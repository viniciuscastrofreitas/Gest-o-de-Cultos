
import React, { useState, useMemo } from 'react';
import { ServiceRecord } from '../types';

interface WorkerEvent { date: string; description: string; isAlpendre?: boolean; }
interface Props { history: ServiceRecord[]; workers: string[]; }

const WorkerRanking: React.FC<Props> = ({ history, workers }) => {
  const [modalData, setModalData] = useState<{ worker: string, role: string, events: WorkerEvent[] } | null>(null);

  const stats = useMemo(() => {
    const data: Record<string, { gate: WorkerEvent[], praise: WorkerEvent[], word: WorkerEvent[], total: number }> = {};
    const officialWorkers = workers.filter(name => !['VISITANTE', 'TRANSMISSÃO'].includes(name));
    officialWorkers.forEach(name => { data[name] = { gate: [], praise: [], word: [], total: 0 }; });

    history.forEach(r => {
      const eventBase = { date: r.date, description: r.description };
      
      // Processamento do Portão (suporta múltiplos obreiros e identifica Alpendre)
      if (r.roles.gate) {
        const rawGateWorkers = r.roles.gate.split(', ');
        rawGateWorkers.forEach(rawName => {
          const isAlpendre = rawName.endsWith(' (Alpendre)');
          const name = isAlpendre ? rawName.replace(' (Alpendre)', '').trim() : rawName.trim();
          if (data[name]) {
            data[name].gate.push({ ...eventBase, isAlpendre });
          }
        });
      }

      if (r.roles.praise && data[r.roles.praise]) data[r.roles.praise].praise.push({ ...eventBase });
      if (r.roles.word && data[r.roles.word]) data[r.roles.word].word.push({ ...eventBase });
    });

    Object.keys(data).forEach(name => {
      data[name].total = data[name].gate.length + data[name].praise.length + data[name].word.length;
      data[name].gate.sort((a, b) => b.date.localeCompare(a.date));
      data[name].praise.sort((a, b) => b.date.localeCompare(a.date));
      data[name].word.sort((a, b) => b.date.localeCompare(a.date));
    });

    return Object.entries(data).map(([name, val]) => ({ name, ...val })).sort((a, b) => b.total - a.total);
  }, [history, workers]);

  const StatBox = ({ label, count, onClick, icon }: { label: string, count: number, onClick: () => void, icon: string }) => (
    <button 
      onClick={onClick} 
      className="w-full aspect-square bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center justify-center transition-all active:scale-95 hover:bg-slate-100 group p-2"
    >
      <div className="flex flex-col items-center gap-1 mb-1.5">
        <span className="material-icons text-[14px] text-slate-300 group-hover:text-indigo-600">{icon}</span>
        <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 text-center">{label}</span>
      </div>
      <span className="text-2xl md:text-3xl font-black text-slate-900 leading-none">{count}</span>
    </button>
  );

  return (
    <>
      <div className="space-y-10 animate-fadeIn pb-10 max-w-4xl mx-auto">
        <div className="px-2">
          <h2 className="text-2xl font-black text-white tracking-tight uppercase">Ranking Obreiros</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Total de atos acumulados</p>
        </div>

        <div className="grid gap-8">
          {stats.map((worker) => (
            <div key={worker.name} className="bg-white rounded-[3rem] overflow-hidden shadow-2xl border border-slate-100">
              <div className="bg-slate-50 px-8 md:px-10 py-8 flex justify-between items-center relative overflow-hidden border-b border-slate-100">
                <h3 className="text-slate-900 font-black text-xl tracking-tight uppercase relative z-10">{worker.name}</h3>
                <div className="bg-amber-500 text-white px-5 py-2 rounded-full font-black text-[10px] shadow-lg flex items-center gap-2 relative z-10 shadow-amber-500/20">
                  <span className="material-icons text-[14px]">military_tech</span>
                  {worker.total} ATOS
                </div>
              </div>
              <div className="p-5 md:p-6 grid grid-cols-3 gap-3 md:gap-5">
                <StatBox label="Portão" count={worker.gate.length} icon="door_front" onClick={() => setModalData({ worker: worker.name, role: 'Portão', events: worker.gate })} />
                <StatBox label="Louvor" count={worker.praise.length} icon="music_note" onClick={() => setModalData({ worker: worker.name, role: 'Louvor', events: worker.praise })} />
                <StatBox label="Palavra" count={worker.word.length} icon="record_voice_over" onClick={() => setModalData({ worker: worker.name, role: 'Palavra', events: worker.word })} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {modalData && (
        <div className="fixed inset-0 z-[6000] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fadeIn" onClick={() => setModalData(null)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slideInRight border-l border-slate-100">
            <div className="bg-slate-50 pt-24 pb-12 px-10 relative border-b border-slate-100">
              <span className="text-indigo-600 font-black text-[10px] uppercase tracking-[0.3em] block mb-2">Histórico</span>
              <h3 className="text-slate-900 font-black text-3xl uppercase tracking-tighter mb-6 leading-none">{modalData.worker}</h3>
              <div className="flex gap-2">
                <span className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest">{modalData.role}</span>
                <span className="bg-amber-500 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest">{modalData.events.length} Vezes</span>
              </div>
              <button onClick={() => setModalData(null)} className="absolute top-20 right-8 w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-300 active:scale-90 border border-slate-100 shadow-sm"><span className="material-icons">close</span></button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-4 custom-scrollbar">
              {modalData.events.map((ev, i) => (
                <div key={i} className="flex justify-between items-center p-5 bg-slate-50 rounded-3xl border border-slate-100 transition-all hover:bg-slate-100">
                  <div className="flex flex-col">
                    <span className="font-black text-slate-800 text-base leading-none mb-1">
                      {new Date(ev.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      {ev.isAlpendre && (
                        <span className="ml-2 text-[8px] text-amber-500 font-black uppercase tracking-tighter">(Alpendre)</span>
                      )}
                    </span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{ev.description}</span>
                  </div>
                  <span className="material-icons text-emerald-500 text-lg">check_circle</span>
                </div>
              ))}
            </div>
            <div className="p-10 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalData(null)} className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl uppercase text-[11px] tracking-widest active:scale-95 shadow-xl">VOLTAR</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WorkerRanking;
