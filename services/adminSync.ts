// El secreto que acepta el Apps Script de letras vive solo en el servidor (GS_SYNC_SECRET).
// El panel se identifica con la contraseña de admin y /api/sheet-proxy pone el secreto real.
export const adminHeaders = (extra: Record<string, string> = {}): Record<string, string> => {
  let pass = '';
  try { pass = localStorage.getItem('admin_password') || sessionStorage.getItem('admin_password') || ''; } catch { /* sin storage */ }
  return { ...extra, 'x-admin-password': pass };
};

export const syncFetch = (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> =>
  fetch(input, { ...init, headers: adminHeaders((init.headers as Record<string, string>) || {}) });
