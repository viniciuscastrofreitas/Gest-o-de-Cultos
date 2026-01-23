
import React, { useState, useMemo } from 'react';
import { PraiseLearningItem, LearningStatus } from '../types';

interface Props {
  fullSongList: string[];
  learningList: PraiseLearningItem[];
  setLearningList: React.Dispatch<React.SetStateAction<PraiseLearningItem[]>>;
}

const PraiseLearningList: React.FC<Props> = ({ fullSongList, learningList, setLearningList }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<LearningStatus | 'all'>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [addInput, setAddInput] = useState('');

  const stats = useMemo(() => {
    const total = learningList.length;
    const learned = learningList.filter(i => i.status === 'learned').length;
    const learning = learningList.filter(i => i.status === 'learning').length;
    const correcting = learningList.filter(i => i.status === 'correcting').length;
    const notStarted = learningList.filter(i => i.status === 'not_started').length;
    const percent = total > 0 ? Math.round((learned / total) * 100) : 0;
    return { total, learned, learning, correcting, notStarted, percent };
  }, [learningList]);

  const statusWeight: Record<LearningStatus, number> = {
    learning: 1,
    correcting: 2,
    not_started: 3,
    learned: 4
  };

  const filteredItems = useMemo(() => {
    return learningList
      .filter(item => {
        const matchSearch = item.song.toLowerCase().includes(searchTerm.toLowerCase());
        const matchFilter = filter === 'all' || item.status === filter;
        return matchSearch && matchFilter;
      })
      .sort((a, b) => {
        const diff = statusWeight[a.status] - statusWeight[b.status];
        if (diff !== 0) return diff;
        return a.song.localeCompare(b.song);
      });
  }, [learningList, searchTerm, filter]);

  const addSong = (song: string) => {
    if (learningList.some(i => i.song === song)) return;
    const newItem: PraiseLearningItem = {
      song,
      status: 'not_started',
      updatedAt: new Date().toISOString()
    };
    setLearningList(prev => [...prev, newItem]);
    setAddInput('');
    setIsAdding(false);
  };

  const updateStatus = (song: string, status: LearningStatus) => {
    setLearningList(prev => prev.map(i => 
      i.song === song ? { ...i, status, updatedAt: new Date().toISOString() } : i
    ));
  };

  const removeItem = (song: string) => {
    if (window.confirm(`Remover "${song}" do monitoramento?`)) {
      setLearningList(prev => prev.filter(i => i.song !== song));
    }
  };

  const suggestions = useMemo(() => {
    // Alterado de 2 para 1 para começar a buscar com um único caractere
    if (addInput.length < 1) return [];
    const lower = addInput.toLowerCase();
    const alreadyInList = new Set(learningList.map(i => i.song));
    return fullSongList
      .filter(s => s.toLowerCase().includes(lower) && !alreadyInList.has(s))
      .slice(0, 15);
  }, [addInput, fullSongList, learningList]);

  const StatusButton = ({ status, active, onClick, count }: { status: LearningStatus | 'all', active: boolean, onClick: () => void, count?: number }) => {
    const labels = { all: 'Todos', learned: 'Sabemos', learning: 'Praticando', correcting: 'Corrigir', not_started: 'Fila' };
    const icons = { all: 'apps', learned: 'verified', learning: 'menu_book', correcting: 'edit_note', not_started: 'schedule' };
    
    const colors = { 
      all: 'bg-slate-100 text-slate-400 border-slate-200', 
      learned: 'bg-emerald-50 text-emerald-500 border-emerald-100', 
      learning: 'bg-amber-50 text-amber-500 border-amber-100', 
      correcting: 'bg-violet-50 text-violet-500 border-violet-100',
      not_started: 'bg-rose-50 text-rose-400 border-rose-100' 
    };
    const activeColors = { 
      all: 'bg-[#1a1c3d] text-white border-[#1a1c3d]', 
      learned: 'bg-emerald-500 text-white border-emerald-500', 
      learning: 'bg-amber-500 text-white border-amber-500', 
      correcting: 'bg-violet-500 text-white border-violet-500',
      not_started: 'bg-rose-500 text-white border-rose-500' 
    };

    return (
      <button 
        onClick={onClick}
        title={labels[status]}
        className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all shrink-0 border-2 active:scale-90 ${active ? activeColors[status] + ' shadow-lg' : colors[status]}`}
      >
        <span className="material-icons text-2xl">{icons[status]}</span>
        {count !== undefined && count > 0 && (
          <span className={`absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 flex items-center justify-center rounded-full text-[9px] font-black border-2 shadow-sm ${active ? 'bg-white text-[#1a1c3d] border-[#1a1c3d]' : 'bg-slate-700 text-white border-white'}`}>
            {count}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-24 px-1">
      {/* Dashboard Card */}
      <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-slate-50">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <span className="material-icons text-xl">school</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-[#1a1c3d] tracking-tight uppercase">Aprendizado</h2>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="w-11 h-11 md:w-auto md:px-6 md:h-12 bg-[#1a1c3d] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
          >
            <span className="material-icons text-xl md:text-sm">add</span>
            <span className="hidden md:inline">Adicionar</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-28 h-28 shrink-0">
             <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
               <circle className="text-slate-50 stroke-current" strokeWidth="10" fill="transparent" r="40" cx="50" cy="50" />
               <circle className="text-emerald-500 stroke-current" strokeWidth="10" strokeLinecap="round" fill="transparent" r="40" cx="50" cy="50" 
                 style={{ strokeDasharray: '251.2', strokeDashoffset: 251.2 - (251.2 * stats.percent) / 100, transition: 'stroke-dashoffset 1s ease' }} 
               />
             </svg>
             <div className="absolute inset-0 flex flex-col items-center justify-center">
               <span className="text-xl font-black text-[#1a1c3d]">{stats.percent}%</span>
               <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">OK</span>
             </div>
          </div>
          
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2.5 w-full">
             <div className="bg-amber-50/50 p-3 rounded-2xl text-center border border-amber-100">
               <div className="text-lg font-black text-amber-600 leading-none">{stats.learning}</div>
               <div className="text-[8px] font-black text-amber-500 uppercase tracking-tighter mt-1">Praticando</div>
             </div>
             <div className="bg-violet-50/50 p-3 rounded-2xl text-center border border-violet-100">
               <div className="text-lg font-black text-violet-600 leading-none">{stats.correcting}</div>
               <div className="text-[8px] font-black text-violet-500 uppercase tracking-tighter mt-1">Corrigir</div>
             </div>
             <div className="bg-rose-50/50 p-3 rounded-2xl text-center border border-rose-100">
               <div className="text-lg font-black text-rose-600 leading-none">{stats.notStarted}</div>
               <div className="text-[8px] font-black text-rose-500 uppercase tracking-tighter mt-1">Fila</div>
             </div>
             <div className="bg-emerald-50/50 p-3 rounded-2xl text-center border border-emerald-100">
               <div className="text-lg font-black text-emerald-600 leading-none">{stats.learned}</div>
               <div className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter mt-1">Sabemos</div>
             </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-1">
        <div className="relative">
          <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">search</span>
          <input 
            type="text" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            placeholder="Pesquisar hino..." 
            className="w-full bg-white border border-slate-100 rounded-2xl pl-12 pr-4 py-4 font-bold text-sm text-slate-600 shadow-sm outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
          />
        </div>
        
        <div className="flex justify-center md:justify-start gap-4 pb-2 px-1">
          <StatusButton status="all" active={filter === 'all'} onClick={() => setFilter('all')} count={stats.total} />
          <StatusButton status="learning" active={filter === 'learning'} onClick={() => setFilter('learning')} count={stats.learning} />
          <StatusButton status="correcting" active={filter === 'correcting'} onClick={() => setFilter('correcting')} count={stats.correcting} />
          <StatusButton status="not_started" active={filter === 'not_started'} onClick={() => setFilter('not_started')} count={stats.notStarted} />
          <StatusButton status="learned" active={filter === 'learned'} onClick={() => setFilter('learned')} count={stats.learned} />
        </div>
      </div>

      <div className="space-y-3 px-1">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-white/50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
            <span className="material-icons text-slate-200 text-5xl mb-3">library_music</span>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Nenhum hino encontrado</p>
          </div>
        ) : (
          filteredItems.map(item => (
            <div key={item.song} className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-100 flex flex-col animate-fadeIn">
              <div className="flex flex-1">
                <div className={`w-1.5 shrink-0 ${item.status === 'learned' ? 'bg-emerald-500' : item.status === 'learning' ? 'bg-amber-400' : item.status === 'correcting' ? 'bg-violet-500' : 'bg-rose-400'}`}></div>
                <div className="p-5 flex-1 flex flex-col gap-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[#1a1c3d] font-black text-sm leading-snug break-words uppercase tracking-tight">{item.song}</h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="material-icons text-[10px] text-slate-300">update</span>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                          {new Date(item.updatedAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => removeItem(item.song)} className="w-10 h-10 -mr-2 -mt-2 flex items-center justify-center text-slate-200 hover:text-rose-500 transition-colors">
                      <span className="material-icons text-lg">delete_outline</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-[1.25rem]">
                    <button onClick={() => updateStatus(item.song, 'not_started')} className={`flex-1 h-11 rounded-xl flex items-center justify-center transition-all ${item.status === 'not_started' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-300'}`} title="Fila"><span className="material-icons text-xl">schedule</span></button>
                    <button onClick={() => updateStatus(item.song, 'learning')} className={`flex-1 h-11 rounded-xl flex items-center justify-center transition-all ${item.status === 'learning' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-300'}`} title="Praticando"><span className="material-icons text-xl">menu_book</span></button>
                    <button onClick={() => updateStatus(item.song, 'correcting')} className={`flex-1 h-11 rounded-xl flex items-center justify-center transition-all ${item.status === 'correcting' ? 'bg-violet-500 text-white shadow-md' : 'text-slate-300'}`} title="Corrigir"><span className="material-icons text-xl">edit_note</span></button>
                    <button onClick={() => updateStatus(item.song, 'learned')} className={`flex-1 h-11 rounded-xl flex items-center justify-center transition-all ${item.status === 'learned' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-300'}`} title="Aprendido"><span className="material-icons text-xl">verified</span></button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Slide-up para Escolher Hino */}
      {isAdding && (
        <div className="fixed inset-0 z-[6000] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" onClick={() => setIsAdding(false)} />
          <div className="relative bg-white rounded-t-[3.5rem] shadow-2xl flex flex-col h-[90vh] animate-slideUp">
            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mt-6 shrink-0"></div>
            
            <div className="p-8 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <span className="material-icons text-indigo-600">library_add</span>
                <h3 className="text-[#1a1c3d] font-black text-xl uppercase tracking-tighter">Escolher Hino</h3>
              </div>
              <button 
                onClick={() => setIsAdding(false)} 
                className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 active:scale-90"
              >
                <span className="material-icons text-xl">close</span>
              </button>
            </div>

            <div className="px-8 pb-4 shrink-0">
              <div className="relative">
                <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">search</span>
                <input 
                  autoFocus
                  type="text" 
                  value={addInput} 
                  onChange={e => setAddInput(e.target.value)} 
                  placeholder="Número ou nome do hino..." 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-12 py-5 font-bold text-sm text-[#1a1c3d] outline-none focus:ring-4 focus:ring-indigo-50 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 p-8 pt-2 custom-scrollbar">
              {suggestions.length === 0 ? (
                <div className="text-center py-20 opacity-20">
                  <span className="material-icons text-7xl">search</span>
                  <p className="text-[10px] font-black uppercase tracking-widest mt-4">Digite para buscar hinos</p>
                </div>
              ) : (
                suggestions.map((s, i) => (
                  <button 
                    key={s} 
                    onClick={() => addSong(s)}
                    className="w-full p-5 bg-slate-50/50 hover:bg-indigo-50 active:scale-[0.98] rounded-[1.5rem] text-left font-bold text-xs text-slate-700 flex justify-between items-center transition-all border border-transparent hover:border-indigo-100 animate-fadeIn"
                    style={{ animationDelay: `${i * 0.03}s` }}
                  >
                    <span className="truncate pr-4 uppercase tracking-tight">{s}</span>
                    <span className="material-icons text-indigo-300">add_circle_outline</span>
                  </button>
                ))
              )}
            </div>

            <div className="p-8 bg-white shrink-0">
              <button 
                onClick={() => setIsAdding(false)}
                className="w-full py-5 bg-slate-50 text-slate-400 font-black rounded-3xl uppercase text-[11px] tracking-widest"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PraiseLearningList;
