
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
      if (r.roles.gate && data[r.roles.gate]) data[r.roles.gate].gate.push(event);
      if (r.roles.praise && data[r.roles.praise]) data[r.roles.praise].praise.push(event);
      if (r.roles.word && data[r.roles.word]) data[r.roles.word].word.push(event);
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
      className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col items-center justify-center transition-all active:scale-95 hover:shadow-md group"
    >
      <div className="flex items-center gap-1 mb-2">
        <span className="material-icons text-[10px] text-slate-300 group-hover:text-indigo-400 transition-colors">{icon}</span>
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] group-hover:text-indigo-600 transition-colors">{label}</span>
      </div>
      <span className="text-3xl font-black text-[#1a1c3d] leading-none">{count}</span>
      <div className="mt-2 w-5 h-0.5 bg-slate-100 rounded-full group-hover:w-8 group-hover:bg-indigo-400 transition-all"></div>
    </button>
  );

  return (
    <>
      <div className="space-y-8 animate-fadeIn pb-10 max-w-4xl mx-auto">
        <div className="px-2 pt-2 md:pt-0">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Atividades por Obreiro</h2>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Total acumulado de atos realizados</p>
        </div>

        <div className="grid gap-8">
          {stats.map((worker) => (
            <div key={worker.name} className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-50 group transition-all">
              <div className="bg-[#1a1c3d] px-8 py-6 flex justify-between items-center relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
                <h3 className="text-white font-black text-xl tracking-tight uppercase relative z-10">{worker.name}</h3>
                <div className="bg-[#ffcc00] text-[#1a1c3d] px-4 py-2 rounded-full font-black text-[10px] shadow-lg flex items-center gap-2 relative z-10">
                  <span className="material-icons text-[14px]">military_tech</span>
                  {worker.total} ATOS TOTAIS
                </div>
              </div>
              <div className="p-5 flex gap-3 bg-slate-50/30">
                <StatBox label="Portão" count={worker.gate.length} icon="door_front" onClick={() => setModalData({ worker: worker.name, role: 'Portão', events: worker.gate })} />
                <StatBox label="Louvor" count={worker.praise.length} icon="music_note" onClick={() => setModalData({ worker: worker.name, role: 'Louvor', events: worker.praise })} />
                <StatBox label="Palavra" count={worker.word.length} icon="record_voice_over" onClick={() => setModalData({ worker: worker.name, role: 'Palavra', events: worker.word })} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Slide-over Drawer para Histórico de Obreiro - Ajustado para mobile */}
      {modalData && (
        <div className="fixed inset-0 z-[6000] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" onClick={() => setModalData(null)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slideInRight">
            {/* Cabeçalho do Drawer com padding extra no mobile (pt-24) */}
            <div className="bg-[#1a1c3d] pt-24 pb-10 px-10 md:pt-12 md:pb-12 md:px-10 relative shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-icons text-indigo-400 text-sm">history</span>
                <span className="text-indigo-400 font-black text-[9px] uppercase tracking-[0.2em] block">HISTÓRICO DETALHADO</span>
              </div>
              <h3 className="text-white font-black text-2xl uppercase tracking-tighter leading-tight">{modalData.worker}</h3>
              
              {/* Opção e quantidade - Movidos mais para baixo */}
              <div className="mt-4 flex flex-wrap gap-2">
                <div className="bg-white/10 px-3 py-1.5 rounded-xl inline-flex items-center gap-2 border border-white/5">
                  <span className="text-white/80 font-black text-[10px] uppercase tracking-widest">{modalData.role}</span>
                </div>
                <div className="bg-amber-400 px-3 py-1.5 rounded-xl inline-flex items-center gap-2 shadow-lg">
                  <span className="text-[#1a1c3d] font-black text-[10px] uppercase tracking-widest">{modalData.events.length} VEZES</span>
                </div>
              </div>

              {/* Botão fechar ajustado para não conflitar com menu superior */}
              <button 
                onClick={() => setModalData(null)} 
                className="absolute top-20 md:top-8 right-8 w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white/40 active:scale-90 transition-transform hover:bg-white/20"
              >
                <span className="material-icons text-xl">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-3">
              {modalData.events.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Nenhum registro encontrado</p>
                </div>
              ) : (
                modalData.events.map((ev, i) => (
                  <div key={i} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm animate-fadeIn" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm">
                        <span className="text-[10px] font-black text-indigo-600">#{modalData.events.length - i}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-[#1a1c3d] text-base leading-none mb-1">
                          {new Date(ev.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Culto: {ev.description}</span>
                      </div>
                    </div>
                    <span className="material-icons text-slate-200 text-sm">event_available</span>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-8 bg-slate-50 shrink-0 border-t border-slate-100">
              <button onClick={() => setModalData(null)} className="w-full py-5 bg-[#1a1c3d] text-white font-black rounded-3xl uppercase text-[11px] tracking-widest active:scale-95 transition-all shadow-xl">VOLTAR AO RANKING</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WorkerRanking;
