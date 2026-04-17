// DIAGNÓSTICO: JSON SOLAMENTE (SIN IMAGENES)
// Restaurando el build para limpiar errores previos

export default async function handler(req, res) {
  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    const message = `🛠️ ESTADO: Build Recuperado\n\nID: RECOVERY_2331\n\nEste mensaje confirma que la conexión con Vercel está limpia.`;

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
        status: "Build OK",
        id: "RECOVERY_2331" 
    });
  } catch (error) {
    return res.status(500).json({ status: "error", error: error.message });
  }
}
