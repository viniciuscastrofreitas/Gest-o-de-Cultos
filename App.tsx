
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { INITIAL_PRAISE_LIST } from './constants';
import { ServiceRecord, SongStats, ServiceDraft, PraiseLearningItem } from './types';
import ServiceForm from './components/ServiceForm';
import HistoryList from './components/HistoryList';
import RankingList from './components/RankingList';
import BackupRestore from './components/BackupRestore';
import UnplayedList from './components/UnplayedList';
import WorkerStats from './components/WorkerStats';
import WorkerRanking from './components/WorkerRanking';
import PraiseLearningList from './components/PraiseLearningList';
import { initDB, saveData, loadData } from './db';
import { supabase } from './supabase';
import AuthForm from './components/AuthForm';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'new' | 'history' | 'workers' | 'suggestions' | 'praise-ranking' | 'unplayed' | 'learning' | 'settings'>('new');
  const [history, setHistory] = useState<ServiceRecord[]>([]);
  const [customSongs, setCustomSongs] = useState<string[]>([]);
  const [learningList, setLearningList] = useState<PraiseLearningItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'local'>('local');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCloudRestoreConfirm, setShowCloudRestoreConfirm] = useState(false);
  const [showRestoreSuccess, setShowRestoreSuccess] = useState(false);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const [isCloudActionLoading, setIsCloudActionLoading] = useState(false);
  
  const [isReadyForCloudSync, setIsReadyForCloudSync] = useState(false);
  const syncTimeoutRef = useRef<number | null>(null);

  const getTodayDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const emptyRoles = { gate: '', praise: '', word: '', scripture: '', leader: '' };

  const [draft, setDraft] = useState<ServiceDraft>({
    date: getTodayDate(),
    description: '',
    songs: [],
    roles: { ...emptyRoles }
  });

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const setup = async () => {
      try {
        await initDB();
        const localData = await loadData();
        
        if (localData) {
          if (localData.history) setHistory(localData.history);
          if (localData.customSongs) setCustomSongs(localData.customSongs);
          if (localData.learningList) setLearningList(localData.learningList);
          if (localData.draft) setDraft(localData.draft);
        }

        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          const { data: cloudData } = await supabase
            .from('user_data')
            .select('json_data')
            .eq('user_id', currentUser.id)
            .maybeSingle();

          if (cloudData?.json_data) {
            const cloud = cloudData.json_data;
            if (localData?.history?.length === 0 && cloud.history?.length > 0) {
              setHistory(cloud.history || []);
              setCustomSongs(cloud.customSongs || []);
              setLearningList(cloud.learningList || []);
              if (cloud.draft) setDraft(cloud.draft);
            }
          }
        }
      } catch (e) {
        console.error("Erro no setup inicial:", e);
      } finally {
        setIsLoading(false);
        setIsReadyForCloudSync(true);
      }
    };
    setup();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;
    saveData({ history, customSongs, draft, learningList });
  }, [history, customSongs, draft, learningList, isLoading]);

  useEffect(() => {
    if (!isReadyForCloudSync || !user || isOffline) {
      if (user && isOffline) setSyncStatus('local');
      return;
    }

    setSyncStatus('syncing');
    if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
    
    syncTimeoutRef.current = window.setTimeout(async () => {
      try {
        const { error } = await supabase.from('user_data').upsert({ 
          user_id: user.id, 
          json_data: { history, customSongs, learningList, draft },
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
        
        if (error) throw error;
        setSyncStatus('synced');
      } catch (e) {
        setSyncStatus('local');
      }
    }, 2000);

    return () => {
      if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
    };
  }, [history, customSongs, learningList, draft, user, isOffline, isReadyForCloudSync]);

  const handleManualUpload = async () => {
    if (!user || isOffline) return;
    setIsCloudActionLoading(true);
    try {
      const { error } = await supabase.from('user_data').upsert({
        user_id: user.id,
        json_data: { history, customSongs, learningList, draft },
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
      if (error) throw error;
      setSyncStatus('synced');
      setShowSyncSuccess(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCloudActionLoading(false);
    }
  };

  const handleManualDownload = () => {
    if (!user || isOffline) return;
    setShowCloudRestoreConfirm(true);
  };

  const executeManualDownload = async () => {
    setShowCloudRestoreConfirm(false);
    setIsCloudActionLoading(true);
    try {
      const { data } = await supabase.from('user_data').select('json_data').eq('user_id', user.id).maybeSingle();
      if (data?.json_data) {
        setHistory(data.json_data.history || []);
        setCustomSongs(data.json_data.customSongs || []);
        setLearningList(data.json_data.learningList || []);
        if (data.json_data.draft) setDraft(data.json_data.draft);
        setShowRestoreSuccess(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCloudActionLoading(false);
    }
  };

  const fullSongList = useMemo(() => {
    return [...new Set([...INITIAL_PRAISE_LIST, ...customSongs])].sort((a, b) => a.localeCompare(b));
  }, [customSongs]);

  const songStats = useMemo(() => {
    const stats: Record<string, SongStats> = {};
    history.forEach(record => {
      record.songs.forEach(song => {
        if (!stats[song]) stats[song] = { song, count: 0, lastDate: null, history: [] };
        stats[song].count++;
        stats[song].history.push(record.date);
      });
    });
    Object.keys(stats).forEach(s => {
      stats[s].history.sort((a, b) => b.localeCompare(a));
      stats[s].lastDate = stats[s].history[0];
    });
    return stats;
  }, [history]);

  const saveRecord = (data: Omit<ServiceRecord, 'id'>) => {
    if (editingId) {
      setHistory(prev => prev.map(r => r.id === editingId ? { ...data, id: editingId } : r));
      setEditingId(null);
    } else {
      setHistory(prev => [{ ...data, id: crypto.randomUUID() }, ...prev]);
    }
    setDraft({ date: getTodayDate(), description: '', songs: [], roles: { ...emptyRoles } });
  };

  const menuItems = [
    { id: 'new', icon: 'add_circle', label: 'Novo Culto' },
    { id: 'history', icon: 'history', label: 'Histórico' },
    { id: 'unplayed', icon: 'assignment_late', label: 'Hinos Restantes' },
    { id: 'learning', icon: 'school', label: 'Aprendizado' },
    { id: 'praise-ranking', icon: 'trending_up', label: 'Ranking Hinos' },
    { id: 'workers', icon: 'emoji_events', label: 'Ranking Obreiros' },
    { id: 'suggestions', icon: 'assignment_ind', label: 'Escala / Sugestão' },
    { id: 'settings', icon: 'settings', label: 'Backup / Sistema' },
  ] as const;

  const handleTabChange = (id: typeof activeTab) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
    window.scrollTo(0,0);
  };

  const AppBrand = () => (
    <div className="flex items-center gap-5">
      <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center p-2.5">
        <img src="https://cdn-icons-png.flaticon.com/512/1672/1672225.png" alt="Logo" className="w-full h-full object-contain" />
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
           <span className={`material-icons text-[14px] ${syncStatus === 'synced' ? 'text-emerald-400' : syncStatus === 'syncing' ? 'text-amber-400 animate-spin' : 'text-white/20'}`}>
             {syncStatus === 'synced' ? 'cloud_done' : syncStatus === 'syncing' ? 'sync' : 'cloud_off'}
           </span>
           <span className="text-white/60 font-black text-[10px] tracking-[0.2em] uppercase">
             {syncStatus === 'synced' ? 'Nuvem OK' : syncStatus === 'syncing' ? 'Salvando...' : 'Local'}
           </span>
        </div>
        <h1 className="text-white font-black text-xl tracking-tighter leading-tight uppercase whitespace-nowrap">Santo Antônio II</h1>
        <div className="mt-1 bg-white/10 self-start px-3 py-1 rounded-full flex items-center gap-2">
           <span className="material-icons text-amber-400 text-xs">analytics</span>
           <span className="text-white font-black text-[10px] uppercase">{history.length} Cultos</span>
        </div>
      </div>
    </div>
  );

  const UserProfile = () => {
    if (!user) {
      return (
        <div className="px-10 py-8 border-b border-white/5 animate-fadeIn">
          <button 
            onClick={() => setShowLoginModal(true)}
            className="w-full py-5 bg-amber-400 text-[#1a1c3d] rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all"
          >
            <span className="material-icons text-lg">cloud_sync</span>
            Entrar / Sincronizar
          </button>
        </div>
      );
    }
    return (
      <div className="px-10 py-8 border-b border-white/5 space-y-6 bg-white/5 animate-fadeIn">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
            <span className="material-icons text-[#1a1c3d] text-2xl">person</span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-white font-black text-xs uppercase truncate leading-tight">{user.email?.split('@')[0]}</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'}`}></span>
              <span className="text-white/30 font-bold text-[8px] uppercase tracking-widest">{isOffline ? 'Offline' : 'Conectado'}</span>
            </div>
          </div>
          <button 
            onClick={() => supabase.auth.signOut()}
            className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-400 hover:bg-rose-500/20 transition-all"
            title="Sair"
          >
            <span className="material-icons text-sm">logout</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button 
            disabled={isCloudActionLoading || isOffline}
            onClick={handleManualUpload}
            className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-lg disabled:opacity-50"
          >
            <span className={`material-icons text-sm ${isCloudActionLoading ? 'animate-spin' : ''}`}>cloud_upload</span>
            <span className="text-[7px] font-black uppercase tracking-widest">Sincronizar</span>
          </button>
          <button 
            disabled={isCloudActionLoading || isOffline}
            onClick={handleManualDownload}
            className="flex-1 bg-amber-400 hover:bg-amber-500 text-[#1a1c3d] py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-lg disabled:opacity-50"
          >
            <span className={`material-icons text-sm ${isCloudActionLoading ? 'animate-spin' : ''}`}>cloud_download</span>
            <span className="text-[7px] font-black uppercase tracking-widest">Recuperar</span>
          </button>
        </div>
      </div>
    );
  };

  if (isLoading) return <div className="min-h-screen bg-[#1a1c3d] flex flex-col items-center justify-center text-white p-10"><img src="https://cdn-icons-png.flaticon.com/512/1672/1672225.png" className="w-20 h-20 animate-bounce mb-6" /><p className="font-black tracking-widest text-sm animate-pulse">CARREGANDO SISTEMA...</p></div>;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row">
      <aside className="hidden md:flex w-96 bg-[#1a1c3d] flex-col sticky top-0 h-screen shadow-2xl z-[150]">
        <div className="p-12 border-b border-white/5">
          <AppBrand />
        </div>
        
        <UserProfile />

        <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
          {menuItems.map(item => (
            <button 
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`w-full flex items-center gap-6 px-12 py-6 transition-all duration-300 ${activeTab === item.id ? 'bg-amber-400 text-[#1a1c3d] font-black' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              <span className="material-icons text-2xl">{item.icon}</span>
              <span className="text-sm uppercase font-black tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <header className="md:hidden bg-[#1a1c3d] text-white p-6 sticky top-0 z-[200] flex justify-between items-center shadow-2xl rounded-b-[2rem]">
        <AppBrand />
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-4 bg-white/10 rounded-2xl active:scale-90 transition-transform">
          <span className="material-icons text-3xl">menu</span>
        </button>
      </header>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[300] md:hidden">
          <div className="absolute inset-0 bg-[#1a1c3d]/90 backdrop-blur-lg" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="absolute top-0 right-0 bottom-0 w-[85%] bg-[#1a1c3d] shadow-2xl flex flex-col animate-slideInRight border-l border-white/5">
            <div className="p-10 flex justify-between items-center border-b border-white/5">
              <span className="text-white/40 font-black text-xs tracking-widest uppercase">Navegação Principal</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-white/40"><span className="material-icons">close</span></button>
            </div>
            
            <UserProfile />

            <nav className="flex-1 py-4 overflow-y-auto">
              {menuItems.map(item => (
                <button 
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`w-full flex items-center gap-8 px-10 py-7 border-b border-white/5 ${activeTab === item.id ? 'text-amber-400 bg-white/5 font-black' : 'text-white/60'}`}
                >
                  <span className="material-icons text-3xl">{item.icon}</span>
                  <span className="text-base font-black uppercase tracking-widest">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {showLoginModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-[#1a1c3d]/95 backdrop-blur-xl animate-fadeIn" onClick={() => setShowLoginModal(false)} />
          <div className="relative bg-white/5 border border-white/10 rounded-[3rem] p-10 w-full max-w-sm shadow-2xl animate-scaleUp">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-20 h-20 bg-amber-400 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-amber-400/20">
                <span className="material-icons text-4xl text-[#1a1c3d]">cloud_sync</span>
              </div>
              <h2 className="text-white font-black text-2xl uppercase tracking-tighter">Sincronizar</h2>
              <p className="text-white/40 font-bold text-[10px] uppercase tracking-widest mt-2 leading-relaxed">Acesse sua conta para manter seus dados seguros em qualquer lugar.</p>
            </div>
            <AuthForm onSuccess={() => setShowLoginModal(false)} />
            <button 
              onClick={() => setShowLoginModal(false)}
              className="w-full mt-6 py-4 text-white/20 font-black text-[10px] uppercase tracking-widest hover:text-white transition-all"
            >
              FECHAR
            </button>
          </div>
        </div>
      )}

      {showCloudRestoreConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-[#1a1c3d]/95 backdrop-blur-xl animate-fadeIn" onClick={() => setShowCloudRestoreConfirm(false)} />
          <div className="relative bg-white border border-white rounded-[3rem] p-10 w-full max-w-sm shadow-2xl animate-scaleUp text-center">
            <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-amber-500 shadow-xl shadow-amber-400/10">
              <span className="material-icons text-4xl">cloud_download</span>
            </div>
            <h2 className="text-[#1a1c3d] font-black text-2xl uppercase tracking-tighter">Restaurar Nuvem?</h2>
            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-4 leading-relaxed px-4">
              Isso substituirá seus dados locais pela versão da nuvem (incluindo rascunhos). <span className="text-rose-500 font-black">Esta ação é definitiva.</span>
            </p>
            <div className="mt-10 space-y-3">
              <button 
                onClick={executeManualDownload}
                className="w-full py-5 bg-[#1a1c3d] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"
              >
                SIM, RESTAURAR AGORA
              </button>
              <button 
                onClick={() => setShowCloudRestoreConfirm(false)}
                className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-[#1a1c3d] transition-all"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}

      {showRestoreSuccess && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-[#1a1c3d]/90 backdrop-blur-md animate-fadeIn" onClick={() => setShowRestoreSuccess(false)} />
          <div className="relative bg-white rounded-[3.5rem] p-10 w-full max-w-sm shadow-2xl animate-scaleUp text-center border border-white">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500">
              <span className="material-icons text-4xl">cloud_done</span>
            </div>
            <h3 className="text-2xl font-black text-[#1a1c3d] mb-2 uppercase tracking-tighter">Dados Recuperados!</h3>
            <p className="text-slate-600 font-bold text-[10px] uppercase tracking-[0.2em] mb-8">Sincronização concluída com sucesso.</p>
            <button 
              onClick={() => setShowRestoreSuccess(false)} 
              className="w-full py-5 bg-[#1a1c3d] text-white font-black rounded-3xl shadow-lg active:scale-95 transition-all uppercase text-xs tracking-widest"
            >
              ENTENDIDO
            </button>
          </div>
        </div>
      )}

      {showSyncSuccess && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-[#1a1c3d]/90 backdrop-blur-md animate-fadeIn" onClick={() => setShowSyncSuccess(false)} />
          <div className="relative bg-white rounded-[3.5rem] p-10 w-full max-w-sm shadow-2xl animate-scaleUp text-center border border-white">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-500">
              <span className="material-icons text-4xl">cloud_done</span>
            </div>
            <h3 className="text-2xl font-black text-[#1a1c3d] mb-2 uppercase tracking-tighter">Sincronizado!</h3>
            <p className="text-slate-600 font-bold text-[10px] uppercase tracking-[0.2em] mb-8">Seus dados foram salvos na nuvem.</p>
            <button 
              onClick={() => setShowSyncSuccess(false)} 
              className="w-full py-5 bg-[#1a1c3d] text-white font-black rounded-3xl shadow-lg active:scale-95 transition-all uppercase text-xs tracking-widest"
            >
              EXCELENTE
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0">
        {isOffline && (
          <div className="bg-amber-500 text-white text-[10px] font-black uppercase py-2.5 text-center sticky top-[92px] md:top-0 z-[190] shadow-lg">
            Modo Offline: Seus dados estão sendo salvos localmente e serão sincronizados ao conectar.
          </div>
        )}
        
        <div className="px-4 pt-14 pb-20 md:p-16 animate-fadeIn max-w-6xl mx-auto">
          {activeTab === 'new' && <ServiceForm onSave={saveRecord} songStats={songStats} fullSongList={fullSongList} onRegisterNewSong={s => setCustomSongs(prev => [...prev, s])} draft={draft} setDraft={setDraft} editingId={editingId} onCancelEdit={() => setEditingId(null)} />}
          {activeTab === 'history' && <HistoryList history={history} onDelete={id => setHistory(prev => prev.filter(r => r.id !== id))} onEdit={r => { setEditingId(r.id); setDraft({ ...r }); setActiveTab('new'); }} onClearAll={() => {}} />}
          {activeTab === 'learning' && <PraiseLearningList fullSongList={fullSongList} learningList={learningList} setLearningList={setLearningList} />}
          {activeTab === 'workers' && <WorkerRanking history={history} />}
          {activeTab === 'suggestions' && <WorkerStats history={history} />}
          {activeTab === 'praise-ranking' && <RankingList songStats={songStats} />}
          {activeTab === 'unplayed' && <UnplayedList fullSongList={INITIAL_PRAISE_LIST} history={history} />}
          {activeTab === 'settings' && <BackupRestore history={history} customSongs={customSongs} learningList={learningList} onRestore={(h, c, l) => { setHistory(h); setCustomSongs(c); setLearningList(l || []); }} />}
        </div>
      </main>
    </div>
  );
};

export default App;
