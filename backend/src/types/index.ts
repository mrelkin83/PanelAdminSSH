// Types para la aplicación

export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  privateKey?: string;
  password?: string;
  timeout?: number;
  keepaliveInterval?: number;
}

export interface SSHCommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  code: number;
}

export interface ADMRufuUserData {
  username: string;
  password: string;
  expirationDate: string;
  daysRemaining: number;
  isActive: boolean;
  isBlocked: boolean;
  connectionLimit?: number;
}

export interface ADMRufuConnectionData {
  username: string;
  ipAddress: string;
  connectedAt: string;
  protocol: string;
}

export interface ADMRufuCreatedUserData {
  serverIp: string;
  username: string;
  token: string;
  expiresIn: string;
}

export interface CreateUserPayload {
  vpsId: string;
  username: string;
  alias?: string;
  password: string;
  days: number;
  maxConnections?: number;
  notes?: string;
}

export interface RenewUserPayload {
  days: number;
}

export interface VPSPayload {
  name: string;
  host: string;
  port: number;
  username: string;
  privateKey?: string;
  password?: string;
  location?: string;
  provider?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
}

export interface JWTPayload {
  id: string;
  email: string;
  role: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  vpsId?: string;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface BackupPayload {
  vpsId: string;
  sshUserId?: string;
  backupType: 'full' | 'single_user';
  notes?: string;
}

export interface VPSStatus {
  isOnline: boolean;
  cpuUsage?: number;
  memoryUsage?: number;
  diskUsage?: number;
  totalUsers?: number;
  activeConnections?: number;
  admRufuVersion?: string;
}

export interface DashboardStats {
  totalVPS: number;
  activeVPS: number;
  totalUsers: number;
  activeUsers: number;
  expiredUsers: number;
  totalConnections: number;
  recentActions: number;
}

export interface ErrorResponse {
  success: false;
  error: string;
  details?: any;
}

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;
