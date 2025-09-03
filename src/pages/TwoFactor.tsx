import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const TwoFactor: React.FC = () => {
  const navigate = useNavigate();
  const { verify2FA, twoFactorRequired, isAuthenticated, error } = useAuth();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
    else if (!twoFactorRequired) navigate('/login');
  }, [twoFactorRequired, isAuthenticated, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.replace(/\D/g, '').length < 6) return;
    setIsLoading(true);
    try {
      await verify2FA(code.replace(/\s/g, ''));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-[#49C5B6] rounded-xl flex items-center justify-center mb-3 mx-auto">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Verificação em duas etapas</h1>
          <p className="text-sm text-gray-600 mt-1">Digite o código do seu autenticador para continuar</p>
        </div>

        {error && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">Código 2FA</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <KeyRound className="h-5 w-5 text-gray-400" />
            </div>
            <input
              autoFocus
              type="text"
              inputMode="numeric"
              pattern="[0-9\s]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#49C5B6] focus:border-[#49C5B6] transition-colors text-gray-900 tracking-widest text-center"
              placeholder="000000"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || code.length < 6}
            className="w-full bg-[#49C5B6] hover:bg-[#3ba394] text-white py-3 px-6 rounded-lg font-semibold text-base transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Verificando...' : 'VERIFICAR'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full text-[#49C5B6] hover:text-[#3ba394] font-medium text-sm mt-2"
          >
            Voltar ao login
          </button>
        </form>
      </div>
    </div>
  );
};

export default TwoFactor;

