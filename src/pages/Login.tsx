import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle, Eye, EyeOff, Lock, Shield, User } from 'lucide-react';
import axios from 'axios';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface LoginFormData {
  cpf: string;
  password: string;
}

interface LoginResponse {
  cpf: string;
  twoFactorEnabled?: boolean;
  requiresTwoFactor?: boolean;
  twoFactorRequired?: boolean;
  token?: string;
  tempToken?: string;
  message?: string;
  error?: string;
  [key: string]: unknown;
}

interface TwoFAResponse {
  cpf: string;
  token?: string;
  status?: string;
}

const parsePossibleJson = (raw: unknown): Record<string, unknown> | string => {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return (raw as Record<string, unknown>) ?? {};
};

const extractTempToken = (payload: Record<string, unknown>): string | null => {
  const keys = ['tempToken', 'temp_token', 'temporaryToken', 'temporary_token', 'token'];
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
};

const extractAuthToken = (payload: Record<string, unknown>): string | null => {
  const keys = ['token', 'accessToken', 'jwt', 'bearerToken'];
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
};

const extractServerMessage = (payload: Record<string, unknown>): string | null => {
  const keys = ['message', 'error', 'detail'];
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
};

const toBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['true', '1', 'yes', 'y'].includes(normalized);
  }
  if (typeof value === 'number') return value === 1;
  return false;
};

