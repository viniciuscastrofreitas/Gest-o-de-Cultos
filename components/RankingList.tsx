
import React, { useMemo } from 'react';
import { SongStats } from '../types';

interface Props { songStats: Record<string, SongStats>; }

const RankingList: React.FC<Props> = ({ songStats }) => {
  const top10 = useMemo(() => {
    return (Object.values(songStats) as SongStats[])
      .filter(stat => stat.count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [songStats]);

  if (top10.length === 0) return (
    <div className="text-center py-20 bg-white/5 rounded-[3rem] border-2 border-dashed border-white/10">
       <span className="material-icons text-white/5 text-6xl mb-4">analytics</span>
       <p className="text-white/20 font-black text-xs uppercase tracking-widest">Sem repetições suficientes para ranking</p>
    </div>
  );

  const maxCount = top10[0]?.count || 1;

  return (
    <div className="bg-white rounded-[3rem] shadow-2xl p-8 md:p-12 border border-slate-100 animate-fadeIn">
      <div className="flex items-center justify-between mb-10">
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tighter uppercase">
          <span className="material-icons text-amber-500">trending_up</span>
          Mais Cantados
        </h2>
        <span className="bg-indigo-50 px-4 py-1.5 rounded-full text-[9px] font-black text-indigo-600 uppercase tracking-widest">Destaques</span>
      </div>

      <div className="space-y-8">
        {top10.map((stat, index) => (
          <div key={stat.song} className="group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-5 overflow-hidden">
                <div className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-2xl font-black text-sm transition-all group-hover:scale-110 ${
                  index === 0 ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' :
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
                <span className="text-indigo-600 font-black text-xl block leading-none">{stat.count}</span>
                <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Atos</span>
              </div>
            </div>
            
            <div className="relative w-full h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out ${
                  index === 0 ? 'bg-amber-500' : index < 3 ? 'bg-indigo-500' : 'bg-indigo-200'
                }`}
                style={{ width: `${(stat.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RankingList;
