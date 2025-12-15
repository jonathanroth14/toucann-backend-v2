import { auth } from './auth';
import { logApiError } from './errors';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

interface ApiOptions extends RequestInit {
  requiresAuth?: boolean;
}

async function apiFetch<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { requiresAuth = false, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string> || {}),
  };

  if (requiresAuth) {
    const token = auth.getToken();
    if (!token) {
      window.location.href = '/login';
      throw new Error('Not authenticated');
    }
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add Content-Type for JSON requests
  if (fetchOptions.body && typeof fetchOptions.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('🔵 API Request:', {
      url: `${API_BASE}${endpoint}`,
      method: fetchOptions.method || 'GET',
      hasAuth: !!headers['Authorization'],
      body: fetchOptions.body ? JSON.parse(fetchOptions.body as string) : undefined,
    });
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (process.env.NODE_ENV === 'development') {
    console.log('🔵 API Response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });
  }

  if (response.status === 401) {
    auth.clearToken();
    window.location.href = '/login';
    throw new Error('Unauthorized - please login again');
  }

  if (!response.ok) {
    let errorData: any;
    const contentType = response.headers.get('content-type');

    try {
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
      } else {
        errorData = { detail: await response.text() };
      }
    } catch (e) {
      errorData = { detail: `Request failed with status ${response.status}` };
    }

    logApiError(endpoint, errorData, response);

    // Throw the full error object so we can format it properly in the UI
    const error = new Error(typeof errorData.detail === 'string' ? errorData.detail : 'Request failed');
    (error as any).data = errorData;
    throw error;
  }

  const data = await response.json();

  if (process.env.NODE_ENV === 'development') {
    console.log('✅ API Success:', data);
  }

  return data;
}

// Auth API
export const authApi = {
  async login(email: string, password: string) {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(error.detail || 'Login failed');
    }

    return response.json() as Promise<{ access_token: string; token_type: string }>;
  },

  async register(email: string, password: string) {
    return apiFetch<{ id: number; email: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async getMe() {
    return apiFetch<{ id: number; email: string; is_admin: boolean }>('/auth/me', {
      requiresAuth: true,
    });
  },
};

// Admin API
export const adminApi = {
  async listChallenges() {
    return apiFetch<Array<{
      id: number;
      title: string;
      description: string | null;
      is_active: boolean;
      created_at: string;
    }>>('/admin/challenges', {
      requiresAuth: true,
    });
  },

  async getChallenge(id: number) {
    return apiFetch<{
      id: number;
      title: string;
      description: string | null;
      is_active: boolean;
      created_at: string;
      objectives: Array<{
        id: number;
        title: string;
        description: string | null;
        points: number;
        sort_order: number;
        is_required: boolean;
      }>;
    }>(`/admin/challenges/${id}`, {
      requiresAuth: true,
    });
  },

  async createChallenge(data: { title: string; description?: string; is_active: boolean }) {
    return apiFetch<{ id: number; title: string }>('/admin/challenges', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(data),
    });
  },

  async createObjective(
    challengeId: number,
    data: {
      title: string;
      description?: string;
      points: number;
      sort_order: number;
      is_required: boolean;
    }
  ) {
    return apiFetch<{ id: number }>(`/admin/challenges/${challengeId}/objectives`, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(data),
    });
  },

  async linkNextChallenge(challengeId: number, toId: number, condition: string = 'ON_COMPLETE') {
    return apiFetch(`/admin/challenges/${challengeId}/link-next`, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({ to_challenge_id: toId, condition }),
    });
  },
};

// Student API
export const studentApi = {
  async getActiveChallenge() {
    return apiFetch<{
      id: number;
      title: string;
      description: string | null;
      status: string;
      objectives: Array<{
        id: number;
        title: string;
        description: string | null;
        points: number;
        sort_order: number;
        is_required: boolean;
        status: string;
        completed_at: string | null;
      }>;
    }>('/me/active-challenge', {
      requiresAuth: true,
    });
  },

  async completeObjective(objectiveId: number) {
    return apiFetch(`/me/objectives/${objectiveId}/complete`, {
      method: 'POST',
      requiresAuth: true,
    });
  },
};
