import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Audio proxy route to avoid CORS issues with external CDN
  app.get("/api/audio/:reciter/:chapter", async (req, res) => {
    try {
      const { reciter, chapter } = req.params;
      
      // Try requested reciter first
      let audioUrl = `https://cdn.islamic.network/quran/audio-surah/128/${reciter}/${chapter}.mp3`;
      let response = await fetch(audioUrl);
      
      // If not found, fallback to Alafasy (most complete collection)
      if (!response.ok && reciter !== 'ar.alafasy') {
        console.log(`Audio not found for ${reciter}, falling back to Alafasy`);
        audioUrl = `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${chapter}.mp3`;
        response = await fetch(audioUrl);
      }
      
      if (!response.ok) {
        console.error(`Audio not found: ${audioUrl}`);
        return res.status(404).send("Audio not found");
      }
      
      // Set appropriate headers
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Accept-Ranges', 'bytes');
      
      // Stream the audio to the client
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error('Audio proxy error:', error);
      res.status(500).send("Failed to fetch audio");
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
