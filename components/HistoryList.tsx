
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

  const shareIndividual = (record: ServiceRecord) => {
    let msg = `*ICM SANTO ANTÔNIO II*\n\n`;
    msg += formatServiceMessage(record);
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const shareMonth = (monthKey: string) => {
    const records = (groupedHistory as Record<string, ServiceRecord[]>)[monthKey];
    let msg = `*RESUMO MENSAL - ${monthKey}*\n*ICM SANTO ANTÔNIO II*\n\n`;
    [...records].sort((a, b) => a.date.localeCompare(b.date)).forEach(r => {
      msg += formatServiceMessage(r);
      msg += `_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _\n\n`;
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const shareAll = () => {
    let msg = `*HISTÓRICO DE CULTOS*\n*ICM SANTO ANTÔNIO II*\n\n`;
    history.slice(0, 10).forEach(r => {
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
    <div className="space-y-8 animate-fadeIn max-w-2xl mx-auto pb-10">
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-white rounded-full flex items-center px-6 py-4 shadow-xl border border-slate-50">
          <span className="material-icons text-slate-300 mr-3">search</span>
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Pesquisar..." className="w-full bg-transparent font-bold text-slate-600 outline-none placeholder:text-slate-300" />
        </div>
        <button onClick={shareAll} title="Compartilhar" className="bg-[#1a1c3d] text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl">
           <span className="material-icons">share</span>
        </button>
      </div>

      {/* Fix: Explicitly cast the result of Object.entries(groupedHistory) to resolve 'unknown' type errors for 'records' */}
      {(Object.entries(groupedHistory) as [string, ServiceRecord[]][]).map(([month, records]) => (
        <div key={month} className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{month}</h3>
            <button onClick={() => shareMonth(month)} className="text-[10px] font-black text-indigo-500 uppercase flex items-center gap-1 hover:underline">
              <span className="material-icons text-xs">share</span> Compartilhar Mês
            </button>
          </div>
          
          <div className="grid gap-4">
            {records.map(record => (
              <div key={record.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 group">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex flex-col items-center justify-center border border-slate-100">
                      <span className="text-[10px] font-black text-indigo-600 leading-none">{new Date(record.date + 'T12:00:00').getDate()}</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">{dayOfWeekNamesShort[new Date(record.date + 'T12:00:00').getDay()]}</span>
                    </div>
                    <div>
                      <h4 className="font-black text-[#1a1c3d] uppercase text-sm tracking-tight">{record.description}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{record.songs.length} Louvores</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:flex md:items-center gap-4 border-t md:border-t-0 md:border-l border-slate-50 pt-4 md:pt-0 md:pl-6">
                    <InfoTag label="Louvor" value={record.roles.praise} icon="music_note" />
                    <InfoTag label="Palavra" value={record.roles.word} icon="record_voice_over" />
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => shareIndividual(record)} className="p-3 text-emerald-500 hover:bg-emerald-50 rounded-xl"><span className="material-icons text-xl">share</span></button>
                    <button onClick={() => onEdit(record)} className="p-3 text-indigo-500 hover:bg-indigo-50 rounded-xl"><span className="material-icons text-xl">edit</span></button>
                    <button onClick={() => setItemToDelete(record.id)} className="p-3 text-rose-300 hover:text-rose-500 rounded-xl"><span className="material-icons text-xl">delete_outline</span></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {history.length === 0 && (
        <div className="text-center py-20">
          <span className="material-icons text-slate-200 text-6xl mb-4">history_toggle_off</span>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Vazio</p>
        </div>
      )}

      {itemToDelete && (
        <div className="fixed inset-0 bg-[#1a1c3d]/90 backdrop-blur-md flex items-center justify-center z-[3000] p-6 animate-fadeIn">
          <div className="bg-white rounded-[3.5rem] p-10 w-full max-w-sm shadow-2xl animate-scaleUp text-center">
            <h3 className="text-xl font-black text-[#1a1c3d] mb-2 uppercase tracking-tighter">Excluir?</h3>
            <div className="flex flex-col gap-3 mt-6">
              <button onClick={() => { onDelete(itemToDelete!); setItemToDelete(null); }} className="w-full py-4 bg-rose-500 text-white font-black rounded-2xl shadow-lg">SIM</button>
              <button onClick={() => setItemToDelete(null)} className="w-full py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest">NÃO</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryList;
