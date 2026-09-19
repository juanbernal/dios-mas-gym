export interface MaintenanceStatus {
  enabled: boolean;
  videoUrl: string;
}

const getApiBase = (): string => {
  try {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.');
    const isVercel = hostname.endsWith('.vercel.app') || hostname.includes('vercel');
    const isProdDomain = hostname === 'diosmasgym.com' || hostname.endsWith('.diosmasgym.com');
    return (isLocal || isVercel || isProdDomain) ? window.location.origin : 'https://www.diosmasgym.com';
  } catch (e) {
    return 'https://www.diosmasgym.com';
  }
};

/**
 * Fetches the global maintenance status.
 */
const MAINTENANCE_FALLBACK: MaintenanceStatus = {
  enabled: false,
  videoUrl: '/outros/Robot_performing_dumbbell_curls_202605312331.mp4'
};

export const fetchMaintenanceStatus = async (): Promise<MaintenanceStatus> => {
  try {
    const apiBase = getApiBase();
    const url = new URL('/api/common', apiBase);
    url.searchParams.append('action', 'maintenance');
    // Sin parametro t= y sin no-store: eran justo lo que impedia que la
    // respuesta se cachease, y la app entera esperaba por ella en cada visita.

    // La app arranca esperando esto, asi que nunca puede tardar mas de 1,5 s.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    let response: Response;
    try {
      response = await fetch(url.toString(), { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch maintenance status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('Maintenance status no disponible a tiempo, se asume sitio activo:', error);
    return MAINTENANCE_FALLBACK;
  }
};

/**
 * Updates the global maintenance status. Requires master admin password.
 */
export const updateMaintenanceStatus = async (
  enabled: boolean,
  videoUrl: string,
  password: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    const apiBase = getApiBase();
    const url = new URL('/api/common', apiBase);
    url.searchParams.append('action', 'maintenance');

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': password
      },
      body: JSON.stringify({ enabled, videoUrl })
    });

    const result = await response.json();
    if (!response.ok) {
      const errMsg = result.details ? `${result.error} (${result.details})` : (result.error || result.message || `HTTP ${response.status}`);
      throw new Error(errMsg);
    }
    return { success: true, message: result.message };
  } catch (error: any) {
    console.error('Error updating maintenance status:', error);
    return { success: false, message: error.message || 'Error de conexión con el servidor.' };
  }
};
