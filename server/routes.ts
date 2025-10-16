import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
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
      if (!response.ok && reciter !== 'ar.alafasy') {
        console.log(`Audio not found for ${reciter}, falling back to Alafasy`);
        audioUrl = `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${chapter}.mp3`;
        response = await fetch(audioUrl, fetchOptions);
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
      
      // Stream the response body directly to client
      if (response.body) {
        const reader = response.body.getReader();
        
        const stream = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
        };
        
        await stream();
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
