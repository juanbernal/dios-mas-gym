
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
