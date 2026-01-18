
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

const HistoryList: React.FC<Props> = ({ 
  history, 
  onDelete, 
  onEdit, 
  externalFilter, 
  onClearExternalFilter 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  const monthNames = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
  const dayOfWeekNamesShort = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

  const groupedHistory = useMemo(() => {
    let filtered = [...history];

    // FILTRO ESPECÍFICO DO RANKING
    if (externalFilter) {
      filtered = filtered.filter(r => 
        r.roles[externalFilter.role as keyof typeof r.roles] === externalFilter.worker
      );
    }

    // Busca por texto (Filtro secundário)
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.date.includes(searchTerm) || 
        r.roles?.word?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.roles?.praise?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.roles?.gate?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.songs.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Ordenação (Mais recente primeiro)
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

  const roleLabels: Record<string, string> = {
    gate: 'PORTÃO',
    praise: 'LOUVOR',
    word: 'PALAVRA'
  };

  const InfoTag = ({ label, value, icon, roleId }: { label: string, value?: string, icon: string, roleId: string }) => {
    if (!value) return null;
    
    // Identifica se esta tag deve ser destacada pelo filtro ativo
    const isHighlighted = externalFilter?.role === roleId;

    return (
      <div className={`flex flex-col border-l-2 pl-3 py-1 transition-all rounded-r-xl ${
        isHighlighted 
          ? 'border-amber-400 bg-amber-50/50 ring-1 ring-amber-100' 
          : 'border-indigo-100'
      }`}>
        <div className="flex items-center gap-1 mb-0.5">
          <span className={`material-icons text-[10px] ${isHighlighted ? 'text-amber-500' : 'text-slate-300'}`}>{icon}</span>
          <span className={`text-[8px] font-black uppercase tracking-widest ${isHighlighted ? 'text-amber-600' : 'text-slate-300'}`}>{label}</span>
        </div>
        <span className={`text-[11px] font-black truncate ${isHighlighted ? 'text-[#1a1c3d]' : 'text-slate-600'}`}>{value}</span>
      </div>
    );
  };

  const formatServiceMessage = (r: ServiceRecord) => {
    const d = new Date(r.date + 'T12:00:00');
    const dateFormatted = d.toLocaleDateString('pt-BR');
    let msg = `*RELATÓRIO - ${dateFormatted}* (${r.description})\n`;
    msg += `Portão: ${r.roles.gate || '-'}\nLouvor: ${r.roles.praise || '-'}\nPalavra: ${r.roles.word || '-'}\n`;
    if (r.roles.scripture) msg += `Texto: ${r.roles.scripture}\n`;
    
    if (r.songs && r.songs.length > 0) {
      msg += `\n*LOUVORES:*\n`;
      r.songs.forEach((s, i) => msg += `${i + 1}. ${s}\n`);
    }
    return msg;
  };

  const shareMonth = (monthKey: string) => {
    const records = (groupedHistory as Record<string, ServiceRecord[]>)[monthKey];
    if (!records) return;
    let msg = `*RESUMO MENSAL - ${monthKey}*\n\n`;
    records.forEach(r => {
      msg += formatServiceMessage(r);
      msg += `-------------------\n\n`;
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto pb-10 px-1">
      {/* HEADER DE BUSCA */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white rounded-full flex items-center px-6 py-4 shadow-xl border border-slate-50">
            <span className="material-icons text-slate-300 mr-3">search</span>
            <input 
              type="text" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="Pesquisar histórico..." 
              className="w-full bg-transparent font-bold text-slate-600 outline-none placeholder:text-slate-300" 
            />
          </div>
          <button onClick={() => setIsMonthPickerOpen(true)} className="bg-indigo-500 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl shrink-0 active:scale-90 transition-transform">
             <span className="material-icons">calendar_month</span>
          </button>
        </div>

        {/* BANNER DE FILTRO ATIVO */}
        {externalFilter && (
          <div className="bg-[#1a1c3d] rounded-3xl p-5 shadow-2xl animate-scaleUp border border-white/5 relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10">
              <span className="material-icons text-7xl -mr-4 -mt-4 text-white">filter_alt</span>
            </div>
            <div className="relative z-10 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center text-[#1a1c3d] shadow-lg">
                  <span className="material-icons">person_search</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Filtro de Atividade</span>
                  <p className="text-white text-sm font-medium leading-none">
                    <span className="font-black text-amber-400">{externalFilter.worker}</span>
                    <span className="mx-2 text-white/20">|</span>
                    <span className="font-black uppercase text-[10px] tracking-widest">{roleLabels[externalFilter.role]}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={onClearExternalFilter}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
              >
                Limpar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* LISTA AGRUPADA POR MÊS */}
      {(Object.entries(groupedHistory) as [string, ServiceRecord[]][]).map(([month, records]) => (
        <div key={month} className="space-y-4">
          <div className="px-4 flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">{month}</h3>
            <span className="text-[10px] font-black text-indigo-300">{records.length} Cultos</span>
          </div>
          
          <div className="grid gap-4">
            {records.map(record => (
              <div key={record.id} className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-slate-100 animate-fadeIn hover:shadow-md transition-shadow">
                <div className="flex flex-col gap-6">
                  {/* Cabeçalho do Card */}
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
                      <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(formatServiceMessage(record))}`)} className="w-10 h-10 flex items-center justify-center text-emerald-500 bg-emerald-50/50 rounded-xl active:scale-90"><span className="material-icons text-xl">share</span></button>
                      <button onClick={() => onEdit(record)} className="w-10 h-10 flex items-center justify-center text-indigo-500 bg-indigo-50/50 rounded-xl active:scale-90"><span className="material-icons text-xl">edit</span></button>
                      <button onClick={() => setItemToDelete(record.id)} className="w-10 h-10 flex items-center justify-center text-rose-300 hover:text-rose-500 bg-rose-50/50 rounded-xl active:scale-90"><span className="material-icons text-xl">delete_outline</span></button>
                    </div>
                  </div>

                  {/* Funções do Culto */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-slate-50 pt-5">
                    <InfoTag label="Portão" value={record.roles.gate} icon="door_front" roleId="gate" />
                    <InfoTag label="Louvor" value={record.roles.praise} icon="music_note" roleId="praise" />
                    <InfoTag label="Palavra" value={record.roles.word} icon="record_voice_over" roleId="word" />
                    <InfoTag label="Texto" value={record.roles.word === 'TRANSMISSÃO' ? 'SATÉLITE' : record.roles.scripture} icon="auto_stories" roleId="scripture" />
                  </div>

                  {/* Hinos */}
                  {record.songs.length > 0 && (
                    <div className="pt-4 border-t border-slate-50">
                      <div className="flex flex-wrap gap-2">
                        {record.songs.map((song, idx) => (
                          <div key={idx} className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 flex items-center gap-2">
                            <span className="text-[8px] font-black text-indigo-300">#{idx + 1}</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase truncate max-w-[150px]">{song}</span>
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

      {/* MODAL MÊS */}
      {isMonthPickerOpen && (
        <div className="fixed inset-0 z-[8000] flex flex-col justify-end">
          <div className="absolute inset-0 bg-[#1a1c3d]/80 backdrop-blur-sm animate-fadeIn" onClick={() => setIsMonthPickerOpen(false)} />
          <div className="relative bg-white rounded-t-[3rem] p-8 max-h-[85vh] flex flex-col shadow-2xl animate-slideUp">
            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8 shrink-0"></div>
            <h3 className="text-xl font-black text-[#1a1c3d] mb-6 uppercase tracking-tighter text-center">Exportar Mensal</h3>
            <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar pb-8">
              {Object.keys(groupedHistory).map(monthKey => (
                <button 
                  key={monthKey}
                  onClick={() => { shareMonth(monthKey); setIsMonthPickerOpen(false); }}
                  className="w-full py-5 px-6 bg-slate-50 hover:bg-indigo-50 text-[#1a1c3d] font-bold rounded-2xl flex justify-between items-center transition-all active:scale-95"
                >
                  <span className="text-sm uppercase tracking-tight">{monthKey}</span>
                  <span className="material-icons text-indigo-400">share</span>
                </button>
              ))}
            </div>
            <button onClick={() => setIsMonthPickerOpen(false)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest shrink-0">FECHAR</button>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[8000] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" onClick={() => setItemToDelete(null)} />
          <div className="relative bg-white rounded-t-[3rem] p-8 pb-12 shadow-2xl animate-slideUp">
            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8"></div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-6 text-rose-500">
                <span className="material-icons text-3xl">delete_forever</span>
              </div>
              <h3 className="text-xl font-black text-[#1a1c3d] mb-2 uppercase tracking-tighter">Apagar Registro?</h3>
              <p className="text-slate-400 font-bold text-[10px] uppercase mb-8">Esta ação não pode ser desfeita.</p>
              <div className="w-full flex flex-col gap-3">
                <button onClick={() => { onDelete(itemToDelete!); setItemToDelete(null); }} className="w-full py-5 bg-rose-500 text-white font-black rounded-2xl shadow-xl active:scale-95">EXCLUIR AGORA</button>
                <button onClick={() => setItemToDelete(null)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">CANCELAR</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {Object.keys(groupedHistory).length === 0 && (
        <div className="text-center py-24 bg-white/50 rounded-[3rem] border-2 border-dashed border-slate-200 mx-1">
          <span className="material-icons text-slate-200 text-6xl mb-4">history_toggle_off</span>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">Nenhum registro encontrado</p>
          {externalFilter && (
            <button onClick={onClearExternalFilter} className="mt-4 text-indigo-600 font-black text-[10px] uppercase border-b border-indigo-200">Limpar filtros</button>
          )}
        </div>
      )}
    </div>
  );
};

export default HistoryList;
