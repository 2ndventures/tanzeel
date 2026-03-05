import type { Express } from "express";
import { createServer, type Server } from "http";
import { Readable, pipeline } from "stream";

export async function registerRoutes(app: Express): Promise<Server> {
  // Verse-by-verse audio proxy for EveryAyah.com
  app.get("/api/verse-audio/:reciterFolder/:surah/:ayah", async (req, res) => {
    try {
      const { reciterFolder, surah, ayah } = req.params;
      
      // Construct EveryAyah.com URL
      const audioUrl = `https://everyayah.com/data/${reciterFolder}/${surah}${ayah}.mp3`;
      console.log(`📡 Fetching verse audio: ${audioUrl}`);
      
      const response = await fetch(audioUrl);
      
      if (!response.ok) {
        console.error(`❌ Verse audio not found: ${audioUrl}`);
        return res.status(404).send("Verse audio not found");
      }
      
      // Buffer the entire audio file (verse audio files are small: 50-200KB)
      const buffer = await response.arrayBuffer();
      console.log(`✓ Loaded verse audio: ${buffer.byteLength} bytes`);
      
      // Set headers for audio playback
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', buffer.byteLength.toString());
      // Don't advertise Accept-Ranges since we're not implementing range requests
      
      // Set caching headers for better performance
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      
      // Send the audio buffer
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error('❌ Verse audio proxy error:', error);
      res.status(500).send("Failed to fetch verse audio");
    }
  });

  // Audio proxy route with HTTP Range Request streaming support
  app.get("/api/audio/:reciter/:chapter", async (req, res) => {
    try {
      const { reciter, chapter } = req.params;
      
      // Use chapter number as-is (no zero-padding needed for Quran.com CDN)
      let audioUrl = `https://download.quranicaudio.com/qdc/${reciter}/murattal/${chapter}.mp3`;
      console.log(`🎵 Audio proxy request: ${reciter}/${chapter}`);
      console.log(`🌐 Fetching from CDN: ${audioUrl}`);
      
      // Prepare fetch options with Range header if client requested it
      const fetchOptions: RequestInit = {
        headers: {} as Record<string, string>
      };
      
      // Forward Range header from client to CDN for streaming
      const rangeHeader = req.headers.range;
      if (rangeHeader) {
        (fetchOptions.headers as Record<string, string>)['Range'] = rangeHeader;
        console.log(`📏 Range request: ${rangeHeader}`);
      }
      
      let response = await fetch(audioUrl, fetchOptions);
      console.log(`📡 CDN response: ${response.status} ${response.statusText}`);
      
      // If not found, fallback to Alafasy/Mishari (most complete collection)
      // But preserve 416 Range Not Satisfiable errors (client needs to retry)
      if (!response.ok && response.status !== 416 && reciter !== 'mishari_al_afasy') {
        console.log(`Audio not found for ${reciter}, falling back to Mishari Al-Afasy`);
        audioUrl = `https://download.quranicaudio.com/qdc/mishari_al_afasy/murattal/${chapter}.mp3`;
        response = await fetch(audioUrl, fetchOptions);
      }
      
      // Forward 416 Range Not Satisfiable directly to client
      if (response.status === 416) {
        res.status(416);
        const contentRange = response.headers.get('Content-Range');
        if (contentRange) {
          res.setHeader('Content-Range', contentRange);
        }
        return res.send("Range Not Satisfiable");
      }
      
      if (!response.ok) {
        console.error(`❌ Audio not found: ${audioUrl} (Status: ${response.status})`);
        return res.status(404).send("Audio not found");
      }
      
      console.log(`✅ Audio found, streaming to client...`);
      
      // Set status code (206 for partial content, 200 for full)
      res.status(response.status);
      
      // Forward essential headers for streaming
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Accept-Ranges', 'bytes');
      
      // Forward Content-Length if present
      const contentLength = response.headers.get('Content-Length');
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }
      
      // Forward Content-Range for partial requests (206 responses)
      const contentRange = response.headers.get('Content-Range');
      if (contentRange) {
        res.setHeader('Content-Range', contentRange);
      }
      
      // Forward caching headers from CDN for better client-side caching
      const cacheControl = response.headers.get('Cache-Control');
      if (cacheControl) {
        res.setHeader('Cache-Control', cacheControl);
      }
      
      const etag = response.headers.get('ETag');
      if (etag) {
        res.setHeader('ETag', etag);
      }
      
      // Stream the response body directly to client using Node.js streams
      if (response.body) {
        // Convert Web ReadableStream to Node.js Readable stream for better backpressure handling
        const nodeStream = Readable.fromWeb(response.body as any);
        
        // Use pipeline for proper error handling and cleanup on both streams
        pipeline(nodeStream, res, (error) => {
          if (error) {
            console.error('Streaming error:', error);
            // Destroy response to close connection and notify client
            res.destroy(error);
          }
        });
        
        // Handle client disconnect - stop upstream download
        res.on('close', () => {
          if (!nodeStream.destroyed) {
            nodeStream.destroy();
          }
        });
      } else {
        // Fallback for environments without streaming support
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
      }
    } catch (error) {
      console.error('Audio proxy error:', error);
      res.status(500).send("Failed to fetch audio");
    }
  });

  // Timing data proxy for Quran.com word-level synchronization
  app.get("/api/audio-timing/:reciterId/:chapter", async (req, res) => {
    try {
      const { reciterId, chapter } = req.params;
      
      // Fetch timing data from Quran.com API
      const timingUrl = `https://api.qurancdn.com/api/qdc/audio/reciters/${reciterId}/audio_files?chapter=${chapter}&segments=true`;
      console.log(`📡 Fetching timing data: ${timingUrl}`);
      
      const response = await fetch(timingUrl);
      
      if (!response.ok) {
        console.error(`❌ Timing data not found: ${timingUrl}`);
        return res.status(404).json({ error: "Timing data not found" });
      }
      
      const data = await response.json();
      console.log(`✓ Loaded timing data for chapter ${chapter}`);
      
      // CRITICAL FIX: Quran.com API returns INCONSISTENT formats:
      // - Some chapters: {"audio_files": [...]} (plural, array)
      // - Other chapters: {"audio_file": {...}} (singular, object)
      // We need to normalize both formats to always return audio_files array
      
      let audioFiles: any[] = [];
      
      if (data.audio_files && Array.isArray(data.audio_files)) {
        // Format 1: audio_files array (e.g., chapter 1)
        audioFiles = data.audio_files;
        console.log(`📦 Format: audio_files array (${audioFiles.length} files)`);
      } else if (data.audio_file && typeof data.audio_file === 'object') {
        // Format 2: audio_file singular object (e.g., chapter 2)
        audioFiles = [data.audio_file];
        console.log(`📦 Format: audio_file object (normalized to array)`);
      } else {
        console.error(`❌ Unexpected API response format:`, Object.keys(data));
        return res.status(500).json({ error: "Unexpected API response format" });
      }
      
      // Keep original CDN URLs - no proxy needed
      // The Quran CDN has proper CORS headers and can handle large files efficiently
      // Proxying 110MB+ files through our backend causes timeout issues in production
      console.log(`✅ Using direct CDN URLs for chapter ${chapter} (${audioFiles.length} files)`);
      
      // Always return normalized format with audio_files array
      const normalizedData = {
        audio_files: audioFiles
      };
      
      // Set caching headers for better performance
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
      res.setHeader('Content-Type', 'application/json');
      
      res.json(normalizedData);
    } catch (error) {
      console.error('❌ Timing data proxy error:', error);
      res.status(500).json({ error: "Failed to fetch timing data" });
    }
  });

  // Quran text proxy for different Arabic script editions (IndoPak, Tajweed)
  // Uthmani text is served from bundled static JSON, no proxy needed
  app.get("/api/quran-text/:script/:chapter", async (req, res) => {
    try {
      const { script, chapter } = req.params;

      // Map our script names to Quran.com API endpoint names and response field names
      const scriptConfig: Record<string, { endpoint: string; field: string }> = {
        indopak: { endpoint: "indopak", field: "text_indopak" },
        tajweed: { endpoint: "uthmani_tajweed", field: "text_uthmani_tajweed" },
      };

      const config = scriptConfig[script];
      if (!config) {
        return res.status(400).json({ error: `Unknown script: ${script}` });
      }

      const apiUrl = `https://api.quran.com/api/v4/quran/verses/${config.endpoint}?chapter_number=${chapter}`;
      console.log(`📡 Fetching ${script} text: ${apiUrl}`);

      const response = await fetch(apiUrl);

      if (!response.ok) {
        console.error(`❌ Quran text API error: ${response.status}`);
        return res.status(response.status).json({ error: "Failed to fetch Quran text" });
      }

      const data = await response.json();
      console.log(`✅ Loaded ${script} text for chapter ${chapter}`);

      const verses = (data.verses || []).map((v: any) => ({
        verse_key: v.verse_key,
        text: v[config.field] || "",
      }));

      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Content-Type", "application/json");
      res.json({ verses });
    } catch (error) {
      console.error("❌ Quran text proxy error:", error);
      res.status(500).json({ error: "Failed to fetch Quran text" });
    }
  });

  // Tafsir list proxy — returns available tafsirs from Quran.com API
  app.get("/api/tafsirs", async (_req, res) => {
    try {
      const apiUrl = "https://api.quran.com/api/v4/resources/tafsirs?language=en";
      console.log(`📡 Fetching tafsir list: ${apiUrl}`);

      const response = await fetch(apiUrl);
      if (!response.ok) {
        console.error(`❌ Tafsir list API error: ${response.status}`);
        return res.status(response.status).json({ error: "Failed to fetch tafsir list" });
      }

      const data = await response.json();
      console.log(`✅ Loaded tafsir list`);

      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Content-Type", "application/json");
      res.json(data);
    } catch (error) {
      console.error("❌ Tafsir list proxy error:", error);
      res.status(500).json({ error: "Failed to fetch tafsir list" });
    }
  });

  // Tafsir content proxy — returns tafsir for a specific chapter
  app.get("/api/tafsir/:tafsirId/by-chapter/:chapter", async (req, res) => {
    try {
      const { tafsirId, chapter } = req.params;
      const apiUrl = `https://api.quran.com/api/v4/tafsirs/${tafsirId}?chapter_number=${chapter}`;
      console.log(`📡 Fetching tafsir ${tafsirId} for chapter ${chapter}: ${apiUrl}`);

      const response = await fetch(apiUrl);
      if (!response.ok) {
        console.error(`❌ Tafsir API error: ${response.status}`);
        return res.status(response.status).json({ error: "Failed to fetch tafsir" });
      }

      const data = await response.json();
      console.log(`✅ Loaded tafsir ${tafsirId} for chapter ${chapter}`);

      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Content-Type", "application/json");
      res.json(data);
    } catch (error) {
      console.error("❌ Tafsir proxy error:", error);
      res.status(500).json({ error: "Failed to fetch tafsir" });
    }
  });


  const httpServer = createServer(app);

  return httpServer;
}
