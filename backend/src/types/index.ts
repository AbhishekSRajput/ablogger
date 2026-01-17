// Database entity types
export interface AdminUser {
  admin_id: number;
  username: string;
  email: string;
  password_hash: string;
  created_at: Date;
  last_login: Date | null;
}

export interface Client {
  client_id: number;
  client_name: string;
  company_name: string | null;
  email: string | null;
  contact_person: string | null;
  created_at: Date;
  is_active: boolean;
  notes: string | null;
}

export interface MonitoredUrl {
  url_id: number;
  client_id: number;
  url: string;
  url_label: string | null;
  is_active: boolean;
  has_active_test: boolean;
  last_checked_at: Date | null;
  created_at: Date;
  notes: string | null;
}

export interface BrowserConfiguration {
  config_id: number;
  browser_name: string;
  browser_version: string | null;
  device_type: 'desktop' | 'mobile' | 'tablet';
  operating_system: string | null;
  viewport_width: number | null;
  viewport_height: number | null;
  user_agent: string | null;
  is_active: boolean;
}

export interface MonitoringRun {
  run_id: number;
  started_at: Date;
  completed_at: Date | null;
  total_urls_checked: number;
  total_errors_found: number;
  status: 'running' | 'completed' | 'failed';
  triggered_by: 'cron' | 'manual';
}

export interface UrlCheck {
  check_id: number;
  run_id: number;
  url_id: number;
  config_id: number;
  checked_at: Date;
  page_load_time_ms: number | null;
  cookie_found: boolean;
  error_detected: boolean;
  check_status: 'success' | 'timeout' | 'error';
  error_message: string | null;
}

export interface DetectedFailure {
  failure_id: number;
  check_id: number;
  url_id: number;
  client_id: number;
  test_id: string;
  variant: string;
  error_type: string;
  error_message: string;
  browser_from_cookie: string | null;
  timestamp_from_cookie: Date | null;
  detected_at: Date;
  resolution_status: 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'ignored';
  resolved_at: Date | null;
  resolved_by: number | null;
  resolution_notes: string | null;
}

export interface FailureScreenshot {
  screenshot_id: number;
  failure_id: number;
  file_path: string;
  captured_at: Date;
}

// Cookie error data format
export interface ABTestErrorCookie {
  test_id: string;
  variant: string;
  error_type: string;
  error_message: string;
  browser: string;
  timestamp: string;
}

// Request/Response types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  admin: {
    admin_id: number;
    username: string;
    email: string;
  };
}

export interface CreateClientRequest {
  client_name: string;
  company_name?: string;
  email?: string;
  contact_person?: string;
  notes?: string;
}

export interface UpdateClientRequest {
  client_name?: string;
  company_name?: string;
  email?: string;
  contact_person?: string;
  is_active?: boolean;
  notes?: string;
}

export interface CreateUrlRequest {
  client_id: number;
  url: string;
  url_label?: string;
  is_active?: boolean;
  has_active_test?: boolean;
  notes?: string;
}

export interface UpdateUrlRequest {
  url?: string;
  url_label?: string;
  is_active?: boolean;
  has_active_test?: boolean;
  notes?: string;
}

export interface CreateBrowserConfigRequest {
  browser_name: string;
  browser_version?: string;
  device_type: 'desktop' | 'mobile' | 'tablet';
  operating_system?: string;
  viewport_width?: number;
  viewport_height?: number;
  user_agent?: string;
  is_active?: boolean;
}

export interface UpdateBrowserConfigRequest {
  browser_name?: string;
  browser_version?: string;
  device_type?: 'desktop' | 'mobile' | 'tablet';
  operating_system?: string;
  viewport_width?: number;
  viewport_height?: number;
  user_agent?: string;
  is_active?: boolean;
}

export interface UpdateFailureStatusRequest {
  resolution_status: 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'ignored';
  resolution_notes?: string;
}

export interface BulkUpdateFailuresRequest {
  failure_ids: number[];
  resolution_status: 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'ignored';
}

export interface FailureFilters {
  client_id?: number;
  url_id?: number;
  test_id?: string;
  error_type?: string;
  resolution_status?: string;
  date_from?: string;
  date_to?: string;
  browser?: string;
  page?: number;
  limit?: number;
}

// Browser check result
export interface BrowserCheckResult {
  success: boolean;
  pageLoadTimeMs: number | null;
  cookieFound: boolean;
  errorDetected: boolean;
  errorData: ABTestErrorCookie | null;
  screenshotPath: string | null;
  checkStatus: 'success' | 'timeout' | 'error';
  errorMessage: string | null;
}

// Analytics types
export interface OverviewStats {
  totalClients: number;
  totalUrls: number;
  failuresLast7Days: number;
  failuresLast30Days: number;
  failuresByStatus: {
    status: string;
    count: number;
  }[];
}

export interface TrendData {
  date: string;
  count: number;
}

export interface GroupedCount {
  label: string;
  count: number;
}

// Extended types with joins
export interface ClientWithStats extends Client {
  url_count: number;
  recent_failure_count: number;
}

export interface FailureWithDetails extends DetectedFailure {
  client_name: string;
  url: string;
  browser_name: string;
  device_type: string;
  screenshot_path: string | null;
}

export interface MonitoringRunWithDetails extends MonitoringRun {
  checks: UrlCheck[];
}

// JWT payload
export interface JwtPayload {
  admin_id: number;
  username: string;
  email: string;
}

// Express Request with user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
