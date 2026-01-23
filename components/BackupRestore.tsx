
import React, { useRef, useState, useEffect } from 'react';
import { ServiceRecord, PraiseLearningItem } from '../types';
import { supabase, testSupabaseConnection } from '../supabase';

interface Props {
  history: ServiceRecord[];
  customSongs: string[];
  learningList: PraiseLearningItem[];
  onRestore: (history: ServiceRecord[], customSongs: string[], learningList: PraiseLearningItem[]) => void;
  onForceSync: () => void;
}

const BackupRestore: React.FC<Props> = ({ history, customSongs, learningList, onRestore, onForceSync }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<any>(null);
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null);
  const [connStatus, setConnStatus] = useState<{ loading: boolean, status: 'ok' | 'error' | 'idle', message: string }>({
    loading: false,
    status: 'idle',
    message: ''
  });

  const checkConnection = async () => {
    setConnStatus(prev => ({ ...prev, loading: true }));
    const result = await testSupabaseConnection();
    setConnStatus({
      loading: false,
      status: result.success ? 'ok' : 'error',
      message: result.message
    });
  };

  const fetchLastSync = async (userId: string) => {
    try {
      const { data } = await supabase.from('user_data').select('updated_at').eq('user_id', userId).maybeSingle();
      if (data) setLastSyncDate(data.updated_at);
    } catch (e) {}
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchLastSync(u.id);
        checkConnection();
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchLastSync(u.id);
        checkConnection();
      } else {
        setLastSyncDate(null);
        setConnStatus({ loading: false, status: 'idle', message: '' });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleBackup = () => {
    const dataStr = JSON.stringify({ history, customSongs, learningList }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_igreja_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json && Array.isArray(json.history)) {
          if (window.confirm("Restaurar backup? Isso substituirá seus dados atuais.")) {
            onRestore(json.history, json.customSongs || [], json.learningList || []);
          }
        }
      } catch (err) { alert("Arquivo inválido."); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-10 animate-fadeIn max-w-4xl mx-auto pb-10">
      <div className="px-2">
        <h2 className="text-2xl font-black text-white flex items-center gap-4 tracking-tight uppercase">
          <span className="material-icons text-indigo-500">settings</span>
          Nuvem e Backup
        </h2>
      </div>

      <div className="bg-[#1e293b] rounded-[3rem] p-10 md:p-14 shadow-2xl border border-white/5 relative overflow-hidden">
        <div className="absolute -right-16 -bottom-16 opacity-[0.03]">
           <span className="material-icons text-[20rem]">cloud_sync</span>
        </div>
        
        <div className="relative z-10 flex flex-col space-y-10">
           {user ? (
             <div className="space-y-8">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                 <div className="flex items-center gap-6">
                   <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-3xl flex items-center justify-center border border-emerald-500/20">
                     <span className="material-icons text-3xl">cloud_done</span>
                   </div>
                   <div className="flex flex-col">
                     <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-1">Sincronização em Tempo Real</span>
                     <span className="text-white font-black text-sm uppercase leading-none">{user.email}</span>
                     <p className="text-white/20 text-[9px] font-black uppercase tracking-widest mt-2">Os dados são salvos automaticamente.</p>
                   </div>
                 </div>
                 <button 
                  onClick={onForceSync}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl active:scale-95"
                 >
                   <span className="material-icons text-sm">refresh</span>
                   Forçar Atualização
                 </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block mb-2">Conexão Supabase</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${connStatus.status === 'ok' ? 'bg-emerald-500' : connStatus.status === 'error' ? 'bg-rose-500' : 'bg-slate-500'}`}></div>
                      <span className={`text-[10px] font-black uppercase ${connStatus.status === 'error' ? 'text-rose-400' : 'text-white/60'}`}>
                        {connStatus.loading ? 'Verificando...' : connStatus.status === 'ok' ? 'Ativa' : connStatus.status === 'error' ? 'Falha' : 'Desconectado'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block mb-2">Última Modificação Cloud</span>
                    <span className="text-white font-black text-xs uppercase tracking-tight">
                      {lastSyncDate ? new Date(lastSyncDate).toLocaleString('pt-BR') : 'Sem registros na nuvem'}
                    </span>
                  </div>
               </div>
               
               <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                 <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider leading-relaxed">
                   Dica: Se os dados não aparecerem em outro dispositivo, clique em "Forçar Atualização" ou certifique-se de que ambos estão logados com a mesma conta.
                 </p>
               </div>
             </div>
           ) : (
             <div className="text-center py-10 space-y-6">
               <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white/10">
                 <span className="material-icons text-4xl">cloud_off</span>
               </div>
               <div className="max-w-xs mx-auto">
                 <h3 className="text-white font-black text-lg uppercase tracking-widest">Nuvem Desconectada</h3>
                 <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest mt-2 leading-relaxed">Faça login para manter seus relatórios seguros e sincronizados com outros aparelhos.</p>
               </div>
             </div>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#1e293b] rounded-[3rem] p-10 border border-white/5 shadow-2xl flex flex-col items-center text-center group">
          <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-8 text-indigo-400 group-hover:scale-110 transition-transform">
            <span className="material-icons text-3xl">download</span>
          </div>
          <h4 className="text-lg font-black text-white mb-2 uppercase tracking-tighter">Exportar Local</h4>
          <p className="text-white/20 text-[10px] font-bold uppercase mb-10 tracking-widest leading-relaxed">Salva um arquivo JSON no seu aparelho como segurança extra.</p>
          <button onClick={handleBackup} className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-xl active:scale-95 transition-all text-[11px] tracking-widest uppercase">BAIXAR ARQUIVO</button>
        </div>

        <div className="bg-[#1e293b] rounded-[3rem] p-10 border border-white/5 shadow-2xl flex flex-col items-center text-center group">
          <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-8 text-emerald-400 group-hover:scale-110 transition-transform">
            <span className="material-icons text-3xl">upload</span>
          </div>
          <h4 className="text-lg font-black text-white mb-2 uppercase tracking-tighter">Importar Local</h4>
          <p className="text-white/20 text-[10px] font-bold uppercase mb-10 tracking-widest leading-relaxed">Carrega dados de um arquivo de backup salvo anteriormente.</p>
          <button onClick={() => fileInputRef.current?.click()} className="w-full py-5 bg-emerald-600 text-white font-black rounded-3xl shadow-xl active:scale-95 transition-all text-[11px] tracking-widest uppercase">CARREGAR ARQUIVO</button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
        </div>
      </div>
    </div>
  );
};

export default BackupRestore;
