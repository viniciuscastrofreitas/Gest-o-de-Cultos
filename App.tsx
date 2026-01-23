
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
import AuthForm from './components/AuthForm';
import { initDB, saveData, loadData } from './db';
import { supabase } from './supabase';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'new' | 'history' | 'unplayed' | 'learning' | 'praise-ranking' | 'workers' | 'suggestions' | 'settings'>('new');
  const [history, setHistory] = useState<ServiceRecord[]>([]);
  const [customSongs, setCustomSongs] = useState<string[]>([]);
  const [learningList, setLearningList] = useState<PraiseLearningItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Iniciando sistema...');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'local' | 'error'>('local');
  
  const [hasCheckedCloud, setHasCheckedCloud] = useState(false);
  const lastCloudUpdateRef = useRef<string | null>(null);
  const syncTimeoutRef = useRef<number | null>(null);

  const getTodayDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const getSpecialServiceInfo = (dateString: string) => {
    const d = new Date(dateString + 'T12:00:00');
    const day = d.getDay();
    if (day === 1) return { name: 'Glorificação', color: 'text-indigo-400' };
    if (day === 3) return { name: 'Senhoras', color: 'text-rose-400' };
    if (day === 4) return { name: 'Oração', color: 'text-amber-400' };
    return null;
  };

  const todaySpecial = useMemo(() => getSpecialServiceInfo(getTodayDate()), []);

  const emptyRoles = { gate: '', praise: '', word: '', scripture: '' };

  const [draft, setDraft] = useState<ServiceDraft>({
    date: getTodayDate(),
    description: '',
    songs: [],
    roles: { ...emptyRoles }
  });

  // Função para buscar dados da nuvem e aplicar se forem mais novos
  const pullFromCloud = async (userId: string) => {
    try {
      setSyncStatus('syncing');
      const { data, error } = await supabase
        .from('user_data')
        .select('json_data, updated_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      
      if (data && data.json_data) {
        const cloudTimestamp = data.updated_at;
        if (!lastCloudUpdateRef.current || new Date(cloudTimestamp) > new Date(lastCloudUpdateRef.current)) {
          lastCloudUpdateRef.current = cloudTimestamp;
          const remote = data.json_data;
          if (remote.history) setHistory(remote.history);
          if (remote.customSongs) setCustomSongs(remote.customSongs);
          if (remote.learningList) setLearningList(remote.learningList);
        }
      }
      setSyncStatus('synced');
    } catch (e) {
      console.error("Erro ao puxar dados da nuvem:", e);
      setSyncStatus('error');
    }
  };

  const pushToCloud = async () => {
    if (!user || isOffline) return;
    setSyncStatus('syncing');
    try {
      const timestamp = new Date().toISOString();
      const { error } = await supabase.from('user_data').upsert({ 
        user_id: user.id, 
        json_data: { history, customSongs, learningList },
        updated_at: timestamp
      }, { onConflict: 'user_id' });
      
      if (error) throw error;
      lastCloudUpdateRef.current = timestamp;
      setSyncStatus('synced');
    } catch (e) {
      console.error("Erro ao enviar dados para nuvem:", e);
      setSyncStatus('error');
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);
      if (!newUser) {
        setHasCheckedCloud(false);
        setSyncStatus('local');
        lastCloudUpdateRef.current = null;
      } else {
        setShowAuthModal(false);
      }
    });

    const setup = async () => {
      try {
        setLoadingStatus('Conectando ao banco local...');
        await initDB();
        
        setLoadingStatus('Recuperando seus registros...');
        const data = await loadData();
        
        if (data) {
          setLoadingStatus('Organizando informações...');
          if (data.history) setHistory(data.history);
          if (data.customSongs) setCustomSongs(data.customSongs);
          if (data.learningList) setLearningList(data.learningList);
          if (data.draft) setDraft({ ...data.draft, date: getTodayDate() });
        }
        
        setLoadingStatus('Quase pronto...');
        await new Promise(r => setTimeout(r, 800));
        
      } catch (e) {
        console.error("Erro no DB Local", e);
        setLoadingStatus('Erro ao carregar dados locais.');
      } finally {
        setIsLoading(false);
      }
    };
    setup();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      authSub.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`db-sync-${user.id}`)
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'user_data', filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          if (payload.new && payload.new.updated_at !== lastCloudUpdateRef.current) {
            pullFromCloud(user.id);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    if (user && !isLoading && !hasCheckedCloud) {
      pullFromCloud(user.id).then(() => setHasCheckedCloud(true));
    }
  }, [user, isLoading, hasCheckedCloud]);

  useEffect(() => {
    if (isLoading) return;
    saveData({ history, customSongs, draft, learningList });
    if (user && !isOffline && hasCheckedCloud) {
      if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
      setSyncStatus('syncing');
      syncTimeoutRef.current = window.setTimeout(async () => {
        const { data: remoteInfo } = await supabase.from('user_data').select('updated_at').eq('user_id', user.id).maybeSingle();
        if (remoteInfo && lastCloudUpdateRef.current && new Date(remoteInfo.updated_at) > new Date(lastCloudUpdateRef.current)) {
          await pullFromCloud(user.id);
        } else {
          await pushToCloud();
        }
      }, 2000);
    } else if (!user) {
      setSyncStatus('local');
    }
  }, [history, customSongs, draft, learningList, user, isOffline, isLoading, hasCheckedCloud]);

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
    { id: 'suggestions', icon: 'assignment_ind', label: 'Sugestão Escala' },
    { id: 'settings', icon: 'settings', label: 'Backup / Nuvem' },
  ] as const;

  const handleTabChange = (id: typeof activeTab) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
    window.scrollTo(0,0);
  };

  const AppBrand = () => {
    const statusIcon = { synced: 'cloud_done', syncing: 'sync', local: 'cloud_off', error: 'cloud_off' }[syncStatus];
    const statusColor = { synced: 'text-emerald-400', syncing: 'text-amber-400 animate-spin', local: 'text-slate-500', error: 'text-rose-500' }[syncStatus];
    const statusText = { synced: 'Sincronizado', syncing: 'Sincronizando...', local: 'Modo Local', error: 'Erro Conexão' }[syncStatus];

    return (
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white rounded-xl shadow-xl flex items-center justify-center p-2 shrink-0">
          <img src="https://cdn-icons-png.flaticon.com/512/1672/1672225.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        <div className="flex flex-col min-w-0">
          <h1 className="text-white font-black text-lg tracking-tighter leading-tight uppercase whitespace-nowrap">Santo Antônio II</h1>
          <div className="flex items-center gap-2 mt-0.5">
             <div className="flex items-center gap-1.5">
               <span className={`material-icons text-[12px] ${statusColor}`}>{statusIcon}</span>
               <span className="text-slate-400 font-black text-[9px] uppercase tracking-widest">{statusText}</span>
             </div>
             <div className="h-3 w-px bg-white/10 mx-1"></div>
             <div className="flex items-center gap-1">
               <span className="material-icons text-[12px] text-amber-400">analytics</span>
               <span className="text-amber-400 font-black text-[9px] uppercase tracking-widest">{history.length} Cultos</span>
             </div>
          </div>
        </div>
      </div>
    );
  };

  const UserHeader = () => (
    <div className="p-8 border-b border-white/5 bg-white/5">
      {user ? (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="material-icons text-white">person</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Conta Ativa</span>
            <span className="text-white font-black text-xs uppercase truncate leading-none">{user.email}</span>
            <button onClick={() => supabase.auth.signOut()} className="mt-2 self-start text-[8px] font-black text-rose-400 uppercase tracking-widest hover:text-rose-300">Sair da Conta</button>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setShowAuthModal(true)}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95"
        >
          <span className="material-icons text-sm">login</span>
          Entrar p/ Sincronizar
        </button>
      )}
    </div>
  );

  if (isLoading) return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-white p-10 animate-fadeIn relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="relative mb-12 flex flex-col items-center">
        <div className="w-24 h-24 bg-white rounded-3xl shadow-[0_20px_50px_rgba(79,70,229,0.3)] flex items-center justify-center p-4 relative z-10 animate-pulse">
          <img src="https://cdn-icons-png.flaticon.com/512/1672/1672225.png" className="w-full h-full object-contain" alt="Logo" />
        </div>
      </div>
      <div className="flex flex-col items-center gap-5 max-w-xs w-full relative z-10">
        <div className="text-center">
          <h2 className="font-black tracking-[0.3em] text-[10px] uppercase text-slate-400 mb-1">ICM Santo Antônio II</h2>
          <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.4em]">Gestão Eclesiástica</p>
        </div>
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden relative">
          <div className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 w-1/2 rounded-full animate-loading-bar shadow-[0_0_10px_rgba(79,70,229,0.5)]"></div>
        </div>
        <p className="font-black tracking-[0.15em] text-[9px] uppercase text-indigo-400/80 animate-pulse h-4">{loadingStatus}</p>
      </div>
      <style>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%) scaleX(0.5); }
          50% { transform: translateX(50%) scaleX(1); }
          100% { transform: translateX(200%) scaleX(0.5); }
        }
        .animate-loading-bar { animation: loading-bar 1.8s cubic-bezier(0.65, 0, 0.35, 1) infinite; }
      `}</style>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col md:flex-row">
      <aside className="hidden md:flex w-80 bg-[#1e293b] flex-col sticky top-0 h-screen shadow-2xl z-[150] border-r border-white/5">
        <div className="p-10 border-b border-white/5">
          <AppBrand />
        </div>
        <UserHeader />
        <nav className="flex-1 py-6 overflow-y-auto custom-scrollbar">
          {menuItems.map(item => (
            <button 
              key={item.id} 
              onClick={() => handleTabChange(item.id)} 
              className={`w-full flex items-center justify-between gap-5 px-10 py-5 transition-all duration-300 border-l-4 ${activeTab === item.id ? 'bg-indigo-600/10 border-indigo-500 text-white font-black' : 'border-transparent text-slate-500 hover:text-white/60 hover:bg-white/5'}`}
            >
              <div className="flex items-center gap-5">
                <span className="material-icons text-xl">{item.icon}</span>
                <span className="text-[11px] uppercase font-black tracking-widest">{item.label}</span>
              </div>
              {item.id === 'new' && todaySpecial && (
                <div className={`flex items-center gap-1.5 ${todaySpecial.color} animate-pulse`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                  <span className="text-[8px] font-black uppercase tracking-tighter">{todaySpecial.name}</span>
                </div>
              )}
            </button>
          ))}
        </nav>
      </aside>

      <header className="md:hidden bg-[#1e293b] text-white p-6 sticky top-0 z-[200] flex justify-between items-center shadow-2xl border-b border-white/5">
        <AppBrand />
        <button onClick={() => setIsMobileMenuOpen(true)} className="w-12 h-12 bg-white/5 rounded-2xl active:scale-90 transition-transform flex items-center justify-center">
          <span className="material-icons text-2xl">menu</span>
        </button>
      </header>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[300] md:hidden">
          <div className="absolute inset-0 bg-[#0f172a]/95 backdrop-blur-xl" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="absolute top-0 right-0 bottom-0 w-[85%] bg-[#1e293b] shadow-2xl flex flex-col animate-fadeIn border-l border-white/5">
            <div className="p-8 flex justify-between items-center border-b border-white/5">
              <AppBrand />
              <button onClick={() => setIsMobileMenuOpen(false)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-white/20"><span className="material-icons">close</span></button>
            </div>
            <UserHeader />
            <nav className="flex-1 py-4 overflow-y-auto">
              {menuItems.map(item => (
                <button 
                  key={item.id} 
                  onClick={() => handleTabChange(item.id)} 
                  className={`w-full flex items-center justify-between px-10 py-6 border-b border-white/5 ${activeTab === item.id ? 'text-indigo-400 bg-white/5 font-black' : 'text-slate-400'}`}
                >
                  <div className="flex items-center gap-6">
                    <span className="material-icons text-2xl">{item.icon}</span>
                    <span className="text-[12px] font-black uppercase tracking-widest">{item.label}</span>
                  </div>
                  {item.id === 'new' && todaySpecial && (
                    <span className={`px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest ${todaySpecial.color}`}>
                      {todaySpecial.name}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {showAuthModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-[#0f172a]/90 backdrop-blur-md" onClick={() => setShowAuthModal(false)} />
          <div className="relative w-full max-w-sm bg-[#1e293b] rounded-[3rem] p-10 shadow-2xl border border-white/10 animate-scaleUp">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-white font-black text-xl uppercase tracking-tighter">Login Cloud</h3>
               <button onClick={() => setShowAuthModal(false)} className="text-white/20"><span className="material-icons">close</span></button>
            </div>
            <AuthForm onSuccess={() => setShowAuthModal(false)} />
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0">
        {isOffline && <div className="bg-amber-500 text-white text-[10px] font-black uppercase py-2.5 text-center sticky top-0 z-[190] shadow-lg">Você está operando offline.</div>}
        <div className="px-4 py-10 md:p-16 animate-fadeIn max-w-4xl mx-auto">
          {activeTab === 'new' && <ServiceForm onSave={saveRecord} songStats={songStats} fullSongList={fullSongList} onRegisterNewSong={s => setCustomSongs(prev => [...prev, s])} draft={draft} setDraft={setDraft} editingId={editingId} onCancelEdit={() => setEditingId(null)} />}
          {activeTab === 'history' && <HistoryList history={history} onDelete={id => setHistory(prev => prev.filter(r => r.id !== id))} onEdit={r => { setEditingId(r.id); setDraft({ ...r }); setActiveTab('new'); }} onClearAll={() => {}} />}
          {activeTab === 'learning' && <PraiseLearningList fullSongList={fullSongList} learningList={learningList} setLearningList={setLearningList} />}
          {activeTab === 'workers' && <WorkerRanking history={history} />}
          {activeTab === 'suggestions' && <WorkerStats history={history} />}
          {activeTab === 'praise-ranking' && <RankingList songStats={songStats} />}
          {activeTab === 'unplayed' && <UnplayedList fullSongList={INITIAL_PRAISE_LIST} history={history} />}
          {activeTab === 'settings' && <BackupRestore history={history} customSongs={customSongs} learningList={learningList} onRestore={(h, c, l) => { setHistory(h); setCustomSongs(c); setLearningList(l || []); }} onForceSync={() => user && pullFromCloud(user.id)} />}
        </div>
      </main>
    </div>
  );
};

export default App;
