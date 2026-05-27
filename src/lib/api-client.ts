// API Client for communicating with Vercel Serverless Functions

const API_BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname) ? 'http://localhost:3000' : '');

export async function apiRequest(endpoint: string, options?: RequestInit) {
  const url = `${API_BASE}/api${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

// Users API
export const usersApi = {
  list: () => apiRequest('/users'),
  getByPhone: (phone: string) => apiRequest(`/users?phone=${encodeURIComponent(phone)}`),
  create: (data: any) => apiRequest('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (data: any) => apiRequest('/users', { method: 'PUT', body: JSON.stringify(data) }),
};

// Circle Pair API
export const circlePairApi = {
  list: () => apiRequest('/circle-pair'),
  getById: (id: string) => apiRequest(`/circle-pair?id=${id}`),
  create: (data: any) => apiRequest('/circle-pair', { method: 'POST', body: JSON.stringify(data) }),
  update: (data: any) => apiRequest('/circle-pair', { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiRequest(`/circle-pair?id=${id}`, { method: 'DELETE' }),
};

// Circle Phone API
export const circlePhoneApi = {
  list: () => apiRequest('/circle-phone'),
  getById: (id: string) => apiRequest(`/circle-phone?id=${id}`),
  create: (data: any) => apiRequest('/circle-phone', { method: 'POST', body: JSON.stringify(data) }),
  update: (data: any) => apiRequest('/circle-phone', { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiRequest(`/circle-phone?id=${id}`, { method: 'DELETE' }),
};
