
import React, { useState, useMemo } from 'react';
import { ServiceRecord } from '../types';
import { WORKERS_LIST } from '../constants';

interface WorkerEvent {
  date: string;
  description: string;
}

interface Props {
  history: ServiceRecord[];
}

const WorkerRanking: React.FC<Props> = ({ history }) => {
  const [modalData, setModalData] = useState<{ worker: string, role: string, events: WorkerEvent[] } | null>(null);

  const stats = useMemo(() => {
    const data: Record<string, { gate: WorkerEvent[], praise: WorkerEvent[], word: WorkerEvent[], total: number }> = {};
    const officialWorkers = WORKERS_LIST.filter(name => !['VISITANTE', 'TRANSMISSÃO'].includes(name));
    
    officialWorkers.forEach(name => {
      data[name] = { gate: [], praise: [], word: [], total: 0 };
    });

    history.forEach(r => {
      const event = { date: r.date, description: r.description };
      
      if (r.roles.gate && data[r.roles.gate]) {
        data[r.roles.gate].gate.push(event);
      }

      if (r.roles.leader && data[r.roles.leader]) {
        const leaderEvent = { ...event, description: `${event.description} (Dirigente)` };
        data[r.roles.leader].praise.push(leaderEvent);
        data[r.roles.leader].word.push(leaderEvent);
      } else {
        if (r.roles.praise && data[r.roles.praise]) data[r.roles.praise].praise.push(event);
        if (r.roles.word && data[r.roles.word]) data[r.roles.word].word.push(event);
      }
    });

    Object.keys(data).forEach(name => {
      data[name].total = data[name].gate.length + data[name].praise.length + data[name].word.length;
      data[name].gate.sort((a, b) => b.date.localeCompare(a.date));
      data[name].praise.sort((a, b) => b.date.localeCompare(a.date));
      data[name].word.sort((a, b) => b.date.localeCompare(a.date));
    });

    return Object.entries(data)
      .map(([name, val]) => ({ name, ...val }))
      .sort((a, b) => b.total - a.total);
  }, [history]);

  const StatBox = ({ label, count, onClick, icon }: { label: string, count: number, onClick: () => void, icon: string }) => (
    <button 
      onClick={onClick}
      className="flex-1 bg-white rounded-xl p-3 shadow-sm border border-slate-100 flex flex-col items-center justify-center transition-all active:scale-95 hover:shadow-md group"
    >
      <div className="flex items-center gap-1.5 mb-1 text-center">
        <span className="material-icons text-[12px] text-slate-500 group-hover:text-indigo-600 transition-colors">{icon}</span>
        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">{label}</span>
      </div>
      <span className="text-lg font-black text-[#1a1c3d] leading-none">{count}</span>
    </button>
  );

  return (
    <>
      <div className="space-y-6 animate-fadeIn pb-10 max-w-4xl mx-auto">
        <div className="px-2">
          <h2 className="text-2xl font-black text-white tracking-tight">Atividades por Obreiro</h2>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Total acumulado de atos realizados</p>
        </div>

        <div className="grid gap-4">
          {stats.map((worker) => (
            <div key={worker.name} className="bg-white rounded-[2rem] overflow-hidden shadow-lg border border-slate-100 group transition-all">
              <div className="bg-[#1a1c3d] px-6 py-4 flex justify-between items-center">
                <h3 className="text-white font-black text-base tracking-tight uppercase">{worker.name}</h3>
                <div className="bg-amber-400 text-[#1a1c3d] px-3 py-1.5 rounded-full font-black text-[9px] shadow-lg flex items-center gap-1.5">
                  <span className="material-icons text-[12px]">military_tech</span>
                  {worker.total} ATOS
                </div>
              </div>
              <div className="p-4 flex flex-row gap-2 bg-slate-50/50">
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
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" onClick={() => setModalData(null)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slideInRight">
            <div className="bg-[#1a1c3d] pt-12 pb-10 px-8 relative shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-icons text-indigo-400 text-sm">history</span>
                <span className="text-indigo-400 font-black text-[9px] uppercase tracking-widest block">HISTÓRICO DETALHADO</span>
              </div>
              <h3 className="text-white font-black text-2xl uppercase tracking-tighter">{modalData.worker}</h3>
              <div className="mt-4 flex gap-2">
                <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/5 text-white/80 font-black text-[10px] uppercase">{modalData.role}</div>
                <div className="bg-amber-400 px-3 py-1.5 rounded-xl text-[#1a1c3d] font-black text-[10px] uppercase">{modalData.events.length} VEZES</div>
              </div>
              <button onClick={() => setModalData(null)} className="absolute top-8 right-8 w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white/40"><span className="material-icons">close</span></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-3">
              {modalData.events.map((ev, i) => (
                <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-indigo-600 bg-white w-8 h-8 rounded-lg flex items-center justify-center border border-slate-100 shadow-sm">#{modalData.events.length - i}</span>
                    <div className="flex flex-col">
                      <span className="font-black text-[#1a1c3d] text-sm">{new Date(ev.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                      <span className="text-[8px] font-black text-slate-500 uppercase">Culto: {ev.description}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-8 bg-slate-50 border-t border-slate-100"><button onClick={() => setModalData(null)} className="w-full py-4 bg-[#1a1c3d] text-white font-black rounded-3xl uppercase text-[11px] shadow-xl">VOLTAR</button></div>
          </div>
        </div>
      )}
    </>
  );
};

export default WorkerRanking;
