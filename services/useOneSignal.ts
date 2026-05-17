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
    testNotification: () => Promise<any>;
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
        
        // Hard override local
        const localOptOut = localStorage.getItem('onesignal_user_optout') === 'true';
        if (localOptOut) {
            setIsSubscribed(false);
            setIsPushEnabled(false);
            return;
        }

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
        localStorage.removeItem('onesignal_user_optout');
        
        // Feedback inmediato
        setIsSubscribed(true);
        setIsPushEnabled(true);

        if (typeof window !== 'undefined' && window.OneSignalDeferred) {
            window.OneSignalDeferred.push(async (OneSignal: any) => {
                try {
                    await OneSignal.User?.PushSubscription?.optIn();
                    setTimeout(refreshState, 1000);
                } catch (e) {
                    console.error('[useOneSignal] Subscribe error:', e);
                }
            });
        } else if (OS) {
            try {
                await OS.User?.PushSubscription?.optIn();
                setTimeout(refreshState, 1000);
            } catch (e) {
                console.error('[useOneSignal] Subscribe error:', e);
            }
        }
    }, [getOS, refreshState]);

    const unsubscribe = useCallback(async () => {
        const OS = getOS();
        // Hard override local
        localStorage.setItem('onesignal_user_optout', 'true');
        // Feedback inmediato
        setIsSubscribed(false);
        setIsPushEnabled(false);
        
        if (typeof window !== 'undefined' && window.OneSignalDeferred) {
            window.OneSignalDeferred.push(async (OneSignal: any) => {
                try {
                    await OneSignal.User?.PushSubscription?.optOut();
                    setTimeout(refreshState, 1500);
                } catch (e) {
                    console.error('[useOneSignal] Unsubscribe error:', e);
                }
            });
        } else if (OS) {
            try {
                await OS.User?.PushSubscription?.optOut();
                setTimeout(refreshState, 1500);
            } catch (e) {
                console.error('[useOneSignal] Unsubscribe error:', e);
            }
        }
    }, [getOS, refreshState]);

    const testNotification = useCallback(async () => {
        try {
            const res = await fetch('/api/check-releases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            return data;
        } catch (e) {
            console.error('[useOneSignal] Test notification error:', e);
            throw e;
        }
    }, []);

    return { isSupported, isSubscribed, isPushEnabled, subscribe, unsubscribe, testNotification };
}
