export default async function handler(req, res) {
  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    const message = `🚨 DIAGNÓSTICO DE CONEXIÓN\n\nID: JSON_ONLY_TEST_2327\nEstado: El código se ha subido correctamente.\n\nEste es un mensaje de texto puro para confirmar que el servidor de Vercel está leyendo mis cambios.`;

    // Intentamos enviar solo mensaje a Telegram
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: "Markdown"
      })
    });

    return res.status(200).json({ 
        success: true, 
        test_id: "JSON_ONLY_TEST_2327",
        note: "Si ves este JSON, significa que los cambios SÍ suben. El problema es únicamente el generador de imágenes."
    });

  } catch (error) {
    return res.status(500).json({ error_test: error.message });
  }
}
