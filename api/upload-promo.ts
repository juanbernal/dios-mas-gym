import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { base64Data } = req.body;
        if (!base64Data) {
            return res.status(400).json({ error: 'No image data provided' });
        }

        // Clean the Base64 header if it exists
        const b64 = base64Data.replace(/^data:image\/\w+;base64,/, "");

        // Build URL parameters for ImgBB (using free API key)
        const params = new URLSearchParams();
        params.append("key", "6d207e02198a847aa98d0a2a901485a5");
        params.append("image", b64);

        // Upload to ImgBB
        const imgbbRes = await fetch("https://api.imgbb.com/1/upload", {
            method: "POST",
            body: params
        });

        const imgbbJson = await imgbbRes.json() as any;
        
        if (imgbbJson.success) {
            return res.status(200).json({ url: imgbbJson.data.url });
        } else {
            return res.status(500).json({ error: 'ImgBB rejected the image', details: imgbbJson });
        }
    } catch (err: any) {
        return res.status(500).json({ error: 'Internal server error', details: err.message });
    }
}
