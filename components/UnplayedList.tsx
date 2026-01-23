
import React, { useMemo, useState } from 'react';
import { ServiceRecord } from '../types';

interface Props {
  fullSongList: string[];
  history: ServiceRecord[];
}

interface GroupDefinition { name: string; min: number; max: number; }

const CATEGORIES: GroupDefinition[] = [
  { name: "CLAMOR", min: 1, max: 56 },
  { name: "INVOCAÇÃO E COMUNHÃO", min: 57, max: 96 },
  { name: "DEDICAÇÃO", min: 97, max: 200 },
  { name: "MORTE, RESSURREIÇÃO E SALVAÇÃO", min: 201, max: 294 },
  { name: "CONSOLO E ENCORAJAMENTO", min: 295, max: 385 },
  { name: "SANTIFICAÇÃO E DERRAMAMENTO DO E.S.", min: 386, max: 477 },
  { name: "VOLTA DE JESUS E ETERNIDADE", min: 478, max: 571 },
  { name: "LOUVOR", min: 572, max: 649 },
  { name: "SALMOS DE LOUVOR", min: 650, max: 665 },
  { name: "GRUPO DE LOUVOR", min: 666, max: 730 },
  { name: "CORINHOS", min: 731, max: 794 },
];

const CIAS_CATEGORIES: GroupDefinition[] = [
  { name: "CLAMOR", min: 1, max: 13 },
  { name: "INVOCAÇÃO E COMUNHÃO", min: 14, max: 22 },
  { name: "DEDICAÇÃO", min: 23, max: 59 },
  { name: "MORTE, RESSURREIÇÃO E SALVAÇÃO", min: 60, max: 108 },
  { name: "CONSOLO E ENCORAJAMENTO", min: 109, max: 132 },
  { name: "SANTIFICAÇÃO E DERRAMAMENTO DO E.S.", min: 133, max: 180 },
  { name: "VOLTA DE JESUS E ETERNIDADE", min: 181, max: 219 },
  { name: "LOUVOR", min: 220, max: 241 },
];

