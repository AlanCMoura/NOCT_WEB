import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Plus, Search, X, Edit, Trash2, RefreshCcw } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useSidebar } from '../context/SidebarContext';
import { useSessionUser } from '../context/AuthContext';
import { registerUser, setupTwoFactorAuth, setupTwoFactorForUser, TotpSetupResponse, RegisterUserResponse } from '../services/auth';
import { ApiUser, deleteUserById, listUsers, updateUserById } from '../services/users';

interface UserLogged {
  name: string;
  role: string;
}

type Role = 'Administrador' | 'Gerente' | 'Inspetor';
const ROLE_TO_API: Record<Role, string> = {
  Administrador: 'ADMIN',
  Gerente: 'GERENTE',
  Inspetor: 'INSPETOR',
};

const API_ROLE_TO_UI: Record<string, Role> = {
  ADMIN: 'Administrador',
  GERENTE: 'Gerente',
  INSPETOR: 'Inspetor',
};

interface ManagedUser {
  id: number | string;
  firstName: string;
  lastName: string;
  cpf: string;
  email: string;
  role: Role;
  twoFactor: boolean;
}

// Toggle UI
const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    aria-pressed={checked}
    aria-label="Alternar"
    onClick={() => !disabled && onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-teal-600' : 'bg-gray-300'} ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span className={`inline-block h-5 w-5 transform rounded-full bg-[var(--surface)] transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
  </button>
);

