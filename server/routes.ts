import type { Express } from "express";
import { createServer, type Server } from "http";
import { Readable, pipeline } from "stream";
import { storage } from "./storage";

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
      
      // Try requested reciter first
      let audioUrl = `https://cdn.islamic.network/quran/audio-surah/128/${reciter}/${chapter}.mp3`;
      
      // Prepare fetch options with Range header if client requested it
      const fetchOptions: RequestInit = {
        headers: {} as Record<string, string>
      };
      
      // Forward Range header from client to CDN for streaming
      const rangeHeader = req.headers.range;
      if (rangeHeader) {
        (fetchOptions.headers as Record<string, string>)['Range'] = rangeHeader;
      }
      
      let response = await fetch(audioUrl, fetchOptions);
      
      // If not found, fallback to Alafasy (most complete collection)
      // But preserve 416 Range Not Satisfiable errors (client needs to retry)
      if (!response.ok && response.status !== 416 && reciter !== 'ar.alafasy') {
        console.log(`Audio not found for ${reciter}, falling back to Alafasy`);
        audioUrl = `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${chapter}.mp3`;
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
        console.error(`Audio not found: ${audioUrl}`);
        return res.status(404).send("Audio not found");
      }
      
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

  const httpServer = createServer(app);

  return httpServer;
}
