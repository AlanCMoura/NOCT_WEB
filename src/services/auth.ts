import axios from 'axios';
import { api } from './api';

export interface RegisterUserPayload {
  firstName: string;
  lastName: string;
  cpf: string;
  email: string;
  password: string;
  role: string;
  twoFactorEnabled: boolean;
}

const DEFAULT_SUCCESS = 'Usuário registrado com sucesso';
const DEFAULT_ERROR = 'Não foi possível concluir o cadastro. Tente novamente.';

export async function registerUser(payload: RegisterUserPayload): Promise<string> {
  try {
    const { data } = await api.post('/auth/register', payload);

    if (typeof data === 'string') {
      return data || DEFAULT_SUCCESS;
    }

    if (data && typeof data === 'object' && 'message' in data) {
      const { message } = data as { message?: string };
      return message ?? DEFAULT_SUCCESS;
    }

    return DEFAULT_SUCCESS;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const { response } = error;
      const responseData = response?.data;
      const statusPrefix = response?.status ? `[${response.status}] ` : '';

      if (typeof responseData === 'string' && responseData.trim()) {
        throw new Error(`${statusPrefix}${responseData}`);
      }

      if (responseData && typeof responseData === 'object') {
        const message =
          (responseData as { message?: string; error?: string }).message ??
          (responseData as { message?: string; error?: string }).error;
        if (message) {
          throw new Error(`${statusPrefix}${message}`);
        }
      }

      if (response?.statusText) {
        throw new Error(`${statusPrefix}${response.statusText}`);
      }
    }

    throw new Error(DEFAULT_ERROR);
  }
}
