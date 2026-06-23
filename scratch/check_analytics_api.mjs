

async function check() {
  const proxyUrl = 'https://app.diosmasgym.com/api/sheet-proxy?script=analytics';
  const directUrl = 'https://script.google.com/macros/s/AKfycbwNX-T5wawLrYaTnJ0PcN_xA8sp0LIXThDA3jqkDhR3IdjSlnqRif8rUEx_e9e1xSsd3Q/exec';

  console.log("=== 1. Probando a través de Vercel Proxy ===");
  try {
    const res = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getAnalytics' })
    });
    console.log("Status:", res.status);
    console.log("Content-Type:", res.headers.get('content-type'));
    const text = await res.text();
    console.log("Snippet de respuesta (primeros 500 chars):");
    console.log(text.substring(0, 500));
  } catch (err) {
    console.error("Error en Proxy:", err);
  }

  console.log("\n=== 2. Probando Directo a Google Apps Script ===");
  try {
    const res = await fetch(directUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getAnalytics' })
    });
    console.log("Status:", res.status);
    console.log("Content-Type:", res.headers.get('content-type'));
    const text = await res.text();
    console.log("Respuesta completa:");
    console.log(text);
  } catch (err) {
    console.error("Error Directo:", err);
  }
}

check();