const LOGIN_HIGHLIGHTS = [
  {
    title: 'Seguranca empresarial',
    description: 'Autenticacao robusta e controle de acesso avancado.',
    icon: Shield,
  },
  {
    title: 'Gestao centralizada',
    description: 'Controle total de operacoes e relatorios detalhados.',
    icon: Building2,
  },
  {
    title: 'Auditoria completa',
    description: 'Rastreabilidade total e conformidade garantida.',
    icon: CheckCircle,
  },
  {
    title: 'Relatorios avancados',
    description: 'Analytics detalhados e insights estrategicos.',
    icon: Building2,
  },
] as const;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login: persistSession, refreshUser } = useAuth();
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [twoFactorRequired, setTwoFactorRequired] = useState<boolean>(false);
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState<string>('');

  const [loginData, setLoginData] = useState<LoginFormData>({
    cpf: '',
    password: '',
  });

  const formatCPF = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    }
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const resetTwoFactorState = () => {
    setTwoFactorRequired(false);
    setTwoFactorToken(null);
    setTwoFactorCode('');
  };

  const finalizeAuthenticatedSession = async (token: string) => {
    persistSession(token);
    try {
      await refreshUser();
    } catch (error) {
      console.warn('Nao foi possivel atualizar o usuario autenticado', error);
    }
    navigate('/dashboard');
  };

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    if (name === 'cpf') {
      setLoginData((prev) => ({ ...prev, cpf: formatCPF(value) }));
      return;
    }

    setLoginData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTwoFactorCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
    setTwoFactorCode(digits);
  };

  const handleLoginSubmit = async (): Promise<void> => {
    setLoginError(null);
    resetTwoFactorState();

    const sanitizedCpf = loginData.cpf.replace(/\D/g, '');
    const password = loginData.password.trim();

    if (sanitizedCpf.length !== 11 || !password) {
      setLoginError('Informe um CPF valido (11 digitos) e a senha.');
      return;
    }

    setIsLoading(true);

    try {
      const { data } = await api.post<LoginResponse>('/auth/login', {
        cpf: loginData.cpf.trim(),
        password,
      });

      const parsed = parsePossibleJson(data);
      const dataObject = typeof parsed === 'string' ? { message: parsed } : parsed;

      const temp = extractTempToken(dataObject);
      const authToken = extractAuthToken(dataObject);
      const requiresTwoFactor =
        toBoolean((dataObject as LoginResponse).requiresTwoFactor) ||
        toBoolean((dataObject as LoginResponse).twoFactorRequired) ||
        toBoolean((dataObject as LoginResponse).twoFactorEnabled);

      if (authToken && !requiresTwoFactor) {
        await finalizeAuthenticatedSession(authToken);
        return;
      }

      if (requiresTwoFactor && temp) {
        setTwoFactorRequired(true);
        setTwoFactorToken(temp);
        setTwoFactorCode('');
        return;
      }

      if (requiresTwoFactor) {
        const serverMessage = extractServerMessage(dataObject);
        setLoginError(serverMessage || 'Nao foi possivel iniciar a verificacao em duas etapas. Tente novamente.');
        return;
      }

      setLoginError('Nao foi possivel autenticar. Verifique seu CPF e senha.');
    } catch (error) {
      console.error('Erro ao autenticar usuario', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          setLoginError('Credenciais invalidas. Verifique seu CPF e senha.');
        } else if (typeof error.response?.data === 'string' && error.response.data.trim()) {
          setLoginError(error.response.data);
        } else {
          setLoginError('Erro ao autenticar. Tente novamente.');
        }
      } else {
        setLoginError('Erro ao autenticar. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (): Promise<void> => {
    if (!twoFactorToken) {
      setLoginError('Token temporario ausente. Faca login novamente.');
      return;
    }

    if (twoFactorCode.length < 6) {
      setLoginError('Informe o codigo de 6 digitos do autenticador.');
      return;
    }

    setIsVerifying(true);
    setLoginError(null);

    try {
      const { data } = await api.post<TwoFAResponse>(
        '/auth/verify',
        { code: Number(twoFactorCode) || twoFactorCode },
        {
          headers: {
            Authorization: `Bearer ${twoFactorToken}`,
          },
        }
      );

      if (data?.token && (data.status === 'authenticated' || !data.status || data.status === 'success')) {
        resetTwoFactorState();
        await finalizeAuthenticatedSession(data.token);
        return;
      }

      if (data?.status === 'invalid_code') {
        setLoginError('Codigo 2FA invalido. Tente novamente.');
        return;
      }

      setLoginError('Nao foi possivel concluir a verificacao. Tente novamente.');
    } catch (error) {
      console.error('Erro ao verificar codigo 2FA', error);

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setLoginError('Codigo 2FA invalido. Tente novamente.');
      } else {
        setLoginError('Nao foi possivel concluir a verificacao. Tente novamente.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const isTwoFactorStep = twoFactorRequired && !!twoFactorToken;
  const primaryAction = isTwoFactorStep ? handleTwoFactorSubmit : handleLoginSubmit;
  const primaryLoading = isTwoFactorStep ? isVerifying : isLoading;
  const primaryIdleLabel = isTwoFactorStep ? 'VALIDAR CODIGO' : 'ENTRAR';
  const primaryLoadingLabel = isTwoFactorStep ? 'Validando...' : 'Entrando...';

  return (
    <div className="min-h-screen bg-[var(--surface)] lg:grid lg:grid-cols-2">
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-slate-900 text-white">
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-5">
            <div className="grid h-full w-full grid-cols-8 grid-rows-10 sm:grid-cols-12 sm:grid-rows-12">
              {Array.from({ length: 144 }).map((_, i) => (
                <div key={i} className="border border-white/20" />
              ))}
            </div>
          </div>
          <div className="absolute -right-8 top-10 h-24 w-24 rotate-12 rounded-2xl border border-[#49C5B6]/30 sm:right-20 sm:top-24 sm:h-40 sm:w-40" />
          <div className="absolute bottom-12 left-4 h-20 w-20 rounded-full bg-[#49C5B6]/10 sm:bottom-28 sm:left-16 sm:h-32 sm:w-32" />
          <div className="absolute right-10 top-1/2 hidden h-24 w-24 -rotate-6 rounded-lg border border-white/20 lg:block" />
        </div>

        <div className="relative z-10 flex h-full flex-col px-5 py-8 sm:px-8 sm:py-10 lg:justify-center lg:px-12 xl:px-16">
          <div className="mb-8 lg:mb-14">
            <div className="mb-6 flex items-center gap-4 sm:gap-5 lg:mb-8 lg:gap-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white p-2 shadow-lg sm:h-20 sm:w-20 lg:h-24 lg:w-24 lg:p-3">
                <img src="/assets/logo_.png" alt="ContainerView Logo" className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">ContainerView</h1>
                <p className="mt-1 text-sm font-medium text-slate-300 sm:text-base">Sistema de Gestao Empresarial</p>
              </div>
            </div>

            <div className="max-w-xl">
              <h2 className="mb-3 text-xl font-semibold text-[#49C5B6] sm:text-2xl">Bem-vindo de volta</h2>
              <p className="text-sm leading-relaxed text-slate-300 sm:text-base lg:text-lg">
                Acesse sua conta para gerenciar operacoes de conteineres com eficiencia, rastreabilidade e seguranca.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5 lg:gap-x-8 lg:gap-y-6">
            {LOGIN_HIGHLIGHTS.map(({ title, description, icon: Icon }) => (
              <div key={title} className="flex items-start gap-3 sm:gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#49C5B6]/20">
                  <Icon className="h-5 w-5 text-[#49C5B6]" />
                </div>
                <div>
                  <h4 className="mb-1 font-semibold">{title}</h4>
                  <p className="text-sm text-slate-300">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex min-h-[48vh] items-center justify-center px-4 py-6 sm:px-6 sm:py-8 lg:min-h-screen lg:px-10 lg:py-10 xl:px-14">
        <div className="w-full max-w-md lg:max-w-lg">
          <form
            className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl sm:p-7 lg:p-8"
            onSubmit={(e) => {
              e.preventDefault();
              if (!primaryLoading) primaryAction();
            }}
          >
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-12 -translate-y-12 rounded-full bg-[#49C5B6]/5" />

            <div className="relative z-10 mb-6 text-center sm:mb-8">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#49C5B6]">
                <Lock className="h-6 w-6 text-white" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-[var(--text)]">Acesso ao Sistema</h2>
              <p className="text-sm text-[var(--muted)]">Entre com suas credenciais para acessar o sistema</p>
            </div>

            <div className="space-y-5 sm:space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text)]">CPF</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <User className="h-5 w-5 text-[var(--muted)]" />
                  </div>
                  <input
                    name="cpf"
                    type="text"
                    inputMode="numeric"
                    maxLength={14}
                    required
                    value={loginData.cpf}
                    onChange={handleLoginChange}
                    className="block w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-3 pl-10 pr-3 text-[var(--text)] transition-colors focus:border-[#49C5B6] focus:outline-none focus:ring-2 focus:ring-[#49C5B6]"
                    placeholder="Digite seu CPF"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text)]">Senha</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-[var(--muted)]" />
                  </div>
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginData.password}
                    onChange={handleLoginChange}
                    className="block w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-3 pl-10 pr-10 text-[var(--text)] transition-colors focus:border-[#49C5B6] focus:outline-none focus:ring-2 focus:ring-[#49C5B6]"
                    placeholder="Digite sua senha"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-[var(--muted)] hover:text-[var(--muted)]" />
                    ) : (
                      <Eye className="h-5 w-5 text-[var(--muted)] hover:text-[var(--muted)]" />
                    )}
                  </button>
                </div>
              </div>

              {isTwoFactorStep && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-[#49C5B6]/30 bg-[#49C5B6]/10 px-4 py-3 text-sm text-[var(--text)]">
                    <p className="font-semibold">Validacao em duas etapas habilitada</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Digite o codigo de 6 digitos do seu aplicativo autenticador para finalizar o acesso.
                    </p>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--text)]">Codigo do autenticador</label>
                    <div className="relative">
                      <input
                        name="twoFactorCode"
                        inputMode="numeric"
                        maxLength={6}
                        pattern="[0-9]*"
                        autoComplete="one-time-code"
                        value={twoFactorCode}
                        onChange={handleTwoFactorCodeChange}
                        className="block w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-center text-lg tracking-[0.28em] text-[var(--text)] focus:border-[#49C5B6] focus:outline-none focus:ring-2 focus:ring-[#49C5B6] sm:tracking-[0.35em]"
                        placeholder="000000"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      resetTwoFactorState();
                      setLoginError(null);
                    }}
                    className="text-xs font-medium text-[#49C5B6] transition-colors hover:text-[#3ba394]"
                  >
                    Trocar usuario
                  </button>
                </div>
              )}

              {!isTwoFactorStep && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[var(--border)] bg-[var(--surface)] text-[#49C5B6] focus:ring-[#49C5B6]"
                    />
                    <span className="ml-2 text-sm text-[var(--muted)]">Lembrar-me</span>
                  </label>
                  <button
                    type="button"
                    className="text-left text-sm font-medium text-[#49C5B6] transition-colors hover:text-[#3ba394] sm:text-right"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              )}

              {loginError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={primaryLoading}
                className="w-full rounded-lg bg-[#49C5B6] px-6 py-3 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:bg-[#3ba394] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
              >
                {primaryLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="mr-2 h-5 w-5 animate-spin rounded-full border-b-2 border-white" />
                    {primaryLoadingLabel}
                  </div>
                ) : (
                  primaryIdleLabel
                )}
              </button>
            </div>
          </form>

          <div className="mt-5 text-center sm:mt-6">
            <p className="text-xs text-[var(--muted)]">© 2025 ContainerView. Todos os direitos reservados.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Login;
