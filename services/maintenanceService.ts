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
    return (isLocal || isVercel || isProdDomain) ? window.location.origin : 'https://app.diosmasgym.com';
  } catch (e) {
    return 'https://app.diosmasgym.com';
  }
};

/**
 * Fetches the global maintenance status.
 */
export const fetchMaintenanceStatus = async (): Promise<MaintenanceStatus> => {
  try {
    const apiBase = getApiBase();
    const url = new URL('/api/common', apiBase);
    url.searchParams.append('action', 'maintenance');
    url.searchParams.append('t', Date.now().toString()); // Avoid aggressively caching status

    const response = await fetch(url.toString(), { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to fetch maintenance status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching maintenance status:', error);
    return { enabled: false, videoUrl: '/outros/Robot_performing_dumbbell_curls_202605312331.mp4' };
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
      throw new Error(result.error || result.message || `HTTP ${response.status}`);
    }
    return { success: true, message: result.message };
  } catch (error: any) {
    console.error('Error updating maintenance status:', error);
    return { success: false, message: error.message || 'Error de conexión con el servidor.' };
  }
};
