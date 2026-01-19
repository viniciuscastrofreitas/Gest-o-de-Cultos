
import React, { useState } from 'react';
import { supabase } from '../supabase';

interface AuthFormProps {
  onSuccess: () => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto animate-fadeIn">
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-4">E-mail</label>
          <div className="relative">
            <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-white/20 text-sm">person</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white font-bold text-sm outline-none focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-4">Senha</label>
          <div className="relative">
            <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-white/20 text-sm">lock</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white font-bold text-sm outline-none focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-rose-400 text-[10px] font-black uppercase text-center tracking-widest animate-shake">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-5 bg-white text-[#1a1c3d] font-black rounded-3xl shadow-xl active:scale-95 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-3"
        >
          {loading ? (
            <span className="material-icons animate-spin">sync</span>
          ) : (
            <>
              <span className="material-icons">login</span>
              Entrar no Sistema
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default AuthForm;
