
import React, { useState, useMemo } from 'react';
import { ServiceRecord } from '../types';
import { WORKERS_LIST } from '../constants';

interface Props {
  history: ServiceRecord[];
}

const WorkerRanking: React.FC<Props> = ({ history }) => {
  const [modalData, setModalData] = useState<{ worker: string, role: string, dates: string[] } | null>(null);

  const stats = useMemo(() => {
    const data: Record<string, { gate: string[], praise: string[], word: string[], total: number }> = {};
    const officialWorkers = WORKERS_LIST.filter(name => !['VISITANTE', 'TRANSMISSÃO'].includes(name));
    
    officialWorkers.forEach(name => {
      data[name] = { gate: [], praise: [], word: [], total: 0 };
    });

    history.forEach(r => {
      if (r.roles.gate && data[r.roles.gate]) data[r.roles.gate].gate.push(r.date);
      if (r.roles.praise && data[r.roles.praise]) data[r.roles.praise].praise.push(r.date);
      if (r.roles.word && data[r.roles.word]) data[r.roles.word].word.push(r.date);
    });

    Object.keys(data).forEach(name => {
      data[name].total = data[name].gate.length + data[name].praise.length + data[name].word.length;
      data[name].gate.sort((a, b) => b.localeCompare(a));
      data[name].praise.sort((a, b) => b.localeCompare(a));
      data[name].word.sort((a, b) => b.localeCompare(a));
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
        <div className="px-2">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Atividades por Obreiro</h2>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Total acumulado de atos realizados</p>
        </div>

        <div className="grid gap-8">
          {stats.map((worker) => (
            <div key={worker.name} className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-50 group transition-all">
              <div className="bg-[#1a1c3d] px-8 py-6 flex justify-between items-center relative overflow-hidden">
                {/* Efeito visual no fundo do card */}
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
                
                <h3 className="text-white font-black text-xl tracking-tight uppercase relative z-10">{worker.name}</h3>
                <div className="bg-[#ffcc00] text-[#1a1c3d] px-4 py-2 rounded-full font-black text-[10px] shadow-lg flex items-center gap-2 relative z-10">
                  <span className="material-icons text-[14px]">military_tech</span>
                  {worker.total} ATOS
                </div>
              </div>
              
              <div className="p-5 flex gap-3 bg-slate-50/30">
                <StatBox label="Portão" count={worker.gate.length} icon="door_front" onClick={() => setModalData({ worker: worker.name, role: 'Portão', dates: worker.gate })} />
                <StatBox label="Louvor" count={worker.praise.length} icon="music_note" onClick={() => setModalData({ worker: worker.name, role: 'Louvor', dates: worker.praise })} />
                <StatBox label="Palavra" count={worker.word.length} icon="record_voice_over" onClick={() => setModalData({ worker: worker.name, role: 'Palavra', dates: worker.word })} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL DE HISTÓRICO - Ajustado para centralização fixa e visual moderno */}
      {modalData && (
        <div className="fixed inset-0 bg-[#1a1c3d]/90 flex items-center justify-center z-[3000] p-6 backdrop-blur-md animate-fadeIn" onClick={() => setModalData(null)}>
          <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-scaleUp border border-white" onClick={e => e.stopPropagation()}>
            
            {/* Cabeçalho do Modal */}
            <div className="bg-[#1a1c3d] p-10 relative">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-icons text-indigo-400 text-sm">history</span>
                <span className="text-indigo-400 font-black text-[9px] uppercase tracking-[0.2em] block">HISTÓRICO DE ATIVIDADE</span>
              </div>
              <h3 className="text-white font-black text-2xl uppercase tracking-tighter leading-tight">{modalData.worker}</h3>
              <div className="mt-3 bg-white/10 self-start px-3 py-1 rounded-full inline-flex items-center gap-2">
                <span className="text-white font-black text-[10px] uppercase tracking-widest">{modalData.role}</span>
              </div>
              
              <button onClick={() => setModalData(null)} className="absolute top-8 right-8 w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-white/40 active:scale-90 transition-transform">
                <span className="material-icons text-xl">close</span>
              </button>
            </div>

            {/* Lista de Datas */}
            <div className="p-10 bg-white flex flex-col">
              <div className="max-h-72 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                {modalData.dates.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Nenhum registro encontrado</p>
                  </div>
                ) : (
                  modalData.dates.map((d, i) => (
                    <div key={i} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-100 shadow-sm">
                          <span className="text-[10px] font-black text-indigo-600">#{modalData.dates.length - i}</span>
                        </div>
                        <span className="font-black text-[#1a1c3d] text-base">
                          {new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <span className="material-icons text-slate-200 text-sm">event_available</span>
                    </div>
                  ))
                )}
              </div>
              
              <button 
                onClick={() => setModalData(null)} 
                className="w-full mt-8 py-5 bg-slate-50 text-slate-500 font-black rounded-3xl uppercase text-[11px] tracking-widest active:scale-95 transition-all"
              >
                FECHAR HISTÓRICO
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WorkerRanking;
