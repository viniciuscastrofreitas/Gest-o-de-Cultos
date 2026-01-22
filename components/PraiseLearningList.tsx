
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
  const [addInput, setAddInput] = useState('');
  const [showAddSuggestions, setShowAddSuggestions] = useState(false);

  const stats = useMemo(() => {
    const total = learningList.length;
    const learned = learningList.filter(i => i.status === 'learned').length;
    const learning = learningList.filter(i => i.status === 'learning').length;
    const correcting = learningList.filter(i => i.status === 'correcting').length;
    const notStarted = learningList.filter(i => i.status === 'not_started').length;
    const percent = total > 0 ? Math.round((learned / total) * 100) : 0;

    // SVG Doughnut logic
    const safeTotal = total || 1;
    const pLearning = (learning / safeTotal) * 100;
    const pCorrecting = (correcting / safeTotal) * 100;
    const pNotStarted = (notStarted / safeTotal) * 100;
    const pLearned = (learned / safeTotal) * 100;

    return { 
      total, learned, learning, correcting, notStarted, percent,
      chart: { learning: pLearning, correcting: pCorrecting, notStarted: pNotStarted, learned: pLearned }
    };
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

        const aIsCias = a.song.startsWith('(CIAS)');
        const bIsCias = b.song.startsWith('(CIAS)');
        if (!aIsCias && bIsCias) return -1;
        if (aIsCias && !bIsCias) return 1;

        return a.song.localeCompare(b.song, undefined, { numeric: true, sensitivity: 'base' });
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
    setShowAddSuggestions(false);
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

  const addSuggestions = useMemo(() => {
    if (addInput.length < 1) return [];
    const lower = addInput.toLowerCase();
    const alreadyInList = new Set(learningList.map(i => i.song));
    return fullSongList
      .filter(s => s.toLowerCase().includes(lower) && !alreadyInList.has(s))
      .sort((a, b) => {
        const aIsCias = a.startsWith('(CIAS)');
        const bIsCias = b.startsWith('(CIAS)');
        if (!aIsCias && bIsCias) return -1;
        if (aIsCias && !bIsCias) return 1;
        return a.localeCompare(b, undefined, { numeric: true });
      })
      .slice(0, 15);
  }, [addInput, fullSongList, learningList]);

  const StatusButton = ({ status, active, onClick, count, label }: { status: LearningStatus | 'all', active: boolean, onClick: () => void, count?: number, label: string }) => {
    const icons = { all: 'apps', learned: 'verified', learning: 'menu_book', correcting: 'edit_note', not_started: 'schedule' };
    const colors = { 
      all: 'bg-slate-100 text-slate-500 border-slate-200', 
      learned: 'bg-emerald-50 text-emerald-600 border-emerald-100', 
      learning: 'bg-amber-50 text-amber-600 border-amber-100', 
      correcting: 'bg-violet-50 text-violet-600 border-violet-100',
      not_started: 'bg-rose-50 text-rose-600 border-rose-100' 
    };
    const activeColors = { 
      all: 'bg-[#1a1c3d] text-white border-[#1a1c3d]', 
      learned: 'bg-emerald-500 text-white border-emerald-500', 
      learning: 'bg-amber-500 text-white border-amber-500', 
      correcting: 'bg-violet-500 text-white border-violet-500',
      not_started: 'bg-rose-500 text-white border-rose-500' 
    };

    return (
      <button onClick={onClick} className={`relative flex-1 flex flex-col items-center justify-center py-2 rounded-2xl transition-all border-2 gap-1 ${active ? activeColors[status] : colors[status]}`}>
        <span className="material-icons text-lg">{icons[status]}</span>
        <span className="text-[7px] font-black uppercase tracking-widest leading-none">{label}</span>
        {count !== undefined && count > 0 && (
          <span className={`absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-0.5 flex items-center justify-center rounded-full text-[7px] font-black border-2 ${active ? 'bg-white text-[#1a1c3d] border-[#1a1c3d]' : 'bg-slate-700 text-white border-white'}`}>
            {count}
          </span>
        )}
      </button>
    );
  };

  // Helper for SVG Chart
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const getOffset = (percent: number) => circumference - (percent / 100) * circumference;

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fadeIn pb-24 px-1">
      <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-200">
        <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-black text-[#1a1c3d] uppercase tracking-tighter">Aprendizado</h2>
            <div className="bg-indigo-50 px-3 py-1 rounded-full"><span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{stats.percent}% Concluído</span></div>
        </div>
        
        <div className="flex flex-col gap-6">
          <div className="relative">
            <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">add</span>
            <input 
              type="text" 
              value={addInput}
              onChange={e => {setAddInput(e.target.value); setShowAddSuggestions(true);}}
              placeholder="Adicionar hino para monitorar..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3.5 text-sm font-bold text-[#1a1c3d] focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
            />
            {showAddSuggestions && addSuggestions.length > 0 && (
              <div className="absolute z-[250] top-full left-0 w-full bg-white shadow-2xl rounded-2xl overflow-hidden border border-slate-200 max-h-52 overflow-y-auto mt-1 animate-fadeIn">
                {addSuggestions.map(s => (
                  <button key={s} onMouseDown={() => addSong(s)} className="w-full p-4 hover:bg-slate-50 border-b border-slate-50 text-left font-bold text-xs text-[#1a1c3d] flex justify-between items-center">
                    <span className="uppercase">{s}</span>
                    <span className="material-icons text-indigo-500 text-sm">add_circle</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Gráfico Redondo */}
          <div className="flex flex-col items-center gap-4">
             <div className="relative w-40 h-40">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {/* Background base */}
                  <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                  
                  {/* Segment: Learned (Emerald) */}
                  <circle 
                    cx="50" cy="50" r={radius} fill="transparent" stroke="#10b981" strokeWidth="12"
                    strokeDasharray={circumference} 
                    strokeDashoffset={getOffset(stats.chart.learned)}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                  {/* Segment: Learning (Amber) */}
                  <circle 
                    cx="50" cy="50" r={radius} fill="transparent" stroke="#f59e0b" strokeWidth="12"
                    strokeDasharray={circumference} 
                    strokeDashoffset={getOffset(stats.chart.learning)}
                    style={{ transform: `rotate(${(stats.chart.learned / 100) * 360}deg)`, transformOrigin: 'center' }}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                  {/* Segment: Correcting (Violet) */}
                  <circle 
                    cx="50" cy="50" r={radius} fill="transparent" stroke="#8b5cf6" strokeWidth="12"
                    strokeDasharray={circumference} 
                    strokeDashoffset={getOffset(stats.chart.correcting)}
                    style={{ transform: `rotate(${((stats.chart.learned + stats.chart.learning) / 100) * 360}deg)`, transformOrigin: 'center' }}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                  {/* Segment: Not Started (Rose) */}
                  <circle 
                    cx="50" cy="50" r={radius} fill="transparent" stroke="#f43f5e" strokeWidth="12"
                    strokeDasharray={circumference} 
                    strokeDashoffset={getOffset(stats.chart.notStarted)}
                    style={{ transform: `rotate(${((stats.chart.learned + stats.chart.learning + stats.chart.correcting) / 100) * 360}deg)`, transformOrigin: 'center' }}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <span className="text-2xl font-black text-[#1a1c3d] leading-none">{stats.percent}%</span>
                   <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Geral</span>
                </div>
             </div>
             
             {/* Legenda do gráfico */}
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
                <div className="flex items-center gap-2 justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Sabemos ({stats.learned})</span>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Praticando ({stats.learning})</span>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-500"></span>
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Corrigir ({stats.correcting})</span>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Fila ({stats.notStarted})</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">search</span>
          <input 
            type="text" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            placeholder="Pesquisar nos hinos monitorados..." 
            className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3.5 font-bold text-sm text-[#1a1c3d] shadow-sm outline-none"
          />
        </div>
        
        <div className="flex gap-1.5 px-1">
          <StatusButton label="Todos" status="all" active={filter === 'all'} onClick={() => setFilter('all')} count={stats.total} />
          <StatusButton label="Praticando" status="learning" active={filter === 'learning'} onClick={() => setFilter('learning')} count={stats.learning} />
          <StatusButton label="Corrigir" status="correcting" active={filter === 'correcting'} onClick={() => setFilter('correcting')} count={stats.correcting} />
          <StatusButton label="Fila" status="not_started" active={filter === 'not_started'} onClick={() => setFilter('not_started')} count={stats.notStarted} />
          <StatusButton label="Sabemos" status="learned" active={filter === 'learned'} onClick={() => setFilter('learned')} count={stats.learned} />
        </div>
      </div>

      <div className="space-y-2">
        {filteredItems.map(item => (
          <div key={item.song} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 flex flex-col animate-fadeIn">
            <div className="flex">
              <div className={`w-1 shrink-0 ${item.status === 'learned' ? 'bg-emerald-500' : item.status === 'learning' ? 'bg-amber-500' : item.status === 'correcting' ? 'bg-violet-500' : 'bg-rose-500'}`}></div>
              <div className="p-4 flex-1 flex flex-col gap-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[#1a1c3d] font-black text-xs uppercase leading-tight">{item.song}</h4>
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-1 block">At.: {new Date(item.updatedAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <button onClick={() => removeItem(item.song)} className="text-slate-400 hover:text-rose-600"><span className="material-icons text-lg">delete_outline</span></button>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl">
                  <button onClick={() => updateStatus(item.song, 'not_started')} className={`flex-1 h-9 rounded-lg flex items-center justify-center ${item.status === 'not_started' ? 'bg-rose-500 text-white' : 'text-slate-400'}`}><span className="material-icons text-base">schedule</span></button>
                  <button onClick={() => updateStatus(item.song, 'learning')} className={`flex-1 h-9 rounded-lg flex items-center justify-center ${item.status === 'learning' ? 'bg-amber-500 text-white' : 'text-slate-400'}`}><span className="material-icons text-base">menu_book</span></button>
                  <button onClick={() => updateStatus(item.song, 'correcting')} className={`flex-1 h-9 rounded-lg flex items-center justify-center ${item.status === 'correcting' ? 'bg-violet-500 text-white' : 'text-slate-400'}`}><span className="material-icons text-base">edit_note</span></button>
                  <button onClick={() => updateStatus(item.song, 'learned')} className={`flex-1 h-9 rounded-lg flex items-center justify-center ${item.status === 'learned' ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}><span className="material-icons text-base">verified</span></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PraiseLearningList;
