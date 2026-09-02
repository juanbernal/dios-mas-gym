import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  try {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return res.status(500).json({ error: "No REPLICATE_API_TOKEN in .env" });
    }

    if (req.method === 'POST') {
      const { audioUrl } = req.body;
      if (!audioUrl) return res.status(400).json({ error: "audioUrl is required" });

      const response = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: "abf8fe28e407afa6d8e41e86a759caccc0af8e49c3c68016006b62cb0968441e", // htdemucs
          input: {
            audio: audioUrl,
            model_name: "htdemucs_6s"
          }
        }),
      });

      const data = await response.json();
      return res.status(response.status).json(data);
    } 
    
    if (req.method === 'GET') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: "id is required" });

      const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      const data = await response.json();
      return res.status(response.status).json(data);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    console.error("Replicate API Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
