import axios from 'axios';
import { api } from './api';
import type { ApiPage, SortDirection } from './operations';

export interface AuditLog {
  id?: number | string;
  action?: string;
  entityType?: string;
  entityId?: number | string;
  userCpf?: string;
  userName?: string;
  username?: string;
  createdAt?: string;
  timestamp?: string;
  details?: string;
  description?: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
  [key: string]: unknown;
}

export interface ListAuditLogsParams {
  entityType?: string;
  entityId?: string;
  userCpf?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
  sortBy?: 'createdAt' | 'action' | 'entityType' | 'userCpf' | 'entityId';
  sortDirection?: SortDirection;
}

export const formatAuditApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === 'string' && data.trim()) return data;
    if (data && typeof data === 'object') {
      const payload = data as { message?: string; error?: string; detail?: string };
      const message = payload.message || payload.error || payload.detail;
      if (message) return message;
    }
    if (error.response?.status === 403) return 'Usuario sem permissao para consultar auditoria.';
    if (error.response?.status) return `HTTP ${error.response.status}: ${error.message}`;
    return error.message;
  }

  return error instanceof Error ? error.message : 'Nao foi possivel carregar os logs de auditoria.';
};

export const listAuditLogs = async (params: ListAuditLogsParams = {}): Promise<ApiPage<AuditLog>> => {
  const cleanParams = Object.fromEntries(
    Object.entries({
      page: params.page ?? 0,
      size: params.size ?? 20,
      sortBy: params.sortBy ?? 'createdAt',
      sortDirection: params.sortDirection ?? 'DESC',
      entityType: params.entityType?.trim() || undefined,
      entityId: params.entityId?.trim() || undefined,
      userCpf: params.userCpf?.trim() || undefined,
      startDate: params.startDate || undefined,
      endDate: params.endDate || undefined,
    }).filter(([, value]) => value !== undefined && value !== '')
  );

  const { data } = await api.get<ApiPage<AuditLog>>('/api/audit-logs', {
    params: cleanParams,
  });

  return data;
};