const UnplayedList: React.FC<Props> = ({ fullSongList, history }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isPrincipaisExpanded, setIsPrincipaisExpanded] = useState(true);
  const [isCiasExpanded, setIsCiasExpanded] = useState(true);
  const [expandedSubCats, setExpandedSubCats] = useState<Record<string, boolean>>({});
  const [expandedCiasSubCats, setExpandedCiasSubCats] = useState<Record<string, boolean>>({});

  const extractNumber = (song: string): number | null => {
    const match = song.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  const { groupedMain, groupedCias, mainStats, ciasStats } = useMemo(() => {
    const playedSongsSet = new Set<string>();
    history.forEach(r => r.songs.forEach(s => playedSongsSet.add(s.trim())));

    const mainGroups: Record<string, string[]> = {};
    CATEGORIES.forEach(cat => mainGroups[cat.name] = []);
    const ciasGroups: Record<string, string[]> = {};
    CIAS_CATEGORIES.forEach(cat => ciasGroups[cat.name] = []);

    let unMain = 0, totMain = 0, unCias = 0, totCias = 0;

    fullSongList.forEach(song => {
      const isUnplayed = !playedSongsSet.has(song.trim());
      const isCias = song.startsWith('(CIAS)');
      if (isCias) { totCias++; if (isUnplayed) unCias++; } else { totMain++; if (isUnplayed) unMain++; }
      
      if (isUnplayed && song.toLowerCase().includes(searchTerm.toLowerCase())) {
        const num = extractNumber(song);
        if (isCias) {
          if (num !== null) {
            for (const cat of CIAS_CATEGORIES) if (num >= cat.min && num <= cat.max) { ciasGroups[cat.name].push(song); break; }
          }
        } else {
          if (num !== null) {
            for (const cat of CATEGORIES) if (num >= cat.min && num <= cat.max) { mainGroups[cat.name].push(song); break; }
          }
        }
      }
    });

    return { 
      groupedMain: mainGroups, groupedCias: ciasGroups,
      mainStats: { unplayed: unMain, total: totMain, percent: totMain > 0 ? Math.round(((totMain - unMain) / totMain) * 100) : 0 },
      ciasStats: { unplayed: unCias, total: totCias, percent: totCias > 0 ? Math.round(((totCias - unCias) / totCias) * 100) : 0 }
    };
  }, [fullSongList, history, searchTerm]);

  const handleShareCategory = (catName: string, songs: string[]) => {
    if (songs.length === 0) return;
    const text = `🎵 *HINOS RESTANTES (${catName})*\n\n` + songs.map(s => `▫️ ${s}`).join('\n');
    if (navigator.share) {
      navigator.share({ title: `Hinos Restantes - ${catName}`, text });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-1">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">Hinos Restantes</h2>
          <p className="text-[10px] text-slate-400 font-black mt-1 uppercase tracking-[0.2em]">Incentive o ensino de novos louvores</p>
        </div>
        <div className="relative w-full md:w-80">
          <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm">search</span>
          <input 
            type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Filtrar por nome ou nº..."
            className="w-full pl-11 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-slate-900 outline-none focus:border-indigo-500 shadow-2xl text-xs font-bold placeholder:text-slate-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[ { label: "Coletânea Principal", stats: mainStats, color: 'indigo' }, { label: "Coletânea CIAS", stats: ciasStats, color: 'emerald' } ].map(p => (
          <div key={p.label} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col sm:flex-row items-center gap-8">
            <div className="flex-1 w-full">
              <div className="flex justify-between items-end mb-3">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{p.label}</span>
                <span className={`text-${p.color}-600 font-black text-xs`}>{p.stats.percent}% OK</span>
              </div>
              <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                <div className={`h-full bg-${p.color}-500 transition-all duration-1000`} style={{ width: `${p.stats.percent}%` }} />
              </div>
            </div>
            <div className="flex gap-3 shrink-0">
              <div className="text-center bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-100 min-w-[70px]">
                <div className="text-lg font-black text-slate-900 leading-none">{p.stats.unplayed}</div>
                <div className="text-[7px] font-black text-slate-400 uppercase mt-1">Faltam</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {[ { title: "Principais", stats: mainStats, groups: groupedMain, cats: CATEGORIES, color: 'indigo', state: isPrincipaisExpanded, setState: setIsPrincipaisExpanded, subState: expandedSubCats, setSubState: setExpandedSubCats },
           { title: "CIAS", stats: ciasStats, groups: groupedCias, cats: CIAS_CATEGORIES, color: 'emerald', state: isCiasExpanded, setState: setIsCiasExpanded, subState: expandedCiasSubCats, setSubState: setExpandedCiasSubCats } ].map(col => (
          <div key={col.title} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden flex flex-col">
            <button onClick={() => col.setState(!col.state)} className={`w-full p-8 flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-100`}>
              <div className="flex items-center gap-4">
                <span className={`material-icons text-${col.color}-600 transition-transform duration-300 ${col.state ? '' : '-rotate-90'}`}>keyboard_arrow_down</span>
                <h3 className={`font-black text-slate-900 uppercase tracking-[0.2em] text-xs`}>{col.title} <span className={`ml-2 text-${col.color}-600`}>({col.stats.unplayed})</span></h3>
              </div>
            </button>
            {col.state && (
              <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {col.cats.map(cat => (
                  <div key={cat.name} className="border border-slate-100 rounded-3xl overflow-hidden">
                    <div className="flex items-center">
                      <button onClick={() => col.setSubState({ ...col.subState, [cat.name]: !col.subState[cat.name] })} className={`flex-1 px-6 py-5 flex justify-between items-center transition-colors ${col.subState[cat.name] ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
                        <div className="flex flex-col items-start">
                          <span className={`text-[10px] font-black tracking-widest text-left pr-4 ${col.subState[cat.name] ? `text-${col.color}-600` : 'text-slate-500'}`}>{cat.name}</span>
                          <span className="text-[8px] font-black text-slate-300 uppercase mt-1">Restam {col.groups[cat.name].length}</span>
                        </div>
                        <span className="material-icons text-slate-200 text-xl">{col.subState[cat.name] ? 'expand_less' : 'expand_more'}</span>
                      </button>
                      {col.groups[cat.name].length > 0 && (
                        <button onClick={() => handleShareCategory(cat.name, col.groups[cat.name])} className="p-5 text-indigo-500 active:scale-90 transition-transform"><span className="material-icons">share</span></button>
                      )}
                    </div>
                    {col.subState[cat.name] && (
                      <div className="p-4 grid gap-2.5 animate-fadeIn bg-slate-50/50">
                        {col.groups[cat.name].length > 0 ? col.groups[cat.name].map((s, i) => (
                          <div key={i} className="p-4 bg-white rounded-2xl text-[11px] font-bold text-slate-700 border border-slate-100 uppercase tracking-tight shadow-sm">{s}</div>
                        )) : <p className="py-4 text-center text-[9px] font-black text-emerald-600 uppercase tracking-widest">Categoria Completa!</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UnplayedList;
