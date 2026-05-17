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
