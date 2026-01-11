
import React, { useMemo } from 'react';
import { SongStats } from '../types';

interface Props {
  songStats: Record<string, SongStats>;
}

const RankingList: React.FC<Props> = ({ songStats }) => {
  const top10 = useMemo(() => {
    // Fix: Cast the result of Object.values to SongStats[] to resolve 'unknown' type errors on properties like 'count'
    return (Object.values(songStats) as SongStats[])
      // Mostra apenas louvores que houveram repetição (cantados mais de uma vez)
      .filter(stat => stat.count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [songStats]);

  if (top10.length === 0) {
    return null; // Não mostra se não houver louvores repetidos
  }

  const maxCount = top10[0]?.count || 1;

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 md:p-8 border border-slate-100 animate-fadeIn">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
          <span className="material-icons text-amber-500">emoji_events</span>
          Ranking: Mais Cantados
        </h2>
        <span className="bg-indigo-50 px-3 py-1 rounded-full text-[10px] font-black text-indigo-500 uppercase tracking-widest">Apenas Repetidos</span>
      </div>

      <div className="space-y-6">
        {top10.map((stat, index) => (
          <div key={stat.song} className="group">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4 overflow-hidden">
                <div className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-xl font-black text-sm transition-all group-hover:scale-110 ${
                  index === 0 ? 'bg-amber-400 text-amber-900 shadow-lg shadow-amber-200' :
                  index === 1 ? 'bg-slate-300 text-slate-800' :
                  index === 2 ? 'bg-orange-300 text-orange-900' :
                  'bg-slate-100 text-slate-400'
                }`}>
                  {index + 1}
                </div>
                <span className="font-bold text-slate-700 truncate text-sm md:text-base">
                  {stat.song}
                </span>
              </div>
              <div className="text-right">
                <span className="text-indigo-600 font-black text-lg block leading-none">
                  {stat.count}
                </span>
                <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">VEZES</span>
              </div>
            </div>
            
            {/* Elegant Progress Bar */}
            <div className="relative w-full h-3 bg-slate-50 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out ${
                  index === 0 ? 'bg-amber-400' : 
                  index < 3 ? 'bg-indigo-400' : 
                  'bg-indigo-200'
                }`}
                style={{ width: `${(stat.count / maxCount) * 100}%` }}
              />
            </div>
            
            {stat.lastDate && (
              <p className="text-[9px] text-slate-400 mt-1 font-medium flex items-center justify-end gap-1">
                <span className="material-icons text-[10px]">update</span>
                Visto em: {new Date(stat.lastDate + 'T12:00:00').toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RankingList;
