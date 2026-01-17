import axios, { AxiosInstance } from 'axios';
import { getToken, removeToken } from './auth';
import type {
  LoginRequest,
  LoginResponse,
  CreateAdminRequest,
  Client,
  CreateClientRequest,
  UpdateClientRequest,
  ClientWithStats,
  MonitoredUrl,
  CreateUrlRequest,
  UpdateUrlRequest,
  BrowserConfiguration,
  CreateBrowserConfigRequest,
  UpdateBrowserConfigRequest,
  DetectedFailure,
  FailureWithDetails,
  FailureFilters,
  UpdateFailureStatusRequest,
  BulkUpdateFailuresRequest,
  MonitoringRun,
  MonitoringRunWithDetails,
  UrlCheck,
  OverviewStats,
  TrendData,
  GroupedCount,
} from '@/types';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - remove token and redirect to login
      removeToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// AUTH API
// ============================================================================

export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  createAdmin: async (data: CreateAdminRequest): Promise<{ admin_id: number; message: string }> => {
    const response = await api.post('/auth/create-admin', data);
    return response.data;
  },
};

// ============================================================================
// CLIENTS API
// ============================================================================

export const clientsApi = {
  getClients: async (): Promise<ClientWithStats[]> => {
    const response = await api.get<ClientWithStats[]>('/clients');
    return response.data;
  },

  getClient: async (id: number): Promise<Client> => {
    const response = await api.get<Client>(`/clients/${id}`);
    return response.data;
  },

  createClient: async (data: CreateClientRequest): Promise<{ client_id: number; message: string }> => {
    const response = await api.post('/clients', data);
    return response.data;
  },

  updateClient: async (id: number, data: UpdateClientRequest): Promise<{ message: string }> => {
    const response = await api.put(`/clients/${id}`, data);
    return response.data;
  },

  deleteClient: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/clients/${id}`);
    return response.data;
  },

  toggleClientStatus: async (id: number): Promise<{ message: string }> => {
    const response = await api.patch(`/clients/${id}/status`);
    return response.data;
  },
};

// ============================================================================
// URLS API
// ============================================================================

export const urlsApi = {
  getUrls: async (clientId?: number): Promise<MonitoredUrl[]> => {
    const response = await api.get<MonitoredUrl[]>('/urls', {
      params: clientId ? { client_id: clientId } : {},
    });
    return response.data;
  },

  getUrl: async (id: number): Promise<MonitoredUrl> => {
    const response = await api.get<MonitoredUrl>(`/urls/${id}`);
    return response.data;
  },

  createUrl: async (data: CreateUrlRequest): Promise<{ url_id: number; message: string }> => {
    const response = await api.post('/urls', data);
    return response.data;
  },

  updateUrl: async (id: number, data: UpdateUrlRequest): Promise<{ message: string }> => {
    const response = await api.put(`/urls/${id}`, data);
    return response.data;
  },

  deleteUrl: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/urls/${id}`);
    return response.data;
  },

  toggleUrlActive: async (id: number): Promise<{ message: string }> => {
    const response = await api.patch(`/urls/${id}/active`);
    return response.data;
  },

  toggleUrlHasTest: async (id: number): Promise<{ message: string }> => {
    const response = await api.patch(`/urls/${id}/has-test`);
    return response.data;
  },
};

// ============================================================================
// BROWSERS API
// ============================================================================

