export const API_URL =
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const api = (path: string) => `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
