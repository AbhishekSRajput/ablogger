// Simple validation utilities

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidUsername(username: string): boolean {
  return username.length >= 3 && username.length <= 50 && /^[a-zA-Z0-9_]+$/.test(username);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

export function sanitizeString(str: string, maxLength: number = 255): string {
  return str.trim().substring(0, maxLength);
}

export function isPositiveInteger(value: any): boolean {
  return Number.isInteger(value) && value > 0;
}

export function isValidResolutionStatus(
  status: string
): status is 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'ignored' {
  return ['new', 'acknowledged', 'investigating', 'resolved', 'ignored'].includes(status);
}

export function isValidDeviceType(type: string): type is 'desktop' | 'mobile' | 'tablet' {
  return ['desktop', 'mobile', 'tablet'].includes(type);
}

export function isValidCheckStatus(status: string): status is 'success' | 'timeout' | 'error' {
  return ['success', 'timeout', 'error'].includes(status);
}
