
import React, { useMemo, useState } from 'react';
import { ServiceRecord } from '../types';

interface Props {
  fullSongList: string[];
  history: ServiceRecord[];
}

interface GroupDefinition {
  name: string;
  min: number;
  max: number;
}

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
  
  const [expandedSubCats, setExpandedSubCats] = useState<Record<string, boolean>>(
    CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.name]: false }), {})
  );

  const [expandedCiasSubCats, setExpandedCiasSubCats] = useState<Record<string, boolean>>(
    CIAS_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.name]: false }), {})
  );

  const extractNumber = (song: string): number | null => {
    const match = song.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  const toggleSubCat = (name: string) => {
    setExpandedSubCats(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const toggleCiasSubCat = (name: string) => {
    setExpandedCiasSubCats(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const { 
    groupedMain, 
    groupedCias,
    mainStats,
    ciasStats
  } = useMemo(() => {
    const playedSongsSet = new Set<string>();
    history.forEach(record => {
      record.songs.forEach(song => playedSongsSet.add(song.trim()));
    });

    const mainGroups: Record<string, string[]> = {};
    CATEGORIES.forEach(cat => mainGroups[cat.name] = []);
    
    const ciasGroups: Record<string, string[]> = {};
    CIAS_CATEGORIES.forEach(cat => ciasGroups[cat.name] = []);

    const extraMain: string[] = [];
    const extraCias: string[] = [];

    let unplayedMainCount = 0;
    let totalMainCount = 0;
    let unplayedCiasCount = 0;
    let totalCiasCount = 0;

    fullSongList.forEach(song => {
      const songTrimmed = song.trim();
      const isUnplayed = !playedSongsSet.has(songTrimmed);
      const isCias = song.startsWith('(CIAS)');

      // Contagem Geral para Estatísticas
      if (isCias) {
        totalCiasCount++;
        if (isUnplayed) unplayedCiasCount++;
      } else {
        totalMainCount++;
        if (isUnplayed) unplayedMainCount++;
      }
      
      // Organização por categorias para exibição
      if (isUnplayed) {
        const isSearchMatch = song.toLowerCase().includes(searchTerm.toLowerCase());
        if (isSearchMatch) {
          const num = extractNumber(song);
          let added = false;
          
          if (isCias) {
            if (num !== null) {
              for (const cat of CIAS_CATEGORIES) {
                if (num >= cat.min && num <= cat.max) {
                  ciasGroups[cat.name].push(song);
                  added = true;
                  break;
                }
              }
            }
            if (!added) extraCias.push(song);
          } else {
            if (num !== null) {
              for (const cat of CATEGORIES) {
                if (num >= cat.min && num <= cat.max) {
                  mainGroups[cat.name].push(song);
                  added = true;
                  break;
                }
              }
            }
            if (!added) extraMain.push(song);
          }
        }
      }
    });

    return { 
      groupedMain: mainGroups, 
      groupedCias: ciasGroups,
      mainStats: {
        unplayed: unplayedMainCount,
        total: totalMainCount,
        percent: totalMainCount > 0 ? Math.round(((totalMainCount - unplayedMainCount) / totalMainCount) * 100) : 0
      },
      ciasStats: {
        unplayed: unplayedCiasCount,
        total: totalCiasCount,
        percent: totalCiasCount > 0 ? Math.round(((totalCiasCount - unplayedCiasCount) / totalCiasCount) * 100) : 0
      }
    };
  }, [fullSongList, history, searchTerm]);

  return (
    <div className="space-y-6 animate-fadeIn pb-10 flex flex-col h-full">
      {/* Cabeçalho e Busca */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-1">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="material-icons text-indigo-600">assignment_late</span>
            Louvores Restantes
          </h2>
          <p className="text-[10px] text-slate-500 font-black mt-1 uppercase tracking-[0.15em]">
            Hinos que nunca constaram em nenhum relatório
          </p>
        </div>
        
        <div className="relative w-full md:w-80">
          <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar nesta lista..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 outline-none shadow-sm text-sm font-semibold"
          />
        </div>
      </div>

      {/* Resumo de Progresso Duplo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Progresso Principais */}
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center gap-5">
          <div className="flex-1 w-full">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Coletânea Principal</span>
              <span className="text-indigo-600 font-black text-xs">{mainStats.percent}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-1000" 
                style={{ width: `${mainStats.percent}%` }}
              />
            </div>
          </div>
          <div className="flex gap-3 shrink-0">
            <div className="text-center bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
              <div className="text-sm font-black text-slate-700 leading-none">{mainStats.unplayed}</div>
              <div className="text-[7px] font-black text-slate-400 uppercase mt-1">Restam</div>
            </div>
            <div className="text-center bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
              <div className="text-sm font-black text-indigo-700 leading-none">{mainStats.total}</div>
              <div className="text-[7px] font-black text-indigo-500 uppercase mt-1">Total</div>
            </div>
          </div>
        </div>

        {/* Progresso CIAS */}
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center gap-5">
          <div className="flex-1 w-full">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Coletânea CIAS</span>
              <span className="text-emerald-600 font-black text-xs">{ciasStats.percent}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-1000" 
                style={{ width: `${ciasStats.percent}%` }}
              />
            </div>
          </div>
          <div className="flex gap-3 shrink-0">
            <div className="text-center bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
              <div className="text-sm font-black text-slate-700 leading-none">{ciasStats.unplayed}</div>
              <div className="text-[7px] font-black text-slate-400 uppercase mt-1">Restam</div>
            </div>
            <div className="text-center bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
              <div className="text-sm font-black text-emerald-700 leading-none">{ciasStats.total}</div>
              <div className="text-[7px] font-black text-emerald-500 uppercase mt-1">Total</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* Coluna Principais */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col">
          <button 
            onClick={() => setIsPrincipaisExpanded(!isPrincipaisExpanded)}
            className="w-full p-6 flex justify-between items-center bg-slate-50/50 hover:bg-slate-100/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className={`material-icons text-indigo-500 transition-transform duration-300 ${isPrincipaisExpanded ? '' : '-rotate-90'}`}>
                keyboard_arrow_down
              </span>
              <h3 className="font-black text-slate-700 uppercase tracking-widest text-xs flex items-center gap-2">
                Hinos Principais
                <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-full text-[10px] shadow-sm">{mainStats.unplayed}</span>
              </h3>
            </div>
            <span className="text-[9px] font-bold text-slate-400 uppercase">{isPrincipaisExpanded ? 'Recolher' : 'Expandir'}</span>
          </button>

          {isPrincipaisExpanded && (
            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white">
              {CATEGORIES.map(cat => (
                <div key={cat.name} className="border border-slate-100 rounded-[1.5rem] overflow-hidden">
                  <button 
                    onClick={() => toggleSubCat(cat.name)}
                    className={`w-full px-5 py-4 flex justify-between items-center transition-colors ${expandedSubCats[cat.name] ? 'bg-indigo-50/30' : 'bg-slate-50/30 hover:bg-slate-50'}`}
                  >
                    <div className="flex flex-col items-start">
                      <span className={`text-[10px] font-black tracking-wider text-left pr-4 ${expandedSubCats[cat.name] ? 'text-indigo-600' : 'text-slate-500'}`}>
                        {cat.name}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Faltam {groupedMain[cat.name].length} hinos</span>
                    </div>
                    <span className="material-icons text-slate-300 text-lg">
                      {expandedSubCats[cat.name] ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                  
                  {expandedSubCats[cat.name] && (
                    <div className="p-3 grid gap-2 animate-fadeIn">
                      {groupedMain[cat.name].length > 0 ? (
                        groupedMain[cat.name].map((song, i) => (
                          <div key={i} className="p-3.5 bg-slate-50/50 rounded-xl text-xs font-bold text-slate-600 border border-transparent hover:border-indigo-100 hover:bg-white transition-all">
                            {song}
                          </div>
                        ))
                      ) : (
                        <div className="py-4 text-center">
                          <span className="material-icons text-emerald-500 text-xl mb-1">done_all</span>
                          <p className="text-[10px] text-slate-400 italic uppercase font-black">Todos desta categoria já foram cantados!</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Coluna CIAS */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col">
          <button 
            onClick={() => setIsCiasExpanded(!isCiasExpanded)}
            className="w-full p-6 flex justify-between items-center bg-emerald-50/30 hover:bg-emerald-100/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className={`material-icons text-emerald-600 transition-transform duration-300 ${isCiasExpanded ? '' : '-rotate-90'}`}>
                keyboard_arrow_down
              </span>
              <h3 className="font-black text-emerald-700 uppercase tracking-widest text-xs flex items-center gap-2">
                Louvores CIAS
                <span className="bg-emerald-700 text-white px-2 py-0.5 rounded-full text-[10px] shadow-sm">{ciasStats.unplayed}</span>
              </h3>
            </div>
            <span className="text-[9px] font-bold text-emerald-600 uppercase">{isCiasExpanded ? 'Recolher' : 'Expandir'}</span>
          </button>

          {isCiasExpanded && (
            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white">
              {CIAS_CATEGORIES.map(cat => (
                <div key={cat.name} className="border border-slate-100 rounded-[1.5rem] overflow-hidden">
                  <button 
                    onClick={() => toggleCiasSubCat(cat.name)}
                    className={`w-full px-5 py-4 flex justify-between items-center transition-colors ${expandedCiasSubCats[cat.name] ? 'bg-emerald-50/30' : 'bg-slate-50/30 hover:bg-slate-50'}`}
                  >
                    <div className="flex flex-col items-start">
                      <span className={`text-[10px] font-black tracking-wider text-left pr-4 ${expandedCiasSubCats[cat.name] ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {cat.name}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Faltam {groupedCias[cat.name].length} hinos</span>
                    </div>
                    <span className="material-icons text-slate-300 text-lg">
                      {expandedCiasSubCats[cat.name] ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                  
                  {expandedCiasSubCats[cat.name] && (
                    <div className="p-3 grid gap-2 animate-fadeIn">
                      {groupedCias[cat.name].length > 0 ? (
                        groupedCias[cat.name].map((song, i) => (
                          <div key={i} className="p-3.5 bg-slate-50/50 rounded-xl text-xs font-bold text-slate-600 border border-transparent hover:border-emerald-100 hover:bg-white transition-all">
                            {song}
                          </div>
                        ))
                      ) : (
                        <div className="py-4 text-center">
                          <span className="material-icons text-emerald-500 text-xl mb-1">done_all</span>
                          <p className="text-[10px] text-slate-400 italic uppercase font-black">Todos desta categoria já foram cantados!</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default UnplayedList;