const formatCpf = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const mapApiUserToManaged = (user: ApiUser): ManagedUser => {
  const roleFromApi = user.role ? API_ROLE_TO_UI[user.role] ?? 'Inspetor' : 'Inspetor';
  const nameParts = (user.name ?? '').trim().split(' ').filter(Boolean);
  const firstName = user.firstName ?? nameParts[0] ?? 'Usuario';
  const lastName = user.lastName ?? (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
  const cpfValue = typeof user.cpf === 'string' ? user.cpf : '';
  const twoFactorEnabled =
    Boolean((user as unknown as { twoFactor?: boolean }).twoFactor) || Boolean(user.twoFactorEnabled);

  return {
    id: user.id ?? String(Date.now()),
    firstName,
    lastName,
    cpf: formatCpf(cpfValue),
    email: user.email ?? '',
    role: roleFromApi,
    twoFactor: twoFactorEnabled,
  };
};

const Users: React.FC = () => {
  const PAGE_SIZE = 10;
  const { changePage } = useSidebar();
  const currentUser: UserLogged = useSessionUser({ role: 'Supervisor' });

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');
  const [twoFactorFilter, setTwoFactorFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('Inspetor');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [twoFactor, setTwoFactor] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pageAlert, setPageAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isTwoFactorModalOpen, setIsTwoFactorModalOpen] = useState(false);
  const [isTwoFactorLoading, setIsTwoFactorLoading] = useState(false);
  const [twoFactorSetupInfo, setTwoFactorSetupInfo] = useState<TotpSetupResponse | null>(null);
  const [twoFactorSetupError, setTwoFactorSetupError] = useState<string | null>(null);

  const resetForm = (options?: { keepTwoFactorModal?: boolean }) => {
    setFirstName('');
    setLastName('');
    setCpf('');
    setEmail('');
    setRole('Inspetor');
    setPassword('');
    setConfirm('');
    setTwoFactor(false);
    setShowPw(false);
    setShowConfirm(false);
    setFormError(null);
    setIsSubmitting(false);

    if (!options?.keepTwoFactorModal) {
      setIsTwoFactorModalOpen(false);
      setTwoFactorSetupInfo(null);
      setTwoFactorSetupError(null);
    }

    setIsTwoFactorLoading(false);
  };

  const cpfDigits = cpf.replace(/\D/g, '');

  const fetchUsers = useCallback(
    async (targetPage = 0) => {
      setIsLoadingUsers(true);
      setListError(null);

      try {
        const data = await listUsers({
          page: targetPage,
          size: PAGE_SIZE,
          sortBy: 'id',
          sortDirection: 'ASC',
        });

        const mapped = (data?.content ?? []).map(mapApiUserToManaged);
        setUsers(mapped);
        setPage(data?.number ?? targetPage);
        setTotalPages(data?.totalPages ?? 0);
        setTotalUsers(data?.totalElements ?? mapped.length);
        return data;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Nao foi possivel carregar os Usuarios.';
        setListError(message);
        return undefined;
      } finally {
        setIsLoadingUsers(false);
      }
    },
    [PAGE_SIZE]
  );

  useEffect(() => {
    fetchUsers(page);
  }, [fetchUsers, page]);

  const refreshCurrentPage = useCallback(async () => {
    const data = await fetchUsers(page);

    if (data && data.totalPages > 0 && page >= data.totalPages) {
      const lastPage = Math.max(0, data.totalPages - 1);
      if (lastPage !== page) {
        setPage(lastPage);
      }
    }
  }, [fetchUsers, page]);

  const loadTwoFactorSetup = async () => {
    setIsTwoFactorLoading(true);
    setTwoFactorSetupInfo(null);
    setTwoFactorSetupError(null);

    try {
      const setupData = await setupTwoFactorAuth();
      setTwoFactorSetupInfo(setupData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Nao foi possivel gerar o QR Code. Tente novamente.';
      setTwoFactorSetupError(message);
    } finally {
      setIsTwoFactorLoading(false);
    }
  };

  const handleTwoFactorToggle = (value: boolean) => {
    setTwoFactor(value);

    if (!value) {
      setIsTwoFactorModalOpen(false);
      setTwoFactorSetupInfo(null);
      setTwoFactorSetupError(null);
      setIsTwoFactorLoading(false);
    }
  };

  const closeTwoFactorModal = () => {
    setIsTwoFactorModalOpen(false);
  };

  const handleSave = async () => {
    if (!isValid || isSubmitting) return;

    setFormError(null);

    const commonPayload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      cpf: cpf, // backend espera CPF com mascara
      email: email.trim(),
      role: ROLE_TO_API[role] ?? role,
      twoFactorEnabled: twoFactor,
    };

    if (editingUser) {
      setIsSubmitting(true);

      try {
        const updatedUser = await updateUserById(editingUser.id, commonPayload);
        const mapped = mapApiUserToManaged(updatedUser);

        setUsers((prev) => prev.map((u) => (String(u.id) === String(mapped.id) ? mapped : u)));
        setPageAlert({ type: 'success', message: 'Usuario atualizado com sucesso.' });
        setIsOpen(false);
        setEditingUser(null);
        resetForm();
        await refreshCurrentPage();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Nao foi possivel atualizar o usuario. Tente novamente.';
        setFormError(message);
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    if (!password || password !== confirm) {
      setFormError('As senhas precisam ser iguais.');
      return;
    }

    const payload = {
      ...commonPayload,
      password,
    };

    setIsSubmitting(true);

    try {
      const response: RegisterUserResponse = await registerUser(payload);

      setPageAlert({ type: 'success', message: response.message || 'Usuario cadastrado com sucesso.' });
      setIsOpen(false);
      setEditingUser(null);
      setPage(0);
      await fetchUsers(0);

      // Se 2FA estavel, garante exibição do QR Code retornado ou busca via endpoint dedicado
      if (twoFactor) {
        setIsTwoFactorLoading(true);
        setTwoFactorSetupError(null);

        const cpfToSetup = payload.cpf;
        let setupInfo: TotpSetupResponse | null = null;

        if (response.totpSecret && response.qrCodeDataUri) {
          setupInfo = {
            secret: response.totpSecret,
            qrCodeDataUri: response.qrCodeDataUri,
            message: response.message || 'Escaneie o QR Code com seu aplicativo Authenticator',
          };
        } else {
          try {
            setupInfo = await setupTwoFactorForUser(cpfToSetup);
          } catch (setupError) {
            const message =
              setupError instanceof Error
                ? setupError.message
                : 'Nao foi possivel gerar o QR Code. Tente novamente.';
            setTwoFactorSetupError(message);
          }
        }

        if (setupInfo) {
          setTwoFactorSetupInfo(setupInfo);
          setIsTwoFactorModalOpen(true);
          resetForm({ keepTwoFactorModal: true });
        } else {
          resetForm();
        }

        setIsTwoFactorLoading(false);
      } else {
        resetForm();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel cadastrar o usuario. Tente novamente.';
      setFormError(message);
      setPageAlert({ type: 'error', message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesSearch =
        !q ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.cpf.includes(q) ||
        u.role.toLowerCase().includes(q);

      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesTwoFactor =
        twoFactorFilter === 'all' ||
        (twoFactorFilter === 'enabled' ? u.twoFactor : !u.twoFactor);

      return matchesSearch && matchesRole && matchesTwoFactor;
    });
  }, [users, search, roleFilter, twoFactorFilter]);

  const isValid = editingUser
    ? Boolean(firstName && lastName && cpfDigits.length === 11 && email && role)
    : Boolean(firstName && lastName && cpfDigits.length === 11 && email && role && password && confirm && password === confirm);

  const submitDisabled = !isValid || isSubmitting;
  const submitLabel = editingUser
    ? (isSubmitting ? 'Salvando...' : 'Salvar alteracoes')
    : (isSubmitting ? 'Cadastrando...' : 'Cadastrar usuario');

  const startCreate = () => {
    setEditingUser(null);
    resetForm();
    setIsOpen(true);
  };

  const startEdit = (u: ManagedUser) => {
    setEditingUser(u);
    setFirstName(u.firstName);
    setLastName(u.lastName);
    setCpf(u.cpf);
    setEmail(u.email);
    setRole(u.role);
    setTwoFactor(u.twoFactor);
    setPassword('');
    setConfirm('');
    setShowPw(false);
    setShowConfirm(false);
    setIsOpen(true);
  };

  const deleteUser = async (id: number | string) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuario?')) return;

    try {
      await deleteUserById(id);
      setPageAlert({ type: 'success', message: 'Usuario excluido com sucesso.' });
      await refreshCurrentPage();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel excluir o usuario.';
      setPageAlert({ type: 'error', message });
    }
  };

  // navegacao via SidebarProvider; handler antigo removido

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

  const goToPreviousPage = () => {
    if (page > 0) setPage((prev) => prev - 1);
  };

  const goToNextPage = () => {
    if (totalPages === 0) return;
    if (page + 1 < totalPages) setPage((prev) => prev + 1);
  };

  return (
    <div className="flex h-screen bg-app">
      <Sidebar user={currentUser} />

      <div className="flex-1 flex flex-col">
        <header className="bg-[var(--surface)] border-b border-[var(--border)] h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text)]">Usuarios</h1>
              <p className="text-sm text-[var(--muted)]">Gerenciamento de usuarios do sistema</p>
            </div>

            {formError && (
              <div className="px-6">
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {formError}
                </div>
              </div>
            )}
            <div className="flex items-center gap-4">
              <div onClick={() => changePage('perfil')} className="flex items-center gap-3 cursor-pointer hover:bg-[var(--hover)] rounded-lg px-4 py-2 transition-colors">
                <div className="text-right">
                  <div className="text-sm font-medium text-[var(--text)]">{currentUser.name}</div>
                  <div className="text-xs text-[var(--muted)]">{currentUser.role}</div>
                </div>
                <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto space-y-6">
          {pageAlert && (
            <div
              className={`flex items-start justify-between rounded-lg px-4 py-3 border text-sm mb-2 ${
                pageAlert.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              <div className="pr-4">
                <p className="font-semibold">
                  {pageAlert.type === 'success' ? 'Cadastro realizado' : 'Nao foi possivel completar a acao'}
                </p>
                <p className="mt-1">{pageAlert.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setPageAlert(null)}
                className="text-inherit hover:opacity-70 transition-opacity"
                aria-label="Fechar alerta"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
            <div className="flex-1 relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--muted)] w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por nome, email ou CPF..."
                className="w-full pl-10 pr-4 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={isLoadingUsers}
              />
            </div>
            <div className="flex flex-wrap items-stretch gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as 'all' | Role)}
                className="min-w-[150px] px-3 py-2 border border-[var(--border)] rounded-md text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                disabled={isLoadingUsers}
              >
                <option value="all">Todos os perfis</option>
                <option value="Administrador">Administrador</option>
                <option value="Gerente">Gerente</option>
                <option value="Inspetor">Inspetor</option>
              </select>
              <select
                value={twoFactorFilter}
                onChange={(e) => setTwoFactorFilter(e.target.value as 'all' | 'enabled' | 'disabled')}
                className="min-w-[150px] px-3 py-2 border border-[var(--border)] rounded-md text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                disabled={isLoadingUsers}
              >
                <option value="all">2FA (Todos)</option>
                <option value="enabled">2FA Ativo</option>
                <option value="disabled">2FA Desativado</option>
              </select>
              <button
                type="button"
                onClick={() => fetchUsers(page)}
                className="inline-flex items-center gap-1 text-[var(--text)] border border-[var(--border)] rounded-md px-3 py-2 hover:bg-[var(--hover)]"
                disabled={isLoadingUsers}
              >
                <RefreshCcw className={`w-4 h-4 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
              <button
                onClick={startCreate}
                className="inline-flex items-center px-4 py-2 bg-[var(--primary)] text-[var(--on-primary)] rounded-lg text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-60"
                disabled={isLoadingUsers}
              >
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Usuario
              </button>
            </div>
          </div>

          <section className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)]">

            {isLoadingUsers ? (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-pulse">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-[var(--border)] p-4 space-y-3">
                      <div className="h-3 bg-[var(--hover)] rounded w-2/3" />
                      <div className="h-3 bg-[var(--hover)] rounded w-1/2" />
                      <div className="h-3 bg-[var(--hover)] rounded w-3/4" />
                      <div className="h-3 bg-[var(--hover)] rounded w-5/6" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--border)]">
                <thead className="bg-[var(--hover)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">CPF</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Perfil</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">2FA</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Acoes</th>
                  </tr>
                </thead>
                <tbody className="bg-[var(--surface)] divide-y divide-[var(--border)]">
  {listError ? (
    <tr>
      <td colSpan={6} className="px-6 py-6 text-sm text-red-700">
        <div className="flex items-center justify-between">
          <span>{listError}</span>
          <button
            type="button"
            onClick={() => fetchUsers(page)}
            className="px-3 py-1 rounded-md border border-[var(--border)] text-[var(--text)] hover:bg-[var(--hover)]"
          >
            Tentar novamente
          </button>
        </div>
      </td>
    </tr>
  ) : filtered.length === 0 ? (
    <tr>
      <td colSpan={6} className="px-6 py-6 text-sm text-[var(--muted)]">
        Nenhum usuario encontrado.
      </td>
    </tr>
  ) : (
    filtered.map((u) => (
      <tr key={u.id} className="hover:bg-[var(--hover)]">
        <td className="px-6 py-3 text-sm text-[var(--text)]">{u.firstName} {u.lastName}</td>
        <td className="px-6 py-3 text-sm text-[var(--text)]">{u.email}</td>
        <td className="px-6 py-3 text-sm text-[var(--text)]">{u.cpf}</td>
        <td className="px-6 py-3 text-sm">
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${roleBadgeClass(u.role)}`}>{u.role}</span>
        </td>
        <td className="px-6 py-3 text-sm">
          {u.twoFactor ? (
            <span className="text-green-700 bg-green-100 px-2 py-1 rounded-full text-xs font-semibold">Ativo</span>
          ) : (
            <span className="text-[var(--text)] bg-app px-2 py-1 rounded-full text-xs font-semibold">Desativado</span>
          )}
        </td>
        <td className="px-6 py-3 text-sm text-right">
          <div className="inline-flex gap-2">
            <button
              onClick={() => startEdit(u)}
              className="px-2 py-1 rounded-md border border-[var(--border)] text-[var(--text)] hover:bg-[var(--hover)] inline-flex items-center gap-1"
              title="Editar"
            >
              <Edit className="w-4 h-4" />
              <span className="hidden sm:inline">Editar</span>
            </button>
            <button
              onClick={() => deleteUser(u.id)}
              className="px-2 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 inline-flex items-center gap-1"
              title="Excluir"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Excluir</span>
            </button>
          </div>
        </td>
      </tr>
    ))
  )}
</tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between text-sm text-[var(--muted)]">
              <div>
                Pagina {totalPages === 0 ? 0 : page + 1} de {totalPages} | Total: {totalUsers}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={goToPreviousPage}
                  disabled={page === 0 || isLoadingUsers}
                  className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <button
                  onClick={goToNextPage}
                  disabled={isLoadingUsers || totalPages === 0 || page + 1 >= totalPages}
                  className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Proximo
                </button>
              </div>
            </div>
              </>
            )}
          </section>
        </main>
      </div>

      {/* Modal de Cadastro */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsOpen(false)} />
          <div className="relative bg-[var(--surface)] rounded-2xl shadow-2xl w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
              <h3 className="text-lg font-semibold text-[var(--text)]">{editingUser ? 'Editar Usuario' : 'Cadastrar Novo Usuario'}</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-[var(--muted)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">Nome <span className="text-red-500">*</span></label>
                  <input
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Nome"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">Sobrenome <span className="text-red-500">*</span></label>
                  <input
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Sobrenome"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">CPF <span className="text-red-500">*</span></label>
                  <input
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(formatCpf(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">Email <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="usuario@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--hover)]">
                <div className="px-4 pt-4">
                  <h4 className="text-sm font-semibold text-[var(--text)]">Perfil de Acesso</h4>
                  <p className="text-xs text-[var(--muted)] mb-3">Selecione um Perfil de Acesso</p>
                </div>
                <div className="px-4 pb-4">
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">Perfil <span className="text-red-500">*</span></label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="block w-full px-3 py-2 border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Administrador">Administrador</option>
                    <option value="Gerente">Gerente</option>
                    <option value="Inspetor">Inspetor</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">Senha <span className="text-red-500">*</span></label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="w-full px-3 py-2 pr-10 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={Boolean(editingUser)}
                  />
                  <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 bottom-2.5 text-[var(--muted)] hover:text-[var(--text)]" disabled={Boolean(editingUser)}>
                    {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">Confirmar Senha <span className="text-red-500">*</span></label>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    className="w-full px-3 py-2 pr-10 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={Boolean(editingUser)}
                  />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 bottom-2.5 text-[var(--muted)] hover:text-[var(--text)]" disabled={Boolean(editingUser)}>
                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text)]">Autenticacao de Dois Fatores (2FA)</h4>
                  <p className="text-xs text-[var(--muted)]">Habilitar verificacao por email para maior seguranca</p>
                </div>
                <Toggle checked={twoFactor} onChange={handleTwoFactorToggle} />
              </div>
            </div>

            <div className="px-6 py-5 border-t border-[var(--border)] flex items-center justify-between">
              <button
                onClick={() => { setIsOpen(false); setEditingUser(null); resetForm(); }}
                className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)]"
              >
                Cancelar
              </button>
              <button
                disabled={submitDisabled}
                onClick={handleSave}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${submitDisabled ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {submitLabel}
              </button>
            </div>
          </div>
        </div>
      )}
      {isTwoFactorModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeTwoFactorModal} />
          <div className="relative bg-[var(--surface)] rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-start justify-between px-6 py-5 border-b border-[var(--border)]">
              <div>
                <h3 className="text-lg font-semibold text-[var(--text)]">Configurar autenticacao em 2 fatores</h3>
                <p className="text-sm text-[var(--muted)] mt-1">
                  Compartilhe o QR Code gerado com o usuario para finalizar a configuracao.
                </p>
              </div>
              <button onClick={closeTwoFactorModal} className="text-gray-400 hover:text-[var(--muted)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">
              {isTwoFactorLoading && (
                <div className="flex items-center gap-3 text-[var(--muted)]">
                  <span className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" aria-hidden />
                  <span>Gerando QR Code para autenticacao...</span>
                </div>
              )}

              {!isTwoFactorLoading && twoFactorSetupError && (
                <>
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                    {twoFactorSetupError}
                  </div>
                  <button
                    type="button"
                    onClick={loadTwoFactorSetup}
                    className="w-full px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)]"
                  >
                    Tentar novamente
                  </button>
                </>
              )}

              {!isTwoFactorLoading && !twoFactorSetupError && twoFactorSetupInfo && (
                <div className="space-y-4">
                  <p className="text-sm text-[var(--muted)]">{twoFactorSetupInfo.message}</p>
                  <div className="flex flex-col items-center gap-3">
                    <img
                      src={twoFactorSetupInfo.qrCodeDataUri}
                      alt="QR Code de autenticacao em 2 fatores"
                      className="w-48 h-48 rounded-lg border border-[var(--border)] bg-white p-2"
                    />
                    <p className="text-xs text-[var(--muted)] text-center">
                      Utilize aplicativos como Google Authenticator ou Microsoft Authenticator para escanear.
                    </p>
                  </div>
                  <div className="bg-[var(--hover)] rounded-lg p-4">
                    <p className="text-sm font-semibold text-[var(--text)]">Chave secreta</p>
                    <p className="font-mono text-lg text-teal-600 break-all mt-2">{twoFactorSetupInfo.secret}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-[var(--border)] flex justify-end">
              <button
                onClick={closeTwoFactorModal}
                className="px-4 py-2 bg-[var(--primary)] text-[var(--on-primary)] rounded-lg text-sm font-medium hover:opacity-90 transition-colors"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;



















