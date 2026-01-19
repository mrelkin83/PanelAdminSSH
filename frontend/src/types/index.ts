// Types para el frontend

export interface Admin {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  admin: Admin;
}

export interface VPS {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  location?: string;
  provider?: string;
  isActive: boolean;
  status: string;
  version?: string;
  lastCheckAt?: string;
  createdAt: string;
  _count?: {
    sshUsers: number;
    connections: number;
  };
}

export interface SSHUser {
  id: string;
  vpsId: string;
  username: string;
  alias?: string;
  expiresAt: string;
  isBlocked: boolean;
  isActive: boolean;
  maxConnections?: number;
  notes?: string;
  createdAt: string;
  daysRemaining: number;
  vps: {
    id: string;
    name: string;
    host: string;
    location?: string;
    provider?: string;
  };
}

export interface Connection {
  id: string;
  vpsId: string;
  username: string;
  ipAddress: string;
  protocol?: string;
  connectedAt: string;
  disconnectedAt?: string;
  vps?: {
    id: string;
    name: string;
    host: string;
    location?: string;
    provider?: string;
  };
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

export interface ActionLog {
  id: string;
  action: string;
  status: string;
  details?: string;
  errorMessage?: string;
  createdAt: string;
  admin?: {
    name: string;
    email: string;
  };
  vps?: {
    name: string;
  };
  sshUser?: {
    username: string;
  };
}

export interface Backup {
  id: string;
  vpsId: string;
  backupType: string;
  notes?: string;
  createdAt: string;
  restoredAt?: string;
  vps: {
    name: string;
  };
  admin: {
    name: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any;
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

export interface CreateVPSPayload {
  name: string;
  host: string;
  port: number;
  username: string;
  privateKey: string;
  location?: string;
  provider?: string;
}
