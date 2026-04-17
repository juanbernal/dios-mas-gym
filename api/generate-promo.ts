// DIAGNÓSTICO: JSON SOLAMENTE (SIN IMAGENES)
// Para arreglar el error del build de Vercel

export default async function handler(req, res) {
  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    const message = `🛠️ REINICIO DEL SISTEMA\n\nID: CLEAN_BUILD_2329\nEstado: Build de Vercel restablecido.\n\nEste mensaje confirma que el servidor ya puede procesar el código sin errores de despliegue.`;

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message
      })
    });

    return res.status(200).json({ 
        success: true, 
        message: "¡BUILD EXITOSO!", 
        id: "CLEAN_BUILD_2329" 
    });
  } catch (error) {
    return res.status(500).json({ status: "error", error: error.message });
  }
}
