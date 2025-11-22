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

export interface RegisterUserResponse {
  message: string;
  cpf: string;
  twoFactorEnabled?: boolean;
  totpSecret?: string;
  qrCodeDataUri?: string;
}

export interface TotpSetupResponse {
  secret: string;
  qrCodeDataUri: string;
  message: string;
}

const DEFAULT_SUCCESS = 'Usuário registrado com sucesso';
const DEFAULT_ERROR = 'Não foi possível concluir o cadastro. Tente novamente.';
const DEFAULT_2FA_ERROR = 'Não foi possível iniciar a configuração de 2FA.';

export async function registerUser(payload: RegisterUserPayload): Promise<RegisterUserResponse> {
  try {
    const { data } = await api.post('/auth/register', payload);

    if (typeof data === 'string') {
      return {
        message: data || DEFAULT_SUCCESS,
        cpf: payload.cpf,
        twoFactorEnabled: payload.twoFactorEnabled,
      };
    }

    if (data && typeof data === 'object') {
      const {
        message = DEFAULT_SUCCESS,
        cpf,
        twoFactorEnabled,
        totpSecret,
        qrCodeDataUri,
      } = data as Partial<RegisterUserResponse>;

      return {
        message,
        cpf: cpf ?? payload.cpf,
        twoFactorEnabled,
        totpSecret,
        qrCodeDataUri,
      };
    }

    return {
      message: DEFAULT_SUCCESS,
      cpf: payload.cpf,
      twoFactorEnabled: payload.twoFactorEnabled,
    };
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

// Mantém para cenários em que o usuário logado precisa gerar um novo QR code
export async function setupTwoFactorAuth(): Promise<TotpSetupResponse> {
  try {
    const { data } = await api.post<TotpSetupResponse>('/auth/2fa/setup');

    if (data && typeof data === 'object' && 'secret' in data && 'qrCodeDataUri' in data) {
      return {
        secret: data.secret,
        qrCodeDataUri: data.qrCodeDataUri,
        message: data.message || 'Escaneie o QR Code com seu aplicativo Authenticator',
      };
    }

    throw new Error('Resposta inesperada do servidor ao configurar 2FA.');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const responseData = error.response?.data;
      const statusPrefix = error.response?.status ? `[${error.response.status}] ` : '';

      if (typeof responseData === 'string' && responseData.trim()) {
        throw new Error(`${statusPrefix}${responseData}`);
      }

      if (responseData && typeof responseData === 'object') {
        const { message, error: errorMsg } = responseData as { message?: string; error?: string };
        if (message || errorMsg) {
          throw new Error(`${statusPrefix}${message ?? errorMsg}`);
        }
      }

      if (error.response?.statusText) {
        throw new Error(`${statusPrefix}${error.response.statusText}`);
      }
    }

    throw new Error(DEFAULT_2FA_ERROR);
  }
}
