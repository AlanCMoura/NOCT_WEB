// src/pages/Login.tsx
import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, Facebook, Chrome } from 'lucide-react';

interface LoginFormData {
  email: string;
  password: string;
}

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [loginData, setLoginData] = useState<LoginFormData>({
    email: '',
    password: ''
  });

  const [registerData, setRegisterData] = useState<RegisterFormData>({
    name: '',
    email: '',
    password: ''
  });

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setLoginData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setRegisterData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Login data:', loginData);
      alert('Login realizado com sucesso!');
    } catch (error) {
      console.error('Erro no login:', error);
      alert('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Register data:', registerData);
      alert('Cadastro realizado com sucesso!');
      setIsLogin(true);
    } catch (error) {
      console.error('Erro no cadastro:', error);
      alert('Erro ao criar conta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Painel lateral esquerdo */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-teal-400 via-teal-500 to-teal-600 relative overflow-hidden">
        {/* Formas decorativas */}
        <div className="absolute top-0 left-0 w-40 h-40 bg-yellow-400 rounded-full transform -translate-x-20 -translate-y-20"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-pink-400 rounded-full transform translate-x-32 translate-y-32"></div>
        <div className="absolute bottom-10 left-10 w-32 h-32 bg-yellow-300 rounded-lg transform rotate-45"></div>
        
        {/* Conteúdo do painel */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
          {/* Logo */}
          <div className="mb-8">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mb-4">
              <span className="text-xl font-bold">M</span>
            </div>
            <h3 className="text-sm font-medium opacity-80">MeuSite</h3>
          </div>

          {/* Título principal */}
          <div className="text-center max-w-sm">
            <h1 className="text-4xl font-bold mb-4">
              {isLogin ? 'Welcome Back!' : 'Join Us Today!'}
            </h1>
            <p className="text-lg opacity-90 mb-8">
              {isLogin 
                ? 'To keep connected with us please login with your personal info'
                : 'Create your account and start your journey with us'
              }
            </p>
            
            {/* Botão para alternar */}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-teal-600 transition-all duration-300"
            >
              {isLogin ? 'SIGN UP' : 'SIGN IN'}
            </button>
          </div>
        </div>
      </div>

      {/* Painel direito - Formulário */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="max-w-md w-full">
          {/* Header mobile */}
          <div className="text-center mb-8 lg:hidden">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">MeuSite</h1>
            <p className="text-gray-600">Bem-vindo de volta!</p>
          </div>

          {/* Título do formulário */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-teal-600 mb-2">
              {isLogin ? 'Sign In' : 'Create Account'}
            </h2>
            
            {/* Botões sociais */}
            <div className="flex justify-center space-x-4 mb-6">
              <button className="w-10 h-10 border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
                <Facebook className="w-5 h-5 text-blue-600" />
              </button>
              <button className="w-10 h-10 border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
                <Chrome className="w-5 h-5 text-red-500" />
              </button>
            </div>
            
            <p className="text-gray-500 text-sm">
              or use your email for {isLogin ? 'sign in' : 'registration'}
            </p>
          </div>

          {/* Formulário */}
          {isLogin ? (
            <form onSubmit={handleLoginSubmit} className="space-y-6">
              {/* Email */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  name="email"
                  type="email"
                  required
                  value={loginData.email}
                  onChange={handleLoginChange}
                  className="block w-full pl-10 pr-3 py-4 border-0 border-b-2 border-gray-200 bg-transparent focus:outline-none focus:border-teal-500 transition-colors text-gray-700"
                  placeholder="Email"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginData.password}
                  onChange={handleLoginChange}
                  className="block w-full pl-10 pr-10 py-4 border-0 border-b-2 border-gray-200 bg-transparent focus:outline-none focus:border-teal-500 transition-colors text-gray-700"
                  placeholder="Password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>

              {/* Forgot Password */}
              <div className="text-right">
                <button type="button" className="text-sm text-gray-500 hover:text-teal-600 transition-colors">
                  Forgot your password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-teal-500 hover:bg-teal-600 text-white py-4 px-6 rounded-full font-semibold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Signing In...
                  </div>
                ) : (
                  'SIGN IN'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-6">
              {/* Name */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  name="name"
                  type="text"
                  required
                  value={registerData.name}
                  onChange={handleRegisterChange}
                  className="block w-full pl-10 pr-3 py-4 border-0 border-b-2 border-gray-200 bg-transparent focus:outline-none focus:border-teal-500 transition-colors text-gray-700"
                  placeholder="Name"
                />
              </div>

              {/* Email */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  name="email"
                  type="email"
                  required
                  value={registerData.email}
                  onChange={handleRegisterChange}
                  className="block w-full pl-10 pr-3 py-4 border-0 border-b-2 border-gray-200 bg-transparent focus:outline-none focus:border-teal-500 transition-colors text-gray-700"
                  placeholder="Email"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={registerData.password}
                  onChange={handleRegisterChange}
                  className="block w-full pl-10 pr-10 py-4 border-0 border-b-2 border-gray-200 bg-transparent focus:outline-none focus:border-teal-500 transition-colors text-gray-700"
                  placeholder="Password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-teal-500 hover:bg-teal-600 text-white py-4 px-6 rounded-full font-semibold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Creating Account...
                  </div>
                ) : (
                  'SIGN UP'
                )}
              </button>
            </form>
          )}

          {/* Toggle para mobile */}
          <div className="mt-8 text-center lg:hidden">
            <p className="text-gray-600">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 text-teal-600 font-semibold hover:text-teal-700 transition-colors"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;