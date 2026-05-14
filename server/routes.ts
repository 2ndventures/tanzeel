import type { Express } from "express";
import { createServer, type Server } from "http";
import { Readable, pipeline } from "stream";

let searchIndex: Array<{ chapterId: number; verseNumber: number; translation: string }> | null = null;

async function getSearchIndex() {
  if (searchIndex) return searchIndex;
  const fs = await import('fs/promises');
  const path = await import('path');
  const entries: Array<{ chapterId: number; verseNumber: number; translation: string }> = [];
  for (let i = 1; i <= 114; i++) {
    try {
      const filePath = path.default.join(process.cwd(), 'public', 'data', 'chapters', `${i}.json`);
      const raw = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(raw);
      for (const verse of data.verses || []) {
        entries.push({ chapterId: i, verseNumber: verse.number, translation: verse.translation || '' });
      }
    } catch {}
  }
  searchIndex = entries;
  return searchIndex;
}

const SAFE_PARAM = /^[a-zA-Z0-9_\-]+$/;
const SAFE_NUM = /^[0-9]+$/;

export async function registerRoutes(app: Express): Promise<Server> {
  // Hidden Sentry verification endpoint. Throws so the global error handler
  // (Sentry's setupExpressErrorHandler) captures and reports it.
  app.get("/api/_debug/sentry", (_req, _res) => {
    throw new Error("Sentry test error from /api/_debug/sentry");
  });

  app.get("/api/search", async (req, res) => {
    try {
      const q = (req.query.q as string || '').trim().toLowerCase();
      if (q.length < 2) return res.json({ results: [] });

      const index = await getSearchIndex();
      const results: Array<{ chapterId: number; verseNumber: number; translation: string }> = [];
      const limit = 30;

      for (const entry of index) {
        if (entry.translation.toLowerCase().includes(q)) {
          results.push(entry);
          if (results.length >= limit) break;
        }
      }

      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.json({ results });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  });

  // Verse-by-verse audio proxy for EveryAyah.com
  app.get("/api/verse-audio/:reciterFolder/:surah/:ayah", async (req, res) => {
    try {
      const { reciterFolder, surah, ayah } = req.params;

      if (!SAFE_PARAM.test(reciterFolder) || !SAFE_PARAM.test(surah) || !SAFE_PARAM.test(ayah)) {
        return res.status(400).json({ error: 'Invalid parameters' });
      }

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

      if (!SAFE_PARAM.test(reciter) || !SAFE_NUM.test(chapter)) {
        return res.status(400).json({ error: 'Invalid parameters' });
      }

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

      if (!SAFE_NUM.test(reciterId) || !SAFE_NUM.test(chapter)) {
        return res.status(400).json({ error: 'Invalid parameters' });
      }

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

      if (!SAFE_NUM.test(chapter)) {
        return res.status(400).json({ error: 'Invalid parameters' });
      }

      if (script !== 'indopak' && script !== 'tajweed') {
        return res.status(400).json({ error: `Unknown script: ${script}` });
      }

      let apiUrl: string;
      let verses: { verse_key: string; text: string; words?: string[] }[];

      if (script === 'indopak') {
        // Fetch per-word IndoPak text so word count exactly matches Quran.com timing API
        // The full-verse string has a different spacing convention (e.g. standalone وَ tokens)
        // that causes tokenization to produce more words than the timing data expects.
        apiUrl = `https://api.quran.com/api/v4/verses/by_chapter/${chapter}?words=true&word_fields=text_indopak&per_page=300&fields=verse_key`;
        console.log(`📡 Fetching indopak per-word text: ${apiUrl}`);

        const response = await fetch(apiUrl);
        if (!response.ok) {
          console.error(`❌ Quran text API error (indopak): ${response.status}`);
          return res.status(response.status).json({ error: "Failed to fetch Quran text" });
        }

        const data = await response.json();
        console.log(`✅ Loaded indopak per-word text for chapter ${chapter}`);

        // Build per-word arrays from the API word objects.
        // IndoPak text_indopak can contain internal spaces within a single word token
        // (Nastaliq font convention), so joining and re-splitting by space is unreliable.
        // We return both:
        //   - text: words joined for whole-verse display (may have internal spaces)
        //   - words: the pre-split array (API word boundaries, exact same count as timing data)

        // Sanitise IndoPak word text by stripping characters that render as □ boxes.
        // The Quran.com text_indopak field embeds several non-letter markers:
        //
        //   U+06D6–U+06ED  Quranic annotation chars (pause/stop marks, sajda, etc.)
        //   U+08A0–U+08FF  Arabic Extended-A (extra Quranic diacritics)
        //   U+FD3E–U+FD3F  Ornate Quranic parentheses
        //   U+E000–U+F8FF  BMP Private Use Area — proprietary Quran.com markers
        //                  (e.g. U+E021, U+E022) that no public font defines
        //   U+200F         Right-to-Left Mark (bidi control, invisible but may box)
        //   U+200E         Left-to-Right Mark (same reason)
        //   U+200B         Zero Width Space
        //   U+FEFF         BOM / Zero Width No-Break Space
        //
        // All actual Arabic letters and standard harakat are preserved.
        const sanitiseIndopakWord = (text: string): string =>
          text.replace(/[\u06D6-\u06ED\u08A0-\u08FF\uFD3E\uFD3F\uE000-\uF8FF\u200B-\u200F\uFEFF]/g, '');

        verses = (data.verses || []).map((v: any) => {
          const wordTexts: string[] = (v.words || [])
            .filter((w: any) => w.char_type_name === 'word')
            .map((w: any) => sanitiseIndopakWord(w.text_indopak || ''));
          return {
            verse_key: v.verse_key,
            text: wordTexts.join(' '),
            words: wordTexts,
          };
        });

      } else {
        // Tajweed: full verse HTML with <tajweed> tags; existing tokenizer handles it correctly
        apiUrl = `https://api.quran.com/api/v4/quran/verses/uthmani_tajweed?chapter_number=${chapter}`;
        console.log(`📡 Fetching tajweed text: ${apiUrl}`);

        const response = await fetch(apiUrl);
        if (!response.ok) {
          console.error(`❌ Quran text API error (tajweed): ${response.status}`);
          return res.status(response.status).json({ error: "Failed to fetch Quran text" });
        }

        const data = await response.json();
        console.log(`✅ Loaded tajweed text for chapter ${chapter}`);

        verses = (data.verses || []).map((v: any) => ({
          verse_key: v.verse_key,
          text: (v.text_uthmani_tajweed || "").replace(/\s*<span\s+class=end>[\u0660-\u0669\d]+<\/span>/g, ''),
        }));
      }

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

      if (!SAFE_NUM.test(tafsirId) || !SAFE_NUM.test(chapter)) {
        return res.status(400).json({ error: 'Invalid parameters' });
      }

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


  // ── Public privacy policy page (used as App Store Connect privacy URL) ──
  app.get("/privacy", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Privacy Policy — Tanzeel</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0d1d35;
      color: #e2e8f0;
      line-height: 1.7;
      padding: 2rem 1rem 4rem;
    }
    .container { max-width: 720px; margin: 0 auto; }
    header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid rgba(245,200,74,0.2); }
    .logo { width: 48px; height: 48px; border-radius: 12px; }
    header h1 { font-size: 1.5rem; font-weight: 700; color: #f5c84a; }
    header p { font-size: 0.85rem; color: #7e8a9f; margin-top: 0.1rem; }
    h2 { font-size: 1.2rem; font-weight: 700; color: #f5c84a; margin-bottom: 0.75rem; margin-top: 2rem; }
    p { color: #cbd5e1; margin-bottom: 0.75rem; }
    ul { padding-left: 1.5rem; color: #cbd5e1; margin-bottom: 0.75rem; }
    ul li { margin-bottom: 0.4rem; }
    .callout { background: rgba(255,255,255,0.05); border: 1px solid rgba(245,200,74,0.15); border-radius: 10px; padding: 1.25rem 1.5rem; margin: 1rem 0; }
    .callout h3 { font-size: 1rem; font-weight: 600; color: #f5c84a; margin-bottom: 0.5rem; }
    .meta { font-size: 0.8rem; color: #7e8a9f; margin-bottom: 2rem; }
    strong { color: #e2e8f0; }
    a { color: #f5c84a; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>Tanzeel — Privacy Policy</h1>
        <p>Quran Reading &amp; Recitation</p>
      </div>
    </header>

    <p class="meta"><strong>Last Updated:</strong> November 14, 2025</p>

    <h2>Introduction</h2>
    <p>2nd Ventures, LLC ("we," "us," or "our") operates the Tanzeel mobile application (the "App"). This Privacy Policy explains our practices regarding the collection, use, and disclosure of information when you use our App. We are committed to protecting your privacy and complying with applicable privacy laws, including GDPR and CCPA.</p>

    <h2>Information We Collect</h2>
    <p><strong>Tanzeel does not collect, store, or transmit any personal data to our servers.</strong></p>
    <p>All app functionality operates entirely on your device using local storage. This includes:</p>
    <ul>
      <li>Reading progress and bookmarks</li>
      <li>User preferences (theme, font size, reciter selection)</li>
      <li>Reading statistics and history</li>
      <li>Application settings</li>
    </ul>
    <p>This data is stored exclusively on your device and is never transmitted to us or any third party.</p>

    <h2>Third-Party Services</h2>
    <p>The App uses the following third-party service:</p>
    <div class="callout">
      <h3>Quran.com API</h3>
      <p>We use the Quran.com API to provide audio recitation and word-level timing data. When you play audio in the app, your device connects directly to Quran.com's content delivery network to stream the audio files.</p>
      <p>This connection may expose your IP address to Quran.com's servers. We recommend reviewing <a href="https://quran.com/privacy" target="_blank">Quran.com's privacy policy</a> for information about how they handle this data.</p>
    </div>

    <h2>Data Storage and Security</h2>
    <p>All user data is stored locally on your device using your device's native storage mechanisms. This data remains under your control and can be deleted at any time by uninstalling the app or clearing the app's data through your device settings.</p>

    <h2>In-App Purchases</h2>
    <p>The App may offer a one-time purchase option in the future. If implemented, all purchase transactions will be processed through Apple's App Store or Google Play Store. We do not collect or store any payment information.</p>

    <h2>Children's Privacy</h2>
    <p>Our App is suitable for users of all ages, including children. Because we do not collect any personal information, we do not knowingly collect data from children under 13 (or the applicable age in your jurisdiction). All data is stored locally on the device and remains under the control of the device owner.</p>

    <h2>Your Rights</h2>
    <p>Since we do not collect or store any personal data on our servers, the following rights are inherently protected:</p>
    <ul>
      <li><strong>Right to Access:</strong> All your data is stored on your device and accessible to you at all times</li>
      <li><strong>Right to Delete:</strong> You can delete all app data by uninstalling the app or clearing app data in device settings</li>
      <li><strong>Right to Portability:</strong> Your data never leaves your device</li>
      <li><strong>Right to Opt-Out:</strong> No data collection means no opt-out is necessary</li>
    </ul>

    <h2>International Data Transfers</h2>
    <p>We do not transfer any personal data internationally because we do not collect or store personal data. The only data transfer that occurs is when your device connects to Quran.com's servers to stream audio content, which is governed by Quran.com's privacy policy.</p>

    <h2>GDPR Compliance</h2>
    <p>For users in the European Economic Area (EEA), we comply with GDPR requirements. Since we do not collect personal data, most GDPR obligations do not apply. However, we maintain this privacy policy to ensure transparency about our practices.</p>

    <h2>CCPA Compliance</h2>
    <p>For California residents, we comply with the California Consumer Privacy Act (CCPA). We do not:</p>
    <ul>
      <li>Collect personal information</li>
      <li>Sell personal information</li>
      <li>Share personal information for behavioral advertising</li>
      <li>Retain personal information</li>
    </ul>

    <h2>Changes to This Privacy Policy</h2>
    <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy in the app and updating the "Last Updated" date above.</p>

    <h2>Contact Us</h2>
    <div class="callout">
      <h3>2nd Ventures, LLC</h3>
      <p>Email: <a href="mailto:support@2ndventures.ai">support@2ndventures.ai</a></p>
    </div>
  </div>
</body>
</html>`);
  });

  const httpServer = createServer(app);

  return httpServer;
}
