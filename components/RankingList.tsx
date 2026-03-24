
import React, { useMemo, useState } from 'react';
import { SongStats } from '../types';

interface Props { songStats: Record<string, SongStats>; }

const RankingList: React.FC<Props> = ({ songStats }) => {
  const [activeCategory, setActiveCategory] = useState<'principais' | 'cias'>('principais');

  const { topPrincipais, topCias } = useMemo(() => {
    const allStats = Object.values(songStats) as SongStats[];
    
    const principais = allStats
      .filter(stat => !stat.song.startsWith('(CIAS)') && stat.count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const cias = allStats
      .filter(stat => stat.song.startsWith('(CIAS)') && stat.count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { topPrincipais: principais, topCias: cias };
  }, [songStats]);

  const currentList = activeCategory === 'principais' ? topPrincipais : topCias;

  if (topPrincipais.length === 0 && topCias.length === 0) return (
    <div className="text-center py-20 bg-white/5 rounded-[3rem] border-2 border-dashed border-white/10">
       <span className="material-icons text-white/5 text-6xl mb-4">analytics</span>
       <p className="text-white/20 font-black text-xs uppercase tracking-widest">Sem repetições suficientes para ranking</p>
    </div>
  );

  const maxCount = currentList[0]?.count || 1;

  return (
    <div className="bg-white rounded-[3rem] shadow-2xl p-8 md:p-12 border border-slate-100 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tighter uppercase">
          <span className="material-icons text-amber-500">trending_up</span>
          Mais Cantados
        </h2>
        
        <div className="flex bg-slate-100 p-1 rounded-2xl self-start md:self-center">
          <button 
            onClick={() => setActiveCategory('principais')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === 'principais' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Principais
          </button>
          <button 
            onClick={() => setActiveCategory('cias')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === 'cias' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            CIAS
          </button>
        </div>
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
                    index === 0 ? (activeCategory === 'cias' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-amber-500 text-white shadow-lg shadow-amber-500/20') :
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
                  <span className={`font-black text-xl block leading-none ${activeCategory === 'cias' ? 'text-rose-500' : 'text-indigo-600'}`}>{stat.count}</span>
                  <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Atos</span>
                </div>
              </div>
              
              <div className="relative w-full h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${
                    index === 0 ? (activeCategory === 'cias' ? 'bg-rose-500' : 'bg-amber-500') : 
                    index < 3 ? (activeCategory === 'cias' ? 'bg-rose-400' : 'bg-indigo-500') : 
                    (activeCategory === 'cias' ? 'bg-rose-200' : 'bg-indigo-200')
                  }`}
                  style={{ width: `${(stat.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RankingList;