export const browsersApi = {
  getBrowsers: async (): Promise<BrowserConfiguration[]> => {
    const response = await api.get<BrowserConfiguration[]>('/browsers');
    return response.data;
  },

  getBrowser: async (id: number): Promise<BrowserConfiguration> => {
    const response = await api.get<BrowserConfiguration>(`/browsers/${id}`);
    return response.data;
  },

  createBrowser: async (data: CreateBrowserConfigRequest): Promise<{ browser_id: number; message: string }> => {
    const response = await api.post('/browsers', data);
    return response.data;
  },

  updateBrowser: async (id: number, data: UpdateBrowserConfigRequest): Promise<{ message: string }> => {
    const response = await api.put(`/browsers/${id}`, data);
    return response.data;
  },

  deleteBrowser: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/browsers/${id}`);
    return response.data;
  },

  toggleBrowserActive: async (id: number): Promise<{ message: string }> => {
    const response = await api.patch(`/browsers/${id}/active`);
    return response.data;
  },
};

// ============================================================================
// FAILURES API
// ============================================================================

export const failuresApi = {
  getFailures: async (filters?: FailureFilters): Promise<FailureWithDetails[]> => {
    const response = await api.get<FailureWithDetails[]>('/failures', {
      params: filters,
    });
    return response.data;
  },

  getFailure: async (id: number): Promise<FailureWithDetails> => {
    const response = await api.get<FailureWithDetails>(`/failures/${id}`);
    return response.data;
  },

  updateFailureStatus: async (id: number, data: UpdateFailureStatusRequest): Promise<{ message: string }> => {
    const response = await api.patch(`/failures/${id}/status`, data);
    return response.data;
  },

  updateFailureNotes: async (id: number, notes: string): Promise<{ message: string }> => {
    const response = await api.patch(`/failures/${id}/notes`, { notes });
    return response.data;
  },

  bulkUpdateFailures: async (data: BulkUpdateFailuresRequest): Promise<{ message: string }> => {
    const response = await api.post('/failures/bulk-status', data);
    return response.data;
  },

  getTestIds: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/failures/filters/test-ids');
    return response.data;
  },

  getErrorTypes: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/failures/filters/error-types');
    return response.data;
  },

  getBrowserFilters: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/failures/filters/browsers');
    return response.data;
  },

  getScreenshotUrl: (id: number): string => {
    return `${api.defaults.baseURL}/failures/${id}/screenshot`;
  },
};

// ============================================================================
// MONITORING API
// ============================================================================

export const monitoringApi = {
  triggerMonitoring: async (): Promise<{ message: string; runId: number }> => {
    const response = await api.post('/monitoring/trigger');
    return response.data;
  },

  getMonitoringRuns: async (limit?: number): Promise<MonitoringRun[]> => {
    const response = await api.get<MonitoringRun[]>('/monitoring/runs', {
      params: limit ? { limit } : {},
    });
    return response.data;
  },

  getMonitoringRun: async (id: number): Promise<MonitoringRunWithDetails> => {
    const response = await api.get<MonitoringRunWithDetails>(`/monitoring/runs/${id}`);
    return response.data;
  },

  getRunChecks: async (runId: number): Promise<UrlCheck[]> => {
    const response = await api.get<UrlCheck[]>(`/monitoring/runs/${runId}/checks`);
    return response.data;
  },
};

// ============================================================================
// ANALYTICS API
// ============================================================================

export const analyticsApi = {
  getOverview: async (): Promise<OverviewStats> => {
    const response = await api.get<OverviewStats>('/analytics/overview');
    return response.data;
  },

  getTrends: async (days?: number): Promise<TrendData[]> => {
    const response = await api.get<TrendData[]>('/analytics/trends', {
      params: days ? { days } : {},
    });
    return response.data;
  },

  getByBrowser: async (): Promise<GroupedCount[]> => {
    const response = await api.get<GroupedCount[]>('/analytics/by-browser');
    return response.data;
  },

  getByClient: async (): Promise<GroupedCount[]> => {
    const response = await api.get<GroupedCount[]>('/analytics/by-client');
    return response.data;
  },

  getByErrorType: async (): Promise<GroupedCount[]> => {
    const response = await api.get<GroupedCount[]>('/analytics/by-error-type');
    return response.data;
  },

  getByTestId: async (): Promise<GroupedCount[]> => {
    const response = await api.get<GroupedCount[]>('/analytics/by-test-id');
    return response.data;
  },

  getTopErrors: async (limit?: number): Promise<GroupedCount[]> => {
    const response = await api.get<GroupedCount[]>('/analytics/top-errors', {
      params: limit ? { limit } : {},
    });
    return response.data;
  },

  getClientStats: async (clientId: number): Promise<any> => {
    const response = await api.get(`/analytics/client/${clientId}`);
    return response.data;
  },

  getUrlStats: async (urlId: number): Promise<any> => {
    const response = await api.get(`/analytics/url/${urlId}`);
    return response.data;
  },
};

export default api;
