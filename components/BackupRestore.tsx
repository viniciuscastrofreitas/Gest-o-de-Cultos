
import React, { useRef, useState, useEffect } from 'react';
import { ServiceRecord, PraiseLearningItem } from '../types';
import { supabase } from '../supabase';

interface Props {
  history: ServiceRecord[];
  customSongs: string[];
  learningList: PraiseLearningItem[];
  onRestore: (history: ServiceRecord[], customSongs: string[], learningList: PraiseLearningItem[]) => void;
}

const BackupRestore: React.FC<Props> = ({ history, customSongs, learningList, onRestore }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null);

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
      if (u) fetchLastSync(u.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchLastSync(u.id);
      else setLastSyncDate(null);
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
          Backup e Sistema
        </h2>
      </div>

      <div className="bg-[#1e293b] rounded-[3rem] p-10 md:p-14 shadow-2xl border border-white/5 relative overflow-hidden">
        <div className="absolute -right-16 -bottom-16 opacity-[0.03]">
           <span className="material-icons text-[20rem]">storage</span>
        </div>
        
        <div className="relative z-10 flex flex-col space-y-10">
           {user ? (
             <div className="space-y-8">
               <div className="flex items-center gap-6">
                 <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-3xl flex items-center justify-center border border-emerald-500/20">
                   <span className="material-icons text-3xl">verified_user</span>
                 </div>
                 <div className="flex flex-col">
                   <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-1">Backup em Nuvem Ativo</span>
                   <span className="text-white font-black text-sm uppercase leading-none">{user.email}</span>
                   <p className="text-white/20 text-[9px] font-black uppercase tracking-widest mt-2">Sincronização Automática Ativa</p>
                 </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block mb-2">Última Sincronização</span>
                    <span className="text-white font-black text-xs uppercase tracking-tight">
                      {lastSyncDate ? new Date(lastSyncDate).toLocaleString('pt-BR') : 'Sem registros'}
                    </span>
                  </div>
                  <button onClick={() => supabase.auth.signOut()} className="bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 px-8 py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest transition-all border border-rose-500/10">Sair desta Conta</button>
               </div>
             </div>
           ) : (
             <div className="text-center py-10 space-y-6">
               <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white/10">
                 <span className="material-icons text-4xl">cloud_off</span>
               </div>
               <div className="max-w-xs mx-auto">
                 <h3 className="text-white font-black text-lg uppercase tracking-widest">Nuvem Inativa</h3>
                 <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest mt-2 leading-relaxed">Faça login pelo menu lateral para ativar a sincronização entre dispositivos.</p>
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
          <p className="text-white/20 text-[10px] font-bold uppercase mb-10 tracking-widest leading-relaxed">Backup manual em arquivo offline (JSON).</p>
          <button onClick={handleBackup} className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-xl active:scale-95 transition-all text-[11px] tracking-widest uppercase">SALVAR ARQUIVO</button>
        </div>

        <div className="bg-[#1e293b] rounded-[3rem] p-10 border border-white/5 shadow-2xl flex flex-col items-center text-center group">
          <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-8 text-emerald-400 group-hover:scale-110 transition-transform">
            <span className="material-icons text-3xl">upload</span>
          </div>
          <h4 className="text-lg font-black text-white mb-2 uppercase tracking-tighter">Restaurar Local</h4>
          <p className="text-white/20 text-[10px] font-bold uppercase mb-10 tracking-widest leading-relaxed">Carregar hinos e relatórios de arquivo externo.</p>
          <button onClick={() => fileInputRef.current?.click()} className="w-full py-5 bg-emerald-600 text-white font-black rounded-3xl shadow-xl active:scale-95 transition-all text-[11px] tracking-widest uppercase">ABRIR BACKUP</button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
        </div>
      </div>
    </div>
  );
};

export default BackupRestore;
