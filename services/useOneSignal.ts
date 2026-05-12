import { useState, useEffect, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// useOneSignal: manages subscription state and prompt for the admin panel
// ─────────────────────────────────────────────────────────────────────────────

interface OneSignalState {
    isSupported: boolean;
    isSubscribed: boolean;
    isPushEnabled: boolean;
    subscribe: () => Promise<void>;
    unsubscribe: () => Promise<void>;
    testNotification: () => Promise<void>;
}

declare global {
    interface Window {
        OneSignalDeferred?: any[];
        OneSignal?: any;
        __ONESIGNAL_APP_ID__?: string;
    }
}

export function useOneSignal(): OneSignalState {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isPushEnabled, setIsPushEnabled] = useState(false);
    const isSupported = typeof window !== 'undefined' && 'PushManager' in window && 'serviceWorker' in navigator;

    const getOS = useCallback(() => window.OneSignal, []);

    const refreshState = useCallback(async () => {
        const OS = getOS();
        if (!OS) return;
        try {
            const subscribed = await OS.User?.PushSubscription?.optedIn ?? false;
            setIsSubscribed(subscribed);
            setIsPushEnabled(subscribed);
        } catch (e) {
            console.warn('[useOneSignal] Could not get subscription state:', e);
        }
    }, [getOS]);

    useEffect(() => {
        if (!isSupported) return;

        // Wait for OneSignal to initialize (it uses deferred queue)
        const timer = setInterval(async () => {
            const OS = getOS();
            if (OS && typeof OS.User !== 'undefined') {
                clearInterval(timer);
                await refreshState();
            }
        }, 500);

        return () => clearInterval(timer);
    }, [isSupported, getOS, refreshState]);

    const subscribe = useCallback(async () => {
        const OS = getOS();
        if (!OS) return;
        try {
            await OS.User?.PushSubscription?.optIn();
            await refreshState();
        } catch (e) {
            console.error('[useOneSignal] Subscribe error:', e);
        }
    }, [getOS, refreshState]);

    const unsubscribe = useCallback(async () => {
        const OS = getOS();
        if (!OS) return;
        try {
            await OS.User?.PushSubscription?.optOut();
            await refreshState();
        } catch (e) {
            console.error('[useOneSignal] Unsubscribe error:', e);
        }
    }, [getOS, refreshState]);

    const testNotification = useCallback(async () => {
        // Calls our Vercel endpoint manually to trigger a test push
        try {
            const res = await fetch('/api/check-releases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            console.log('[useOneSignal] Test push result:', data);
        } catch (e) {
            console.error('[useOneSignal] Test notification error:', e);
        }
    }, []);

    return { isSupported, isSubscribed, isPushEnabled, subscribe, unsubscribe, testNotification };
}
