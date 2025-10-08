import { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

type UserRole = "admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  full_name?: string;
  permissions?: {
    can_edit: boolean;
    can_create: boolean;
    can_delete: boolean;
    can_manage_users: boolean;
  };
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (params: { email: string; password: string }) => Promise<void>;
  logout: () => void;
  updateFullName: (fullName: string) => void;
  updatePermissions: (permissions: { can_edit: boolean; can_create: boolean; can_delete: boolean; can_manage_users: boolean; }) => void;
  logUserAction: (actionType: string, description: string, targetType?: string, targetId?: string, metadata?: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "auction-usher.auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isActiveRef = useRef<boolean>(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { user: AuthUser };
        if (parsed?.user) {
          // Verificar se o usuário tem permissões carregadas
          // Se não tiver, limpar o storage e forçar novo login
          if (!parsed.user.permissions) {
            localStorage.removeItem(STORAGE_KEY);
            setIsLoading(false);
            return;
          }
          
          setUser(parsed.user);
        }
      }
    } catch (_) {
      // ignore corrupted storage
    } finally {
      setIsLoading(false);
    }
  }, []);

  const persist = useCallback((nextUser: AuthUser | null) => {
    if (nextUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: nextUser }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const login = useCallback(async ({ email, password }: { email: string; password: string }) => {
    // Limpar espaços em branco do email/usuário e senha
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();
    
    console.log('Iniciando processo de login...', { 
      originalEmail: email, 
      cleanEmail, 
      hasSpaces: email !== cleanEmail 
    });
    
    // Garantir que não há estado residual de autenticação
    if (user) {
      console.log('Limpando estado de usuário anterior...');
      setUser(null);
      persist(null);
    }
    
    await new Promise((r) => setTimeout(r, 500)); // Simular tempo de requisição
    
    if (!cleanEmail || !cleanPassword) {
      throw new Error("Usuário e senha são obrigatórios");
    }

    try {
      // Primeiro buscar o usuário por email
      console.log('🔍 Buscando usuário com email:', cleanEmail);
      let { data: users, error: userError } = await supabase
        .from('users' as any)
        .select('id, name, email, role, full_name, can_edit, can_create, can_delete, can_manage_users, is_active')
        .eq('email', cleanEmail);

      // Se não encontrar por email, buscar por nome
      if (!users || users.length === 0) {
        console.log('👤 Não encontrado por email, buscando por nome:', cleanEmail);
        const { data: usersByName, error: nameError } = await supabase
          .from('users' as any)
          .select('id, name, email, role, full_name, can_edit, can_create, can_delete, can_manage_users, is_active')
          .eq('name', cleanEmail);
        
        users = usersByName;
        userError = nameError;
      }

      if (userError) {
        console.error('❌ Erro ao buscar usuário:', userError);
        throw new Error("Usuário ou senha incorretos");
      }

      if (!users || users.length === 0) {
        console.log('❌ Usuário não encontrado:', cleanEmail);
        throw new Error("Usuário ou senha incorretos");
      }

      const user = users[0] as any;
      console.log('✅ Usuário encontrado:', { 
        id: user.id, 
        name: user.name, 
        email: user.email,
        isActive: user.is_active 
      });

      // Verificar se o usuário está ativo
      if (!user.is_active) {
        console.log('Usuário está desativado');
        throw new Error("Usuário desativado. Entre em contato com o administrador.");
      }

      // Depois buscar as credenciais do usuário
      console.log('🔑 Buscando credenciais do usuário...');
      const { data: credentials, error: credError } = await supabase
        .from('user_credentials' as any)
        .select('password_hash')
        .eq('user_id', user.id)
        .single();

      if (credError) {
        console.error('❌ Erro ao buscar credenciais:', credError);
        throw new Error("Usuário não possui credenciais válidas");
      }

      if (!credentials || !credentials.password_hash) {
        console.log('❌ Credenciais não encontradas ou hash vazio');
        throw new Error("Usuário não possui credenciais válidas");
      }

      console.log('✅ Credenciais encontradas, hash existe');

      // Verificar se a senha corresponde usando RPC function
      console.log('🔐 Verificando senha com verify_password...');
      console.log('📧 Email para verificação:', user.email);
      console.log('🔑 Senha recebida (tamanho):', cleanPassword.length, 'caracteres');
      
      const { data: passwordMatch, error: verifyError } = await supabase
        .rpc('verify_password' as any, {
          user_email: user.email, // Usar o email do banco, não o digitado
          user_password: cleanPassword
        });

      if (verifyError) {
        console.error('❌ Erro na verificação de senha:', verifyError);
        console.error('❌ Detalhes do erro:', JSON.stringify(verifyError, null, 2));
        throw new Error("Usuário ou senha incorretos");
      }

      console.log('📊 Resultado da verificação:', passwordMatch);

      if (!passwordMatch) {
        console.log('❌ Senha não confere');
        throw new Error("Usuário ou senha incorretos");
      }

      console.log('✅ Senha verificada com sucesso!');

      const permissions = {
        can_edit: user.can_edit || false,
        can_create: user.can_create || false,
        can_delete: user.can_delete || false,
        can_manage_users: user.can_manage_users || false, // Buscar do banco
      };

      const authenticatedUser: AuthUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: (user.role as UserRole) || "admin",
        full_name: (user as any).full_name || null,
        permissions,
      };
      
      // Atualizar dados de login no banco
      try {
        const { error: updateError } = await supabase
          .from('users' as any)
          .update({
            last_login_at: new Date().toISOString(),
            session_count: ((user as any).session_count || 0) + 1,
            first_login_at: (user as any).first_login_at || new Date().toISOString(),
            is_active: true
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('Erro ao atualizar dados de login:', updateError);
        }

        // Registrar ação de login
        await supabase.from('user_actions' as any).insert({
          user_id: user.id,
          action_type: 'login',
          action_description: 'Fez login no sistema (autenticação bem-sucedida)',
          target_type: 'auth',
          metadata: { login_method: 'credentials' }
        });
      } catch (error) {
        console.error('Erro na sincronização de login:', error);
      }
      
      console.log('Autenticação concluída com sucesso:', { userId: user.id, userName: user.name });
      setUser(authenticatedUser);
      persist(authenticatedUser);
    } catch (error: any) {
      console.error('Erro durante o login:', error);
      throw new Error(error.message || "Usuário ou senha incorretos");
    }
  }, [persist]);

  const logout = useCallback(async () => {
    console.log('Iniciando logout...', { userId: user?.id });
    
    if (user && heartbeatIntervalRef.current) {
      // Marcar usuário como offline no banco antes de fazer logout
      try {
        await supabase
          .from('users' as any)
          .update({ 
            last_login_at: new Date(Date.now() - 10 * 60 * 1000).toISOString() // 10 minutos atrás para garantir offline
          })
          .eq('id', user.id);
      } catch (error) {
        console.error('Erro ao marcar usuário como offline:', error);
      }
      
      // Limpar heartbeat
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    // Limpar todos os dados de autenticação
    setUser(null);
    persist(null);
    
    // Limpar outros estados relacionados
    lastActivityRef.current = Date.now();
    isActiveRef.current = true;
    
    // Forçar limpeza de qualquer cache do Supabase
    try {
      // Limpar possível cache de sessão do Supabase
      await supabase.auth.signOut();
    } catch (error) {
      // Ignorar erros de signOut pois não usamos auth nativo do Supabase
    }
    
    console.log('Logout concluído com sucesso');
  }, [user, persist]);

  const updateFullName = useCallback((fullName: string) => {
    if (user) {
      const updatedUser = { ...user, full_name: fullName };
      setUser(updatedUser);
      persist(updatedUser);
    }
  }, [user, persist]);

  const updatePermissions = useCallback((permissions: { can_edit: boolean; can_create: boolean; can_delete: boolean; can_manage_users: boolean; }) => {
    if (user) {
      const updatedUser = { 
        ...user, 
        permissions: {
          ...user.permissions,
          ...permissions
        }
      };
      setUser(updatedUser);
      persist(updatedUser);
    }
  }, [user, persist]);

  const logUserAction = useCallback(async (
    actionType: string,
    description: string,
    targetType?: string,
    targetId?: string,
    metadata?: any
  ) => {
    if (!user) {
      console.warn('Tentativa de registrar ação sem usuário logado');
      return;
    }

    try {
      await supabase.from('user_actions' as any).insert({
        user_id: user.id,
        action_type: actionType,
        action_description: description,
        target_type: targetType,
        target_id: targetId,
        metadata: metadata
      });
    } catch (error) {
      console.error('Erro ao registrar ação do usuário:', error);
    }
  }, [user]);

  // Sistema de heartbeat para status online/offline real e sincronização de permissões
  const updateHeartbeat = useCallback(async () => {
    if (!user || !isActiveRef.current) return;
    
    try {
      // Atualizar heartbeat e buscar status + permissões atuais
      const { data: userData, error: updateError } = await supabase
        .from('users' as any)
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', user.id)
        .select('is_active, can_edit, can_create, can_delete, can_manage_users')
        .single();

      if (updateError) {
        // Se erro 406 (PGRST116), provavelmente usuário foi excluído
        if (updateError.code === 'PGRST116' || updateError.message?.includes('No rows found')) {
          console.log('🗑️ Usuário foi excluído - fazendo logout automático');
          
          // Salvar mensagem de exclusão no localStorage
          localStorage.setItem('deletion-message', 'Sua conta foi excluída por um administrador.');
          
          // Fazer logout imediato
          logout();
          return;
        }
        
        console.error('Erro ao atualizar heartbeat:', updateError);
        return;
      }

      // Se o usuário foi desativado, fazer logout automático
      if (userData && !(userData as any).is_active) {
        console.log('🔴 Usuário foi desativado - fazendo logout automático');
        
        // Salvar mensagem de desativação no localStorage
        localStorage.setItem('deactivation-message', 'Sua conta foi desativada por um administrador.');
        
        // Fazer logout imediato
        logout();
        return;
      }

      // Sincronizar permissões se houver mudanças
      if (userData) {
        const currentPermissions = user.permissions || {
          can_edit: false,
          can_create: false,
          can_delete: false,
          can_manage_users: false
        };
        const newPermissions = {
          can_edit: (userData as any).can_edit || false,
          can_create: (userData as any).can_create || false,
          can_delete: (userData as any).can_delete || false,
          can_manage_users: (userData as any).can_manage_users || false,
        };

        // Verificar se houve mudanças nas permissões
        const permissionsChanged = 
          currentPermissions.can_edit !== newPermissions.can_edit ||
          currentPermissions.can_create !== newPermissions.can_create ||
          currentPermissions.can_delete !== newPermissions.can_delete ||
          currentPermissions.can_manage_users !== newPermissions.can_manage_users;

        if (permissionsChanged) {
          console.log('🔄 Permissões alteradas - sincronizando automaticamente');
          console.log('🔐 Permissões antigas:', currentPermissions);
          console.log('✨ Novas permissões:', newPermissions);
          
          // Atualizar contexto com novas permissões
          updatePermissions(newPermissions);
          
          // Disparar evento personalizado para notificar outros componentes
          window.dispatchEvent(new CustomEvent('permissions-updated', { 
            detail: { 
              oldPermissions: currentPermissions, 
              newPermissions: newPermissions 
            } 
          }));
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar heartbeat:', error);
      
      // Verificar se é erro de usuário não encontrado (excluído)
      if ((error as any)?.code === 'PGRST116' || (error as any)?.message?.includes('No rows found')) {
        console.log('🗑️ Usuário foi excluído - fazendo logout automático');
        
        // Salvar mensagem de exclusão no localStorage
        localStorage.setItem('deletion-message', 'Sua conta foi excluída por um administrador.');
        
        // Fazer logout imediato
        logout();
      }
    }
  }, [user, logout]);

  const handleUserActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    isActiveRef.current = true;
  }, []);

  const checkUserActivity = useCallback(() => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    
    // Considera usuário inativo após 5 minutos sem atividade
    if (timeSinceLastActivity > 5 * 60 * 1000) {
      isActiveRef.current = false;
    }
  }, []);

  // Configurar listeners de atividade e heartbeat
  useEffect(() => {
    if (!user) return;

    // Eventos que indicam atividade do usuário
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    activityEvents.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    // Detectar quando a janela ganha/perde foco
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Janela perdeu foco - pausar heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
      } else {
        // Janela ganhou foco - retomar heartbeat e atualizar imediatamente
        handleUserActivity();
        updateHeartbeat();
        
        heartbeatIntervalRef.current = setInterval(() => {
          checkUserActivity();
          updateHeartbeat();
        }, 2 * 60 * 1000);
      }
    };

    const handleWindowFocus = () => {
      handleUserActivity();
      updateHeartbeat();
    };

    // Listeners para visibilidade e foco
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    // Heartbeat inicial a cada 2 minutos quando ativo
    heartbeatIntervalRef.current = setInterval(() => {
      checkUserActivity();
      updateHeartbeat();
    }, 2 * 60 * 1000);

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [user, handleUserActivity, checkUserActivity, updateHeartbeat]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: Boolean(user),
    login,
    logout,
    updateFullName,
    updatePermissions,
    logUserAction,
  }), [user, login, logout, updateFullName, updatePermissions, logUserAction]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-lg text-gray-600">Carregando...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return ctx;
}