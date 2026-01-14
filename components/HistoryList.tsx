
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
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  const monthNames = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
  const dayOfWeekNamesShort = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

  const groupedHistory = useMemo(() => {
    const filtered = history.filter(r => 
      r.date.includes(searchTerm) || 
      r.roles?.word?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.roles?.praise?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.roles?.gate?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.songs.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      if (a.description === 'EBD' && b.description === 'DOM') return 1;
      if (a.description === 'DOM' && b.description === 'EBD') return -1;
      return 0;
    });

    const groups: Record<string, ServiceRecord[]> = {};
    filtered.forEach(record => {
      const date = new Date(record.date + 'T12:00:00');
      const key = `${monthNames[date.getMonth()]} / ${date.getFullYear()}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(record);
    });
    return groups;
  }, [history, searchTerm]);

  const formatServiceMessage = (r: ServiceRecord) => {
    const d = new Date(r.date + 'T12:00:00');
    const day = d.getDay();
    const dateFormatted = d.toLocaleDateString('pt-BR');
    const isSatellite = r.roles.word === 'TRANSMISSÃO';
    
    let msg = `*RELATÓRIO DE CULTO - ${dateFormatted}* (${r.description})\n`;
    msg += `> Portão: ${r.roles.gate || '-'}\n`;
    
    if (day !== 3) {
      msg += `> Louvor: ${r.roles.praise || '-'}\n`;
      if (day !== 1) msg += `> Palavra: ${r.roles.word || '-'}\n`;
      if (!isSatellite && r.roles.scripture) msg += `> Texto: ${r.roles.scripture}\n`;
      else if (isSatellite) msg += `*Satélite: Transmissão*\n`;
    } else {
      msg += `*Culto das Senhoras*\n`;
    }

    if (r.songs.length > 0) {
      msg += `\n*LOUVORES:* \n`;
      r.songs.forEach((s, i) => msg += ` ${i + 1}. ${s}\n`);
    }

    return msg;
  };

  const sortChronologically = (records: ServiceRecord[]) => {
    return [...records].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      if (a.description === 'EBD' && b.description === 'DOM') return -1;
      if (a.description === 'DOM' && b.description === 'EBD') return 1;
      return 0;
    });
  };

  const shareIndividual = (record: ServiceRecord) => {
    let msg = `*ICM SANTO ANTÔNIO II*\n\n`;
    msg += formatServiceMessage(record);
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const shareMonth = (monthKey: string) => {
    const rawRecords = (groupedHistory as Record<string, ServiceRecord[]>)[monthKey];
    if (!rawRecords) return;
    const sortedRecords = sortChronologically(rawRecords);
    
    let msg = `*RESUMO MENSAL - ${monthKey}*\n*ICM SANTO ANTÔNIO II*\n\n`;
    sortedRecords.forEach(r => {
      msg += formatServiceMessage(r);
      msg += `_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _\n\n`;
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const shareAll = () => {
    const sortedHistory = sortChronologically(history);
    let msg = `*HISTÓRICO COMPLETO DE CULTOS*\n*ICM SANTO ANTÔNIO II*\n\n`;
    const limitedHistory = sortedHistory.slice(-15);
    
    limitedHistory.forEach(r => {
      msg += formatServiceMessage(r);
      msg += `_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _\n\n`;
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
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto pb-10">
      <div className="flex items-center gap-2 px-1">
        <div className="flex-1 bg-white rounded-full flex items-center px-6 py-4 shadow-xl border border-slate-50">
          <span className="material-icons text-slate-300 mr-3">search</span>
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Pesquisar..." className="w-full bg-transparent font-bold text-slate-600 outline-none placeholder:text-slate-300" />
        </div>
        <button onClick={() => setIsMonthPickerOpen(true)} title="Compartilhar por Mês" className="bg-indigo-500 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl shrink-0 active:scale-90 transition-transform">
           <span className="material-icons">calendar_month</span>
        </button>
        <button onClick={shareAll} title="Compartilhar Geral" className="bg-[#1a1c3d] text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl shrink-0 active:scale-90 transition-transform">
           <span className="material-icons">share</span>
        </button>
      </div>

      {(Object.entries(groupedHistory) as [string, ServiceRecord[]][]).map(([month, records]) => (
        <div key={month} className="space-y-4">
          <div className="px-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{month}</h3>
          </div>
          
          <div className="grid gap-4">
            {records.map(record => (
              <div key={record.id} className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-slate-100 animate-fadeIn">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex flex-col items-center justify-center border border-slate-100 shrink-0">
                        <span className="text-[10px] font-black text-indigo-600 leading-none">{new Date(record.date + 'T12:00:00').getDate()}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase">{dayOfWeekNamesShort[new Date(record.date + 'T12:00:00').getDay()]}</span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-[#1a1c3d] uppercase text-sm tracking-tight truncate">{record.description}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{record.songs.length} Louvores</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => shareIndividual(record)} className="w-10 h-10 flex items-center justify-center text-emerald-500 bg-emerald-50/50 rounded-xl transition-colors active:scale-90"><span className="material-icons text-xl">share</span></button>
                      <button onClick={() => onEdit(record)} className="w-10 h-10 flex items-center justify-center text-indigo-500 bg-indigo-50/50 rounded-xl transition-colors active:scale-90"><span className="material-icons text-xl">edit</span></button>
                      <button onClick={() => setItemToDelete(record.id)} className="w-10 h-10 flex items-center justify-center text-rose-300 hover:text-rose-500 bg-rose-50/50 rounded-xl transition-colors active:scale-90"><span className="material-icons text-xl">delete_outline</span></button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-slate-50 pt-5">
                    <InfoTag label="Portão" value={record.roles.gate} icon="door_front" />
                    <InfoTag label="Louvor" value={record.roles.praise} icon="music_note" />
                    <InfoTag label="Palavra" value={record.roles.word} icon="record_voice_over" />
                    <InfoTag label="Texto" value={record.roles.word === 'TRANSMISSÃO' ? 'SATÉLITE' : record.roles.scripture} icon="auto_stories" />
                  </div>

                  {record.songs.length > 0 && (
                    <div className="pt-5 border-t border-slate-50">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="material-icons text-slate-300 text-xs">library_music</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Hinos Cantados</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                        {record.songs.map((song, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 bg-slate-50/50 p-2 rounded-xl border border-transparent">
                            <span className="text-[10px] font-black text-indigo-300 mt-0.5 min-w-[15px]">#{idx + 1}</span>
                            <span className="text-[11px] font-bold text-slate-600 leading-tight uppercase tracking-tight">{song}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Bottom Sheet - Seletor de Mês (MODERNO E MOBILE-READY) */}
      {isMonthPickerOpen && (
        <div className="fixed inset-0 z-[8000] flex flex-col justify-end">
          <div className="absolute inset-0 bg-[#1a1c3d]/80 backdrop-blur-sm animate-fadeIn" onClick={() => setIsMonthPickerOpen(false)} />
          <div className="relative bg-white rounded-t-[3rem] p-8 max-h-[85vh] flex flex-col shadow-2xl animate-slideUp">
            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8 shrink-0"></div>
            <h3 className="text-xl font-black text-[#1a1c3d] mb-6 uppercase tracking-tighter text-center">Compartilhar Mês</h3>
            <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar pb-8">
              {Object.keys(groupedHistory).length > 0 ? (
                Object.keys(groupedHistory).map(monthKey => (
                  <button 
                    key={monthKey}
                    onClick={() => { shareMonth(monthKey); setIsMonthPickerOpen(false); }}
                    className="w-full py-5 px-6 bg-slate-50 hover:bg-indigo-50 text-[#1a1c3d] font-bold rounded-2xl flex justify-between items-center transition-all active:scale-95 group"
                  >
                    <span className="text-sm uppercase tracking-tight">{monthKey}</span>
                    <span className="material-icons text-indigo-400 group-hover:translate-x-1 transition-transform">share</span>
                  </button>
                ))
              ) : (
                <p className="text-center text-slate-400 font-bold text-[10px] uppercase py-10 tracking-widest">Sem registros disponíveis</p>
              )}
            </div>
            <button onClick={() => setIsMonthPickerOpen(false)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest shrink-0 active:text-[#1a1c3d]">FECHAR</button>
          </div>
        </div>
      )}

      {/* Bottom Sheet - Confirmação de Exclusão */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[8000] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" onClick={() => setItemToDelete(null)} />
          <div className="relative bg-white rounded-t-[3rem] p-8 pb-12 shadow-2xl animate-slideUp">
            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8"></div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-6 text-rose-500">
                <span className="material-icons text-3xl">delete_forever</span>
              </div>
              <h3 className="text-xl font-black text-[#1a1c3d] mb-2 uppercase tracking-tighter">Excluir Relatório?</h3>
              <p className="text-slate-400 font-bold text-[10px] uppercase mb-8 tracking-widest">Ação permanente e irreversível.</p>
              
              <div className="w-full flex flex-col gap-3">
                <button onClick={() => { onDelete(itemToDelete!); setItemToDelete(null); }} className="w-full py-5 bg-rose-500 text-white font-black rounded-2xl shadow-xl active:scale-95">EXCLUIR AGORA</button>
                <button onClick={() => setItemToDelete(null)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">CANCELAR</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {history.length === 0 && (
        <div className="text-center py-24 bg-white/50 rounded-[3rem] border-2 border-dashed border-slate-200 mx-1">
          <span className="material-icons text-slate-200 text-6xl mb-4">history_toggle_off</span>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">Nenhum culto no histórico</p>
        </div>
      )}
    </div>
  );
};

export default HistoryList;
