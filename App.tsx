
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { INITIAL_PRAISE_LIST, DEFAULT_WORKERS_LIST } from './constants';
import { ServiceRecord, SongStats, ServiceDraft, PraiseLearningItem } from './types';
import ServiceForm from './components/ServiceForm';
import HistoryList from './components/HistoryList';
import RankingList from './components/RankingList';
import { RepetitionChart } from './components/RepetitionChart';
import BackupRestore from './components/BackupRestore';
import UnplayedList from './components/UnplayedList';
import WorkerStats from './components/WorkerStats';
import WorkerRanking from './components/WorkerRanking';
import PraiseLearningList from './components/PraiseLearningList';
import WorkerManager from './components/WorkerManager';
import CollectionsManager from './components/CollectionsManager';
import AuthForm from './components/AuthForm';
import { initDB, saveData, loadData, getImmediateCachedData } from './db';
import { supabase } from './supabase';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineBanner } from './components/OfflineBanner';

const App: React.FC = () => {
  // 1. CARREGAMENTO INSTANTÂNEO DIRETO DO DISCO DO CELULAR (0ms de espera)
  const cachedInitial = useMemo(() => getImmediateCachedData(), []);

  const [activeTab, setActiveTab] = useState<'new' | 'history' | 'unplayed' | 'learning' | 'praise-ranking' | 'repetition' | 'workers' | 'suggestions' | 'manage-workers' | 'collections' | 'settings'>('new');
  const [history, setHistory] = useState<ServiceRecord[]>(() => cachedInitial?.history || []);
  const [churchName, setChurchName] = useState<string>(() => cachedInitial?.churchName || 'Clique aqui para nomear sua igreja');
  const [isEditingChurchName, setIsEditingChurchName] = useState(false);
  const [customSongs, setCustomSongs] = useState<string[]>(() => cachedInitial?.customSongs || []);
  const [praiseCollection, setPraiseCollection] = useState<string[]>(() => {
    if (cachedInitial?.praiseCollection && cachedInitial.praiseCollection.length > 0) {
      return cachedInitial.praiseCollection;
    }
    return [...new Set([...INITIAL_PRAISE_LIST, ...(cachedInitial?.customSongs || [])])].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  });
  const [customWorkers, setCustomWorkers] = useState<string[]>(() => cachedInitial?.customWorkers || DEFAULT_WORKERS_LIST);
  const [learningList, setLearningList] = useState<PraiseLearningItem[]>(() => cachedInitial?.learningList || []);
  
  // Se já temos registros salvos na memória do celular, o app abre IMEDIATAMENTE!
  const [isLoading, setIsLoading] = useState(() => !cachedInitial || !cachedInitial.history);
  const [loadingStatus, setLoadingStatus] = useState('Abrindo aplicativo...');
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

  const [draft, setDraft] = useState<ServiceDraft>(() => {
    if (cachedInitial?.draft) {
      return { ...cachedInitial.draft, date: getTodayDate() };
    }
    return {
      date: getTodayDate(),
      description: '',
      songs: [],
      roles: { ...emptyRoles },
      attendance: {}
    };
  });

  const pullFromCloud = async (userId: string) => {
    try {
      setSyncStatus('syncing');
      
      // TIMEOUT DE PROTEÇÃO: Em locais como a igreja com sinal instável, não trava o app!
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout de rede")), 2500)
      );

      const queryPromise = supabase
        .from('user_data')
        .select('json_data, updated_at')
        .eq('user_id', userId)
        .maybeSingle();

      const { data, error }: any = await Promise.race([queryPromise, timeoutPromise]);

      if (error) throw error;
      
      if (data && data.json_data) {
        const cloudTimestamp = data.updated_at;
        if (!lastCloudUpdateRef.current || new Date(cloudTimestamp) > new Date(lastCloudUpdateRef.current)) {
          lastCloudUpdateRef.current = cloudTimestamp;
          const remote = data.json_data;
          if (remote.history) setHistory(remote.history);
          if (remote.churchName) setChurchName(remote.churchName);
          if (remote.customSongs) setCustomSongs(remote.customSongs);
          if (remote.customWorkers) setCustomWorkers(remote.customWorkers);
          if (remote.learningList) setLearningList(remote.learningList);
          if (remote.praiseCollection) setPraiseCollection(remote.praiseCollection);

          // Salva imediatamente no armazenamento local do aparelho
          saveData(remote);
        }
      }
      setSyncStatus('synced');
    } catch (e) {
      console.warn("Sem conexão com a nuvem no momento. Usando dados salvos localmente.", e);
      setSyncStatus('local');
    }
  };

  const pushToCloud = async () => {
    if (!user || isOffline) return;
    setSyncStatus('syncing');
    try {
      const timestamp = new Date().toISOString();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout de rede")), 3500)
      );

      const upsertPromise = supabase.from('user_data').upsert({ 
        user_id: user.id, 
        json_data: { history, churchName, customSongs, customWorkers, learningList, praiseCollection },
        updated_at: timestamp
      }, { onConflict: 'user_id' });

      const { error }: any = await Promise.race([upsertPromise, timeoutPromise]);
      
      if (error) throw error;
      lastCloudUpdateRef.current = timestamp;
      setSyncStatus('synced');
    } catch (e) {
      console.warn("Erro ao enviar dados para nuvem, mantendo local:", e);
      setSyncStatus('error');
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => {
      setIsOffline(true);
      setSyncStatus('local');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Recupera sessão com timeout curto para não prender em modo offline
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    }).catch(() => {
      // Ignora erro de rede se estiver offline
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
        await initDB();
        const data = await loadData();
        
        if (data) {
          if (data.history && data.history.length > 0) setHistory(data.history);
          if (data.churchName && data.churchName !== 'Clique aqui para nomear sua igreja') setChurchName(data.churchName);
          if (data.customSongs) setCustomSongs(data.customSongs);
          if (data.customWorkers) setCustomWorkers(data.customWorkers);
          if (data.learningList) setLearningList(data.learningList);
          if (data.praiseCollection && data.praiseCollection.length > 0) {
            setPraiseCollection(data.praiseCollection);
          }
          if (data.draft) setDraft({ ...data.draft, date: getTodayDate() });
        }
      } catch (e) {
        console.warn("Aviso ao carregar DB local:", e);
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
    saveData({ history, churchName, customSongs, customWorkers, draft, learningList, praiseCollection });
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
  }, [history, churchName, customSongs, customWorkers, draft, learningList, praiseCollection, user, isOffline, isLoading, hasCheckedCloud]);

  const fullSongList = useMemo(() => {
    if (praiseCollection && praiseCollection.length > 0) return praiseCollection;
    return [...new Set([...INITIAL_PRAISE_LIST, ...customSongs])].sort((a, b) => a.localeCompare(b));
  }, [customSongs, praiseCollection]);

  const onRenameSongInHistory = (oldName: string, newName: string) => {
    setHistory(prev => prev.map(record => ({
      ...record,
      songs: record.songs.map(s => s === oldName ? newName : s)
    })));
  };

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
    setDraft({ date: getTodayDate(), description: '', songs: [], roles: { ...emptyRoles }, attendance: {} });
  };

  const handleRegisterGap = (date: string, type: 'missing_service' | 'missing_ebd' | 'missing_dom') => {
    setEditingId(null);
    let initialDescription = '';
    if (type === 'missing_ebd') initialDescription = 'EBD';
    else if (type === 'missing_dom') initialDescription = 'DOM';
    
    setDraft({
      date,
      description: initialDescription,
      songs: [],
      roles: { ...emptyRoles },
      attendance: {}
    });
    setActiveTab('new');
  };

  const menuItems = [
    { id: 'new', icon: 'add_circle', label: 'Novo Culto' },
    { id: 'history', icon: 'history', label: 'Histórico' },
    { id: 'unplayed', icon: 'assignment_late', label: 'Hinos Restantes' },
    { id: 'learning', icon: 'school', label: 'Aprendizado' },
    { id: 'praise-ranking', icon: 'trending_up', label: 'Ranking Hinos' },
    { id: 'repetition', icon: 'insights', label: 'Taxa de Repetição' },
    { id: 'collections', icon: 'library_books', label: 'Coletâneas' },
    { id: 'workers', icon: 'emoji_events', label: 'Ranking Obreiros' },
    { id: 'suggestions', icon: 'assignment_ind', label: 'Sugestão Escala' },
    { id: 'manage-workers', icon: 'person_add', label: 'Gerenciar Obreiros' },
    { id: 'settings', icon: 'settings', label: 'Backup / Nuvem' },
  ] as const;

  const handleTabChange = (id: typeof activeTab) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
    window.scrollTo(0,0);
  };

  const AppBrand = () => {
    const isLocalSafe = syncStatus === 'local' || isOffline;
    const statusIcon = syncStatus === 'synced' ? 'cloud_done' : syncStatus === 'syncing' ? 'sync' : isLocalSafe ? 'verified' : 'cloud_off';
    const statusColor = syncStatus === 'synced' ? 'text-emerald-400' : syncStatus === 'syncing' ? 'text-amber-400 animate-spin' : isLocalSafe ? 'text-emerald-400' : 'text-rose-500';
    const statusText = syncStatus === 'synced' ? 'Nuvem Conectada' : syncStatus === 'syncing' ? 'Sincronizando...' : isLocalSafe ? '100% Salvo no Aparelho' : 'Erro Conexão';

    return (
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 rounded-2xl shadow-lg shadow-indigo-900/40 flex items-center justify-center p-1 border border-white/10 shrink-0 relative overflow-hidden group">
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <span className="material-icons text-white text-2xl drop-shadow-md">assignment</span>
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          {isEditingChurchName ? (
            <input 
              autoFocus
              className="bg-white/10 border-b border-white/30 text-white font-black text-lg outline-none w-full uppercase"
              value={churchName}
              onChange={(e) => setChurchName(e.target.value)}
              onBlur={() => setIsEditingChurchName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingChurchName(false)}
            />
          ) : (
            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingChurchName(true)}>
              <h1 className="text-white font-black text-lg tracking-tighter leading-tight uppercase whitespace-nowrap overflow-hidden text-ellipsis">{churchName}</h1>
              <span className="material-icons text-white/20 text-xs group-hover:text-white/60 transition-colors">edit</span>
            </div>
          )}
          <div className="flex items-center gap-2 mt-0.5">
             <div className="flex items-center gap-1.5">
               <span className={`material-icons text-[12px] ${statusColor}`}>{statusIcon}</span>
               <span className="text-slate-400 font-black text-[9px] uppercase tracking-widest">{statusText}</span>
             </div>
             <div className="h-3 w-px bg-white/10 mx-1"></div>
             <div className="flex items-center gap-1">
               <span className="material-icons text-[12px] text-amber-400">description</span>
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
        <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 rounded-3xl shadow-[0_20px_50px_rgba(79,70,229,0.35)] flex items-center justify-center p-4 relative z-10 animate-pulse border border-white/10">
          <span className="material-icons text-white text-5xl">assignment</span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-5 max-w-xs w-full relative z-10">
        <div className="text-center">
          <h2 className="font-black tracking-[0.3em] text-[10px] uppercase text-slate-400 mb-1">{churchName}</h2>
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
        <div className="px-10 py-3 border-b border-white/5 flex items-center justify-between">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aplicativo PWA</span>
          <PWAInstallButton variant="header" />
        </div>
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
        <div className="flex items-center gap-3">
          <PWAInstallButton variant="header" />
          <button onClick={() => setIsMobileMenuOpen(true)} className="w-12 h-12 bg-white/5 rounded-2xl active:scale-90 transition-transform flex items-center justify-center">
            <span className="material-icons text-2xl">menu</span>
          </button>
        </div>
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
        <PWAInstallButton variant="banner" />
        <OfflineBanner />
        <div className="px-4 py-10 md:p-16 animate-fadeIn max-w-4xl mx-auto">
          {activeTab === 'new' && <ServiceForm onSave={saveRecord} songStats={songStats} fullSongList={fullSongList} workers={customWorkers} onRegisterNewSong={s => { setCustomSongs(prev => [...prev, s]); setPraiseCollection(prev => [...new Set([...prev, s])].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))); }} draft={draft} setDraft={setDraft} editingId={editingId} onCancelEdit={() => setEditingId(null)} />}
          {activeTab === 'history' && <HistoryList history={history} workers={customWorkers} fullSongList={fullSongList} onDelete={id => setHistory(prev => prev.filter(r => r.id !== id))} onEdit={r => { setEditingId(r.id); setDraft({ ...r }); setActiveTab('new'); }} onClearAll={() => {}} onRegisterGap={handleRegisterGap} />}
          {activeTab === 'learning' && <PraiseLearningList fullSongList={fullSongList} learningList={learningList} setLearningList={setLearningList} />}
          {activeTab === 'workers' && <WorkerRanking history={history} workers={customWorkers} />}
          {activeTab === 'suggestions' && <WorkerStats history={history} workers={customWorkers} />}
          {activeTab === 'manage-workers' && <WorkerManager workers={customWorkers} setWorkers={setCustomWorkers} />}
          {activeTab === 'collections' && <CollectionsManager praiseCollection={praiseCollection} setPraiseCollection={setPraiseCollection} onRenameSongInHistory={onRenameSongInHistory} />}
          {activeTab === 'praise-ranking' && <RankingList songStats={songStats} fullSongList={fullSongList} />}
          {activeTab === 'repetition' && <RepetitionChart history={history} songStats={songStats} fullSongList={fullSongList} />}
          {activeTab === 'unplayed' && <UnplayedList fullSongList={fullSongList} history={history} />}
          {activeTab === 'settings' && <BackupRestore history={history} customSongs={customSongs} learningList={learningList} praiseCollection={praiseCollection} onRestore={(h, c, l, p) => { setHistory(h); setCustomSongs(c); setLearningList(l || []); setPraiseCollection(p || []); }} onForceSync={() => user && pullFromCloud(user.id)} />}
        </div>
      </main>
    </div>
  );
};

export default App;
