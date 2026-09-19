import { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// useOneSignal: estado real de la suscripcion a notificaciones push.
//
// Antes el estado se leia UNA sola vez, en cuanto existia window.OneSignal y antes de que
// terminara su init: el SDK todavia reportaba "no suscrito" y el boton se quedaba en
// "Avisame" aunque la persona ya estuviera suscrita. Ahora se lee cuando el SDK termina de
// iniciar, se vuelve a leer con los eventos de cambio y se expone el permiso del navegador
// para poder explicar por que no funciona (bloqueado, no soportado...).
// ─────────────────────────────────────────────────────────────────────────────

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported';

interface OneSignalState {
    isSupported: boolean;
    isSubscribed: boolean;
    isPushEnabled: boolean;
    permission: PushPermission;
    busy: boolean;
    error: string | null;
    subscribe: () => Promise<void>;
    unsubscribe: () => Promise<void>;
    sendLocalTest: () => Promise<boolean>;
    testNotification: () => Promise<any>;
}

declare global {
    interface Window {
        OneSignalDeferred?: any[];
        OneSignal?: any;
        __ONESIGNAL_APP_ID__?: string;
        __ONESIGNAL_INIT_ERROR__?: string;
    }
}

const OPTOUT_KEY = 'onesignal_user_optout';
const SDK_TIMEOUT_MS = 8000;

export function useOneSignal(): OneSignalState {
    const isSupported = typeof window !== 'undefined' && 'PushManager' in window && 'serviceWorker' in navigator && 'Notification' in window;
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [permission, setPermission] = useState<PushPermission>(isSupported ? 'default' : 'unsupported');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const mounted = useRef(true);

    // Lee el estado real desde el SDK (ya inicializado)
    const readState = useCallback((OS: any) => {
        if (!mounted.current || !OS) return;
        try {
            const native: string = OS.Notifications?.permissionNative ?? (typeof Notification !== 'undefined' ? Notification.permission : 'default');
            setPermission(native === 'granted' || native === 'denied' ? native : 'default');
            const optedIn = !!OS.User?.PushSubscription?.optedIn;
            const localOptOut = localStorage.getItem(OPTOUT_KEY) === 'true';
            setIsSubscribed(optedIn && !localOptOut);
        } catch (e) {
            console.warn('[useOneSignal] No se pudo leer el estado:', e);
        }
    }, []);

    // Ejecuta una funcion con el SDK ya cargado, con tiempo maximo de espera
    const withSdk = useCallback((fn: (OS: any) => Promise<void>): Promise<void> => {
        return new Promise<void>((resolve) => {
            let done = false;
            const finish = () => { if (!done) { done = true; resolve(); } };
            const timer = setTimeout(() => {
                if (!done) { setError('sdk_unavailable'); finish(); }
            }, SDK_TIMEOUT_MS);
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            window.OneSignalDeferred.push(async (OS: any) => {
                try {
                    // Si el SDK no pudo iniciar (por ejemplo, el sitio no coincide con la direccion configurada
                    // en OneSignal) no tiene sentido seguir: se avisa con un motivo claro.
                    if (window.__ONESIGNAL_INIT_ERROR__) throw new Error('init_failed');
                    await fn(OS);
                } catch (e: any) {
                    console.error('[useOneSignal] Error:', e);
                    setError(e?.message ? String(e.message) : 'error');
                } finally {
                    clearTimeout(timer);
                    finish();
                }
            });
        });
    }, []);

    useEffect(() => {
        mounted.current = true;
        if (!isSupported) return;

        let removeListeners: (() => void) | undefined;
        const timers: ReturnType<typeof setTimeout>[] = [];

        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(async (OS: any) => {
            readState(OS);
            const onChange = () => readState(OS);
            try {
                OS.User?.PushSubscription?.addEventListener('change', onChange);
                OS.Notifications?.addEventListener('permissionChange', onChange);
                removeListeners = () => {
                    OS.User?.PushSubscription?.removeEventListener('change', onChange);
                    OS.Notifications?.removeEventListener('permissionChange', onChange);
                };
            } catch { /* el SDK no expone eventos: se usan las relecturas */ }
            // Relecturas de respaldo: el SDK puede tardar en registrar la suscripcion existente
            [1500, 4000, 9000].forEach(ms => timers.push(setTimeout(() => readState(window.OneSignal), ms)));
        });

        return () => {
            mounted.current = false;
            timers.forEach(clearTimeout);
            removeListeners?.();
        };
    }, [isSupported, readState]);

    const subscribe = useCallback(async () => {
        if (!isSupported) { setPermission('unsupported'); return; }
        setError(null);
        setBusy(true);
        localStorage.removeItem(OPTOUT_KEY);
        await withSdk(async (OS) => {
            const native = OS.Notifications?.permissionNative ?? Notification.permission;
            if (native === 'denied') {
                setPermission('denied');
                return;
            }
            // Pide el permiso del navegador de forma explicita (antes solo se llamaba a optIn y en
            // algunos navegadores no aparecia la ventana de "Permitir notificaciones")
            if (native !== 'granted') await OS.Notifications?.requestPermission();
            await OS.User?.PushSubscription?.optIn();
            readState(OS);
            setTimeout(() => readState(OS), 1200);
        });
        if (mounted.current) setBusy(false);
    }, [isSupported, withSdk, readState]);

    const unsubscribe = useCallback(async () => {
        setError(null);
        setBusy(true);
        localStorage.setItem(OPTOUT_KEY, 'true');
        setIsSubscribed(false);
        await withSdk(async (OS) => {
            await OS.User?.PushSubscription?.optOut();
            readState(OS);
        });
        if (mounted.current) setBusy(false);
    }, [withSdk, readState]);

    // Notificacion local de prueba: confirma que este dispositivo puede mostrar avisos
    const sendLocalTest = useCallback(async (): Promise<boolean> => {
        try {
            if (Notification.permission !== 'granted') return false;
            const reg = (await navigator.serviceWorker.getRegistration('/')) || (await navigator.serviceWorker.ready);
            await reg.showNotification('🔔 ¡Todo listo!', {
                body: 'Así te avisaremos cuando haya música nueva.',
                icon: '/icon-192.png',
                badge: '/icon-192.png',
            } as NotificationOptions);
            return true;
        } catch (e) {
            console.warn('[useOneSignal] Prueba local fallo:', e);
            return false;
        }
    }, []);

    const testNotification = useCallback(async () => {
        try {
            const res = await fetch('/api/check-releases', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': localStorage.getItem('admin_password') || ''
                },
            });
            return await res.json();
        } catch (e) {
            console.error('[useOneSignal] Test notification error:', e);
            throw e;
        }
    }, []);

    return {
        isSupported,
        isSubscribed,
        isPushEnabled: isSubscribed,
        permission,
        busy,
        error,
        subscribe,
        unsubscribe,
        sendLocalTest,
        testNotification,
    };
}
