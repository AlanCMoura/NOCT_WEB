import axios from 'axios';
import { api } from './api';

export interface MonthlyTrendDTO {
  month: string;
  year: number;
  monthNumber: number;
  operations: number;
  containers: number;
}

export interface TerminalCountDTO {
  terminal: string;
  count: number;
}

export interface RecentOperationDTO {
  id: number;
  ctv: string;
  reservation: string;
  status: string;
  containerCount: number;
  createdAt: string;
}

export interface DashboardMetricsDTO {
  totalOperations: number;
  openOperations: number;
  completedOperations: number;
  totalContainers: number;
  averageContainersPerOperation: number;
  completionRate: number;
  monthlyTrend: MonthlyTrendDTO[];
  topTerminals: TerminalCountDTO[];
  recentOperations: RecentOperationDTO[];
}

const DEFAULT_DASHBOARD_METRICS_PATH =
  process.env.REACT_APP_DASHBOARD_METRICS_PATH || '/dashboard/metrics';

export const getDashboardMetrics = async (): Promise<DashboardMetricsDTO> => {
  try {
    const { data } = await api.get<DashboardMetricsDTO>(DEFAULT_DASHBOARD_METRICS_PATH);
    return data;
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 404 &&
      DEFAULT_DASHBOARD_METRICS_PATH !== '/dashboard'
    ) {
      const { data } = await api.get<DashboardMetricsDTO>('/dashboard');
      return data;
    }
    throw error;
  }
};
