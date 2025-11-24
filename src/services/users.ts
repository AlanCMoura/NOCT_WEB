import { api } from './api';

export type UserRoleApi = 'ADMIN' | 'GERENTE' | 'INSPETOR' | string;
export type SortDirection = 'ASC' | 'DESC';

export interface ApiUser {
  id: number;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  cpf?: string;
  role?: UserRoleApi;
  twoFactorEnabled?: boolean;
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

export interface ListUsersParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: SortDirection;
  role?: UserRoleApi;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  cpf?: string;
  password?: string;
  role?: UserRoleApi;
  twoFactorEnabled?: boolean;
  [key: string]: unknown;
}

export const listUsers = async (params: ListUsersParams = {}): Promise<ApiPage<ApiUser>> => {
  const { page = 0, size = 20, sortBy = 'id', sortDirection = 'ASC', role } = params;
  const endpoint = role ? `/users/by-role/${role}` : '/users';

  const { data } = await api.get<ApiPage<ApiUser>>(endpoint, {
    params: { page, size, sortBy, sortDirection },
  });

  return data;
};

export const getUserById = async (id: number | string): Promise<ApiUser> => {
  const { data } = await api.get<ApiUser>(`/users/${id}`);
  return data;
};

export const updateUserById = async (
  id: number | string,
  payload: UpdateUserPayload
): Promise<ApiUser> => {
  const { data } = await api.put<ApiUser>(`/users/${id}`, payload);
  return data;
};

export const deleteUserById = async (id: number | string): Promise<void> => {
  await api.delete(`/users/${id}`);
};
