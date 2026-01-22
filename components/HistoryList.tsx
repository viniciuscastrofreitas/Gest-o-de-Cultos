
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
      <div className={`flex items-center gap-2 p-2.5 rounded-xl transition-all border ${
        isHighlighted 
          ? 'border-amber-400 bg-amber-50/50 ring-1 ring-amber-100' 
          : 'border-slate-100 bg-slate-50/40 hover:border-slate-200'
      }`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          isHighlighted ? 'bg-amber-400 text-[#1a1c3d]' : 'bg-white text-indigo-500 shadow-sm border border-slate-100'
        }`}>
          <span className="material-icons text-lg">{icon}</span>
        </div>
        <div className="flex flex-col min-w-0">
          <span className={`text-[8px] font-black uppercase tracking-widest ${isHighlighted ? 'text-amber-600' : 'text-slate-500'}`}>{label}</span>
          <span className={`text-[11px] font-bold truncate leading-tight ${isHighlighted ? 'text-[#1a1c3d]' : 'text-slate-700'}`}>{value}</span>
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
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto pb-10 px-1">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white rounded-2xl flex items-center px-5 py-3 shadow-lg border border-slate-100">
            <span className="material-icons text-slate-400 mr-2">search</span>
            <input 
              type="text" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="Pesquisar..." 
              className="w-full bg-transparent font-bold text-slate-700 outline-none placeholder:text-slate-400 text-sm" 
            />
          </div>
          <button onClick={() => setIsMonthPickerOpen(true)} className="bg-indigo-500 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shrink-0 active:scale-90 transition-transform">
             <span className="material-icons">calendar_month</span>
          </button>
        </div>

        {externalFilter && (
          <div className="bg-[#1a1c3d] rounded-2xl p-4 shadow-xl animate-scaleUp border border-white/5 relative overflow-hidden">
            <div className="relative z-10 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center text-[#1a1c3d] shadow-lg">
                  <span className="material-icons text-lg">person_search</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-white/50 uppercase tracking-[0.2em]">Filtro Ativo</span>
                  <p className="text-white text-[12px] font-medium leading-none">
                    <span className="font-black text-amber-400">{externalFilter.worker}</span>
                    <span className="mx-1.5 text-white/20">|</span>
                    <span className="font-black uppercase text-[9px] tracking-widest">{roleLabels[externalFilter.role]}</span>
                  </p>
                </div>
              </div>
              <button onClick={onClearExternalFilter} className="bg-white/10 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">Limpar</button>
            </div>
          </div>
        )}
      </div>

      {(Object.entries(groupedHistory) as [string, ServiceRecord[]][]).map(([month, records]) => (
        <div key={month} className="space-y-3">
          <div className="px-4 flex justify-between items-center">
            <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">{month}</h3>
            <div className="h-[1px] bg-slate-200 flex-1 mx-3 opacity-50"></div>
            <span className="text-[9px] font-black text-indigo-500 tracking-widest">{records.length} CULTOS</span>
          </div>
          
          <div className="grid gap-4">
            {records.map(record => {
              const d = new Date(record.date + 'T12:00:00');
              const isThursday = d.getDay() === 4;
              const isWednesday = d.getDay() === 3;
              
              return (
                <div key={record.id} className="bg-white rounded-[2rem] p-5 md:p-6 shadow-sm border border-slate-100 animate-fadeIn hover:shadow-xl transition-all group">
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#1a1c3d] rounded-2xl flex flex-col items-center justify-center shadow-lg shrink-0 group-hover:scale-105 transition-transform">
                          <span className="text-white font-black text-lg leading-none">{d.getDate()}</span>
                          <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest mt-0.5">{dayOfWeekNamesShort[d.getDay()]}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                            <h4 className="font-black text-[#1a1c3d] uppercase text-sm tracking-tight truncate">{record.description}</h4>
                          </div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                             <span className="material-icons text-[12px]">calendar_today</span>
                             {d.toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 justify-end">
                        <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(formatServiceMessage(record))}`)} className="w-9 h-9 flex items-center justify-center text-emerald-600 bg-emerald-50 rounded-xl active:scale-90 transition-all hover:bg-emerald-100"><span className="material-icons text-lg">share</span></button>
                        <button onClick={() => onEdit(record)} className="w-9 h-9 flex items-center justify-center text-indigo-600 bg-indigo-50 rounded-xl active:scale-90 transition-all hover:bg-indigo-100"><span className="material-icons text-lg">edit</span></button>
                        <button onClick={() => setItemToDelete(record.id)} className="w-9 h-9 flex items-center justify-center text-rose-400 bg-rose-50 rounded-xl active:scale-90 transition-all hover:bg-rose-100"><span className="material-icons text-lg">delete_outline</span></button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        <InfoTag label="Portão" value={record.roles.gate} icon="door_front" roleId="gate" />
                        {isThursday ? (
                          <InfoTag label="Dirigente" value={record.roles.leader} icon="stars" roleId="leader" />
                        ) : isWednesday ? (
                           <div className="col-span-1 sm:col-span-2 flex items-center gap-3 p-3 rounded-xl border border-indigo-100 bg-indigo-50/20">
                             <span className="text-lg">🌸</span>
                             <div className="flex flex-col">
                               <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Responsabilidade</span>
                               <span className="text-[11px] font-black text-indigo-700 uppercase">Grupo de Senhoras</span>
                             </div>
                           </div>
                        ) : (
                          <>
                            <InfoTag label="Louvor" value={record.roles.praise} icon="mic" roleId="praise" />
                            <InfoTag label="Palavra" value={record.roles.word} icon="history_edu" roleId="word" />
                          </>
                        )}
                    </div>

                    {(record.roles.scripture || record.roles.word === 'TRANSMISSÃO') && !isWednesday && (
                      <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex items-center gap-4">
                         <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-500 border border-slate-100">
                           <span className="material-icons text-xl">{record.roles.word === 'TRANSMISSÃO' ? 'satellite_alt' : 'auto_stories'}</span>
                         </div>
                         <div className="flex flex-col min-w-0">
                           <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Texto Bíblico</span>
                           <span className="text-[12px] font-black text-[#1a1c3d] uppercase truncate">
                             {record.roles.word === 'TRANSMISSÃO' ? 'Via Satélite' : (record.roles.scripture || 'Não informado')}
                           </span>
                         </div>
                      </div>
                    )}

                    {record.songs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {record.songs.map((song, idx) => (
                          <div key={idx} className="bg-white px-3 py-1.5 rounded-lg border border-slate-100 flex items-center gap-2">
                            <span className="text-[9px] font-black text-indigo-700">#{idx + 1}</span>
                            <span className="text-[11px] font-bold text-slate-700 uppercase truncate max-w-[180px]">{song}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      
      {/* Modais omitidos para brevidade (mantendo o comportamento original) */}
      {isMonthPickerOpen && (
        <div className="fixed inset-0 z-[8000] flex flex-col justify-end">
          <div className="absolute inset-0 bg-[#1a1c3d]/80 backdrop-blur-sm animate-fadeIn" onClick={() => setIsMonthPickerOpen(false)} />
          <div className="relative bg-white rounded-t-[3.5rem] p-8 max-h-[85vh] flex flex-col shadow-2xl animate-slideUp">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8 shrink-0"></div>
            <h3 className="text-xl font-black text-[#1a1c3d] mb-6 uppercase tracking-tighter text-center">Relatório Mensal</h3>
            <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar pb-8">
              {Object.keys(groupedHistory).map(monthKey => (
                <button key={monthKey} onClick={() => { shareMonth(monthKey); setIsMonthPickerOpen(false); }} className="w-full py-4 px-6 bg-slate-50 hover:bg-indigo-50 text-[#1a1c3d] font-bold rounded-2xl flex justify-between items-center transition-all">
                  <span className="text-sm uppercase">{monthKey}</span>
                  <span className="material-icons text-indigo-500">share</span>
                </button>
              ))}
            </div>
            <button onClick={() => setIsMonthPickerOpen(false)} className="w-full py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest shrink-0">FECHAR</button>
          </div>
        </div>
      )}

      {itemToDelete && (
        <div className="fixed inset-0 z-[8000] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" onClick={() => setItemToDelete(null)} />
          <div className="relative bg-white rounded-t-[3rem] p-8 pb-10 shadow-2xl animate-slideUp">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4 text-rose-500">
                <span className="material-icons text-3xl">delete_forever</span>
              </div>
              <h3 className="text-xl font-black text-[#1a1c3d] mb-1 uppercase tracking-tighter">Apagar Registro?</h3>
              <p className="text-slate-500 font-bold text-[10px] uppercase mb-8">Esta ação não pode ser desfeita.</p>
              <div className="w-full flex flex-col gap-2">
                <button onClick={() => { onDelete(itemToDelete!); setItemToDelete(null); }} className="w-full py-4 bg-rose-500 text-white font-black rounded-2xl shadow-xl active:scale-95">EXCLUIR AGORA</button>
                <button onClick={() => setItemToDelete(null)} className="w-full py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest">CANCELAR</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryList;
