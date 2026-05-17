import { useEffect } from 'react';

export const useAnalytics = () => {
    const trackEvent = async (eventName: string, eventData: any = {}) => {
        try {
            // Local dev / debugging
            console.log(`[Analytics] Track: ${eventName}`, eventData);

            const isVercel = window.location.hostname.includes('vercel');
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const apiBase = isLocal ? window.location.origin : (isVercel ? window.location.origin : 'https://app.diosmasgym.com');

            // We use the existing sheet-proxy to send the data to Google Apps Script.
            // The Apps Script must be updated to handle action=trackEvent
            fetch(`${apiBase}/api/sheet-proxy?script=analytics&action=trackEvent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'trackEvent',
                    event: eventName,
                    data: eventData,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent
                })
            }).catch(() => {
                // Fail silently to avoid breaking the UI if tracking fails
            });
        } catch (error) {
            // Ignore tracking errors
        }
    };

    return { trackEvent };
};

/* 
=============================================================================
CÓDIGO DE RASTREO PARA PÁGINAS EXTERNAS (Blogger, Sitios Web de terceros)
Copia y pega este código antes de la etiqueta </head> o al final del <body>
en páginas externas para registrar visitas en el Analytics Dashboard.
=============================================================================
<!-- CÓDIGO DE RASTREO PARA DIOS MAS GYM -->
<script>
  window.addEventListener('load', function() {
    // 1. Usamos la URL base
    var ANALYTICS_URL = "https://script.google.com/macros/s/AKfycbwNX-T5wawLrYaTnJ0PcN_xA8sp0LIXThDA3jqkDhR3IdjSlnqRif8rUEx_e9e1xSsd3Q/exec";
    
    // 2. Incluimos action en el payload, de lo contrario Apps Script lo rechaza
    var payload = {
      action: "trackEvent",
      event: "post_view", 
      data: { 
        title: document.title,
        artist: "Externa" 
      },
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };

    fetch(ANALYTICS_URL, {
      method: "POST",
      mode: "no-cors", // MUY IMPORTANTE: Evita que el navegador bloquee la petición
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload)
    }).catch(function(e) {
      console.log("Analytics Error:", e);
    });
  });
</script>
<!-- FIN DEL CÓDIGO DE RASTREO -->
*/
