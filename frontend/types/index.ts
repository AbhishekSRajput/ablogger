// Database entity types
export interface AdminUser {
  adminId: number;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  lastLogin: Date | null;
}

export interface Client {
  clientId: number;
  clientName: string;
  companyName: string | null;
  email: string | null;
  contactPerson: string | null;
  createdAt: Date;
  isActive: boolean;
  notes: string | null;
}

export interface MonitoredUrl {
  urlId: number;
  clientId: number;
  url: string;
  urlLabel: string | null;
  isActive: boolean;
  hasActiveTest: boolean;
  lastCheckedAt: Date | null;
  createdAt: Date;
  notes: string | null;
}

export interface BrowserConfiguration {
  configId: number;
  browserName: string;
  browserVersion: string | null;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  operatingSystem: string | null;
  viewportWidth: number | null;
  viewportHeight: number | null;
  userAgent: string | null;
  isActive: boolean;
}

export interface MonitoringRun {
  runId: number;
  startedAt: Date;
  completedAt: Date | null;
  totalUrlsChecked: number;
  totalErrorsFound: number;
  status: 'running' | 'completed' | 'failed';
  triggeredBy: 'cron' | 'manual';
}

export interface UrlCheck {
  checkId: number;
  runId: number;
  urlId: number;
  configId: number;
  checkedAt: Date;
  pageLoadTimeMs: number | null;
  cookieFound: boolean;
  errorDetected: boolean;
  checkStatus: 'success' | 'timeout' | 'error';
  errorMessage: string | null;
}

export interface DetectedFailure {
  failureId: number;
  checkId: number;
  urlId: number;
  clientId: number;
  testId: string;
  variant: string;
  errorType: string;
  errorMessage: string;
  browserFromCookie: string | null;
  timestampFromCookie: Date | null;
  detectedAt: Date;
  resolutionStatus: 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'ignored';
  resolvedAt: Date | null;
  resolvedBy: number | null;
  resolutionNotes: string | null;
}

export interface FailureScreenshot {
  screenshotId: number;
  failureId: number;
  filePath: string;
  capturedAt: Date;
}

// Cookie error data format
export interface ABTestErrorCookie {
  testId: string;
  variant: string;
  errorType: string;
  errorMessage: string;
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
    adminId: number;
    username: string;
    email: string;
  };
}

export interface CreateAdminRequest {
  username: string;
  email: string;
  password: string;
}

export interface CreateClientRequest {
  clientName: string;
  companyName?: string;
  email?: string;
  contactPerson?: string;
  notes?: string;
}

export interface UpdateClientRequest {
  clientName?: string;
  companyName?: string;
  email?: string;
  contactPerson?: string;
  isActive?: boolean;
  notes?: string;
}

export interface CreateUrlRequest {
  clientId: number;
  url: string;
  urlLabel?: string;
  isActive?: boolean;
  hasActiveTest?: boolean;
  notes?: string;
}

export interface UpdateUrlRequest {
  url?: string;
  urlLabel?: string;
  isActive?: boolean;
  hasActiveTest?: boolean;
  notes?: string;
}

export interface CreateBrowserConfigRequest {
  browserName: string;
  browserVersion?: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  operatingSystem?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  userAgent?: string;
  isActive?: boolean;
}

export interface UpdateBrowserConfigRequest {
  browserName?: string;
  browserVersion?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  operatingSystem?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  userAgent?: string;
  isActive?: boolean;
}

export interface UpdateFailureStatusRequest {
  resolutionStatus: 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'ignored';
  resolutionNotes?: string;
}

export interface BulkUpdateFailuresRequest {
  failureIds: number[];
  resolutionStatus: 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'ignored';
}

export interface FailureFilters {
  clientId?: number;
  urlId?: number;
  testId?: string;
  errorType?: string;
  resolutionStatus?: string;
  dateFrom?: string;
  dateTo?: string;
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
  urlCount: number;
  recentFailureCount: number;
}

export interface FailureWithDetails extends DetectedFailure {
  clientName: string;
  url: string;
  browserName: string;
  deviceType: string;
  screenshotPath: string | null;
}

export interface MonitoringRunWithDetails extends MonitoringRun {
  checks: UrlCheck[];
}

// JWT payload
export interface JwtPayload {
  adminId: number;
  username: string;
  email: string;
}
