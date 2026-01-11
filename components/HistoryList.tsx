import React, { useState, useMemo } from 'react';
import { ServiceRecord } from '../types';

interface Props {
  history: ServiceRecord[];
  onDelete: (id: string) => void;
  onEdit: (record: ServiceRecord) => void;
  onClearAll: () => void;
}

const HistoryList: React.FC<Props> = ({ history, onDelete, onEdit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const monthNames = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
  const dayOfWeekNamesShort = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

  const groupedHistory = useMemo(() => {
    const filtered = history.filter(r => 
      r.date.includes(searchTerm) || 
      r.roles?.word?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.songs.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => b.date.localeCompare(a.date));

    const groups: Record<string, ServiceRecord[]> = {};
    filtered.forEach(record => {
      const date = new Date(record.date + 'T12:00:00');
      const key = `${monthNames[date.getMonth()]} / ${date.getFullYear()}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(record);
    });
    return groups;
  }, [history, searchTerm]);

  const shareIndividual = (record: ServiceRecord) => {
    const d = new Date(record.date + 'T12:00:00');
    const day = d.getDay();
    const dateFormatted = d.toLocaleDateString('pt-BR');
    
    let msg = `*Relatório ICM Santo Antônio II - ${dateFormatted}*\n\n`;
    msg += `*Culto:* ${record.description}\n\n`;
    msg += `*Escala:*\n`;
    msg += `Portão: ${record.roles.gate || '-'}\n`;
    
    if (day !== 3) {
      msg += `Louvor: ${record.roles.praise || '-'}\n`;
      if (day !== 1) msg += `Palavra: ${record.roles.word || '-'}\n`;
      if (record.roles.word !== 'TRANSMISSÃO') msg += `Texto Bíblico: ${record.roles.scripture || '-'}\n`;
      else msg += `📡 Culto via Satélite\n`;
    } else {
      msg += `🌸 Culto Senhoras\n`;
    }
    
    msg += `\n*Louvores:* \n`;
    record.songs.forEach((s, i) => msg += `${i + 1}. ${s}\n`);
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const shareMonth = (monthKey: string) => {
    const records = (groupedHistory as Record<string, ServiceRecord[]>)[monthKey];
    let msg = `*RESUMO ICM SANTO ANTÔNIO II - ${monthKey}*\n\n`;
    records.forEach(r => {
      msg += `📅 ${new Date(r.date + 'T12:00:00').toLocaleDateString('pt-BR')} - ${r.description}\n`;
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const shareAll = () => {
    let msg = `*HISTÓRICO COMPLETO ICM SANTO ANTÔNIO II*\n\n`;
    history.slice(0, 30).forEach(r => {
      msg += `📅 ${new Date(r.date + 'T12:00:00').toLocaleDateString('pt-BR')} | ${r.description}\n`;
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const InfoTag = ({ label, value, icon }: { label: string, value?: string, icon: string }) => {
    if (!value) return null;
    return (
      <div className="flex flex-col border-l-2 border-indigo-100 pl-3">
        <div className="flex items-center gap-1 mb-0.5">
          <span className="material-icons text-[10px] text-slate-300">{icon}</span>
          <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{label}</span>
        </div>
        <span className="text-[11px] font-black text-[#1a1c3d] truncate">{value}</span>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-2xl mx-auto pb-10">
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-white rounded-full flex items-center px-6 py-4 shadow-xl border border-slate-50">
          <span className="material-icons text-slate-300 mr-3">search</span>
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Pesquisar..." className="w-full bg-transparent font-bold text-slate-600 outline-none placeholder:text-slate-300" />
        </div>
        <button onClick={shareAll} title="Compartilhar Tudo" className="bg-[#1a1c3d] text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-transform">
          <span className="material-icons">history_edu</span>
        </button>
        <button onClick={() => setShowShareModal(true)} title="Relatório Mensal" className="bg-[#ff9900] text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl shadow-orange-950/20 active:scale-90 transition-transform">
          <span className="material-icons">auto_stories</span>
        </button>
      </div>

      <div className="space-y-12">
        {Object.keys(groupedHistory).length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
            <span className="material-icons text-5xl text-slate-100 mb-3">history_toggle_off</span>
            <p className="text-slate-300 font-black uppercase tracking-widest text-[10px]">Sem registros</p>
          </div>
        ) : (
          (Object.entries(groupedHistory) as [string, ServiceRecord[]][]).map(([month, records]) => (
            <div key={month} className="space-y-6">
              <div className="flex items-center gap-4 px-4">
                <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] whitespace-nowrap">{month}</span>
                <div className="flex-1 h-[1px] bg-slate-200/50"></div>
              </div>

              <div className="grid gap-8">
                {records.map(r => {
                  const dateObj = new Date(r.date + 'T12:00:00');
                  const dayCode = dayOfWeekNamesShort[dateObj.getDay()];
                  const isLadiesDay = dateObj.getDay() === 3;
                  const isSatellite = r.roles.word === 'TRANSMISSÃO';

                  return (
                    <div key={r.id} className="bg-white rounded-[2.5rem] shadow-xl border border-slate-50 overflow-hidden group hover:shadow-2xl transition-all">
                      <div className="bg-slate-50/50 px-8 py-5 flex justify-between items-center border-b border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-100 flex flex-col items-center justify-center shadow-sm">
                            <span className="text-indigo-600 font-black text-[9px] uppercase leading-none">{dayCode}</span>
                            <span className="text-[#1a1c3d] font-black text-base leading-none mt-1">{dateObj.getDate().toString().padStart(2, '0')}</span>
                          </div>
                          <div className="flex flex-col">
                            <h4 className="text-[#1a1c3d] font-black text-lg tracking-tighter leading-none">{month.split(' / ')[0]} {dateObj.getFullYear()}</h4>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{r.description}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => onEdit(r)} className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 active:scale-90 transition-transform"><span className="material-icons text-lg">edit</span></button>
                          <button onClick={() => shareIndividual(r)} className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 active:scale-90 transition-transform"><span className="material-icons text-lg">share</span></button>
                          <button onClick={() => setItemToDelete(r.id)} className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500 active:scale-90 transition-transform"><span className="material-icons text-lg">delete</span></button>
                        </div>
                      </div>

                      <div className="p-8 space-y-6">
                        {(isLadiesDay || isSatellite) && (
                          <div className="flex gap-2">
                             {isLadiesDay && <span className="bg-indigo-50 text-indigo-600 text-[8px] font-black px-3 py-1.5 rounded-full border border-indigo-100 uppercase tracking-widest flex items-center gap-1">🌸 Senhoras</span>}
                             {isSatellite && <span className="bg-amber-50 text-amber-600 text-[8px] font-black px-3 py-1.5 rounded-full border border-amber-100 uppercase tracking-widest flex items-center gap-1">📡 Satélite</span>}
                          </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <InfoTag label="Portão" value={r.roles.gate} icon="door_front" />
                          {!isLadiesDay && (
                            <>
                              <InfoTag label="Louvor" value={r.roles.praise} icon="music_note" />
                              <InfoTag label="Palavra" value={r.roles.word} icon="record_voice_over" />
                              {!isSatellite && <InfoTag label="Texto" value={r.roles.scripture} icon="menu_book" />}
                            </>
                          )}
                        </div>

                        <div className="pt-6 border-t border-slate-50">
                           <div className="flex items-center gap-2 mb-3">
                              <span className="material-icons text-indigo-400 text-sm">queue_music</span>
                              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Louvores do Culto</span>
                           </div>
                           <div className="grid gap-2">
                             {r.songs.map((s, idx) => (
                               <div key={idx} className="bg-slate-50/50 p-3 rounded-xl flex items-center gap-3 border border-transparent hover:border-indigo-50 hover:bg-white transition-all">
                                 <span className="text-[10px] font-black text-indigo-400">#{(idx+1)}</span>
                                 <span className="text-[11px] font-bold text-slate-600 truncate">{s}</span>
                               </div>
                             ))}
                           </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {showShareModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[500] p-6 backdrop-blur-sm" onClick={() => setShowShareModal(false)}>
          <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-scaleUp" onClick={e => e.stopPropagation()}>
            <div className="bg-[#1a1c3d] p-10 relative">
              <span className="text-indigo-400 font-black text-[9px] uppercase tracking-[0.2em] block mb-1">REGISTRO DE ESCALA</span>
              <h3 className="text-white font-black text-2xl uppercase tracking-tighter">RELATÓRIO MENSAL</h3>
              <button onClick={() => setShowShareModal(false)} className="absolute top-8 right-8 w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-white/40 active:scale-90">
                <span className="material-icons text-xl">close</span>
              </button>
            </div>
            <div className="p-10 bg-white flex flex-col gap-4">
              <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-3">
                {Object.keys(groupedHistory).length === 0 ? (
                  <p className="text-slate-400 font-bold py-10 text-center text-xs">Sem dados mensais</p>
                ) : (
                  (Object.keys(groupedHistory) as string[]).map(month => (
                    <button key={month} onClick={() => { shareMonth(month); setShowShareModal(false); }} className="w-full py-6 bg-indigo-50/50 text-[#1a1c3d] font-black rounded-3xl border border-indigo-100/50 hover:bg-indigo-100 transition-all active:scale-95 text-lg tracking-tight">
                      {month}
                    </button>
                  ))
                )}
              </div>
              <button onClick={() => setShowShareModal(false)} className="w-full py-6 bg-slate-50 text-slate-800 font-black rounded-3xl uppercase text-sm tracking-widest mt-2 active:scale-95">FECHAR</button>
            </div>
          </div>
        </div>
      )}

      {itemToDelete && (
        <div className="fixed inset-0 bg-[#1a1c3d]/95 flex items-center justify-center z-[500] p-6 backdrop-blur-md" onClick={() => setItemToDelete(null)}>
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-xs animate-scaleUp text-center border border-white" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-8 text-rose-500"><span className="material-icons text-4xl">delete_outline</span></div>
            <h3 className="text-xl font-black text-[#1a1c3d] mb-8 uppercase tracking-tighter leading-tight">Excluir este relatório permanentemente?</h3>
            <div className="flex flex-col gap-3">
              <button onClick={() => { onDelete(itemToDelete!); setItemToDelete(null); }} className="w-full py-5 bg-rose-600 text-white font-black rounded-2xl shadow-lg active:scale-95">SIM, EXCLUIR</button>
              <button onClick={() => setItemToDelete(null)} className="w-full py-4 text-slate-300 font-black uppercase text-[10px] tracking-widest">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryList;