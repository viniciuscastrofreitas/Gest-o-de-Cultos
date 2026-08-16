import React, { useMemo, useState } from 'react';
import { ServiceRecord, SongStats } from '../types';
import { RepetitionChart } from './RepetitionChart';

interface Props {
  songStats: Record<string, SongStats>;
  fullSongList?: string[];
  history?: ServiceRecord[];
}

const RankingList: React.FC<Props> = ({ songStats, fullSongList = [], history = [] }) => {
  const [activeCategory, setActiveCategory] = useState<'principais' | 'cias' | 'clamor'>('principais');
  const [isRankingExpanded, setIsRankingExpanded] = useState(true);
  const [isClamorHistoryExpanded, setIsClamorHistoryExpanded] = useState(true);

  const extractNumber = (song: string): number | null => {
    const match = song.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  const isClamorSong = (song: string): boolean => {
    const isCias = song.startsWith('(CIAS)');
    const num = extractNumber(song);
    if (num === null) return false;
    return isCias ? (num >= 1 && num <= 13) : (num >= 1 && num <= 56);
  };

  const { topPrincipais, topCias, topClamor } = useMemo(() => {
    const allStats = Object.values(songStats) as SongStats[];
    
    const principais = allStats
      .filter(stat => !stat.song.startsWith('(CIAS)') && !isClamorSong(stat.song) && stat.count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const cias = allStats
      .filter(stat => stat.song.startsWith('(CIAS)') && !isClamorSong(stat.song) && stat.count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const clamor = allStats
      .filter(stat => isClamorSong(stat.song) && stat.count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { topPrincipais: principais, topCias: cias, topClamor: clamor };
  }, [songStats]);

  const clamorHistory = useMemo(() => {
    const list = (fullSongList || []).filter(isClamorSong);
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    return list.map(song => {
      const stat = songStats[song];
      const lastDate = stat?.lastDate || null;
      let daysSince = Infinity;

      if (lastDate) {
        daysSince = Math.ceil(
          (today.getTime() - new Date(lastDate + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      return {
        song,
        lastDate,
        daysSince,
        count: stat?.count || 0
      };
    }).sort((a, b) => {
      if (b.daysSince !== a.daysSince) {
        return b.daysSince - a.daysSince;
      }
      return a.song.localeCompare(b.song, undefined, { numeric: true });
    });
  }, [fullSongList, songStats]);

  const currentList = useMemo(() => {
    if (activeCategory === 'principais') return topPrincipais;
    if (activeCategory === 'cias') return topCias;
    return topClamor;
  }, [activeCategory, topPrincipais, topCias, topClamor]);

  const formatDateStr = (dateStr: string | null) => {
    if (!dateStr) return 'NUNCA';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const maxCount = currentList[0]?.count || 1;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* GRÁFICO E ÍNDICE GERAL DE REPETIÇÃO */}
      <RepetitionChart history={history} songStats={songStats} fullSongList={fullSongList} />

      {/* CARD 1 - RANKING DE MAIS CANTADOS */}
      <div className="bg-white rounded-[3rem] shadow-2xl p-8 md:p-12 border border-slate-100">
        <button 
          onClick={() => setIsRankingExpanded(!isRankingExpanded)}
          className="w-full flex items-center justify-between text-left focus:outline-none"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
              <span className="material-icons text-xl">trending_up</span>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Mais Cantados</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Ranking de execuções de louvores</p>
            </div>
          </div>
          <span className={`material-icons text-slate-300 transition-transform duration-300 ${isRankingExpanded ? 'rotate-180 text-amber-500' : ''}`}>expand_more</span>
        </button>

        {isRankingExpanded && (
          <div className="mt-10 animate-scaleUp">
            <div className="flex bg-slate-100 p-1 rounded-2xl self-start md:self-center mb-8 gap-1">
              <button 
                onClick={() => setActiveCategory('principais')}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === 'principais' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Principais
              </button>
              <button 
                onClick={() => setActiveCategory('cias')}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === 'cias' ? 'bg-white text-rose-500 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                CIAS
              </button>
              <button 
                onClick={() => setActiveCategory('clamor')}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === 'clamor' ? 'bg-white text-amber-500 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Clamor
              </button>
            </div>

            {currentList.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Nenhum hino nesta categoria com repetições</p>
              </div>
            ) : (
              <div className="space-y-8">
                {currentList.map((stat, index) => (
                  <div key={stat.song} className="group">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-5 overflow-hidden">
                        <div className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-2xl font-black text-sm transition-all group-hover:scale-110 ${
                          index === 0 ? (activeCategory === 'cias' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : activeCategory === 'clamor' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20') :
                          index === 1 ? 'bg-slate-200 text-slate-600' :
                          index === 2 ? 'bg-orange-600 text-white' :
                          'bg-slate-100 text-slate-400'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="font-black text-slate-800 truncate text-sm md:text-base uppercase tracking-tight">
                          {stat.song}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`font-black text-xl block leading-none ${activeCategory === 'cias' ? 'text-rose-500' : activeCategory === 'clamor' ? 'text-amber-500' : 'text-indigo-600'}`}>{stat.count}</span>
                        <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Atos</span>
                      </div>
                    </div>
                    
                    <div className="relative w-full h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${
                          index === 0 ? (activeCategory === 'cias' ? 'bg-rose-500' : activeCategory === 'clamor' ? 'bg-amber-500' : 'bg-indigo-500') : 
                          index < 3 ? (activeCategory === 'cias' ? 'bg-rose-400' : activeCategory === 'clamor' ? 'bg-amber-400' : 'bg-indigo-500') : 
                          (activeCategory === 'cias' ? 'bg-rose-200' : activeCategory === 'clamor' ? 'bg-amber-100' : 'bg-indigo-200')
                        }`}
                        style={{ width: `${(stat.count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CARD 2 - RECORRÊNCIA DO CLAMOR (MAIS ANTIGOS PARA MAIS RECENTES) */}
      <div className="bg-white rounded-[3rem] shadow-2xl p-8 md:p-12 border border-slate-100">
        <button 
          onClick={() => setIsClamorHistoryExpanded(!isClamorHistoryExpanded)}
          className="w-full flex items-center justify-between text-left focus:outline-none"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500">
              <span className="material-icons text-xl">hourglass_empty</span>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Recorrência do Clamor</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Do que cantou há mais tempo para o mais recente</p>
            </div>
          </div>
          <span className={`material-icons text-slate-300 transition-transform duration-300 ${isClamorHistoryExpanded ? 'rotate-180 text-indigo-500' : ''}`}>expand_more</span>
        </button>

        {isClamorHistoryExpanded && (
          <div className="mt-10 animate-scaleUp">
            {clamorHistory.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Nenhum louvor de clamor disponível</p>
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {clamorHistory.map((item, index) => {
                  const isNever = item.daysSince === Infinity;
                  return (
                    <div 
                      key={item.song} 
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all hover:bg-slate-50 ${
                        isNever ? 'bg-amber-50/40 border-amber-100' : 'bg-white border-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-xl font-black text-xs ${
                          isNever ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="font-bold text-slate-700 text-xs sm:text-sm uppercase tracking-tight">
                          {item.song}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mt-2 sm:mt-0 ml-12 sm:ml-0">
                        {item.count > 0 && (
                          <span className="bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider">
                            {item.count} {item.count === 1 ? 'vez' : 'vezes'}
                          </span>
                        )}
                        <div className="text-right">
                          <p className={`text-[10px] font-black uppercase tracking-wider ${isNever ? 'text-amber-600' : 'text-slate-600'}`}>
                            {isNever ? 'NUNCA' : `HÁ ${item.daysSince} ${item.daysSince === 1 ? 'DIA' : 'DIAS'}`}
                          </p>
                          {!isNever && (
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                              {formatDateStr(item.lastDate)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RankingList;
