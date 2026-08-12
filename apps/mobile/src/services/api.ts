let SecureStore: any;
try {
  SecureStore = require('expo-secure-store');
} catch (e) {
  // In-memory fallback for Node.js / Vitest unit test environment
  const mockStorage = new Map<string, string>();
  SecureStore = {
    getItemAsync: async (key: string) => mockStorage.get(key) || null,
    setItemAsync: async (key: string, val: string) => mockStorage.set(key, val),
    deleteItemAsync: async (key: string) => mockStorage.delete(key),
  };
}

const BACKEND_BASE_URL = 'http://10.0.2.2:3000'; // Default Android emulator localhost bridge

export async function apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  let token: string | null = null;
  try {
    token = await SecureStore.getItemAsync('staff_jwt');
  } catch (e) {
    token = null;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BACKEND_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status} Error`);
  }

  return data;
}
