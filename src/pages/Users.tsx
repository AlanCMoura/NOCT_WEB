import React, { useMemo, useState } from 'react';
import { Eye, EyeOff, Plus, Search, X, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

interface UserLogged {
  name: string;
  role: string;
}

type Role = 'Administrador' | 'Gerente' | 'Inspetor';

interface ManagedUser {
  id: string;
  firstName: string;
  lastName: string;
  cpf: string;
  email: string;
  role: Role;
  twoFactor: boolean;
}

const mockUsers: ManagedUser[] = [
  { id: '1', firstName: 'Ana', lastName: 'Silva', cpf: '123.456.789-00', email: 'ana@empresa.com', role: 'Administrador', twoFactor: true },
  { id: '2', firstName: 'Bruno', lastName: 'Oliveira', cpf: '987.654.321-00', email: 'bruno@empresa.com', role: 'Gerente', twoFactor: false },
  { id: '3', firstName: 'Carla', lastName: 'Souza', cpf: '111.222.333-44', email: 'carla@empresa.com', role: 'Inspetor', twoFactor: false },
];

// Toggle UI
const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }>= ({ checked, onChange, disabled }) => (
  <button
    type="button"
    aria-pressed={checked}
    aria-label="Alternar"
    onClick={() => !disabled && onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-teal-600' : 'bg-gray-300'} ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
  </button>
);

const Users: React.FC = () => {
  const navigate = useNavigate();
  const currentUser: UserLogged = { name: 'Carlos Oliveira', role: 'Supervisor' };

  const [users, setUsers] = useState<ManagedUser[]>(mockUsers);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);

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

  const resetForm = () => {
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
  };

  const handleSave = () => {
    if (!firstName || !lastName || !cpf || !email || !role) return;
    if (!editingUser && (!password || password !== confirm)) return;
    if (editingUser) {
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...editingUser, firstName, lastName, cpf, email, role, twoFactor } : u));
    } else {
      const newUser: ManagedUser = {
        id: String(Date.now()),
        firstName,
        lastName,
        cpf,
        email,
        role,
        twoFactor,
      };
      setUsers((prev) => [newUser, ...prev]);
    }
    setIsOpen(false);
    setEditingUser(null);
    resetForm();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.cpf.includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  }, [users, search]);

  const isValid = editingUser
    ? Boolean(firstName && lastName && cpf && email && role)
    : Boolean(firstName && lastName && cpf && email && role && password && confirm && password === confirm);

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

  const deleteUser = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  const handlePageChange = (pageId: string): void => {
    switch(pageId) {
      case 'dashboard':
        navigate('/dashboard');
        break;
      case 'operations':
        navigate('/operations');
        break;
      case 'perfil':
        navigate('/profile');
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
      case 'logout':
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        break;
      default:
        break;
    }
  };

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

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar currentPage="usuarios" onPageChange={handlePageChange} user={currentUser} />

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
              <p className="text-sm text-gray-600">Gerenciamento de usuários do sistema</p>
            </div>
            <div className="flex items-center gap-4">
              <div onClick={() => navigate('/profile')} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg px-4 py-2 transition-colors">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{currentUser.name}</div>
                  <div className="text-xs text-gray-500">{currentUser.role}</div>
                </div>
                <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto space-y-6">
          <section className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Usuários Cadastrados</h2>
              <div className="flex flex-1 sm:flex-initial gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, email ou CPF..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <button
                  onClick={startCreate}
                  className="inline-flex items-center px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar Usuário
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPF</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Perfil</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">2FA</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filtered.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-900">{u.firstName} {u.lastName}</td>
                      <td className="px-6 py-3 text-sm text-gray-700">{u.email}</td>
                      <td className="px-6 py-3 text-sm text-gray-700">{u.cpf}</td>
                      <td className="px-6 py-3 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${roleBadgeClass(u.role)}`}>{u.role}</span>
                      </td>
                      <td className="px-6 py-3 text-sm">
                        {u.twoFactor ? (
                          <span className="text-green-700 bg-green-100 px-2 py-1 rounded-full text-xs font-semibold">Ativo</span>
                        ) : (
                          <span className="text-gray-700 bg-gray-100 px-2 py-1 rounded-full text-xs font-semibold">Desativado</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => startEdit(u)}
                            className="px-2 py-1 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1"
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
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {/* Modal de Cadastro */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">{editingUser ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome <span className="text-red-500">*</span></label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Nome"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sobrenome <span className="text-red-500">*</span></label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Sobrenome"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CPF <span className="text-red-500">*</span></label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="usuario@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50">
                <div className="px-4 pt-4">
                  <h4 className="text-sm font-semibold text-gray-900">Perfil de Acesso</h4>
                  <p className="text-xs text-gray-500 mb-3">Selecione um perfil de acesso</p>
                </div>
                <div className="px-4 pb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Perfil <span className="text-red-500">*</span></label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Administrador">Administrador</option>
                    <option value="Gerente">Gerente</option>
                    <option value="Inspetor">Inspetor</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senha <span className="text-red-500">*</span></label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={Boolean(editingUser)}
                  />
                  <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 bottom-2.5 text-gray-500 hover:text-gray-700" disabled={Boolean(editingUser)}>
                    {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha <span className="text-red-500">*</span></label>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={Boolean(editingUser)}
                  />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 bottom-2.5 text-gray-500 hover:text-gray-700" disabled={Boolean(editingUser)}>
                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Autenticação de Dois Fatores (2FA)</h4>
                  <p className="text-xs text-gray-500">Habilitar verificação por email para maior segurança</p>
                </div>
                <Toggle checked={twoFactor} onChange={setTwoFactor} />
              </div>
            </div>

            <div className="px-6 py-5 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => { setIsOpen(false); setEditingUser(null); resetForm(); }}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                disabled={!isValid}
                onClick={handleSave}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${isValid ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-300 cursor-not-allowed'}`}
              >
                {editingUser ? 'Salvar Alterações' : 'Cadastrar Usuário'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
