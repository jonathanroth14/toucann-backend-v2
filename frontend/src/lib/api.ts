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
    console.log('🔑 Token from localStorage:', token ? `${token.substring(0, 20)}...` : 'NULL');
    if (!token) {
      console.error('❌ No token found - redirecting to login');
      window.location.href = '/login';
      throw new Error('Not authenticated');
    }
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add Content-Type for JSON requests
  if (fetchOptions.body && typeof fetchOptions.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  console.log('🔵 API Request:', {
    url: `${API_BASE}${endpoint}`,
    method: fetchOptions.method || 'GET',
    headers: {
      'Content-Type': headers['Content-Type'] || 'none',
      'Authorization': headers['Authorization'] ? 'Bearer ***' : 'none',
    },
    body: fetchOptions.body ? JSON.parse(fetchOptions.body as string) : undefined,
  });

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  console.log('🔵 API Response:', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
  });

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

    // Always log errors even in production with full details
    console.error('❌ API Error Response:', {
      endpoint,
      method: fetchOptions.method || 'GET',
      status: response.status,
      statusText: response.statusText,
      contentType,
      errorData: JSON.stringify(errorData, null, 2),
    });

    logApiError(endpoint, errorData, response);

    // Throw the full error object so we can format it properly in the UI
    const error = new Error(typeof errorData.detail === 'string' ? errorData.detail : 'Request failed');
    (error as any).data = errorData;
    throw error;
  }

  const data = await response.json();

  console.log('✅ API Success:', data);

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
      goal_id: number | null;
      next_challenge_id: number | null;
      sort_order: number;
      visible_to_students: boolean;
      points: number;
      category: string | null;
      due_date: string | null;
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

  async createChallenge(data: {
    title: string;
    description?: string;
    is_active: boolean;
    goal_id?: number;
    next_challenge_id?: number;
    sort_order?: number;
    visible_to_students?: boolean;
    points?: number;
    category?: string;
    due_date?: string;
  }) {
    return apiFetch<{ id: number; title: string }>('/admin/challenges', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(data),
    });
  },

  async updateChallenge(id: number, data: {
    title?: string;
    description?: string;
    is_active?: boolean;
    goal_id?: number;
    next_challenge_id?: number;
    sort_order?: number;
    visible_to_students?: boolean;
    points?: number;
    category?: string;
    due_date?: string;
  }) {
    return apiFetch<{
      id: number;
      title: string;
      description: string | null;
      is_active: boolean;
      created_at: string;
      goal_id: number | null;
      next_challenge_id: number | null;
      sort_order: number;
      visible_to_students: boolean;
      points: number;
      category: string | null;
      due_date: string | null;
    }>(`/admin/challenges/${id}`, {
      method: 'PUT',
      requiresAuth: true,
      body: JSON.stringify(data),
    });
  },

  async deleteChallenge(id: number) {
    return apiFetch<{ ok: boolean; message: string }>(`/admin/challenges/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
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
  async getTodayTask() {
    return apiFetch<{
      current_goal: {
        id: number;
        title: string;
        description: string | null;
      } | null;
      current_challenge: {
        id: number;
        title: string;
        description: string | null;
        points: number;
        category: string | null;
        due_date: string | null;
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
        has_next: boolean;
      } | null;
      all_challenges: Array<{
        id: number;
        title: string;
        points: number;
        sort_order: number;
        status: string;
        is_current: boolean;
      }>;
      progress: {
        total: number;
        completed: number;
        percentage: number;
      };
    }>('/student/today', {
      requiresAuth: true,
    });
  },

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

  async completeChallenge(challengeId: number) {
    return apiFetch<{
      ok: boolean;
      message: string;
      next_challenge_activated: boolean;
      next_challenge_id: number | null;
    }>(`/student/challenges/${challengeId}/complete`, {
      method: 'POST',
      requiresAuth: true,
    });
  },

  async getNextChallenge() {
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
    }>('/me/next-challenge', {
      method: 'POST',
      requiresAuth: true,
    });
  },

  async getActiveGoal() {
    return apiFetch<{
      id: number;
      title: string;
      description: string | null;
      status: string;
      steps: Array<{
        id: number;
        goal_id: number;
        title: string;
        description: string | null;
        points: number;
        sort_order: number;
        is_required: boolean;
        status: string;
        completed_at: string | null;
      }>;
    }>('/me/active-goal', {
      requiresAuth: true,
    });
  },

  async completeGoalStep(stepId: number) {
    return apiFetch<{ ok: boolean; message: string; goal_complete: boolean }>(`/me/goal-steps/${stepId}/complete`, {
      method: 'POST',
      requiresAuth: true,
    });
  },
};

// Goals Admin API
export const goalAdminApi = {
  async listGoals() {
    return apiFetch<Array<{
      id: number;
      title: string;
      description: string | null;
      is_active: boolean;
      created_at: string;
    }>>('/admin/goals', {
      requiresAuth: true,
    });
  },

  async getGoal(id: number) {
    return apiFetch<{
      id: number;
      title: string;
      description: string | null;
      is_active: boolean;
      created_at: string;
      steps: Array<{
        id: number;
        goal_id: number;
        title: string;
        description: string | null;
        points: number;
        sort_order: number;
        is_required: boolean;
      }>;
    }>(`/admin/goals/${id}`, {
      requiresAuth: true,
    });
  },

  async createGoal(data: { title: string; description?: string; is_active: boolean }) {
    return apiFetch<{ id: number; title: string }>('/admin/goals', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(data),
    });
  },

  async updateGoal(id: number, data: { title?: string; description?: string; is_active?: boolean }) {
    return apiFetch<{
      id: number;
      title: string;
      description: string | null;
      is_active: boolean;
      created_at: string;
    }>(`/admin/goals/${id}`, {
      method: 'PUT',
      requiresAuth: true,
      body: JSON.stringify(data),
    });
  },

  async deleteGoal(id: number) {
    return apiFetch<{ ok: boolean; message: string }>(`/admin/goals/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  async createStep(
    goalId: number,
    data: {
      title: string;
      description?: string;
      points: number;
      sort_order: number;
      is_required: boolean;
    }
  ) {
    return apiFetch<{ id: number }>(`/admin/goals/${goalId}/steps`, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(data),
    });
  },

  async linkNextGoal(goalId: number, toId: number, condition: string = 'ON_COMPLETE') {
    return apiFetch(`/admin/goals/${goalId}/link-next`, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({ to_goal_id: toId, condition }),
    });
  },
};
