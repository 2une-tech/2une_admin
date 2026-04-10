import { create } from 'zustand';
import { apiRequest, clearTokens, setTokens } from './httpClient';

export type SessionUser = {
  id: string;
  email: string;
  role: string;
  isVerified?: boolean;
};

type AuthState = {
  user: SessionUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  // Important UX: don’t show “Signing in…” on initial paint.
  // isLoading should reflect an active auth request only.
  isLoading: false,

  login: async (email: string, password: string) => {
    // #region agent log
    fetch('http://127.0.0.1:7301/ingest/0e249b43-85b9-4188-a471-babf5b8dabb0',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'09a1a0'},body:JSON.stringify({sessionId:'09a1a0',runId:'pre-fix',hypothesisId:'H1',location:'2une_admin/lib/store.ts:login',message:'login() called',data:{emailProvided:!!email?.trim(),passwordLen:password?.length??0},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    // eslint-disable-next-line no-console
    console.log('[debug-09a1a0] store.login called', { emailProvided: !!email?.trim(), passwordLen: password?.length ?? 0 });
    set({ isLoading: true });
    try {
      const data = await apiRequest<{
        accessToken: string;
        refreshToken: string;
        user: { id: string; email: string; role: string };
      }>('/auth/login', {
        method: 'POST',
        body: { email: email.trim().toLowerCase(), password },
      });

      setTokens(data.accessToken, data.refreshToken);
      const me = await apiRequest<{ id: string; email: string; role: string; isVerified: boolean }>('/users/me', {
        auth: true,
      });
      // #region agent log
      fetch('http://127.0.0.1:7301/ingest/0e249b43-85b9-4188-a471-babf5b8dabb0',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'09a1a0'},body:JSON.stringify({sessionId:'09a1a0',runId:'pre-fix',hypothesisId:'H1',location:'2une_admin/lib/store.ts:login',message:'login() success; /users/me returned',data:{role:me.role,isVerified:me.isVerified},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      // eslint-disable-next-line no-console
      console.log('[debug-09a1a0] store.login success', { role: me.role, isVerified: me.isVerified });
      set({ user: { id: me.id, email: me.email, role: me.role, isVerified: me.isVerified }, isLoading: false });
    } catch (e) {
      // #region agent log
      fetch('http://127.0.0.1:7301/ingest/0e249b43-85b9-4188-a471-babf5b8dabb0',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'09a1a0'},body:JSON.stringify({sessionId:'09a1a0',runId:'pre-fix',hypothesisId:'H1',location:'2une_admin/lib/store.ts:login',message:'login() failed',data:{errorType:typeof e,errorMessage:e instanceof Error?e.message:String(e)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      // eslint-disable-next-line no-console
      console.log('[debug-09a1a0] store.login failed', { errorMessage: e instanceof Error ? e.message : String(e) });
      set({ isLoading: false });
      throw e;
    }
  },

  logout: async () => {
    clearTokens();
    set({ user: null, isLoading: false });
  },

  checkAuth: async () => {
    // #region agent log
    fetch('http://127.0.0.1:7301/ingest/0e249b43-85b9-4188-a471-babf5b8dabb0',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'09a1a0'},body:JSON.stringify({sessionId:'09a1a0',runId:'pre-fix',hypothesisId:'H2',location:'2une_admin/lib/store.ts:checkAuth',message:'checkAuth() called',data:{},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    // eslint-disable-next-line no-console
    console.log('[debug-09a1a0] store.checkAuth called');
    set({ isLoading: true });
    try {
      const me = await apiRequest<{ id: string; email: string; role: string; isVerified: boolean }>('/users/me', {
        auth: true,
      });
      // #region agent log
      fetch('http://127.0.0.1:7301/ingest/0e249b43-85b9-4188-a471-babf5b8dabb0',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'09a1a0'},body:JSON.stringify({sessionId:'09a1a0',runId:'pre-fix',hypothesisId:'H2',location:'2une_admin/lib/store.ts:checkAuth',message:'checkAuth() success; /users/me returned',data:{role:me.role,isVerified:me.isVerified},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      // eslint-disable-next-line no-console
      console.log('[debug-09a1a0] store.checkAuth success', { role: me.role, isVerified: me.isVerified });
      set({ user: { id: me.id, email: me.email, role: me.role, isVerified: me.isVerified }, isLoading: false });
    } catch {
      // #region agent log
      fetch('http://127.0.0.1:7301/ingest/0e249b43-85b9-4188-a471-babf5b8dabb0',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'09a1a0'},body:JSON.stringify({sessionId:'09a1a0',runId:'pre-fix',hypothesisId:'H2',location:'2une_admin/lib/store.ts:checkAuth',message:'checkAuth() failed; clearing tokens and user',data:{},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      // eslint-disable-next-line no-console
      console.log('[debug-09a1a0] store.checkAuth failed; clearing tokens');
      clearTokens();
      set({ user: null, isLoading: false });
    }
  },
}));

