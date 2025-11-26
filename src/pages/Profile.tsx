import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth, useSessionUser, AuthUser } from '../context/AuthContext';

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

const deriveProfileFromAuth = (authUser: AuthUser | null): ProfileUser => {
  const fallback: ProfileUser = {
    firstName: 'Carlos',
    lastName: 'Oliveira',
    email: 'carlos.oliveira@empresa.com',
    cpf: '123.456.789-00',
    role: 'Gerente',
    twoFactor: true,
    createdAt: '2024-01-10',
    lastLoginAt: '2025-08-26 09:12',
  };

  if (!authUser) {
    return fallback;
  }

  const nameParts = authUser.name?.trim().split(' ') ?? [];
  const derivedFirst = nameParts[0] ?? '';
  const derivedLast = nameParts.slice(1).join(' ');

  const firstName = authUser.firstName || derivedFirst || fallback.firstName;
  const lastName = authUser.lastName || derivedLast || fallback.lastName;

  const allowedRoles: Role[] = ['Administrador', 'Gerente', 'Inspetor'];
  const normalizedRole = allowedRoles.includes(authUser.role as Role)
    ? (authUser.role as Role)
    : fallback.role;

  return {
    firstName,
    lastName,
    email: authUser.email || fallback.email,
    cpf: authUser.cpf || fallback.cpf,
    role: normalizedRole,
    twoFactor: Boolean(
      authUser.twoFactorEnabled ?? (authUser as { twoFactor?: boolean }).twoFactor ?? fallback.twoFactor
    ),
    createdAt: authUser.createdAt || fallback.createdAt,
    lastLoginAt: authUser.lastLoginAt || fallback.lastLoginAt,
  };
};

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sessionUser = useSessionUser();

  const userProfile = useMemo(() => deriveProfileFromAuth(user), [user]);

  const sidebarUser: SidebarUser = {
    name: sessionUser.name,
    role: sessionUser.role,
  };

  return (
    <div className="flex h-screen bg-app">
      <Sidebar user={sidebarUser} />

      <div className="flex-1 flex flex-col">
        <header className="bg-[var(--surface)] border-b border-[var(--border)] h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text)]">Meu Perfil</h1>
              <p className="text-sm text-[var(--muted)]">Visualize suas informações pessoais e de acesso</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 cursor-pointer hover:bg-[var(--hover)] rounded-lg px-4 py-2 transition-colors">
                <div className="text-right">
                  <div className="text-sm font-medium text-[var(--text)]">{sidebarUser.name}</div>
                  <div className="text-xs text-[var(--muted)]">{sidebarUser.role}</div>
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
          <section className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)]">
            <div className="p-6 flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 text-white flex items-center justify-center text-2xl font-semibold">
                {getInitials(`${userProfile.firstName} ${userProfile.lastName}`)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-[var(--text)]">{userProfile.firstName} {userProfile.lastName}</h2>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${roleBadgeClass(userProfile.role)}`}>
                    {userProfile.role}
                  </span>
                </div>
                <p className="text-sm text-[var(--muted)]">{userProfile.email}</p>
              </div>
            </div>
          </section>

          {/* InformaÃ§Ãµes pessoais */}
          <section className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)]">
            <div className="p-6 border-b border-[var(--border)]">
              <h3 className="text-lg font-semibold text-[var(--text)]">Informações Pessoais</h3>
              <p className="text-sm text-[var(--muted)]">Dados bÃ¡sicos do seu cadastro</p>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
              <div>
                <span className="text-[var(--muted)] block">Nome</span>
                <span className="text-[var(--text)] font-medium">{userProfile.firstName}</span>
              </div>
              <div>
                <span className="text-[var(--muted)] block">Sobrenome</span>
                <span className="text-[var(--text)] font-medium">{userProfile.lastName}</span>
              </div>
              <div>
                <span className="text-[var(--muted)] block">Email</span>
                <span className="text-[var(--text)] font-medium">{userProfile.email}</span>
              </div>
              <div>
                <span className="text-[var(--muted)] block">CPF</span>
                <span className="text-[var(--text)] font-medium">{userProfile.cpf}</span>
              </div>
              <div>
                <span className="text-[var(--muted)] block">Perfil</span>
                <span className={`inline-flex mt-1 px-2 py-1 text-xs font-semibold rounded-full ${roleBadgeClass(userProfile.role)}`}>{userProfile.role}</span>
              </div>
            </div>
          </section>

          {/* SeguranÃ§a */}
          <section className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)]">
            <div className="p-6 border-b border-[var(--border)]">
              <h3 className="text-lg font-semibold text-[var(--text)]">SeguranÃ§a</h3>
              <p className="text-sm text-[var(--muted)]">Informações relacionadas ao acesso</p>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <span className="text-[var(--muted)] block">AutenticaÃ§Ã£o de Dois Fatores (2FA)</span>
                {userProfile.twoFactor ? (
                  <span className="inline-flex mt-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Ativo</span>
                ) : (
                  <span className="inline-flex mt-1 px-2 py-1 text-xs font-semibold rounded-full bg-app text-gray-800">Desativado</span>
                )}
              </div>
              <div>
                <span className="text-[var(--muted)] block">Criado em</span>
                <span className="text-[var(--text)] font-medium">{userProfile.createdAt || '-'}</span>
              </div>
              <div>
                <span className="text-[var(--muted)] block">Ãšltimo acesso</span>
                <span className="text-[var(--text)] font-medium">{userProfile.lastLoginAt || '-'}</span>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Profile;



