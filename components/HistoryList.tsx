
import React, { useState, useMemo } from 'react';
import { ServiceRecord } from '../types';

interface Props {
  history: ServiceRecord[];
  onDelete: (id: string) => void;
  onEdit: (record: ServiceRecord) => void;
  onClearAll: () => void;
  externalFilter?: { worker: string; role: string } | null;
  onClearExternalFilter?: () => void;
}

const HistoryList: React.FC<Props> = ({ history, onDelete, onEdit, externalFilter, onClearExternalFilter }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [showShareOptions, setShowShareOptions] = useState(false);

  const monthNames = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
  const dayOfWeekNamesShort = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

  const groupedHistory = useMemo(() => {
    let filtered = [...history];
    if (externalFilter) {
      filtered = filtered.filter(r => r.roles[externalFilter.role as keyof typeof r.roles] === externalFilter.worker);
    }
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(r => {
        const d = new Date(r.date + 'T12:00:00');
        return (
          r.date.includes(lowerSearch) ||
          r.description.toLowerCase().includes(lowerSearch) ||
          Object.values(r.roles).some(v => String(v).toLowerCase().includes(lowerSearch)) ||
          r.songs.some(s => s.toLowerCase().includes(lowerSearch))
        );
      });
    }
    filtered.sort((a, b) => b.date.localeCompare(a.date));
    const groups: Record<string, ServiceRecord[]> = {};
    filtered.forEach(record => {
      const date = new Date(record.date + 'T12:00:00');
      const key = `${monthNames[date.getMonth()]} / ${date.getFullYear()}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(record);
    });
    return groups;
  }, [history, searchTerm, externalFilter]);

  const generateSingleReport = (r: ServiceRecord) => {
    const d = new Date(r.date + 'T12:00:00');
    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    
    let text = `*RELATÓRIO DE CULTO - ${dateStr} (${r.description})*\n`;
    if (r.roles.gate) text += `> Portão: ${r.roles.gate}\n`;
    if (r.roles.praise) text += `> Louvor: ${r.roles.praise}\n`;
    
    // Na segunda ou quarta pode não ter palavra
    if (r.roles.word) text += `> Palavra: ${r.roles.word}\n`;

    if (r.roles.word === 'TRANSMISSÃO') {
      text += `Satélite: Transmissão\n`;
    } else if (r.roles.scripture) {
      text += `Texto: ${r.roles.scripture}\n`;
    }

    if (r.songs.length > 0) {
      text += `\nLOUVORES: \n`;
      r.songs.forEach((s, i) => {
        text += ` ${i + 1}. ${s}\n`;
      });
    }
    return text;
  };

  const handleWhatsAppShare = (title: string, records: ServiceRecord[]) => {
    const text = records.map(r => generateSingleReport(r)).join('\n' + '─'.repeat(15) + '\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    setShowShareOptions(false);
  };

  const handleIndividualShare = (record: ServiceRecord) => {
    const text = generateSingleReport(record);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  const InfoTag = ({ label, value, icon, roleId }: { label: string, value?: string, icon: string, roleId: string }) => {
    if (!value) return null;
    const isHighlighted = externalFilter?.role === roleId;
    return (
      <div className={`flex flex-col border-l-2 pl-3 py-1 rounded-r-xl transition-all ${isHighlighted ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50'}`}>
        <div className="flex items-center gap-1 mb-0.5">
          <span className={`material-icons text-[10px] ${isHighlighted ? 'text-indigo-600' : 'text-slate-500'}`}>{icon}</span>
          <span className={`text-[8px] font-black uppercase tracking-widest ${isHighlighted ? 'text-indigo-600' : 'text-slate-500'}`}>{label}</span>
        </div>
        <span className={`text-[11px] font-black truncate ${isHighlighted ? 'text-indigo-800' : 'text-slate-900'}`}>{value}</span>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto pb-10 px-1">
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-white rounded-3xl flex items-center px-6 py-4 shadow-xl border border-slate-100">
          <span className="material-icons text-slate-300 mr-4">search</span>
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Data, Obreiro, Hino..." className="w-full bg-transparent font-bold text-slate-900 outline-none text-sm" />
        </div>
        {history.length > 0 && (
          <button onClick={() => setShowShareOptions(true)} className="w-14 h-14 bg-indigo-600 text-white rounded-3xl flex items-center justify-center shadow-lg active:scale-90"><span className="material-icons">share</span></button>
        )}
      </div>

      {showShareOptions && (
        <div className="fixed inset-0 z-[8000] flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowShareOptions(false)} />
          <div className="relative bg-white rounded-t-[3.5rem] p-10 pb-12 shadow-2xl animate-slideUp max-h-[80vh] flex flex-col">
            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8 shrink-0"></div>
            <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tighter text-center">Opções de Envio</h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              <button onClick={() => handleWhatsAppShare("HISTÓRICO COMPLETO", history)} className="w-full p-6 bg-indigo-600 text-white rounded-3xl flex items-center justify-between shadow-xl active:scale-[0.98]">
                <span className="font-black text-xs uppercase tracking-widest">Enviar Todo o Histórico</span>
                <span className="material-icons">history</span>
              </button>
              <div className="pt-4 pb-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Por Mês</span></div>
              {(Object.entries(groupedHistory) as [string, ServiceRecord[]][]).map(([month, records]) => (
                <button key={month} onClick={() => handleWhatsAppShare(month, records)} className="w-full p-5 bg-slate-50 border border-slate-100 text-slate-700 rounded-2xl flex items-center justify-between active:scale-[0.98]">
                  <span className="font-bold text-sm">{month}</span>
                  <div className="flex items-center gap-2"><span className="text-[10px] font-black text-slate-400">{records.length} cultos</span><span className="material-icons text-emerald-500">whatsapp</span></div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowShareOptions(false)} className="mt-6 w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">FECHAR</button>
          </div>
        </div>
      )}

      {(Object.entries(groupedHistory) as [string, ServiceRecord[]][]).map(([month, records]) => (
        <div key={month} className="space-y-5">
          <div className="px-6 flex justify-between items-center"><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">{month}</h3><span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{records.length} Cultos</span></div>
          <div className="grid gap-5">
            {records.map(record => (
              <div key={record.id} className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-lg border border-slate-100 hover:border-indigo-100 transition-all">
                <div className="flex flex-col gap-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex flex-col items-center justify-center border border-slate-100 shrink-0">
                        <span className="text-sm font-black text-indigo-600 leading-none">{new Date(record.date + 'T12:00:00').getDate()}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{dayOfWeekNamesShort[new Date(record.date + 'T12:00:00').getDay()]}</span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-slate-900 uppercase text-base tracking-tight truncate">{record.description}</h4>
                        <div className="flex items-center gap-2 mt-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{record.songs.length} LOUVORES</p></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 justify-end">
                      <button onClick={() => handleIndividualShare(record)} className="w-11 h-11 flex items-center justify-center text-emerald-600 bg-emerald-50 rounded-2xl active:scale-90"><span className="material-icons text-xl">share</span></button>
                      <button onClick={() => onEdit(record)} className="w-11 h-11 flex items-center justify-center text-indigo-600 bg-indigo-50 rounded-2xl active:scale-90"><span className="material-icons text-xl">edit</span></button>
                      <button onClick={() => setItemToDelete(record.id)} className="w-11 h-11 flex items-center justify-center text-rose-500 bg-rose-50 rounded-2xl active:scale-90"><span className="material-icons text-xl">delete_outline</span></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <InfoTag label="Portão" value={record.roles.gate} icon="door_front" roleId="gate" />
                    <InfoTag label="Louvor" value={record.roles.praise} icon="music_note" roleId="praise" />
                    <InfoTag label="Palavra" value={record.roles.word} icon="record_voice_over" roleId="word" />
                    <InfoTag label="Texto" value={record.roles.word === 'TRANSMISSÃO' ? 'SATÉLITE' : record.roles.scripture} icon="auto_stories" roleId="scripture" />
                  </div>
                  {record.songs.length > 0 && (
                    <div className="pt-6 border-t border-slate-100">
                      <div className="flex flex-wrap gap-2.5">
                        {record.songs.map((song, idx) => (
                          <div key={idx} className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 flex items-center gap-3">
                            <span className="text-[10px] font-black text-indigo-600/50">#{idx + 1}</span>
                            <span className="text-[11px] font-bold text-slate-700 uppercase truncate max-w-[200px] tracking-tight">{song}</span>
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
      {itemToDelete && (
        <div className="fixed inset-0 z-[8000] flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setItemToDelete(null)} />
          <div className="relative bg-white rounded-t-[3.5rem] p-10 pb-12 shadow-2xl animate-slideUp">
            <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tighter text-center">Apagar Registro?</h3>
            <div className="w-full flex flex-col gap-3 mt-6">
              <button onClick={() => { onDelete(itemToDelete!); setItemToDelete(null); }} className="w-full py-5 bg-rose-500 text-white font-black rounded-3xl shadow-xl">EXCLUIR</button>
              <button onClick={() => setItemToDelete(null)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px]">CANCELAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryList;
