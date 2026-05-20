import { useEffect } from 'react';

export const useAnalytics = () => {
    const trackEvent = async (eventName: string, eventData: any = {}) => {
        try {
            // Comprobar si el usuario es administrador y tiene activa la exclusión
            const isAdminStorage = localStorage.getItem('pwa_admin_user') === 'true';
            const isAdminCookie = document.cookie.includes('is_admin_user=true');

            if (isAdminStorage || isAdminCookie) {
                console.log(`[Analytics] [EXCLUIDO - Admin User] Track: ${eventName}`, eventData);
                return;
            }

            // Local dev / debugging
            console.log(`[Analytics] Track: ${eventName}`, eventData);

            const hostname = window.location.hostname;
            const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.');
            const isVercel = hostname.endsWith('.vercel.app') || hostname.includes('vercel');
            const isProdDomain = hostname === 'diosmasgym.com' || hostname.endsWith('.diosmasgym.com');
            const apiBase = (isLocal || isVercel || isProdDomain) ? window.location.origin : 'https://app.diosmasgym.com';

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
  (function() {
    // Si la URL contiene ?admin=true, activar exclusión permanente en este navegador
    if (window.location.search.includes('admin=true')) {
      try {
        localStorage.setItem('pwa_admin_user', 'true');
        console.log('👑 Modo Administrador activado. Tus visitas a este blog serán excluidas permanentemente en este navegador.');
      } catch (e) {}
    }

    // Comprobar si debemos excluir esta visita
    try {
      if (localStorage.getItem('pwa_admin_user') === 'true') {
        console.log('🚫 Visita excluida del rastreo de analíticas (Usuario Administrador)');
        return;
      }
    } catch (e) {}

    function trackView() {
      var ANALYTICS_URL = "https://script.google.com/macros/s/AKfycbwNX-T5wawLrYaTnJ0PcN_xA8sp0LIXThDA3jqkDhR3IdjSlnqRif8rUEx_e9e1xSsd3Q/exec";
      
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
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
      }).catch(function(e) {
        console.log("Analytics Error:", e);
      });
    }

    if (document.readyState === "complete" || document.readyState === "interactive") {
      trackView();
    } else {
      window.addEventListener('load', trackView);
    }
  })();
</script>
<!-- FIN DEL CÓDIGO DE RASTREO -->
*/
