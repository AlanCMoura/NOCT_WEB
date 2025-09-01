import React from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

type Role = 'Administrador' | 'Gerente' | 'Inspetor';

interface SidebarUser {
  name: string;
  role: string;
}

interface ProfileUser {
  firstName: string;
  lastName: string;
  email: string;
  cpf: string;
  role: Role;
  phone?: string;
  twoFactor: boolean;
  createdAt?: string;
  lastLoginAt?: string;
}

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();

const roleBadgeClass = (r: Role): string => {
  switch (r) {
    case 'Administrador':
      return 'bg-purple-100 text-purple-800';
    case 'Gerente':
      return 'bg-blue-100 text-blue-800';
    case 'Inspetor':
    default:
      return 'bg-green-100 text-green-800';
  }
};

const Profile: React.FC = () => {
  const navigate = useNavigate();

  // Tenta ler do localStorage ('user' como JSON). Fallback para mock
  let stored: ProfileUser | null = null;
  try {
    const raw = localStorage.getItem('user');
    if (raw) stored = JSON.parse(raw);
  } catch {}

  const userProfile: ProfileUser = stored || {
    firstName: 'Carlos',
    lastName: 'Oliveira',
    email: 'carlos.oliveira@empresa.com',
    cpf: '123.456.789-00',
    role: 'Gerente',
    phone: '(11) 99999-0000',
    twoFactor: true,
    createdAt: '2024-01-10',
    lastLoginAt: '2025-08-26 09:12',
  };

  const sidebarUser: SidebarUser = {
    name: `${userProfile.firstName} ${userProfile.lastName}`,
    role: userProfile.role,
  };

  const handlePageChange = (pageId: string): void => {
    switch(pageId) {
      case 'dashboard':
        navigate('/dashboard');
        break;
      case 'operations':
        navigate('/operations');
        break;
      case 'usuarios':
        navigate('/users');
        break;
      case 'relatorios':
        navigate('/reports');
        break;
      case 'cadastrar':
        navigate('/register-inspector');
        break;
      case 'perfil':
        navigate('/profile');
        break;
      case 'logout':
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        break;
      default:
        break;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar currentPage="perfil" onPageChange={handlePageChange} user={sidebarUser} />

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
              <p className="text-sm text-gray-600">Visualize suas informações pessoais e de acesso</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg px-4 py-2 transition-colors">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{sidebarUser.name}</div>
                  <div className="text-xs text-gray-500">{sidebarUser.role}</div>
                </div>
                <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {getInitials(sidebarUser.name)}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto space-y-6">
          {/* Resumo */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 text-white flex items-center justify-center text-2xl font-semibold">
                {getInitials(`${userProfile.firstName} ${userProfile.lastName}`)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-gray-900">{userProfile.firstName} {userProfile.lastName}</h2>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${roleBadgeClass(userProfile.role)}`}>
                    {userProfile.role}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{userProfile.email}</p>
              </div>
            </div>
          </section>

          {/* Informações pessoais */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Informações Pessoais</h3>
              <p className="text-sm text-gray-600">Dados básicos do seu cadastro</p>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
              <div>
                <span className="text-gray-500 block">Nome</span>
                <span className="text-gray-900 font-medium">{userProfile.firstName}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Sobrenome</span>
                <span className="text-gray-900 font-medium">{userProfile.lastName}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Email</span>
                <span className="text-gray-900 font-medium">{userProfile.email}</span>
              </div>
              <div>
                <span className="text-gray-500 block">CPF</span>
                <span className="text-gray-900 font-medium">{userProfile.cpf}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Telefone</span>
                <span className="text-gray-900 font-medium">{userProfile.phone || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Perfil</span>
                <span className={`inline-flex mt-1 px-2 py-1 text-xs font-semibold rounded-full ${roleBadgeClass(userProfile.role)}`}>{userProfile.role}</span>
              </div>
            </div>
          </section>

          {/* Segurança */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Segurança</h3>
              <p className="text-sm text-gray-600">Informações relacionadas ao acesso</p>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <span className="text-gray-500 block">Autenticação de Dois Fatores (2FA)</span>
                {userProfile.twoFactor ? (
                  <span className="inline-flex mt-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Ativo</span>
                ) : (
                  <span className="inline-flex mt-1 px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Desativado</span>
                )}
              </div>
              <div>
                <span className="text-gray-500 block">Criado em</span>
                <span className="text-gray-900 font-medium">{userProfile.createdAt || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Último acesso</span>
                <span className="text-gray-900 font-medium">{userProfile.lastLoginAt || '-'}</span>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Profile;

