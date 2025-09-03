import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAuthToken } from '../services/api';

// DESABILITAR AUTENTICAÇÃO (DEV)
// Altere para false quando quiser reativar ou use REACT_APP_DISABLE_AUTH
const DISABLE_AUTH = (process.env.REACT_APP_DISABLE_AUTH ?? 'true') === 'true';

export interface UserMeDTO {
  id: number;
  cpf: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  twoFactorEnabled: boolean;
}

interface LoginResponseDTO {
  cpf: string;
  twoFactorEnabled: boolean;
  token: string; // real token or temp token depending on 2FA
}

interface TwoFAResponseDTO {
  cpf: string;
  token: string; // final token
  status: string; // "authenticated"
}

type LoginParams = { cpf: string; password: string };

interface AuthContextValue {
  user: UserMeDTO | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  twoFactorRequired: boolean;
  login: (params: LoginParams) => Promise<void>;
  verify2FA: (code: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Atalho de desenvolvimento: ignora completamente autenticação e devolve um usuário fake
  if (DISABLE_AUTH) {
    const dummyUser: UserMeDTO = {
      id: 1,
      cpf: '123.456.789-00',
      firstName: 'Dev',
      lastName: 'User',
      email: 'dev@example.com',
      role: 'Administrador',
      twoFactorEnabled: false,
    };

    const value: AuthContextValue = {
      user: dummyUser,
      token: null,
      isAuthenticated: true,
      loading: false,
      error: null,
      twoFactorRequired: false,
      login: async () => {},
      verify2FA: async () => {},
      logout: () => {},
      refreshMe: async () => {},
    };

    return (
      <AuthContext.Provider value={value}>
        {children}
      </AuthContext.Provider>
    );
  }
  const [user, setUser] = useState<UserMeDTO | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [twoFactorRequired, setTwoFactorRequired] = useState<boolean>(false);
  const [tempToken, setTempToken] = useState<string | null>(null);

  const refreshMe = useCallback(async () => {
    if (!localStorage.getItem('authToken')) return;
    try {
      const { data } = await api.get<UserMeDTO>('/auth/me');
      setUser(data);
    } catch (err) {
      // On failure, force logout to keep state consistent
      console.error('Failed to fetch /auth/me', err);
      logout();
    }
  }, []);

  useEffect(() => {
    // Initialize from stored token
    const saved = localStorage.getItem('authToken');
    if (saved) {
      setToken(saved);
      setAuthToken(saved);
      refreshMe().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshMe]);

  const login = useCallback(async ({ cpf, password }: LoginParams) => {
    setError(null);
    // Enviar CPF com a formatação informada (não remover máscara)
    try {
      const { data } = await api.post<LoginResponseDTO>('/auth/login', { cpf, password });
      if (data.twoFactorEnabled) {
        // Store temp token for verifying 2FA
        setTwoFactorRequired(true);
        setTempToken(data.token);
      } else {
        // Authenticated directly
        setAuthToken(data.token);
        setToken(data.token);
        await refreshMe();
      }
    } catch (err: any) {
      console.error('Login failed', err);
      setError('Falha no login. Verifique suas credenciais.');
      throw err;
    }
  }, [refreshMe]);

  const verify2FA = useCallback(async (code: string) => {
    if (!tempToken) throw new Error('Token temporário ausente. Refaça o login.');
    setError(null);
    try {
      // For verification, send the temp token explicitly
      const { data } = await api.post<TwoFAResponseDTO>(
        '/auth/verify',
        { code },
        { headers: { Authorization: `Bearer ${tempToken}` } }
      );
      setTwoFactorRequired(false);
      setTempToken(null);
      setAuthToken(data.token);
      setToken(data.token);
      await refreshMe();
    } catch (err: any) {
      console.error('2FA verification failed', err);
      setError('Código 2FA inválido. Tente novamente.');
      throw err;
    }
  }, [tempToken, refreshMe]);

  const logout = useCallback(() => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    setTwoFactorRequired(false);
    setTempToken(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    isAuthenticated: Boolean(token),
    loading,
    error,
    twoFactorRequired,
    login,
    verify2FA,
    logout,
    refreshMe,
  }), [user, token, loading, error, twoFactorRequired, login, verify2FA, logout, refreshMe]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
};
