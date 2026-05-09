
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

export const generateLyricStyle = async () => {
    try {
        const response = await fetch('/api/generate-lyric-style', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error generando estilo');
        return data;
    } catch (error) {
        console.error("Error in generateLyricStyle:", error);
        throw error;
    }
};
