import axios from 'axios';
import { api } from './api';

export type OperationStatusApi = string;
export type SortDirection = 'ASC' | 'DESC';

export interface ApiOperation {
  id?: string | number;
  ctv?: string;
  amv?: string;
  code?: string;
  reservation?: string;
  reserva?: string;
  booking?: string;
  bookingCode?: string;
  shipName?: string;
  navio?: string;
  vessel?: string;
  vesselName?: string;
  cliente?: string;
  exporter?: string;
  destination?: string;
  terminal?: string;
  refClient?: string;
  arrivalDate?: string;
  loadDeadline?: string;
  deadlineDraft?: string;
  status?: OperationStatusApi;
  createdAt?: string;
  updatedAt?: string;
  deadline?: string;
  data?: string;
  entrega?: string;
  ship?: string;
  containerCount?: number;
  containers?: unknown[];
  containerList?: unknown[];
  [key: string]: unknown;
}

export interface SackImage {
  id?: string | number;
  url?: string;
  imageUrl?: string;
  signedUrl?: string;
  [key: string]: unknown;
}

export interface ApiPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first?: boolean;
  last?: boolean;
  numberOfElements?: number;
}

export interface ListOperationsParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: SortDirection;
  status?: string;
}

export interface CreateOperationPayload {
  ctv?: string;
  ship?: string;
  terminal?: string;
  deadlineDraft?: string;
  destination?: string;
  arrivalDate?: string;
  reservation?: string;
  refClient?: string;
  loadDeadline?: string;
  exporter?: string;
  [key: string]: unknown;
}

export interface UpdateOperationPayload {
  ctv?: string;
  ship?: string;
  terminal?: string;
  deadlineDraft?: string;
  destination?: string;
  arrivalDate?: string;
  reservation?: string;
  refClient?: string;
  loadDeadline?: string;
  exporter?: string;
  [key: string]: unknown;
}

export const listOperations = async (
  params: ListOperationsParams = {}
): Promise<ApiPage<ApiOperation>> => {
  const { page = 0, size = 20, sortBy = 'id', sortDirection = 'ASC', status } = params;
  const endpoint = status ? `/operations/by-status/${status}` : '/operations';

  const { data } = await api.get<ApiPage<ApiOperation>>(endpoint, {
    params: { page, size, sortBy, sortDirection },
  });

  return data;
};

export const createOperation = async (payload: CreateOperationPayload): Promise<ApiOperation> => {
  const { data } = await api.post<ApiOperation>('/operations', payload);
  return data;
};

export const getOperationById = async (id: string | number): Promise<ApiOperation> => {
  const { data } = await api.get<ApiOperation>(`/operations/${id}`);
  return data;
};

export const updateOperation = async (
  id: string | number,
  payload: UpdateOperationPayload
): Promise<ApiOperation> => {
  const { data } = await api.put<ApiOperation>(`/operations/${id}`, payload);
  return data;
};

export const deleteOperation = async (id: string | number): Promise<void> => {
  await api.delete(`/operations/${id}`);
};

export const completeOperationStatus = async (operationId: string | number): Promise<ApiOperation> => {
  const { data } = await api.patch<ApiOperation>(`/operations/${operationId}/status`);
  return data;
};

export const getSackImages = async (
  operationId: string | number,
  expirationMinutes = 60
): Promise<SackImage[]> => {
  try {
    const { data } = await api.get<SackImage[]>(`/operations/${operationId}/sack-images`, {
      params: { expirationMinutes },
    });
    return data;
  } catch (error) {
    // Alguns ambientes expõem apenas o endpoint legado com underscore.
    if (axios.isAxiosError(error)) {
      try {
        const { data } = await api.get<string[]>(`/operations/${operationId}/sack_images`);
        return (data || []).map((url) => ({ url }));
      } catch (fallbackError) {
        throw fallbackError;
      }
    }
    throw error;
  }
};

export const uploadSackImages = async (
  operationId: string | number,
  files: File[]
): Promise<void> => {
  const form = new FormData();
  files.forEach((file) => form.append('sackImages', file));
  // Não definimos Content-Type manualmente para permitir que o navegador adicione o boundary corretamente.
  try {
    await api.post(`/operations/${operationId}/sack-images`, form);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Fallback para rota legada com underscore, caso esteja habilitada.
      await api.post(`/operations/${operationId}/sack_images`, form);
      return;
    }
    throw error;
  }
};

export const deleteSackImage = async (operationId: string | number, imageId: string | number): Promise<void> => {
  await api.delete(`/operations/${operationId}/sack-images/${imageId}`);
};
