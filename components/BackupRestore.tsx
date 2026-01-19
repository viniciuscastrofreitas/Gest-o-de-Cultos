
import React, { useRef, useState, useEffect } from 'react';
import { ServiceRecord, PraiseLearningItem } from '../types';
import { supabase } from '../supabase';
import AuthForm from './AuthForm';

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
      const { data } = await supabase
        .from('user_data')
        .select('updated_at')
        .eq('user_id', userId)
        .maybeSingle();
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
          if (window.confirm("Isso substituirá seus dados atuais. Continuar?")) {
            onRestore(json.history, json.customSongs || [], json.learningList || []);
          }
        }
      } catch (err) { alert("Arquivo inválido."); }
    };
    reader.readAsText(file);
  };

  const handleRestoreFromCloud = async () => {
    if (!user) return;
    if (!window.confirm("Substituir dados locais pela versão da nuvem?")) return;
    
    setIsSyncing(true);
    try {
      const { data } = await supabase.from('user_data').select('json_data').eq('user_id', user.id).maybeSingle();
      if (data?.json_data) {
        onRestore(data.json_data.history || [], data.json_data.customSongs || [], data.json_data.learningList || []);
        alert("Restaurado com sucesso!");
      } else {
        alert("Nenhum dado encontrado na nuvem para este usuário.");
      }
    } catch (e: any) { alert("Erro ao baixar dados."); }
    finally { setIsSyncing(false); }
  };

  const handleUploadToCloud = async () => {
    if (!user) return;
    if (!window.confirm("Deseja enviar seus dados locais atuais para a nuvem? Isso sobrescreverá o backup online anterior.")) return;

    setIsSyncing(true);
    try {
      const { error } = await supabase.from('user_data').upsert({
        user_id: user.id,
        json_data: { history, customSongs, learningList },
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

      if (error) throw error;
      
      await fetchLastSync(user.id);
      alert("Dados enviados para a nuvem com sucesso!");
    } catch (e: any) {
      alert("Erro ao enviar dados: " + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto pb-10">
      <div className="px-2">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <span className="material-icons text-indigo-600">cloud_done</span>
          Sincronização Cloud
        </h2>
      </div>

      <div className="bg-[#1a1c3d] rounded-[2.5rem] p-8 md:p-12 shadow-2xl border border-white/5 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-5">
           <span className="material-icons text-[15rem]">storage</span>
        </div>
        
        <div className="relative z-10">
          {!user ? (
            <div className="flex flex-col items-center text-center space-y-8">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-white/20">
                <span className="material-icons text-4xl">lock_open</span>
              </div>
              <div className="max-w-xs">
                <h3 className="text-white font-black text-xl uppercase tracking-tight">Área Restrita</h3>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-2 leading-relaxed">
                  Faça login com sua conta interna para habilitar o salvamento automático e sincronização em tempo real.
                </p>
              </div>
              <AuthForm onSuccess={() => {}} />
            </div>
          ) : (
            <div className="flex flex-col space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-500 text-white flex items-center justify-center shadow-xl animate-scaleUp">
                    <span className="material-icons text-3xl">verified_user</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Conta Conectada</span>
                    <h3 className="text-white font-black text-lg tracking-tight truncate max-w-[200px]">
                      {user.email}
                    </h3>
                    <p className="text-white/40 text-[10px] font-medium uppercase mt-1">
                      {lastSyncDate ? `Último envio: ${new Date(lastSyncDate).toLocaleString('pt-BR')}` : 'Aguardando sincronização'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => supabase.auth.signOut()}
                    className="bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                  >
                    Sair da Conta
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <button 
                  disabled={isSyncing}
                  onClick={handleUploadToCloud}
                  className="bg-indigo-500 text-white hover:bg-indigo-600 px-6 py-5 rounded-3xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100"
                >
                  <span className={`material-icons ${isSyncing ? 'animate-spin' : ''}`}>
                    {isSyncing ? 'sync' : 'cloud_upload'}
                  </span>
                  {isSyncing ? 'Processando...' : 'Enviar para Nuvem'}
                </button>

                <button 
                  disabled={isSyncing}
                  onClick={handleRestoreFromCloud}
                  className="bg-white/10 text-white hover:bg-white/20 px-6 py-5 rounded-3xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100"
                >
                  <span className={`material-icons ${isSyncing ? 'animate-spin' : ''}`}>
                    {isSyncing ? 'sync' : 'cloud_download'}
                  </span>
                  {isSyncing ? 'Processando...' : 'Restaurar Cloud'}
                </button>
              </div>
              
              <p className="text-center text-white/20 text-[9px] font-black uppercase tracking-[0.3em]">
                O auto-sync salva alterações automaticamente a cada 3 segundos
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col items-center text-center group">
          <div className="w-16 h-16 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center mb-6 text-indigo-600 group-hover:scale-110 transition-transform">
            <span className="material-icons text-3xl">download</span>
          </div>
          <h4 className="text-lg font-black text-[#1a1c3d] mb-2 uppercase">Exportar Offline</h4>
          <p className="text-slate-400 text-[10px] font-bold uppercase mb-8 tracking-widest">Backup manual em arquivo JSON.</p>
          <button onClick={handleBackup} className="w-full py-5 bg-indigo-500 text-white font-black rounded-[2rem] shadow-lg active:scale-95 transition-all text-[11px] tracking-widest uppercase">GERAR ARQUIVO</button>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col items-center text-center group">
          <div className="w-16 h-16 bg-emerald-50 rounded-[1.5rem] flex items-center justify-center mb-6 text-emerald-600 group-hover:scale-110 transition-transform">
            <span className="material-icons text-3xl">upload</span>
          </div>
          <h4 className="text-lg font-black text-[#1a1c3d] mb-2 uppercase">Importar Offline</h4>
          <p className="text-slate-400 text-[10px] font-bold uppercase mb-8 tracking-widest">Restaurar a partir de arquivo local.</p>
          <button onClick={() => fileInputRef.current?.click()} className="w-full py-5 bg-emerald-500 text-white font-black rounded-[2rem] shadow-lg active:scale-95 transition-all text-[11px] tracking-widest uppercase">ABRIR BACKUP</button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
        </div>
      </div>
    </div>
  );
};

export default BackupRestore;
