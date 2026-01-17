
import React, { useRef, useState, useEffect } from 'react';
import { ServiceRecord, PraiseLearningItem } from '../types';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged } from '../firebase';
import { loadFromCloud, saveData } from '../db';

interface Props {
  history: ServiceRecord[];
  customSongs: string[];
  learningList: PraiseLearningItem[];
  onRestore: (history: ServiceRecord[], customSongs: string[], learningList: PraiseLearningItem[]) => void;
}

const BackupRestore: React.FC<Props> = ({ history, customSongs, learningList, onRestore }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState(auth.currentUser);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  const handleBackup = () => {
    if (history.length === 0 && customSongs.length === 0 && learningList.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }
    const dataStr = JSON.stringify({ history, customSongs, learningList }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_igreja_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
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
        } else {
          alert("Arquivo inválido.");
        }
      } catch (err) {
        alert("Erro ao ler o arquivo.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error(e);
      alert("Erro ao fazer login com Google.");
    }
  };

  const handleRestoreFromCloud = async () => {
    if (!window.confirm("Isso substituirá seus dados locais pela versão salva na nuvem. Continuar?")) return;
    setIsSyncing(true);
    try {
      const data = await loadFromCloud();
      if (data) {
        onRestore(data.history, data.customSongs || [], data.learningList || []);
        alert("Dados restaurados da nuvem com sucesso!");
      } else {
        alert("Nenhum dado encontrado na sua conta cloud.");
      }
    } catch (e) {
      alert("Erro ao carregar dados da nuvem.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      await saveData({ history, customSongs, learningList });
      alert("Dados enviados para a nuvem!");
    } catch (e) {
      alert("Erro na sincronização manual.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto pb-10">
      <div className="px-2">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <span className="material-icons text-indigo-600">settings</span>
          Backup e Sincronização
        </h2>
      </div>

      {/* Cloud Sync Panel */}
      <div className="bg-[#1a1c3d] rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-white/5 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-5">
           <span className="material-icons text-[15rem]">cloud_sync</span>
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-xl ${user ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/40'}`}>
              <span className="material-icons text-3xl">{user ? 'cloud_done' : 'cloud_off'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Nuvem Firebase</span>
              <h3 className="text-white font-black text-lg tracking-tight">
                {user ? `Conectado: ${user.displayName}` : 'Sincronização Desativada'}
              </h3>
              <p className="text-white/40 text-[10px] font-medium uppercase mt-1">
                {user ? 'Seus dados estão sendo salvos em tempo real' : 'Faça login para salvar seus dados na nuvem'}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            {user ? (
              <>
                <button 
                  disabled={isSyncing}
                  onClick={handleSyncNow}
                  className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
                >
                  <span className={`material-icons text-sm ${isSyncing ? 'animate-spin' : ''}`}>{isSyncing ? 'sync' : 'upload'}</span>
                  {isSyncing ? 'Sincronizando...' : 'Enviar Agora'}
                </button>
                <button 
                  onClick={handleRestoreFromCloud}
                  className="bg-amber-400 text-[#1a1c3d] px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95"
                >
                  Restaurar Cloud
                </button>
                <button 
                  onClick={() => signOut(auth)}
                  className="bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                >
                  Sair
                </button>
              </>
            ) : (
              <button 
                onClick={handleLogin}
                className="bg-white text-[#1a1c3d] px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl active:scale-95 transition-all"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/instrumentation/google.svg" className="w-5 h-5" alt="G" />
                Entrar com Google
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Local Backup Options */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center mb-6 text-indigo-600">
            <span className="material-icons text-3xl">download</span>
          </div>
          <h4 className="text-lg font-black text-[#1a1c3d] mb-2 uppercase tracking-tight">Exportar Offline</h4>
          <p className="text-slate-400 text-[10px] font-bold uppercase mb-8 tracking-widest leading-relaxed px-4">Baixe um arquivo .json para backup manual ou transferência sem internet.</p>
          <button 
            onClick={handleBackup} 
            className="w-full py-5 bg-indigo-500 text-white font-black rounded-[2rem] shadow-lg active:scale-95 transition-all text-[11px] tracking-widest uppercase"
          >
            BAIXAR ARQUIVO
          </button>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-[1.5rem] flex items-center justify-center mb-6 text-emerald-600">
            <span className="material-icons text-3xl">file_open</span>
          </div>
          <h4 className="text-lg font-black text-[#1a1c3d] mb-2 uppercase tracking-tight">Importar Arquivo</h4>
          <p className="text-slate-400 text-[10px] font-bold uppercase mb-8 tracking-widest leading-relaxed px-4">Restaure relatórios a partir de um backup local baixado anteriormente.</p>
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="w-full py-5 bg-emerald-500 text-white font-black rounded-[2rem] shadow-lg active:scale-95 transition-all text-[11px] tracking-widest uppercase"
          >
            ABRIR BACKUP
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
        </div>
      </div>

      <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
        <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest px-1">Resumo do Sistema</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-50 flex flex-col">
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Total de Cultos</span>
            <span className="text-xl font-black text-[#1a1c3d]">{history.length}</span>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-50 flex flex-col">
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Banco Local</span>
            <span className="text-xl font-black text-emerald-500 flex items-center gap-2">
              <span className="material-icons text-sm">storage</span> Ativo
            </span>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-50 flex flex-col">
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Status Offline</span>
            <span className={`text-xl font-black ${!navigator.onLine ? 'text-amber-500' : 'text-indigo-400'}`}>
              {navigator.onLine ? 'Conectado' : 'Modo Offline'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackupRestore;
