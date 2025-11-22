import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api, setAuthToken } from '../services/api';

export interface AuthUser {
  id?: string;
  cpf?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  phone?: string;
  avatarUrl?: string;
  twoFactorEnabled?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
  [key: string]: unknown;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userData?: Partial<AuthUser>) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (userData: Partial<AuthUser>) => void;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const normalizeUserData = (data?: Partial<AuthUser> | null): AuthUser => {
  if (!data) {
    return { name: 'Usuário' };
  }

  const safeName = typeof data.name === 'string' ? data.name.trim() : '';
  const [firstFromName, ...restName] = safeName ? safeName.split(' ') : [];
  const normalizedFirst = data.firstName ?? firstFromName ?? '';
  const normalizedLast = data.lastName ?? (restName.length ? restName.join(' ') : '');

  const nameFromParts = [normalizedFirst, normalizedLast].filter(Boolean).join(' ').trim();
  const normalizedName =
    safeName ||
    nameFromParts ||
    (typeof data.email === 'string' ? data.email : '') ||
    (typeof data.cpf === 'string' ? data.cpf : '') ||
    'Usuário ContainerView';

  return {
    ...data,
    firstName: normalizedFirst || undefined,
    lastName: normalizedLast || undefined,
    name: normalizedName,
  };
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const persistUser = useCallback((value: Partial<AuthUser> | AuthUser | null) => {
    if (!value) {
      setUser(null);
      localStorage.removeItem('user');
      return;
    }

    const normalized = normalizeUserData(value);
    setUser(normalized);
    localStorage.setItem('user', JSON.stringify(normalized));
  }, []);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const { data } = await api.get<Partial<AuthUser>>('/auth/me');
      if (data) {
        persistUser(data);
      }
    } catch (error) {
      console.warn('Não foi possível recuperar o usuário autenticado', error);
    }
  }, [persistUser]);

  useEffect(() => {
    let mounted = true;

    const hydrate = async () => {
      setIsLoading(true);

      const storedToken = localStorage.getItem('authToken');
      const storedUserRaw = localStorage.getItem('user');

      if (storedToken) {
        setToken(storedToken);
        setAuthToken(storedToken);
      }

      if (storedUserRaw) {
        try {
          const parsed = JSON.parse(storedUserRaw);
          if (mounted) persistUser(parsed);
        } catch {
          localStorage.removeItem('user');
        }
      }

      if (storedToken) {
        await fetchCurrentUser();
      }

      if (mounted) {
        setIsLoading(false);
      }
    };

    hydrate();

    return () => {
      mounted = false;
    };
  }, [fetchCurrentUser, persistUser]);

  const refreshUser = useCallback(async () => {
    const storedToken = localStorage.getItem('authToken');
    if (!storedToken) {
      persistUser(null);
      setToken(null);
      return;
    }

    setIsLoading(true);
    setToken(storedToken);

    try {
      await fetchCurrentUser();
    } finally {
      setIsLoading(false);
    }
  }, [fetchCurrentUser, persistUser]);

  const login = useCallback(
    (newToken: string, userData?: Partial<AuthUser>) => {
      setAuthToken(newToken);
      setToken(newToken);

      if (userData) {
        persistUser(userData);
      } else {
        persistUser(null);
      }
    },
    [persistUser]
  );

  const logout = useCallback(() => {
    setAuthToken(null);
    setToken(null);
    persistUser(null);
  }, [persistUser]);

  const updateUser = useCallback(
    (userData: Partial<AuthUser>) => {
      setUser((prev) => {
        const merged = normalizeUserData({ ...(prev ?? {}), ...userData });
        localStorage.setItem('user', JSON.stringify(merged));
        return merged;
      });
    },
    []
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      isLoading,
      login,
      logout,
      refreshUser,
      updateUser,
    }),
    [user, token, isLoading, login, logout, refreshUser, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

interface SessionUserOptions {
  name?: string;
  role?: string;
}

export const useSessionUser = (options?: SessionUserOptions) => {
  const { user } = useAuth();
  const fallbackName = options?.name ?? 'Usuário ContainerView';
  const fallbackRole = options?.role ?? 'Colaborador';

  if (!user) {
    return { name: fallbackName, role: fallbackRole };
  }

  const name =
    user.name?.trim() ||
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    user.email ||
    user.cpf ||
    fallbackName;

  return {
    name,
    role: user.role || fallbackRole,
  };
};
