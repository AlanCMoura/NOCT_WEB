import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User, Lock, Building2, Shield, CheckCircle } from 'lucide-react';
import { api, setAuthToken } from '../services/api';

interface LoginFormData {
  cpf: string;
  password: string;
}

interface LoginResponseBase {
  cpf: string;
  requiresTwoFactor?: boolean;
  twoFactorRequired?: boolean;
  twoFactorEnabled?: boolean;
}

interface LoginSuccessResponse extends LoginResponseBase {
  token: string;
}

interface LoginTwoFactorResponse extends LoginResponseBase {
  tempToken: string;
}

type LoginResponse = LoginSuccessResponse | LoginTwoFactorResponse;

interface TwoFAResponse {
  cpf: string;
  token?: string;
  status?: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [twoFactorRequired, setTwoFactorRequired] = useState<boolean>(false);
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState<string>('');

  const [loginData, setLoginData] = useState<LoginFormData>({
    cpf: '',
    password: ''
  });

  const formatCPF = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9)
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const resetTwoFactorState = () => {
    setTwoFactorRequired(false);
    setTwoFactorToken(null);
    setTwoFactorCode('');
  };

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    if (name === 'cpf') {
      setLoginData(prev => ({ ...prev, cpf: formatCPF(value) }));
      return;
    }
    setLoginData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTwoFactorCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
    setTwoFactorCode(digits);
  };

  const handleLoginSubmit = async (): Promise<void> => {
    setLoginError(null);
    resetTwoFactorState();

    const cpfDigits = loginData.cpf.replace(/\D/g, '');
    if (cpfDigits.length !== 11 || !loginData.password) {
      setLoginError('Informe um CPF válido (11 dígitos) e a senha.');
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await api.post<LoginResponse>('/auth/login', {
        cpf: loginData.cpf.trim(),
        password: loginData.password
      });

      const requiresTwoFactor =
        data.requiresTwoFactor ?? data.twoFactorRequired ?? data.twoFactorEnabled ?? false;

      if (requiresTwoFactor || 'tempToken' in data) {
        if ('tempToken' in data && data.tempToken) {
          setTwoFactorRequired(true);
          setTwoFactorToken(data.tempToken);
          setTwoFactorCode('');
          return;
        }
        setLoginError('Não foi possível iniciar a verificação em duas etapas. Tente novamente.');
        return;
      }

      if ('token' in data && data.token) {
        setAuthToken(data.token);
        navigate('/dashboard');
        return;
      }

      setLoginError('Não foi possível autenticar. Tente novamente.');
    } catch (error) {
      console.error('Erro ao autenticar usuário', error);
      setLoginError('Credenciais inválidas. Verifique seu CPF e senha.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (): Promise<void> => {
    if (!twoFactorToken) {
      setLoginError('Token temporário ausente. Faça login novamente.');
      return;
    }

    if (twoFactorCode.length < 6) {
      setLoginError('Informe o código de 6 dígitos do autenticador.');
      return;
    }

    setIsVerifying(true);
    setLoginError(null);

    try {
      const { data } = await api.post<TwoFAResponse>(
        '/auth/verify',
        { code: twoFactorCode },
        {
          headers: {
            Authorization: `Bearer ${twoFactorToken}`
          }
        }
      );

      if (data?.token) {
        setAuthToken(data.token);
        resetTwoFactorState();
        navigate('/dashboard');
        return;
      }

      setLoginError('Não foi possível concluir a verificação. Tente novamente.');
    } catch (error) {
      console.error('Erro ao verificar código 2FA', error);
      setLoginError('Código 2FA inválido. Tente novamente.');
    } finally {
      setIsVerifying(false);
    }
  };

  const isTwoFactorStep = twoFactorRequired && !!twoFactorToken;
  const primaryAction = isTwoFactorStep ? handleTwoFactorSubmit : handleLoginSubmit;
  const primaryLoading = isTwoFactorStep ? isVerifying : isLoading;
  const primaryIdleLabel = isTwoFactorStep ? 'VALIDAR CÓDIGO' : 'ENTRAR';
  const primaryLoadingLabel = isTwoFactorStep ? 'Validando...' : 'Entrando...';

  return (
    <div className="min-h-screen flex bg-[var(--surface)]">
      {/* Painel lateral esquerdo */}
      <div className="w-1/2 bg-gradient-to-br from-gray-900 via-gray-800 to-slate-900 relative overflow-hidden">
        {/* Elementos decorativos profissionais */}
        <div className="absolute inset-0">
          {/* Grid sutil */}
          <div className="absolute inset-0 opacity-5">
            <div className="grid grid-cols-12 grid-rows-12 h-full w-full">
              {Array.from({ length: 144 }).map((_, i) => (
                <div key={i} className="border border-white/20"></div>
              ))}
            </div>
          </div>
          
          {/* Formas geométricas elegantes */}
          <div className="absolute top-32 right-32 w-40 h-40 border border-[#49C5B6]/30 rounded-2xl transform rotate-12"></div>
          <div className="absolute bottom-40 left-20 w-32 h-32 bg-[#49C5B6]/10 rounded-full"></div>
          <div className="absolute top-1/2 right-16 w-24 h-24 border border-white/20 rounded-lg transform -rotate-6"></div>
        </div>
        
        {/* Conteúdo do painel */}
        <div className="relative z-10 flex flex-col justify-center items-start w-full p-16 text-white">
          {/* Logo e branding */}
          <div className="mb-16">
            <div className="flex items-center space-x-6 mb-8">
              <div className="w-24 h-24 bg-white backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg border border-white/20 p-3">
                <img 
                  src="/assets/logo_.png" 
                  alt="ContainerView Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-5xl font-bold tracking-tight">ContainerView</h1>
                <p className="text-[var(--muted)] font-medium mt-1">Sistema de Gestão Empresarial</p>
              </div>
            </div>
            
            <div className="max-w-md">
              <h2 className="text-2xl font-semibold mb-4 text-[#49C5B6]">
                Bem-vindo de volta
              </h2>
              <p className="text-[var(--muted)] text-lg leading-relaxed">
                Acesse sua conta para gerenciar operações de contêineres com máxima eficiência e segurança
              </p>
            </div>
          </div>

          {/* Benefícios corporativos */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 mb-12">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-[#49C5B6]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-[#49C5B6]" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Segurança Empresarial</h4>
                <p className="text-sm text-[var(--muted)]">Autenticação robusta e controle de acesso avançado</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-[#49C5B6]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-[#49C5B6]" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Gestão Centralizada</h4>
                <p className="text-sm text-[var(--muted)]">Controle total de operações e relatórios detalhados</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-[#49C5B6]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-[#49C5B6]" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Auditoria Completa</h4>
                <p className="text-sm text-[var(--muted)]">Rastreabilidade total e conformidade garantida</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-[#49C5B6]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-[#49C5B6]" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Relatórios Avançados</h4>
                <p className="text-sm text-[var(--muted)]">Analytics detalhados e insights estratégicos</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-[#49C5B6]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-[#49C5B6]" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Relatórios Avançados</h4>
                <p className="text-sm text-[var(--muted)]">Analytics detalhados e insights estratégicos</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-[#49C5B6]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-[#49C5B6]" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Relatórios Avançados</h4>
                <p className="text-sm text-[var(--muted)]">Analytics detalhados e insights estratégicos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Painel direito - Formulário */}
      <div className="w-1/2 flex items-center justify-center p-16">
        <div className="max-w-md w-full">
          {/* Card do formulário */}
          <div className="bg-[var(--surface)] rounded-2xl shadow-xl border border-[var(--border)] p-8 relative overflow-hidden">
            {/* Elemento decorativo */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#49C5B6]/5 rounded-full transform translate-x-12 -translate-y-12"></div>
            
            {/* Título do formulário */}
            <div className="text-center mb-8 relative z-10">
              <div className="w-12 h-12 bg-[#49C5B6] rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--text)] mb-2">
                Acesso ao Sistema
              </h2>
              <p className="text-[var(--muted)] text-sm">
                Entre com suas credenciais para acessar o sistema
              </p>
            </div>

            {/* Formulário de Login */}
            <div className="space-y-6">
              {/* CPF */}
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                  CPF
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
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
                    className="block w-full pl-10 pr-3 py-3 border border-[var(--border)] rounded-lg bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[#49C5B6] focus:border-[#49C5B6] transition-colors text-[var(--text)]"
                    placeholder="Digite seu CPF"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-[var(--muted)]" />
                  </div>
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginData.password}
                    onChange={handleLoginChange}
                    className="block w-full pl-10 pr-10 py-3 border border-[var(--border)] rounded-lg bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[#49C5B6] focus:border-[#49C5B6] transition-colors text-[var(--text)]"
                    placeholder="Digite sua senha"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
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
                    <p className="font-semibold">Validação em duas etapas habilitada</p>
                    <p className="text-xs text-[var(--muted)] mt-1">
                      Digite o código de 6 dígitos do seu aplicativo autenticador para finalizar o acesso.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text)] mb-2">
                      Código do autenticador
                    </label>
                    <div className="relative">
                      <input
                        name="twoFactorCode"
                        inputMode="numeric"
                        maxLength={6}
                        pattern="[0-9]*"
                        autoComplete="one-time-code"
                        value={twoFactorCode}
                        onChange={handleTwoFactorCodeChange}
                        className="block w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[#49C5B6] focus:border-[#49C5B6] tracking-[0.35em] text-lg text-center text-[var(--text)]"
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
                    className="text-xs font-medium text-[#49C5B6] hover:text-[#3ba394] transition-colors"
                  >
                    Trocar usuário
                  </button>
                </div>
              )}

              {!isTwoFactorStep && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-[#49C5B6] bg-[var(--surface)] border-[var(--border)] rounded focus:ring-[#49C5B6]"
                    />
                    <span className="ml-2 text-sm text-[var(--muted)]">Lembrar-me</span>
                  </label>
                  <button
                    type="button"
                    className="text-sm text-[#49C5B6] hover:text-[#3ba394] transition-colors font-medium"
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

              {/* Submit Button */}
              <button
                onClick={primaryAction}
                disabled={primaryLoading}
                className="w-full bg-[#49C5B6] hover:bg-[#3ba394] text-white py-3 px-6 rounded-lg font-semibold text-base transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {primaryLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {primaryLoadingLabel}
                  </div>
                ) : (
                  primaryIdleLabel
                )}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-xs text-[var(--muted)]">
              © 2025 ContainerView. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
 
