
import React, { useState, useEffect, useMemo } from 'react';
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
import { auth, onAuthStateChanged } from './firebase';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'new' | 'history' | 'workers' | 'suggestions' | 'praise-ranking' | 'unplayed' | 'learning' | 'settings'>('new');
  const [history, setHistory] = useState<ServiceRecord[]>([]);
  const [customSongs, setCustomSongs] = useState<string[]>([]);
  const [learningList, setLearningList] = useState<PraiseLearningItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(auth.currentUser);
  const [historyFilter, setHistoryFilter] = useState<{ worker: string; role: string } | null>(null);

  const getTodayDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const emptyRoles = { gate: '', praise: '', word: '', scripture: '' };

  const [draft, setDraft] = useState<ServiceDraft>({
    date: getTodayDate(),
    description: '',
    songs: [],
    roles: { ...emptyRoles }
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const setup = async () => {
      try {
        await initDB();
        const data = await loadData();
        if (data) {
          if (data.history) setHistory(data.history);
          if (data.customSongs) setCustomSongs(data.customSongs);
          if (data.learningList) setLearningList(data.learningList);
          if (data.draft) {
            setDraft({ 
              ...data.draft, 
              date: getTodayDate(), 
              roles: data.draft.roles || { ...emptyRoles }
            });
          }
        }
      } catch (e) {
        console.error("Erro no DB", e);
      } finally {
        setIsLoading(false);
      }
    };
    setup();
    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isLoading) saveData({ history, customSongs, draft, learningList });
  }, [history, customSongs, draft, learningList, isLoading]);

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
    setDraft({ 
      date: getTodayDate(), 
      description: '', 
      songs: [], 
      roles: { ...emptyRoles }
    });
  };

  const menuItems = [
    { id: 'new', icon: 'add_circle', label: 'Novo Culto' },
    { id: 'history', icon: 'history', label: 'Histórico' },
    { id: 'learning', icon: 'school', label: 'Aprendizado' },
    { id: 'workers', icon: 'emoji_events', label: 'Ranking Obreiros' },
    { id: 'suggestions', icon: 'assignment_ind', label: 'Escala / Sugestão' },
    { id: 'praise-ranking', icon: 'trending_up', label: 'Ranking Hinos' },
    { id: 'unplayed', icon: 'assignment_late', label: 'Hinos Restantes' },
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
           <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
           <span className="text-white/60 font-black text-[10px] tracking-[0.2em] uppercase">Gestão de Culto</span>
        </div>
        <h1 className="text-white font-black text-xl tracking-tighter leading-tight uppercase whitespace-nowrap">Santo Antônio II</h1>
        <div className="mt-1 bg-white/10 self-start px-3 py-1 rounded-full flex items-center gap-2">
           <span className="material-icons text-amber-400 text-xs">analytics</span>
           <span className="text-white font-black text-[10px] uppercase">{history.length} Cultos</span>
        </div>
      </div>
    </div>
  );

  if (isLoading) return <div className="min-h-screen bg-[#1a1c3d] flex flex-col items-center justify-center text-white p-10"><img src="https://cdn-icons-png.flaticon.com/512/1672/1672225.png" className="w-20 h-20 animate-bounce mb-6" /><p className="font-black tracking-widest text-sm animate-pulse">CARREGANDO SISTEMA...</p></div>;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      <aside className="hidden md:flex w-96 bg-[#1a1c3d] flex-col sticky top-0 h-screen shadow-2xl z-[150]">
        <div className="p-12 border-b border-white/5">
          <AppBrand />
        </div>
        <nav className="flex-1 py-10 overflow-y-auto custom-scrollbar">
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
          <div className="absolute top-0 right-0 bottom-0 w-[85%] bg-[#1a1c3d] shadow-2xl flex flex-col animate-fadeIn border-l border-white/5">
            <div className="p-10 flex justify-between items-center border-b border-white/5">
              <span className="text-white/40 font-black text-xs tracking-widest uppercase">Navegação Principal</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-white/40"><span className="material-icons">close</span></button>
            </div>
            <nav className="flex-1 py-6 overflow-y-auto">
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

      <main className="flex-1 min-w-0">
        {isOffline && <div className="bg-amber-500 text-white text-[10px] font-black uppercase py-2.5 text-center sticky top-[92px] md:top-0 z-[190] shadow-lg">Você está operando offline.</div>}
        
        <div className="px-4 pt-14 pb-20 md:p-16 animate-fadeIn max-w-6xl mx-auto">
          {activeTab === 'new' && <ServiceForm onSave={saveRecord} songStats={songStats} fullSongList={fullSongList} onRegisterNewSong={s => setCustomSongs(prev => [...prev, s])} draft={draft} setDraft={setDraft} editingId={editingId} onCancelEdit={() => setEditingId(null)} />}
          
          {activeTab === 'history' && (
            <HistoryList 
              history={history} 
              onDelete={id => setHistory(prev => prev.filter(r => r.id !== id))} 
              onEdit={r => { setEditingId(r.id); setDraft({ ...r }); setActiveTab('new'); }} 
              onClearAll={() => {}} 
              externalFilter={historyFilter}
              onClearExternalFilter={() => setHistoryFilter(null)}
            />
          )}
          
          {activeTab === 'learning' && <PraiseLearningList fullSongList={fullSongList} learningList={learningList} setLearningList={setLearningList} />}
          
          {activeTab === 'workers' && (
            <WorkerRanking 
              history={history} 
              onFilterHistory={(worker, role) => {
                setHistoryFilter({ worker, role });
                setActiveTab('history');
              }}
            />
          )}
          
          {activeTab === 'suggestions' && <WorkerStats history={history} />}
          {activeTab === 'praise-ranking' && <RankingList songStats={songStats} />}
          {activeTab === 'unplayed' && <UnplayedList fullSongList={fullSongList} history={history} />}
          {activeTab === 'settings' && <BackupRestore history={history} customSongs={customSongs} learningList={learningList} onRestore={(h, c, l) => { setHistory(h); setCustomSongs(c); setLearningList(l || []); }} />}
        </div>
      </main>
    </div>
  );
};

export default App;
