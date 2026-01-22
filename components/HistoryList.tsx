
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

    if (externalFilter) {
      filtered = filtered.filter(r => 
        r.roles[externalFilter.role as keyof typeof r.roles] === externalFilter.worker
      );
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.date.includes(searchTerm) || 
        r.description.toLowerCase().includes(lowerSearch) ||
        r.roles?.word?.toLowerCase().includes(lowerSearch) || 
        r.roles?.praise?.toLowerCase().includes(lowerSearch) || 
        r.roles?.gate?.toLowerCase().includes(lowerSearch) || 
        r.roles?.leader?.toLowerCase().includes(lowerSearch) || 
        r.songs.some(s => s.toLowerCase().includes(lowerSearch))
      );
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

  const roleLabels: Record<string, string> = {
    gate: 'PORTÃO',
    praise: 'LOUVOR',
    word: 'PALAVRA',
    leader: 'DIRIGENTE'
  };

  const InfoTag = ({ label, value, icon, roleId }: { label: string, value?: string, icon: string, roleId: string }) => {
    if (!value) return null;
    
    const isHighlighted = externalFilter?.role === roleId;

    return (
      <div className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all border ${
        isHighlighted 
          ? 'border-amber-400 bg-amber-50/50 ring-1 ring-amber-100' 
          : 'border-slate-50 bg-slate-50/40 hover:border-slate-100'
      }`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          isHighlighted ? 'bg-amber-400 text-[#1a1c3d]' : 'bg-white text-indigo-500 shadow-sm border border-slate-50'
        }`}>
          <span className="material-icons text-xl">{icon}</span>
        </div>
        <div className="flex flex-col min-w-0">
          <span className={`text-[9px] font-black uppercase tracking-widest ${isHighlighted ? 'text-amber-600' : 'text-slate-400'}`}>{label}</span>
          <span className={`text-[12px] font-bold truncate leading-tight ${isHighlighted ? 'text-[#1a1c3d]' : 'text-slate-700'}`}>{value}</span>
        </div>
      </div>
    );
  };

  const formatServiceMessage = (r: ServiceRecord) => {
    const d = new Date(r.date + 'T12:00:00');
    const dayName = d.toLocaleDateString('pt-BR', { weekday: 'long' }).toUpperCase();
    const dateFormatted = d.toLocaleDateString('pt-BR');
    const isWednesday = d.getDay() === 3;
    const isThursday = d.getDay() === 4;

    let msg = `RELATÓRIO DE CULTO\n`;
    msg += `ICM SANTO ANTÔNIO II\n\n`;
    msg += `DATA: ${dateFormatted} (${dayName})\n`;

    if (isWednesday) {
      msg += `*CULTO DIRIGIDO PELO GRUPO DE SENHORAS*\n`;
      if (r.roles.gate) msg += `> Portão: ${r.roles.gate}\n`;
    } else if (isThursday) {
      if (r.roles.gate) msg += `> Portão: ${r.roles.gate}\n`;
      if (r.roles.leader) msg += `> Dirigente: ${r.roles.leader}\n`;
      if (r.roles.scripture) msg += `> Texto: ${r.roles.scripture}\n`;
    } else {
      if (r.roles.gate) msg += `> Portão: ${r.roles.gate}\n`;
      if (r.roles.praise) msg += `> Louvor: ${r.roles.praise}\n`;
      if (r.roles.word) msg += `> Palavra: ${r.roles.word}\n`;
      if (r.roles.scripture) msg += `> Texto: ${r.roles.scripture}\n`;
    }
    
    if (r.songs && r.songs.length > 0) {
      msg += `Louvores: \n`;
      r.songs.forEach((s) => msg += ` - ${s}\n`);
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
    <div className="space-y-10 animate-fadeIn max-w-4xl mx-auto pb-10 px-1">
      {/* Search and Month Filter */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white rounded-full flex items-center px-6 py-4 shadow-xl border border-slate-50">
            <span className="material-icons text-slate-300 mr-3">search</span>
            <input 
              type="text" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="Pesquisar por obreiro, dia ou data..." 
              className="w-full bg-transparent font-bold text-slate-600 outline-none placeholder:text-slate-300 text-sm" 
            />
          </div>
          <button onClick={() => setIsMonthPickerOpen(true)} className="bg-indigo-500 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl shrink-0 active:scale-90 transition-transform">
             <span className="material-icons">calendar_month</span>
          </button>
        </div>

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
                  <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Filtro Ativo</span>
                  <p className="text-white text-sm font-medium leading-none">
                    <span className="font-black text-amber-400">{externalFilter.worker}</span>
                    <span className="mx-2 text-white/20">|</span>
                    <span className="font-black uppercase text-[10px] tracking-widest">{roleLabels[externalFilter.role]}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={onClearExternalFilter}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Limpar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* History List Grouped by Month */}
      {(Object.entries(groupedHistory) as [string, ServiceRecord[]][]).map(([month, records]) => (
        <div key={month} className="space-y-6">
          <div className="px-5 flex justify-between items-center">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">{month}</h3>
            <div className="h-[1px] bg-slate-200 flex-1 mx-4 opacity-50"></div>
            <span className="text-[10px] font-black text-indigo-400/80 tracking-widest">{records.length} CULTOS</span>
          </div>
          
          <div className="grid gap-8">
            {records.map(record => {
              const d = new Date(record.date + 'T12:00:00');
              const isThursday = d.getDay() === 4;
              const isWednesday = d.getDay() === 3;
              
              return (
                <div key={record.id} className="bg-white rounded-[3.5rem] p-6 md:p-12 shadow-sm border border-slate-100 animate-fadeIn hover:shadow-2xl hover:border-indigo-50 transition-all group">
                  <div className="flex flex-col gap-10">
                    
                    {/* Header: Compact Date, Info and Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-[#1a1c3d] rounded-[2rem] flex flex-col items-center justify-center shadow-xl shrink-0 group-hover:scale-105 transition-transform">
                          <span className="text-white font-black text-xl leading-none">{d.getDate()}</span>
                          <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest mt-1">{dayOfWeekNamesShort[d.getDay()]}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200"></span>
                            <h4 className="font-black text-[#1a1c3d] uppercase text-base tracking-tighter truncate">{record.description}</h4>
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] flex items-center gap-1.5">
                             <span className="material-icons text-[14px] text-indigo-300">calendar_today</span>
                             {d.toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(formatServiceMessage(record))}`)} className="w-12 h-12 flex items-center justify-center text-emerald-500 bg-emerald-50 rounded-2xl active:scale-90 transition-all hover:bg-emerald-100" title="Compartilhar"><span className="material-icons text-xl">share</span></button>
                        <button onClick={() => onEdit(record)} className="w-12 h-12 flex items-center justify-center text-indigo-500 bg-indigo-50 rounded-2xl active:scale-90 transition-all hover:bg-indigo-100" title="Editar"><span className="material-icons text-xl">edit</span></button>
                        <button onClick={() => setItemToDelete(record.id)} className="w-12 h-12 flex items-center justify-center text-rose-300 hover:text-rose-500 bg-rose-50 rounded-2xl active:scale-90 transition-all hover:bg-rose-100" title="Excluir"><span className="material-icons text-xl">delete_outline</span></button>
                      </div>
                    </div>

                    {/* Group: TEAM ROLES */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 px-1">
                        <span className="text-[10px] font-black text-[#1a1c3d]/20 uppercase tracking-[0.25em]">Equipe</span>
                        <div className="h-[1px] bg-slate-50 flex-1"></div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {/* Always show Gate */}
                        <InfoTag label="Portão" value={record.roles.gate} icon="sensor_door" roleId="gate" />
                        
                        {isThursday ? (
                          <InfoTag label="Dirigente" value={record.roles.leader} icon="stars" roleId="leader" />
                        ) : isWednesday ? (
                           <div className="col-span-1 sm:col-span-2 flex items-center gap-4 p-4 rounded-3xl border border-indigo-100 bg-indigo-50/20">
                             <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-500 shadow-sm border border-indigo-50">
                               <span className="material-icons text-xl">auto_awesome</span>
                             </div>
                             <div className="flex flex-col">
                               <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Responsabilidade</span>
                               <span className="text-[12px] font-black text-indigo-700 uppercase">Grupo de Senhoras</span>
                             </div>
                           </div>
                        ) : (
                          <>
                            <InfoTag label="Louvor" value={record.roles.praise} icon="mic" roleId="praise" />
                            <InfoTag label="Palavra" value={record.roles.word} icon="history_edu" roleId="word" />
                          </>
                        )}
                      </div>
                    </div>

                    {/* Group: MESSAGE / BIBLE CONTENT */}
                    {(record.roles.scripture || record.roles.word === 'TRANSMISSÃO') && !isWednesday && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 px-1">
                          <span className="text-[10px] font-black text-[#1a1c3d]/20 uppercase tracking-[0.25em]">Conteúdo</span>
                          <div className="h-[1px] bg-slate-50 flex-1"></div>
                        </div>
                        <div className="bg-slate-50/50 rounded-[2.5rem] p-6 border border-slate-100 flex items-center gap-5">
                           <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-500 shadow-md border border-slate-50">
                             <span className="material-icons text-2xl">{record.roles.word === 'TRANSMISSÃO' ? 'satellite_alt' : 'auto_stories'}</span>
                           </div>
                           <div className="flex flex-col min-w-0">
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Texto Bíblico</span>
                             <span className="text-sm font-black text-[#1a1c3d] uppercase leading-tight">
                               {record.roles.word === 'TRANSMISSÃO' ? 'Via Satélite' : (record.roles.scripture || 'Não informado')}
                             </span>
                           </div>
                        </div>
                      </div>
                    )}

                    {/* Group: HYMNS LIST */}
                    {record.songs.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 px-1">
                          <span className="text-[10px] font-black text-[#1a1c3d]/20 uppercase tracking-[0.25em]">Hinos</span>
                          <div className="h-[1px] bg-slate-50 flex-1"></div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {record.songs.map((song, idx) => (
                            <div key={idx} className="bg-white px-5 py-3 rounded-2xl border border-slate-100 flex items-center gap-3 shadow-sm hover:border-indigo-200 transition-all">
                              <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
                                <span className="text-[10px] font-black text-indigo-700">{idx + 1}</span>
                              </div>
                              <span className="text-[12px] font-bold text-slate-700 uppercase truncate max-w-[240px]">{song}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Slide-ups for filters and confirmation */}
      {isMonthPickerOpen && (
        <div className="fixed inset-0 z-[8000] flex flex-col justify-end">
          <div className="absolute inset-0 bg-[#1a1c3d]/80 backdrop-blur-sm animate-fadeIn" onClick={() => setIsMonthPickerOpen(false)} />
          <div className="relative bg-white rounded-t-[3.5rem] p-8 max-h-[85vh] flex flex-col shadow-2xl animate-slideUp">
            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8 shrink-0"></div>
            <h3 className="text-xl font-black text-[#1a1c3d] mb-6 uppercase tracking-tighter text-center">Relatório Mensal</h3>
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

      {itemToDelete && (
        <div className="fixed inset-0 z-[8000] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" onClick={() => setItemToDelete(null)} />
          <div className="relative bg-white rounded-t-[3.5rem] p-8 pb-12 shadow-2xl animate-slideUp">
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
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="mt-4 text-indigo-600 font-black text-[10px] uppercase border-b border-indigo-200">Limpar busca</button>
          )}
        </div>
      )}
    </div>
  );
};

export default HistoryList;
