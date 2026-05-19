
export interface SocialCaptionResult {
    caption: string;
    hashtags: string;
    fullText: string;
}

export const generateSocialCaption = async (
    songTitle: string,
    artist: string,
    smartLink: string,
    platform: 'Instagram' | 'TikTok' | 'Instagram/TikTok' = 'Instagram/TikTok'
): Promise<SocialCaptionResult> => {
    const input = `Canción: "${songTitle}" | Artista: ${artist} | SmartLink: ${smartLink}`;
    const payload = JSON.stringify({
        input,
        platform,
        goal: 'Viralizar y generar streams',
        tone: 'Épico, auténtico y con fe'
    });

    try {
        const response = await fetch('/api/generate-post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: payload })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error generando caption');

        const fullText: string = data.text || '';

        // Extract social post section (between "📱 PUBLICACIÓN" and the next "🏷️" or "3.")
        const socialMatch = fullText.match(/📱[^\n]*\n+([\s\S]*?)(?=🏷️|3\.|$)/i)
            || fullText.match(/PUBLICACI[OÓ]N[^\n]*\n+([\s\S]*?)(?=HASHTAG|3\.|$)/i);
        let caption = socialMatch
            ? socialMatch[1].trim()
            : fullText.split('\n').slice(0, 10).join('\n').trim();

        // Strip AI-generated labels like "Copy Magnético:", "**Copy:**", headers, and surrounding markdown bold/italic
        caption = caption
            .replace(/^\*{0,3}(Copy\s*(Magnético|Sugerido|para\s+\w+)?)\s*:?\*{0,3}\s*/gim, '')
            .replace(/^\*{2,3}[^*\n]+\*{2,3}\s*\n?/gm, '') // Remove headers on their own line
            .replace(/^[-─—=]{3,}\s*$/gm, '') // Remove separators
            .trim();

        // Extract hashtags section
        const hashtagMatch = fullText.match(/🏷️[^\n]*\n+([\s\S]*?)(?=---|\*\*\*|$)/i)
            || fullText.match(/HASHTAG[^\n]*\n+([\s\S]*?)$/i);
        const hashtags = hashtagMatch
            ? hashtagMatch[1].trim().split(/\s+/).filter(w => w.startsWith('#')).join(' ')
            : `#${songTitle.replace(/\s+/g, '')} #${artist.replace(/\s+/g, '')} #DiosMasGym #Juan614 #MusicaCristiana #NuevaMusica #Corridos`;

        return { caption, hashtags, fullText };
    } catch (error) {
        console.error('Error in generateSocialCaption:', error);
        throw error;
    }
};

export const generateSocialPost = async (content: string) => {
    try {
        const response = await fetch('/api/generate-post', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error al generar el post en el servidor.');
        }

        return data.text;
    } catch (error) {
        console.error("Error calling generate-post service:", error);
        throw error;
    }
};

export const generateLyricStyle = async (lyrics: string) => {
    try {
        const response = await fetch('/api/generate-lyric-style', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lyrics })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error generando estilo');
        return data;
    } catch (error) {
        console.error("Error in generateLyricStyle:", error);
        throw error;
    }
};
