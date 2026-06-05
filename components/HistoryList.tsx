import React, { useState, useMemo } from 'react';
import { ServiceRecord } from '../types';

interface Props {
  history: ServiceRecord[];
  workers?: string[];
  fullSongList?: string[];
  onDelete: (id: string) => void;
  onEdit: (record: ServiceRecord) => void;
  onClearAll: () => void;
  externalFilter?: { worker: string; role: string } | null;
  onClearExternalFilter?: () => void;
  onRegisterGap?: (date: string, type: 'missing_service' | 'missing_ebd' | 'missing_dom') => void;
}

const HistoryList: React.FC<Props> = ({ 
  history, 
  workers = [], 
  fullSongList = [], 
  onDelete, 
  onEdit, 
  externalFilter, 
  onClearExternalFilter,
  onRegisterGap
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'normal' | 'gaps'>('normal');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Specific Filters
  const [filterDate, setFilterDate] = useState('');
  const [filterWorker, setFilterWorker] = useState('');
  const [filterSong, setFilterSong] = useState('');
  const [filterType, setFilterType] = useState('');

  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [ignoredGaps, setIgnoredGaps] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ignored_gaps_v1');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const handleIgnoreGap = (date: string, type: string) => {
    const key = `${date}_${type}`;
    const updated = [...ignoredGaps, key];
    setIgnoredGaps(updated);
    try {
      localStorage.setItem('ignored_gaps_v1', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearIgnoredGaps = () => {
    setIgnoredGaps([]);
    try {
      localStorage.removeItem('ignored_gaps_v1');
    } catch (e) {
      console.error(e);
    }
  };

  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [showShareOptions, setShowShareOptions] = useState(false);

  const monthNames = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
  const dayOfWeekNamesShort = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterDate('');
    setFilterWorker('');
    setFilterSong('');
    setFilterType('');
    if (onClearExternalFilter) onClearExternalFilter();
  };

  const getSpecialBadge = (dateString: string) => {
    const d = new Date(dateString + 'T12:00:00');
    const day = d.getDay();
    if (day === 1) return { 
      label: 'Glorificação', 
      color: 'bg-indigo-600', 
      emoji: '🎤', 
      bg: 'bg-indigo-50/80', 
      border: 'border-indigo-100', 
      textColor: 'text-indigo-700' 
    };
    if (day === 3) return { 
      label: 'Senhoras', 
      color: 'bg-rose-500', 
      emoji: '🌸', 
      bg: 'bg-rose-50/80', 
      border: 'border-rose-100', 
      textColor: 'text-rose-700' 
    };
    if (day === 4) return { 
      label: 'Oração', 
      color: 'bg-amber-500', 
      emoji: '🙏', 
      bg: 'bg-amber-50/80', 
      border: 'border-amber-100', 
      textColor: 'text-amber-700' 
    };
    return null;
  };

  // 1. Calculate and group services according to filters
  const groupedHistory = useMemo(() => {
    let filtered = [...history];

    if (externalFilter) {
      filtered = filtered.filter(r => r.roles[externalFilter.role as keyof typeof r.roles] === externalFilter.worker);
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(r => {
        const badge = getSpecialBadge(r.date);
        return (
          r.date.includes(lowerSearch) ||
          r.description.toLowerCase().includes(lowerSearch) ||
          badge?.label.toLowerCase().includes(lowerSearch) ||
          Object.values(r.roles).some(v => String(v).toLowerCase().includes(lowerSearch)) ||
          r.songs.some(s => s.toLowerCase().includes(lowerSearch))
        );
      });
    }

    if (filterDate) {
      filtered = filtered.filter(r => r.date === filterDate);
    }

    if (filterWorker) {
      const lowerWorker = filterWorker.toLowerCase();
      filtered = filtered.filter(r => 
        Object.values(r.roles).some(v => String(v).toLowerCase().includes(lowerWorker))
      );
    }

    if (filterSong) {
      const lowerSong = filterSong.toLowerCase();
      filtered = filtered.filter(r => 
        r.songs.some(s => s.toLowerCase().includes(lowerSong))
      );
    }

    if (filterType) {
      filtered = filtered.filter(r => r.description === filterType);
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
  }, [history, searchTerm, externalFilter, filterDate, filterWorker, filterSong, filterType]);

  // 2. Compute calendar gaps (expected service days) & registered issues
  const alertsAndGaps = useMemo(() => {
    const calendarGaps: { date: string; type: 'missing_service' | 'missing_ebd' | 'missing_dom'; dayName: string; formattedDate: string }[] = [];
    const recordCompleteness: { record: ServiceRecord; issues: string[] }[] = [];
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    // Limit scanning exclusively to the current calendar year to ignore previous years completely
    const startOfYear = new Date(today.getFullYear(), 0, 1, 12, 0, 0, 0);
    const timeDiff = today.getTime() - startOfYear.getTime();
    const maxDays = Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));

    // Scan calendar days of the entire history range of this year
    for (let i = maxDays; i > 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dayOfWeek = d.getDay(); // 0 Sunday, 5 Friday

      // standard weekly template: skip Friday (traditionally no regular services)
      if (dayOfWeek === 5) continue;

      const year = d.getFullYear();
      const monthStr = String(d.getMonth() + 1).padStart(2, '0');
      const dateStr = String(d.getDate()).padStart(2, '0');
      const formattedDateStr = `${dateStr}/${monthStr}/${year}`;
      const dateQuery = `${year}-${monthStr}-${dateStr}`;

      const dayRecords = history.filter(r => r.date === dateQuery);
      const dayNameStr = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'][dayOfWeek];

      if (dayOfWeek === 0) { // Sundays have EBD and DOM nighttime
        const hasEBD = dayRecords.some(r => r.description === 'EBD');
        const hasDOM = dayRecords.some(r => r.description === 'DOM' || r.description === 'DOMINGO');
        if (!hasEBD) {
          calendarGaps.push({ date: dateQuery, type: 'missing_ebd', dayName: 'DOMINGO (ESCOLA BÍBLICA DOMINICAL - EBD)', formattedDate: formattedDateStr });
        }
        if (!hasDOM) {
          calendarGaps.push({ date: dateQuery, type: 'missing_dom', dayName: 'DOMINGO (CULTO À NOITE)', formattedDate: formattedDateStr });
        }
      } else { // Weekdays expecting Mon, Tue, Wed, Thu, Sat
        const expectedPrefix = dayNameStr.split('-')[0].toUpperCase();
        const hasRecord = dayRecords.some(r => {
          const desc = r.description.toUpperCase();
          return desc === dayNameStr || desc.includes(expectedPrefix);
        });

        if (!hasRecord) {
          calendarGaps.push({ date: dateQuery, type: 'missing_service', dayName: `${dayNameStr}`, formattedDate: formattedDateStr });
        }
      }
    }

    // Filter out ignored gap items
    const filteredGaps = calendarGaps.filter(gap => !ignoredGaps.includes(`${gap.date}_${gap.type}`));

    // Scan registered records for completeness of required indicators
    history.forEach(r => {
      const issues: string[] = [];

      // Look for blank/missing praises list
      if (!r.songs || r.songs.length === 0) {
        issues.push("Sem nenhum registro de hinos/louvores.");
      }

      // Check worker roles expectations automatically
      const desc = r.description.toUpperCase();
      const isSegment = (descVal: string, targets: string[]) => targets.some(t => descVal.includes(t));

      const expectedRoles: string[] = [];
      if (desc === 'EBD' || desc === 'DOM' || desc === 'DOMINGO' || isSegment(desc, ['TERÇA', 'QUINTA', 'SÁBADO'])) {
        expectedRoles.push('gate', 'praise', 'word');
      } else if (isSegment(desc, ['SEGUNDA'])) {
        expectedRoles.push('gate', 'praise');
      } else if (isSegment(desc, ['QUARTA'])) {
        expectedRoles.push('gate');
      } else {
        expectedRoles.push('gate', 'praise', 'word');
      }

      expectedRoles.forEach(role => {
        const val = r.roles[role as keyof typeof r.roles];
        if (!val || val.trim() === '') {
          const rLabel = role === 'gate' ? 'Portão' : role === 'praise' ? 'Louvor' : 'Palavra';
          issues.push(`Sem escalação do obreiro para a função: "${rLabel}".`);
        }
      });

      if (issues.length > 0) {
        recordCompleteness.push({ record: r, issues });
      }
    });

    return { 
      calendarGaps: filteredGaps, 
      allGapsCount: calendarGaps.length,
      ignoredCount: ignoredGaps.length,
      recordCompleteness, 
      maxDays 
    };
  }, [history, ignoredGaps]);

  const generateSingleReport = (r: ServiceRecord) => {
    const d = new Date(r.date + 'T12:00:00');
    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const badge = getSpecialBadge(r.date);
    let text = `*RELATÓRIO DE CULTO - ${dateStr} (${r.description})*\n`;
    if (badge) text = `*RELATÓRIO DE CULTO (${badge.label.toUpperCase()}) - ${dateStr}*\n`;
    
    if (r.roles.gate) text += `> Portão: ${r.roles.gate}\n`;
    if (r.roles.praise) text += `> Louvor: ${r.roles.praise}\n`;
    if (r.roles.word) text += `> Palavra: ${r.roles.word}\n`;
    if (r.roles.word === 'TRANSMISSÃO') {
      text += `Satélite: Transmissão\n`;
    } else if (r.roles.scripture) {
      text += `Texto: ${r.roles.scripture}\n`;
    }

    if (r.attendance) {
      const att = r.attendance;
      if (r.description === 'EBD') {
        const totalMembers = (att.ebdMembersAdult || 0) + (att.ebdMembersCias || 0);
        const totalVisitors = (att.ebdVisitorsAdult || 0) + (att.ebdVisitorsCias || 0);
        const grandTotal = totalMembers + totalVisitors;
        if (grandTotal > 0) {
          text += `\n*Frequência Total: ${grandTotal}*\n`;
          text += `Membros: ${totalMembers} (A: ${att.ebdMembersAdult || 0} / C: ${att.ebdMembersCias || 0})\n`;
          text += `Visitantes: ${totalVisitors} (A: ${att.ebdVisitorsAdult || 0} / C: ${att.ebdVisitorsCias || 0})\n`;
        }
      } else {
        const total = (att.members || 0) + (att.visitors || 0);
        if (total > 0) {
          text += `\n*Frequência: ${total}* (${att.members || 0} Membros / ${att.visitors || 0} Visitantes)\n`;
        }
      }
    }

    if (r.songs.length > 0) {
      text += `\nLOUVORES: \n`;
      r.songs.forEach((s, i) => { text += ` ${i + 1}. ${s}\n`; });
    }
    return text;
  };

  const handleWhatsAppShare = (title: string, records: ServiceRecord[]) => {
    const reportData = [...records].sort((a, b) => a.date.localeCompare(b.date));
    const text = reportData.map(r => generateSingleReport(r)).join('\n' + '─'.repeat(15) + '\n');
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
        <span className={`text-[11px] font-black ${isHighlighted ? 'text-indigo-800' : 'text-slate-900'}`}>{value}</span>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* HEADER PRINCIPAL */}
      <div className="section-header">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <span className="material-icons text-xl">history</span>
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Histórico de Cultos</h2>
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Consulte todos os registros anteriores</p>
      </div>

      {/* SUB-TABS INTERNAS */}
      <div className="flex bg-slate-800 p-1 rounded-2xl gap-1">
        <button 
          onClick={() => setActiveSubTab('normal')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeSubTab === 'normal' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
        >
          <span className="material-icons text-sm">history</span>
          Todos os Cultos
        </button>
        <button 
          onClick={() => setActiveSubTab('gaps')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all relative ${activeSubTab === 'gaps' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
        >
          <span className="material-icons text-sm">report_problem</span>
          Lacunas de Dados
          {(alertsAndGaps.calendarGaps.length + alertsAndGaps.recordCompleteness.length) > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg border-2 border-slate-900">
              {alertsAndGaps.calendarGaps.length + alertsAndGaps.recordCompleteness.length}
            </span>
          )}
        </button>
      </div>

      {activeSubTab === 'normal' ? (
        <>
          {/* PAINEL DE FILTROS AVANÇADOS */}
          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="material-icons text-sm text-indigo-500">tune</span>
                <span className="font-black text-[10px] text-slate-400 uppercase tracking-widest">Painel de Pesquisa e Filtros</span>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                  className="text-[10px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl uppercase tracking-widest flex items-center gap-1.5 transition-all"
                >
                  <span className="material-icons text-xs">
                    {isFiltersExpanded ? 'expand_less' : 'expand_more'}
                  </span>
                  {isFiltersExpanded ? 'Recolher Filtros' : 'Filtros Avançados'}
                </button>
                {(filterDate || filterWorker || filterSong || filterType || searchTerm) && (
                  <button 
                    onClick={clearAllFilters}
                    className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-600 transition-all"
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>
            </div>

            {/* Caixa geral de texto (Sempre visível) */}
            <div className="relative">
              <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm">search</span>
              <input 
                type="text" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                placeholder="Busca livre... (Qualquer texto, anotação ou badge)" 
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 outline-none focus:border-indigo-500 font-bold placeholder:text-slate-300 text-xs" 
              />
            </div>

            {isFiltersExpanded && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-50 animate-scaleUp">
                {/* Filtro por Data */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Buscar por Data específica</label>
                  <input 
                    type="date" 
                    value={filterDate} 
                    onChange={e => setFilterDate(e.target.value)} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all font-mono"
                  />
                </div>

                {/* Filtro por Obreiro */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider font-mono">Buscar por Obreiro</label>
                  <input 
                    type="text" 
                    value={filterWorker} 
                    onChange={e => setFilterWorker(e.target.value)} 
                    placeholder="Nome do obreiro..." 
                    list="history-workers-list"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
                  />
                  <datalist id="history-workers-list">
                    {workers.map(w => <option key={w} value={w} />)}
                  </datalist>
                </div>

                {/* Filtro por Louvor */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider font-mono">Buscar por Louvor</label>
                  <input 
                    type="text" 
                    value={filterSong} 
                    onChange={e => setFilterSong(e.target.value)} 
                    placeholder="Nome ou nº do hino..." 
                    list="history-songs-list"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
                  />
                  <datalist id="history-songs-list">
                    {fullSongList.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>

                {/* Filtro por Tipo de Culto */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Tipo/Dia do Culto</label>
                  <select 
                    value={filterType} 
                    onChange={e => setFilterType(e.target.value)} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
                  >
                    <option value="">TODOS</option>
                    <option value="EBD">EBD</option>
                    <option value="DOM">DOMINGO</option>
                    <option value="SEGUNDA-FEIRA">SEGUNDA-FEIRA</option>
                    <option value="TERÇA-FEIRA">TERÇA-FEIRA</option>
                    <option value="QUARTA-FEIRA">QUARTA-FEIRA</option>
                    <option value="QUINTA-FEIRA">QUINTA-FEIRA</option>
                    <option value="SÁBADO">SÁBADO</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2.5">
            {history.length > 0 && (
              <button 
                onClick={() => setShowShareOptions(true)} 
                className="px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 shrink-0"
              >
                <span className="material-icons text-sm">share</span>
                Enviar Relatório Mensal / Completo
              </button>
            )}
          </div>

          {/* LISTAGEM AGRUPADA DE CULTOS */}
          {Object.keys(groupedHistory).length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200">
              <span className="material-icons text-slate-200 text-6xl mb-4">search_off</span>
              <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Nenhum culto encontrado com os filtros selecionados</p>
            </div>
          ) : (
            (Object.entries(groupedHistory) as [string, ServiceRecord[]][]).map(([month, records]) => (
              <div key={month} className="space-y-5">
                <div className="px-2 flex justify-between items-center">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">{month}</h3>
                </div>
                
                <div className="grid gap-5">
                  {records.map(record => {
                    const badge = getSpecialBadge(record.date);
                    const att = record.attendance;
                    let attendanceText = "";
                    if (att) {
                      if (record.description === 'EBD') {
                        const total = (att.ebdMembersAdult || 0) + (att.ebdMembersCias || 0) + (att.ebdVisitorsAdult || 0) + (att.ebdVisitorsCias || 0);
                        if (total > 0) attendanceText = `${total} presentes`;
                      } else {
                        const total = (att.members || 0) + (att.visitors || 0);
                        if (total > 0) attendanceText = `${total} presentes`;
                      }
                    }

                    return (
                      <div key={record.id} className="card-main p-6 md:p-10">
                        <div className="flex flex-col gap-6">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-5">
                              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex flex-col items-center justify-center border border-slate-100 shrink-0">
                                <span className="text-sm font-black text-indigo-600 leading-none">
                                  {new Date(record.date + 'T12:00:00').getDate()}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">
                                  {dayOfWeekNamesShort[new Date(record.date + 'T12:00:00').getDay()]}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-black text-slate-900 uppercase text-base tracking-tight">{record.description}</h4>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                  <div className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{record.songs.length} LOUVORES</p>
                                  </div>
                                  {attendanceText && (
                                    <div className="flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">{attendanceText}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2.5 justify-end">
                              <button onClick={() => handleIndividualShare(record)} className="w-11 h-11 flex items-center justify-center text-emerald-600 bg-emerald-50 rounded-2xl active:scale-90" title="Compartilhar no WhatsApp"><span className="material-icons text-xl">share</span></button>
                              <button onClick={() => onEdit(record)} className="w-11 h-11 flex items-center justify-center text-indigo-600 bg-indigo-50 rounded-2xl active:scale-90" title="Editar Culto"><span className="material-icons text-xl">edit</span></button>
                              <button onClick={() => setItemToDelete(record.id)} className="w-11 h-11 flex items-center justify-center text-rose-500 bg-rose-50 rounded-2xl active:scale-90" title="Deletar Registro"><span className="material-icons text-xl">delete_outline</span></button>
                            </div>
                          </div>

                          {badge && (
                            <div className={`w-full py-2.5 px-4 ${badge.bg} ${badge.border} border rounded-xl flex items-center gap-2.5 shadow-sm`}>
                              <span className="text-base leading-none">{badge.emoji}</span>
                              <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${badge.textColor}`}>Culto de {badge.label}</span>
                            </div>
                          )}

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <InfoTag label="Portão" value={record.roles.gate} icon="door_front" roleId="gate" />
                            <InfoTag label="Louvor" value={record.roles.praise} icon="music_note" roleId="praise" />
                            <InfoTag label="Palavra" value={record.roles.word} icon="record_voice_over" roleId="word" />
                            <InfoTag label="Texto" value={record.roles.word === 'TRANSMISSÃO' ? 'SATÉLITE' : record.roles.scripture} icon="auto_stories" roleId="scripture" />
                          </div>

                          {att && (
                             <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/50">
                               {record.description === 'EBD' ? (
                                 <div className="flex flex-wrap gap-x-6 gap-y-2">
                                   <div className="flex flex-col">
                                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Membros</span>
                                     <span className="text-[10px] font-black text-slate-700">A: {att.ebdMembersAdult || 0} / C: {att.ebdMembersCias || 0}</span>
                                   </div>
                                   <div className="flex flex-col">
                                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Visitantes</span>
                                     <span className="text-[10px] font-black text-slate-700">A: {att.ebdVisitorsAdult || 0} / C: {att.ebdVisitorsCias || 0}</span>
                                   </div>
                                 </div>
                               ) : (
                                 <div className="flex gap-6">
                                   <div className="flex flex-col">
                                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Membros</span>
                                     <span className="text-[10px] font-black text-slate-700">{att.members || 0}</span>
                                   </div>
                                   <div className="flex flex-col">
                                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Visitantes</span>
                                     <span className="text-[10px] font-black text-slate-700">{att.visitors || 0}</span>
                                   </div>
                                 </div>
                               )}
                             </div>
                          )}

                          {record.songs.length > 0 && (
                            <div className="mt-2 pt-5 border-t border-slate-50">
                              <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] block mb-3">Louvores do Culto</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                                {record.songs.map((song, i) => (
                                  <div key={i} className="flex items-start gap-3">
                                    <span className="text-[10px] font-black text-indigo-300 mt-0.5">{(i + 1).toString().padStart(2, '0')}</span>
                                    <span className="text-[11px] font-bold text-slate-600 uppercase leading-tight">{song}</span>
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
            ))
          )}
        </>
      ) : (
        /* VISTA DE LACUNAS E ALERTAS DE DATA/CAMPOS */
        <div className="space-y-10">
          {/* LACUNAS DE DATAS (CALENDÁRIO) */}
          <div className="bg-white rounded-[2.5rem] shadow-xl p-8 md:p-10 border border-slate-100">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-left">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2.5">
                    <span className="material-icons text-amber-500">calendar_today</span>
                    Dias sem Culto Registrado (Histórico: {alertsAndGaps.maxDays} dias)
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                    Datas esperadas no calendário padrão de cultos que estão totalmente vazias
                  </p>
                </div>
                {alertsAndGaps.ignoredCount > 0 && (
                  <button
                    onClick={handleClearIgnoredGaps}
                    className="self-start sm:self-center flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200/60 rounded-xl text-[8px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all shadow-xs"
                    title="Reexibir datas ignoradas"
                  >
                    <span className="material-icons text-xs">restore</span>
                    Reexibir {alertsAndGaps.ignoredCount} Cultos Ocultos
                  </button>
                )}
              </div>

              {alertsAndGaps.calendarGaps.length === 0 ? (
                <div className="p-8 bg-emerald-50 border border-emerald-100 rounded-[2rem] text-center text-emerald-700 font-bold text-xs uppercase tracking-wide">
                  ✨ Tudo sob controle! Todos os dias litúrgicos do histórico ({alertsAndGaps.maxDays} dias) possuem pelo menos um registro.
                </div>
              ) : (
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                  {alertsAndGaps.calendarGaps.map((gap, idx) => (
                    <div key={idx} className="bg-[#fffbeb] border border-amber-100/70 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all animate-scaleUp">
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-xl flex flex-col items-center justify-center font-black text-xs font-mono shrink-0 border border-amber-500/20">
                          <span className="text-[14px] leading-tight font-black">{gap.date.split('-')[2]}</span>
                          <span className="text-[7.5px] leading-none uppercase font-black opacity-85">
                            {monthNames[new Date(gap.date + 'T12:00:00').getMonth()].substring(0, 3)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-black text-slate-800 uppercase tracking-tight">
                              {gap.dayName}
                            </p>
                            <span className="text-[8px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                              Sem Registro
                            </span>
                          </div>
                          <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                            Não há nenhum relatório cadastrado para este dia litúrgico ({gap.formattedDate})
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0 w-full sm:w-auto mt-1 sm:mt-0">
                        {onRegisterGap && (
                          <button
                            onClick={() => onRegisterGap(gap.date, gap.type)}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm transition-all hover:scale-[1.02] active:scale-95"
                          >
                            <span className="material-icons text-xs text-white">add</span>
                            Registrar
                          </button>
                        )}
                        <button
                          onClick={() => handleIgnoreGap(gap.date, gap.type)}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all active:scale-95"
                        >
                          <span className="material-icons text-xs text-slate-500">visibility_off</span>
                          Ignorar dia
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* DADOS FALTANTES NOS REGISTROS EXISTENTES */}
          <div className="bg-white rounded-[2.5rem] shadow-xl p-8 md:p-10 border border-slate-100">
            <div className="space-y-6">
              <div className="text-left">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2.5">
                  <span className="material-icons text-rose-500 animate-pulse">error_outline</span>
                  Inconsistências / Informação Pendente por Culto
                </h3>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                  Registros já efetuados que estão sem preenchimento de hinos ou com obreiros obrigatórios ausentes
                </p>
              </div>

              {alertsAndGaps.recordCompleteness.length === 0 ? (
                <div className="p-8 bg-emerald-50 border border-emerald-100 rounded-[2rem] text-center text-emerald-700 font-bold text-xs uppercase tracking-wide">
                  ✨ Parabéns! Não há inconsistências ou campos em branco nos cultos registrados.
                </div>
              ) : (
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                  {alertsAndGaps.recordCompleteness.map((item, idx) => {
                    const r = item.record;
                    const d = new Date(r.date + 'T12:00:00');
                    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                    return (
                      <div key={r.id || idx} className="bg-rose-50/20 border border-rose-100 rounded-[2rem] p-6 flex flex-col gap-4 shadow-sm animate-scaleUp">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex flex-col items-center justify-center font-black">
                              <span className="text-xs font-black text-indigo-600 leading-none">{d.getDate()}</span>
                              <span className="text-[7px] font-black text-slate-400 uppercase">{dayOfWeekNamesShort[d.getDay()]}</span>
                            </div>
                            <div>
                              <h4 className="font-black text-slate-900 text-xs sm:text-sm uppercase tracking-tight">{r.description}</h4>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{dateStr}</p>
                            </div>
                          </div>
                          <div>
                            <button 
                              onClick={() => onEdit(r)} 
                              className="p-2 text-indigo-600 hover:bg-white rounded-xl shadow-xs transition-all focus:outline-none flex items-center justify-center bg-indigo-50 border border-indigo-100" 
                              title="Editar para Completar Dados"
                            >
                              <span className="material-icons text-sm mr-1">edit</span>
                              <span className="text-[8px] font-black uppercase tracking-wider">Completar</span>
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5 pl-2 border-l-2 border-rose-200">
                          {item.issues.map((issue, issueIdx) => (
                            <div key={issueIdx} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              <p className="text-[10px] font-bold text-rose-700 uppercase tracking-tight">{issue}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE COMPARTILHAMENTO MENSAL */}
      {showShareOptions && (
        <div className="fixed inset-0 z-[8000] flex flex-col justify-end animate-fadeIn">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowShareOptions(false)} />
          <div className="relative bg-white rounded-t-[3.5rem] p-10 pb-12 shadow-2xl animate-slideUp max-h-[80vh] flex flex-col">
            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8 shrink-0"></div>
            <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tighter text-center">Opções de Envio</h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              <button onClick={() => handleWhatsAppShare("HISTÓRICO COMPLETO", history)} className="w-full p-6 bg-indigo-600 text-white rounded-3xl flex items-center justify-between shadow-xl active:scale-[0.98]">
                <span className="font-black text-xs uppercase tracking-widest">Enviar Todo o Histórico</span>
                <span className="material-icons">history</span>
              </button>
              <div className="pt-4 pb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Por Mês</span>
              </div>
              {(Object.entries(groupedHistory) as [string, ServiceRecord[]][]).map(([month, records]) => (
                <button key={month} onClick={() => handleWhatsAppShare(month, records)} className="w-full p-5 bg-slate-50 border border-slate-100 text-slate-700 rounded-2xl flex items-center justify-between active:scale-[0.98]">
                  <span className="font-bold text-sm">{month}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400">{records.length} cultos</span>
                    <span className="material-icons text-emerald-500">whatsapp</span>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowShareOptions(false)} className="mt-6 w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest bg-slate-50 rounded-2xl hover:bg-slate-100">FECHAR</button>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE APAGAR REGISTRO */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[8000] flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setItemToDelete(null)} />
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
