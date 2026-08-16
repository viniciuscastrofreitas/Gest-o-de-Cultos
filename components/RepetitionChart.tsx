import React, { useMemo, useState } from 'react';
import { ServiceRecord, SongStats } from '../types';

interface Props {
  history: ServiceRecord[];
  songStats: Record<string, SongStats>;
  fullSongList?: string[];
}

type PeriodFilter = 'all' | 'year' | '90d' | '30d';
type CategoryFilter = 'all' | 'principais' | 'cias' | 'clamor';

interface TierData {
  id: string;
  name: string;
  shortName: string;
  rangeLabel: string;
  colorHex: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  badgeClass: string;
  songs: { song: string; count: number }[];
  songCount: number;
  totalExecutions: number;
  songPercentage: number;
  executionPercentage: number;
}

export const RepetitionChart: React.FC<Props> = ({ history, songStats, fullSongList = [] }) => {
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [tierSearch, setTierSearch] = useState('');
  const [isChartExpanded, setIsChartExpanded] = useState(true);

  const extractNumber = (song: string): number | null => {
    const match = song.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  const isClamorSong = (song: string): boolean => {
    const isCias = song.startsWith('(CIAS)');
    const num = extractNumber(song);
    if (num === null) return false;
    return isCias ? (num >= 1 && num <= 13) : (num >= 1 && num <= 56);
  };

  // Filter records by period
  const filteredRecords = useMemo(() => {
    if (period === 'all') return history;
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    let minDate: Date;
    if (period === 'year') {
      minDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    } else if (period === '90d') {
      minDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else {
      // 30d
      minDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const minDateStr = minDate.toISOString().split('T')[0];
    return history.filter(r => r.date >= minDateStr);
  }, [history, period]);

  // Aggregate songs frequency based on filtered records & category
  const metrics = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalSongsSung = 0;

    filteredRecords.forEach(record => {
      record.songs.forEach(song => {
        // Filter by category
        if (category === 'principais' && (song.startsWith('(CIAS)') || isClamorSong(song))) return;
        if (category === 'cias' && (!song.startsWith('(CIAS)') || isClamorSong(song))) return;
        if (category === 'clamor' && !isClamorSong(song)) return;

        counts[song] = (counts[song] || 0) + 1;
        totalSongsSung++;
      });
    });

    const songEntries = Object.entries(counts).map(([song, count]) => ({ song, count }));
    const uniqueSongsCount = songEntries.length;

    // Repetition rate formula:
    // Repeated executions = total executions - unique songs count
    // Repetition index (%) = (repeated executions / total executions) * 100
    const repeatedExecutions = Math.max(0, totalSongsSung - uniqueSongsCount);
    const repetitionRate = totalSongsSung > 0 ? (repeatedExecutions / totalSongsSung) * 100 : 0;
    const diversityRate = totalSongsSung > 0 ? (uniqueSongsCount / totalSongsSung) * 100 : 0;
    const averagePerSong = uniqueSongsCount > 0 ? totalSongsSung / uniqueSongsCount : 0;

    // Categorize into repetition tiers
    const tier1: { song: string; count: number }[] = []; // 1 vez
    const tier2: { song: string; count: number }[] = []; // 2 a 3 vezes
    const tier3: { song: string; count: number }[] = []; // 4 a 6 vezes
    const tier4: { song: string; count: number }[] = []; // 7 a 10 vezes
    const tier5: { song: string; count: number }[] = []; // 11+ vezes

    songEntries.forEach(item => {
      if (item.count === 1) tier1.push(item);
      else if (item.count <= 3) tier2.push(item);
      else if (item.count <= 6) tier3.push(item);
      else if (item.count <= 10) tier4.push(item);
      else tier5.push(item);
    });

    // Sort songs inside tiers by count desc, then alphabetically
    const sortSongs = (arr: { song: string; count: number }[]) => 
      arr.sort((a, b) => b.count - a.count || a.song.localeCompare(b.song, undefined, { numeric: true }));

    sortSongs(tier1);
    sortSongs(tier2);
    sortSongs(tier3);
    sortSongs(tier4);
    sortSongs(tier5);

    const makeTierData = (
      id: string,
      name: string,
      shortName: string,
      rangeLabel: string,
      colorHex: string,
      bgClass: string,
      textClass: string,
      borderClass: string,
      badgeClass: string,
      songs: { song: string; count: number }[]
    ): TierData => {
      const execs = songs.reduce((sum, s) => sum + s.count, 0);
      return {
        id,
        name,
        shortName,
        rangeLabel,
        colorHex,
        bgClass,
        textClass,
        borderClass,
        badgeClass,
        songs,
        songCount: songs.length,
        totalExecutions: execs,
        songPercentage: uniqueSongsCount > 0 ? (songs.length / uniqueSongsCount) * 100 : 0,
        executionPercentage: totalSongsSung > 0 ? (execs / totalSongsSung) * 100 : 0,
      };
    };

    const tiers: TierData[] = [
      makeTierData('tier1', 'Sem Repetição (1x)', '1 vez', 'Cantados apenas 1 vez', '#8b5cf6', 'bg-violet-500', 'text-violet-600', 'border-violet-100', 'bg-violet-50 text-violet-700', tier1),
      makeTierData('tier2', 'Baixa Repetição (2-3x)', '2 a 3x', 'Cantados de 2 a 3 vezes', '#3b82f6', 'bg-blue-500', 'text-blue-600', 'border-blue-100', 'bg-blue-50 text-blue-700', tier2),
      makeTierData('tier3', 'Repetição Moderada (4-6x)', '4 a 6x', 'Cantados de 4 a 6 vezes', '#10b981', 'bg-emerald-500', 'text-emerald-600', 'border-emerald-100', 'bg-emerald-50 text-emerald-700', tier3),
      makeTierData('tier4', 'Alta Repetição (7-10x)', '7 a 10x', 'Cantados de 7 a 10 vezes', '#f59e0b', 'bg-amber-500', 'text-amber-600', 'border-amber-100', 'bg-amber-50 text-amber-700', tier4),
      makeTierData('tier5', 'Super Executados (11x+)', '11x ou mais', 'Cantados 11 ou mais vezes', '#f43f5e', 'bg-rose-500', 'text-rose-600', 'border-rose-100', 'bg-rose-50 text-rose-700', tier5),
    ];

    // Top 10 concentration
    const sortedAll = [...songEntries].sort((a, b) => b.count - a.count);
    const top10 = sortedAll.slice(0, 10);
    const top10Execs = top10.reduce((acc, s) => acc + s.count, 0);
    const top10Percentage = totalSongsSung > 0 ? (top10Execs / totalSongsSung) * 100 : 0;

    return {
      totalSongsSung,
      uniqueSongsCount,
      repeatedExecutions,
      repetitionRate,
      diversityRate,
      averagePerSong,
      tiers,
      top10,
      top10Execs,
      top10Percentage,
      totalServices: filteredRecords.length,
    };
  }, [filteredRecords, category]);

  // Donut SVG calculations
  const donutSlices = useMemo(() => {
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    let accumulatedOffset = 0;

    return metrics.tiers.map(tier => {
      const sliceLength = (tier.executionPercentage / 100) * circumference;
      const strokeDasharray = `${sliceLength} ${circumference - sliceLength}`;
      const strokeDashoffset = -accumulatedOffset;
      accumulatedOffset += sliceLength;

      return {
        ...tier,
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [metrics.tiers]);

  // Selected tier song list filtered by search
  const selectedTier = useMemo(() => {
    return metrics.tiers.find(t => t.id === selectedTierId) || null;
  }, [metrics.tiers, selectedTierId]);

  const filteredTierSongs = useMemo(() => {
    if (!selectedTier) return [];
    if (!tierSearch.trim()) return selectedTier.songs;
    const term = tierSearch.toLowerCase();
    return selectedTier.songs.filter(s => s.song.toLowerCase().includes(term));
  }, [selectedTier, tierSearch]);

  // Liturgical diagnosis based on repetition rate
  const diagnosis = useMemo(() => {
    const rate = metrics.repetitionRate;
    if (metrics.totalSongsSung === 0) {
      return {
        title: 'Sem Dados Suficientes',
        badge: 'Sem dados',
        badgeClass: 'bg-slate-100 text-slate-600',
        color: 'text-slate-500',
        text: 'Nenhum culto com louvores registrados neste período e categoria selecionados.',
      };
    }
    if (rate >= 70) {
      return {
        title: 'Altíssima Repetição (Repertório Muito Fechado)',
        badge: 'Super Concentrado',
        badgeClass: 'bg-rose-100 text-rose-700 border-rose-200',
        color: 'text-rose-600',
        text: `Mais de ${rate.toFixed(1)}% das execuções são repetições. A igreja tem um repertório de louvores bastante fixo e compacto, cantando pouca variedade de hinos distintos.`,
      };
    }
    if (rate >= 55) {
      return {
        title: 'Repetição Alta / Foco em Fixação',
        badge: 'Focado / Habitual',
        badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
        color: 'text-amber-600',
        text: `${rate.toFixed(1)}% dos hinos cantados são repetições. Há um bom padrão de fixação que facilita o canto congregacional, mas vale avaliar se há novos hinos a explorar.`,
      };
    }
    if (rate >= 40) {
      return {
        title: 'Repetição Equilibrada',
        badge: 'Equilíbrio Saudável',
        badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        color: 'text-emerald-600',
        text: `Equilíbrio saudável (${rate.toFixed(1)}% de repetição). A igreja consegue manter hinos conhecidos sem deixar de trazer variedade regular ao repertório dos cultos.`,
      };
    }
    return {
      title: 'Alta Rotatividade (Pouca Repetição)',
      badge: 'Muito Variado',
      badgeClass: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      color: 'text-indigo-600',
      text: `Taxa de repetição de apenas ${rate.toFixed(1)}%. A igreja canta uma quantidade muito grande de hinos diferentes, com pouca reincidência no período.`,
    };
  }, [metrics]);

  return (
    <div className="bg-white rounded-[3rem] shadow-2xl p-8 md:p-12 border border-slate-100 space-y-8 animate-fadeIn">
      {/* HEADER PRINCIPAL */}
      <button 
        onClick={() => setIsChartExpanded(!isChartExpanded)}
        className="w-full flex items-center justify-between text-left focus:outline-none"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600">
            <span className="material-icons text-2xl">pie_chart</span>
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase">
              Índice Geral de Repetição
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
              Análise de frequência, reutilização e concentração de louvores
            </p>
          </div>
        </div>
        <span className={`material-icons text-slate-300 transition-transform duration-300 ${isChartExpanded ? 'rotate-180 text-indigo-600' : ''}`}>
          expand_more
        </span>
      </button>

      {isChartExpanded && (
        <div className="space-y-8 animate-scaleUp">
          {/* BARRA DE FILTROS (PERÍODO & CATEGORIA) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
            {/* Filtro de Período */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2 shrink-0">
                Período:
              </span>
              {(
                [
                  { id: 'all', label: 'Todo Histórico' },
                  { id: 'year', label: `Ano ${new Date().getFullYear()}` },
                  { id: '90d', label: 'Últimos 90d' },
                  { id: '30d', label: 'Últimos 30d' },
                ] as const
              ).map(p => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                    period === p.id 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800 bg-white/70 border border-slate-200/50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Filtro de Categoria */}
            <div className="flex items-center gap-1 overflow-x-auto">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2 shrink-0">
                Tipo:
              </span>
              {(
                [
                  { id: 'all', label: 'Todos' },
                  { id: 'principais', label: 'Principais' },
                  { id: 'cias', label: 'CIAS' },
                  { id: 'clamor', label: 'Clamor' },
                ] as const
              ).map(c => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                    category === c.id 
                      ? 'bg-slate-900 text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800 bg-white/70 border border-slate-200/50'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* INDICADORES EM NÚMEROS (CARDS PRINCIPAIS) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-100 rounded-3xl p-5 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600">Índice Repetição</span>
                <span className="material-icons text-indigo-500 text-sm">repeat</span>
              </div>
              <p className="text-2xl md:text-3xl font-black text-indigo-900 tracking-tight mt-2">
                {metrics.repetitionRate.toFixed(1)}%
              </p>
              <p className="text-[8px] font-bold text-indigo-500 uppercase tracking-wider mt-1">
                {metrics.repeatedExecutions} repetições de hinos
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Atos de Louvor</span>
                <span className="material-icons text-slate-400 text-sm">music_note</span>
              </div>
              <p className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight mt-2">
                {metrics.totalSongsSung}
              </p>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                Em {metrics.totalServices} cultos avaliados
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Hinos Únicos</span>
                <span className="material-icons text-slate-400 text-sm">queue_music</span>
              </div>
              <p className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight mt-2">
                {metrics.uniqueSongsCount}
              </p>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                Média {metrics.averagePerSong.toFixed(1)}x por hino
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Top 10 Cantados</span>
                <span className="material-icons text-amber-500 text-sm">star</span>
              </div>
              <p className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight mt-2">
                {metrics.top10Percentage.toFixed(1)}%
              </p>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                Do total de execuções
              </p>
            </div>
          </div>

          {/* PAINEL GRÁFICO: DONUT SVG + FAIXAS DE FREQUÊNCIA */}
          <div className="bg-slate-50/60 border border-slate-100 rounded-[2.5rem] p-6 md:p-8">
            <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
              {/* DONUT CHART SVG */}
              <div className="flex flex-col items-center justify-center shrink-0">
                <div className="relative w-48 h-48 md:w-56 md:h-56 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                    {/* Background circle track */}
                    <circle
                      cx="100"
                      cy="100"
                      r="70"
                      fill="transparent"
                      stroke="#e2e8f0"
                      strokeWidth="22"
                    />
                    {/* Slices for each tier */}
                    {donutSlices.map(slice => {
                      if (slice.executionPercentage === 0) return null;
                      return (
                        <circle
                          key={slice.id}
                          cx="100"
                          cy="100"
                          r="70"
                          fill="transparent"
                          stroke={slice.colorHex}
                          strokeWidth="22"
                          strokeDasharray={slice.strokeDasharray}
                          strokeDashoffset={slice.strokeDashoffset}
                          className="transition-all duration-700 hover:opacity-80 cursor-pointer"
                          onClick={() => setSelectedTierId(selectedTierId === slice.id ? null : slice.id)}
                        />
                      );
                    })}
                  </svg>

                  {/* Centered Donut Label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-tight">
                      Taxa de Repetição
                    </span>
                    <span className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter mt-0.5">
                      {metrics.repetitionRate.toFixed(1)}%
                    </span>
                    <span className={`text-[7.5px] font-black uppercase px-2 py-0.5 rounded-full mt-1 ${diagnosis.badgeClass}`}>
                      {diagnosis.badge}
                    </span>
                  </div>
                </div>

                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-3">
                  Distribuição por volume de culto
                </p>
              </div>

              {/* BARRAS DE DISTRIBUIÇÃO POR FAIXA DE REPETIÇÃO */}
              <div className="flex-1 w-full space-y-3.5">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Faixas de Frequência dos Louvores
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                    {metrics.uniqueSongsCount} hinos únicos
                  </span>
                </div>

                <div className="space-y-3">
                  {metrics.tiers.map(tier => {
                    const isSelected = selectedTierId === tier.id;
                    return (
                      <div 
                        key={tier.id}
                        onClick={() => setSelectedTierId(isSelected ? null : tier.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-white border-indigo-300 shadow-md ring-2 ring-indigo-500/20' 
                            : 'bg-white/80 border-slate-100 hover:bg-white hover:border-slate-200 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span 
                              className="w-3 h-3 rounded-full shrink-0" 
                              style={{ backgroundColor: tier.colorHex }}
                            />
                            <span className="text-xs font-black text-slate-800 uppercase tracking-tight truncate">
                              {tier.name}
                            </span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
                              ({tier.rangeLabel})
                            </span>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">
                              <strong className="text-slate-900 font-black">{tier.songCount}</strong> {tier.songCount === 1 ? 'hino' : 'hinos'}
                            </span>
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-md ${tier.badgeClass}`}>
                              {tier.totalExecutions} atos ({tier.executionPercentage.toFixed(1)}%)
                            </span>
                          </div>
                        </div>

                        {/* Barra de Progresso da Faixa */}
                        <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{ 
                              width: `${tier.executionPercentage}%`,
                              backgroundColor: tier.colorHex
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* DIAGNÓSTICO LITÚRGICO */}
          <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center shrink-0">
              <span className="material-icons text-xl">insights</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Diagnóstico da Igreja: {diagnosis.title}
                </h4>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                {diagnosis.text}
              </p>
              {metrics.top10.length > 0 && (
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-2">
                  📌 Os 10 hinos mais cantados concentram <span className="text-slate-900 font-black">{metrics.top10Percentage.toFixed(1)}%</span> de todos os louvores dos cultos.
                </p>
              )}
            </div>
          </div>

          {/* MODAL / LISTA EXPANSÍVEL DE LOUVORES DA FAIXA SELECIONADA */}
          {selectedTier && (
            <div className="bg-white border-2 border-indigo-100 rounded-[2.5rem] p-6 md:p-8 shadow-xl space-y-5 animate-scaleUp">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: selectedTier.colorHex }}
                  />
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                      Hinos na faixa: {selectedTier.name}
                    </h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      {selectedTier.songCount} {selectedTier.songCount === 1 ? 'louvor cadastrado' : 'louvores cadastrados'} • Total de {selectedTier.totalExecutions} execuções
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs">search</span>
                    <input 
                      type="text"
                      value={tierSearch}
                      onChange={e => setTierSearch(e.target.value)}
                      placeholder="Filtrar hinos..."
                      className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 w-40 sm:w-48"
                    />
                  </div>
                  <button 
                    onClick={() => { setSelectedTierId(null); setTierSearch(''); }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all"
                    title="Fechar lista"
                  >
                    <span className="material-icons text-sm">close</span>
                  </button>
                </div>
              </div>

              {filteredTierSongs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 font-bold text-xs uppercase tracking-wider">
                  Nenhum louvor encontrado para este filtro
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                  {filteredTierSongs.map(item => (
                    <div 
                      key={item.song}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100/70 transition-all"
                    >
                      <span className="text-xs font-black text-slate-800 uppercase tracking-tight truncate pr-2">
                        {item.song}
                      </span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg shrink-0 ${selectedTier.badgeClass}`}>
                        {item.count}x
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
