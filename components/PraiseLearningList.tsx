
import React, { useState, useMemo } from 'react';
import { PraiseLearningItem, LearningStatus } from '../types';

interface Props {
  fullSongList: string[];
  learningList: PraiseLearningItem[];
  setLearningList: React.Dispatch<React.SetStateAction<PraiseLearningItem[]>>;
}

const PraiseLearningList: React.FC<Props> = ({ fullSongList, learningList, setLearningList }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [addInput, setAddInput] = useState('');
  const [filter, setFilter] = useState<LearningStatus | 'all'>('all');

  const stats = useMemo(() => {
    const total = learningList.length;
    const learned = learningList.filter(i => i.status === 'learned').length;
    const percent = total > 0 ? Math.round((learned / total) * 100) : 0;
    
    const countNotStarted = learningList.filter(i => i.status === 'not_started').length;
    const countLearning = learningList.filter(i => i.status === 'learning').length;
    const countCorrecting = learningList.filter(i => i.status === 'correcting').length;
    const countLearned = learned;

    return { total, learned, percent, countNotStarted, countLearning, countCorrecting, countLearned };
  }, [learningList]);

  const statusWeight: Record<LearningStatus, number> = { learning: 1, correcting: 2, not_started: 3, learned: 4 };

  const filteredItems = useMemo(() => {
    return learningList
      .filter(item => {
        const matchSearch = item.song.toLowerCase().includes(searchTerm.toLowerCase());
        const matchFilter = filter === 'all' || item.status === filter;
        return matchSearch && matchFilter;
      })
      .sort((a, b) => {
        const sw = statusWeight[a.status] - statusWeight[b.status];
        if (sw !== 0) return sw;
        // Ordenação Natural (Numérica: hino 02 vem antes de 10 e 100)
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
  };

  const updateStatus = (song: string, status: LearningStatus) => {
    setLearningList(prev => prev.map(i => i.song === song ? { ...i, status, updatedAt: new Date().toISOString() } : i));
  };

  const removeItem = (song: string) => {
    if (window.confirm(`Remover "${song}" do monitoramento?`)) {
      setLearningList(prev => prev.filter(i => i.song !== song));
    }
  };

  const suggestions = useMemo(() => {
    if (addInput.length < 1) return [];
    const lower = addInput.toLowerCase();
    const alreadyInList = new Set(learningList.map(i => i.song));
    return fullSongList
      .filter(s => s.toLowerCase().includes(lower) && !alreadyInList.has(s))
      .sort((a, b) => {
        // Prioridade: Principal antes de CIAS
        const isCiasA = a.startsWith('(CIAS)');
        const isCiasB = b.startsWith('(CIAS)');
        if (isCiasA !== isCiasB) return isCiasA ? 1 : -1;
        return a.localeCompare(b, undefined, { numeric: true });
      })
      .slice(0, 15);
  }, [addInput, fullSongList, learningList]);

  const StatusButton = ({ status, active, onClick, count, label }: { status: LearningStatus | 'all', active: boolean, onClick: () => void, count?: number, label: string }) => {
    const icons = { all: 'apps', learned: 'verified', learning: 'menu_book', correcting: 'edit_note', not_started: 'schedule' };
    const colors = { 
      all: 'bg-slate-100 text-slate-500 border-slate-100', 
      learned: 'bg-emerald-50 text-emerald-600 border-emerald-100', 
      learning: 'bg-amber-50 text-amber-600 border-amber-100', 
      correcting: 'bg-violet-50 text-violet-600 border-violet-100',
      not_started: 'bg-rose-50 text-rose-500 border-rose-100' 
    };
    const activeColors = { 
      all: 'bg-indigo-600 text-white border-indigo-600', 
      learned: 'bg-emerald-500 text-white border-emerald-500', 
      learning: 'bg-amber-500 text-white border-amber-500', 
      correcting: 'bg-violet-500 text-white border-violet-500',
      not_started: 'bg-rose-500 text-white border-rose-500' 
    };

    return (
      <div className="flex flex-col items-center gap-2">
        <button 
          onClick={onClick}
          className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all shrink-0 border-2 active:scale-90 ${active ? activeColors[status] + ' shadow-lg' : colors[status]}`}
        >
          <span className="material-icons text-2xl">{icons[status]}</span>
          {count !== undefined && count > 0 && (
            <span className={`absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1.5 flex items-center justify-center rounded-full text-[9px] font-black border-2 shadow-sm ${active ? 'bg-white text-indigo-600 border-white' : 'bg-slate-800 text-white border-white'}`}>
              {count}
            </span>
          )}
        </button>
        <span className={`text-[8px] font-black uppercase tracking-widest ${active ? 'text-white' : 'text-slate-400'}`}>{label}</span>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-24 px-1">
      {/* 1. CAMPO DE ADICIONAR */}
      <div className="space-y-4">
        <div className="relative group">
          <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">add_circle</span>
          <input 
            type="text" 
            value={addInput} 
            onChange={e => setAddInput(e.target.value)} 
            placeholder="Adicionar hino para monitorar..." 
            className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-5 font-black text-sm text-slate-900 shadow-2xl outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300"
          />
          {suggestions.length > 0 && (
            <div className="absolute z-[250] w-full bg-white shadow-2xl rounded-2xl overflow-hidden border border-slate-200 max-h-60 overflow-y-auto mt-2 animate-fadeIn">
              {suggestions.map(s => (
                <button 
                  key={s} 
                  onClick={() => addSong(s)}
                  className="w-full p-5 hover:bg-slate-50 text-left border-b border-slate-50 font-black text-xs text-slate-700 flex justify-between items-center transition-colors"
                >
                  <span className={s.startsWith('(CIAS)') ? 'text-slate-400' : 'text-slate-800'}>{s}</span>
                  <span className="material-icons text-indigo-500/40 text-sm">add_circle_outline</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. GRÁFICO DE PORCENTAGEM (CARD BRANCO) */}
      <div className="bg-white rounded-[3rem] p-10 md:p-14 shadow-2xl border border-slate-100 flex flex-col items-center">
        <div className="relative w-44 h-44">
           <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
             <circle className="text-slate-100 stroke-current" strokeWidth="10" fill="transparent" r="40" cx="50" cy="50" />
             <circle className="text-emerald-500 stroke-current" strokeWidth="10" strokeLinecap="round" fill="transparent" r="40" cx="50" cy="50" 
               style={{ strokeDasharray: '251.2', strokeDashoffset: 251.2 - (251.2 * stats.percent) / 100, transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)' }} 
             />
           </svg>
           <div className="absolute inset-0 flex flex-col items-center justify-center">
             <span className="text-4xl font-black text-slate-900 leading-none">{stats.percent}%</span>
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-2">Aprendidos</span>
           </div>
        </div>
        <div className="mt-8 flex flex-col items-center">
           <h2 className="text-slate-900 font-black text-lg uppercase tracking-tight">Progresso Geral</h2>
           <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Sincronizado na Nuvem</p>
        </div>
      </div>

      {/* 3. FILTROS E LISTA */}
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-2 px-1">
          <StatusButton status="all" active={filter === 'all'} onClick={() => setFilter('all')} count={stats.total} label="Todos" />
          <StatusButton status="not_started" active={filter === 'not_started'} onClick={() => setFilter('not_started')} count={stats.countNotStarted} label="Fila" />
          <StatusButton status="learning" active={filter === 'learning'} onClick={() => setFilter('learning')} count={stats.countLearning} label="Pratica" />
          <StatusButton status="correcting" active={filter === 'correcting'} onClick={() => setFilter('correcting')} count={stats.countCorrecting} label="Corrigir" />
          <StatusButton status="learned" active={filter === 'learned'} onClick={() => setFilter('learned')} count={stats.countLearned} label="Sabemos" />
        </div>

        <div className="relative">
          <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">search</span>
          <input 
            type="text" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            placeholder="Filtrar hinos nesta lista..." 
            className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-4 font-bold text-xs text-slate-900 shadow-xl outline-none focus:border-indigo-500 transition-all placeholder:text-slate-200"
          />
        </div>

        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <div className="text-center py-24 bg-white/5 rounded-[3rem] border-2 border-dashed border-white/10">
              <span className="material-icons text-white/5 text-6xl mb-4">library_music</span>
              <p className="text-white/20 font-black text-[10px] uppercase tracking-widest">Nenhum hino encontrado</p>
            </div>
          ) : (
            filteredItems.map(item => (
              <div key={item.song} className="bg-white rounded-[2.5rem] overflow-hidden shadow-lg border border-slate-100 flex flex-col animate-fadeIn">
                <div className="flex flex-1">
                  <div className={`w-2 shrink-0 ${item.status === 'learned' ? 'bg-emerald-500' : item.status === 'learning' ? 'bg-amber-500' : item.status === 'correcting' ? 'bg-violet-500' : 'bg-rose-500'}`}></div>
                  <div className="p-6 md:p-8 flex-1 flex flex-col gap-6">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-slate-900 font-black text-sm leading-snug break-words uppercase tracking-tight">{item.song}</h4>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="material-icons text-[10px] text-slate-400">history</span>
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                            Atualizado em: {new Date(item.updatedAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => removeItem(item.song)} className="w-10 h-10 -mr-2 -mt-2 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors">
                        <span className="material-icons text-xl">delete_outline</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-3xl">
                      <button onClick={() => updateStatus(item.song, 'not_started')} className={`flex-1 h-12 rounded-2xl flex items-center justify-center transition-all ${item.status === 'not_started' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-rose-500'}`}><span className="material-icons">schedule</span></button>
                      <button onClick={() => updateStatus(item.song, 'learning')} className={`flex-1 h-12 rounded-2xl flex items-center justify-center transition-all ${item.status === 'learning' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400 hover:text-amber-500'}`}><span className="material-icons">menu_book</span></button>
                      <button onClick={() => updateStatus(item.song, 'correcting')} className={`flex-1 h-12 rounded-2xl flex items-center justify-center transition-all ${item.status === 'correcting' ? 'bg-violet-500 text-white shadow-lg' : 'text-slate-400 hover:text-violet-500'}`}><span className="material-icons">edit_note</span></button>
                      <button onClick={() => updateStatus(item.song, 'learned')} className={`flex-1 h-12 rounded-2xl flex items-center justify-center transition-all ${item.status === 'learned' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-emerald-500'}`}><span className="material-icons">verified</span></button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PraiseLearningList;
