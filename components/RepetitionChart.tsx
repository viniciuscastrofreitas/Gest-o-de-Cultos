import React, { useMemo, useState } from 'react';
import { ServiceRecord, SongStats } from '../types';

interface Props {
  history: ServiceRecord[];
  songStats: Record<string, SongStats>;
  fullSongList?: string[];
}

type CategoryFilter = 'all' | 'principais' | 'cias' | 'clamor';
type MainTab = 'ano' | 'intervalos' | 'meses';

interface MonthlyData {
  monthKey: string;      // '2025-03'
  shortLabel: string;    // 'Mar/25'
  fullMonth: string;     // 'Março de 2025'
  year: number;
  monthNumber: number;   // 1-12
  servicesCount: number;
  totalExecutions: number;
  uniqueSongs: number;
  repeatedTimes: number; // totalExecutions - uniqueSongs
  repetitionRate: number; // %
  onceSongs: string[];   // cantados só 1x
  twiceSongs: string[];  // cantados 2x
  manySongs: { song: string; count: number }[]; // cantados 3x ou mais
}

interface YearCountGroup {
  times: number; // 1, 2, 3, 4, 5, 6 (6+)
  label: string;
  badge: string;
  badgeBg: string;
  borderColor: string;
  color: string;
  description: string;
  songs: { song: string; count: number; lastDate: string | null }[];
}

interface FastRepeatItem {
  song: string;
  firstDate: string;
  secondDate: string;
  daysInterval: number;
  servicesBetween: number;
}

export const RepetitionChart: React.FC<Props> = ({ history }) => {
  const [mainTab, setMainTab] = useState<MainTab>('ano');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [selectedTimesFilter, setSelectedTimesFilter] = useState<number | 'all'>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [fastSearchTerm, setFastSearchTerm] = useState('');
  const [fastIntervalFilter, setFastIntervalFilter] = useState<'all' | '7' | '15' | '30'>('all');

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

  // Anos disponíveis ordenados
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    history.forEach(r => {
      if (r.date) {
        const y = parseInt(r.date.substring(0, 4), 10);
        if (!isNaN(y)) years.add(y);
      }
    });
    if (years.size === 0) years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [history]);

  useMemo(() => {
    if (!availableYears.includes(selectedYear) && availableYears.length > 0) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  // =========================================================================
  // DADOS DE REPETIÇÃO EM MENOS DE 30 DIAS (TÓPICO 2)
  // =========================================================================
  const fastRepetitionData = useMemo(() => {
    // Cultos ordenados cronologicamente do mais antigo para o mais novo
    const sortedServices = [...history]
      .filter(r => r.date && r.date.startsWith(`${selectedYear}-`))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Mapa de todas as datas em que cada hino foi cantado no ano
    // { song: [ { date: '2025-01-05', serviceIndex: 0 }, ... ] }
    const songOccurrences: Record<string, { date: string; serviceIndex: number }[]> = {};
    let totalPraiseExecutionsInYear = 0;

    sortedServices.forEach((r, idx) => {
      r.songs.forEach(song => {
        if (category === 'principais' && (song.startsWith('(CIAS)') || isClamorSong(song))) return;
        if (category === 'cias' && (!song.startsWith('(CIAS)') || isClamorSong(song))) return;
        if (category === 'clamor' && !isClamorSong(song)) return;

        totalPraiseExecutionsInYear++;
        if (!songOccurrences[song]) {
          songOccurrences[song] = [];
        }
        songOccurrences[song].push({ date: r.date, serviceIndex: idx });
      });
    });

    const fastRepetitions: FastRepeatItem[] = [];
    const songsWithFastRepeat = new Set<string>();

    Object.entries(songOccurrences).forEach(([song, occurrences]) => {
      if (occurrences.length < 2) return;

      // Percorre as ocorrências consecutivas
      for (let i = 0; i < occurrences.length - 1; i++) {
        const d1 = new Date(occurrences[i].date + 'T12:00:00');
        const d2 = new Date(occurrences[i + 1].date + 'T12:00:00');
        const diffTime = d2.getTime() - d1.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 30 && diffDays >= 0) {
          const servicesBetween = Math.max(0, occurrences[i + 1].serviceIndex - occurrences[i].serviceIndex - 1);
          fastRepetitions.push({
            song,
            firstDate: occurrences[i].date,
            secondDate: occurrences[i + 1].date,
            daysInterval: diffDays,
            servicesBetween
          });
          songsWithFastRepeat.add(song);
        }
      }
    });

    // Ordenar por menor intervalo em dias e depois data mais recente
    fastRepetitions.sort((a, b) => a.daysInterval - b.daysInterval || b.secondDate.localeCompare(a.secondDate));

    const totalUniqueSongsInYear = Object.keys(songOccurrences).length;
    // Taxa de repetição rápida: porcentagem dos hinos únicos que repetiram em menos de 30 dias
    const fastRepeatRate = totalUniqueSongsInYear > 0 
      ? (songsWithFastRepeat.size / totalUniqueSongsInYear) * 100 
      : 0;

    // Taxa sobre execuções: quantas ocorrências foram repetições com menos de 30 dias
    const fastExecRate = totalPraiseExecutionsInYear > 0 
      ? (fastRepetitions.length / totalPraiseExecutionsInYear) * 100 
      : 0;

    // Contadores por faixa
    const under7Days = fastRepetitions.filter(item => item.daysInterval <= 7);
    const between8and15 = fastRepetitions.filter(item => item.daysInterval > 7 && item.daysInterval <= 15);
    const between16and30 = fastRepetitions.filter(item => item.daysInterval > 15 && item.daysInterval <= 30);

    return {
      fastRepetitions,
      songsWithFastRepeatCount: songsWithFastRepeat.size,
      totalUniqueSongsInYear,
      totalPraiseExecutionsInYear,
      fastRepeatRate,
      fastExecRate,
      under7DaysCount: under7Days.length,
      between8and15Count: between8and15.length,
      between16and30Count: between16and30.length
    };
  }, [history, selectedYear, category]);

  // Lista filtrada de repetições rápidas
  const displayedFastRepeats = useMemo(() => {
    let list = fastRepetitionData.fastRepetitions;

    if (fastIntervalFilter === '7') {
      list = list.filter(i => i.daysInterval <= 7);
    } else if (fastIntervalFilter === '15') {
      list = list.filter(i => i.daysInterval > 7 && i.daysInterval <= 15);
    } else if (fastIntervalFilter === '30') {
      list = list.filter(i => i.daysInterval > 15 && i.daysInterval <= 30);
    }

    if (!fastSearchTerm.trim()) return list;
    const term = fastSearchTerm.toLowerCase();
    return list.filter(i => i.song.toLowerCase().includes(term));
  }, [fastRepetitionData, fastIntervalFilter, fastSearchTerm]);

  // =========================================================================
  // DADOS DE TODOS OS MESES (TÓPICO 3 - MÊS A MÊS CONSOLIDADO)
  // =========================================================================
  const allMonthsData = useMemo(() => {
    const monthMap = new Map<string, {
      services: ServiceRecord[];
      songCounts: Record<string, number>;
    }>();

    history.forEach(r => {
      if (!r.date) return;
      const key = r.date.substring(0, 7);

      if (!monthMap.has(key)) {
        monthMap.set(key, { services: [], songCounts: {} });
      }

      const m = monthMap.get(key)!;
      m.services.push(r);

      r.songs.forEach(song => {
        if (category === 'principais' && (song.startsWith('(CIAS)') || isClamorSong(song))) return;
        if (category === 'cias' && (!song.startsWith('(CIAS)') || isClamorSong(song))) return;
        if (category === 'clamor' && !isClamorSong(song)) return;

        m.songCounts[song] = (m.songCounts[song] || 0) + 1;
      });
    });

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const fullNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    const sortedKeys = Array.from(monthMap.keys()).sort();

    const list: MonthlyData[] = sortedKeys.map(key => {
      const [yStr, mStr] = key.split('-');
      const year = parseInt(yStr, 10);
      const mIdx = parseInt(mStr, 10) - 1;
      const entry = monthMap.get(key)!;

      let totalExecutions = 0;
      const onceSongs: string[] = [];
      const twiceSongs: string[] = [];
      const manySongs: { song: string; count: number }[] = [];

      Object.entries(entry.songCounts).forEach(([song, count]) => {
        totalExecutions += count;
        if (count === 1) onceSongs.push(song);
        else if (count === 2) twiceSongs.push(song);
        else manySongs.push({ song, count });
      });

      manySongs.sort((a, b) => b.count - a.count);

      const uniqueSongs = Object.keys(entry.songCounts).length;
      const repeatedTimes = Math.max(0, totalExecutions - uniqueSongs);
      const repetitionRate = totalExecutions > 0 ? (repeatedTimes / totalExecutions) * 100 : 0;

      return {
        monthKey: key,
        shortLabel: `${monthNames[mIdx]}/${yStr.substring(2)}`,
        fullMonth: `${fullNames[mIdx]} de ${year}`,
        year,
        monthNumber: mIdx + 1,
        servicesCount: entry.services.length,
        totalExecutions,
        uniqueSongs,
        repeatedTimes,
        repetitionRate,
        onceSongs,
        twiceSongs,
        manySongs
      };
    });

    return list;
  }, [history, category]);

  // Mês selecionado para visualização no Tópico 3
  const activeMonth = useMemo(() => {
    if (allMonthsData.length === 0) return null;
    if (selectedMonthKey) {
      const found = allMonthsData.find(m => m.monthKey === selectedMonthKey);
      if (found) return found;
    }
    return allMonthsData[allMonthsData.length - 1];
  }, [allMonthsData, selectedMonthKey]);

  // =========================================================================
  // DADOS DO ANO SELECIONADO (TÓPICO 1)
  // =========================================================================
  const yearlyData = useMemo(() => {
    const yearRecords = history.filter(r => r.date && r.date.startsWith(`${selectedYear}-`));
    const songMap: Record<string, { count: number; lastDate: string | null }> = {};
    let totalExecs = 0;

    yearRecords.forEach(r => {
      r.songs.forEach(song => {
        if (category === 'principais' && (song.startsWith('(CIAS)') || isClamorSong(song))) return;
        if (category === 'cias' && (!song.startsWith('(CIAS)') || isClamorSong(song))) return;
        if (category === 'clamor' && !isClamorSong(song)) return;

        totalExecs++;
        if (!songMap[song]) {
          songMap[song] = { count: 1, lastDate: r.date };
        } else {
          songMap[song].count++;
          if (!songMap[song].lastDate || r.date > songMap[song].lastDate!) {
            songMap[song].lastDate = r.date;
          }
        }
      });
    });

    const groups: Record<number, { song: string; count: number; lastDate: string | null }[]> = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: []
    };

    Object.entries(songMap).forEach(([song, data]) => {
      if (data.count >= 6) {
        groups[6].push({ song, ...data });
      } else {
        groups[data.count].push({ song, ...data });
      }
    });

    [1, 2, 3, 4, 5, 6].forEach(k => {
      groups[k].sort((a, b) => b.count - a.count || a.song.localeCompare(b.song, undefined, { numeric: true }));
    });

    const uniqueCount = Object.keys(songMap).length;
    const repeated = Math.max(0, totalExecs - uniqueCount);
    const overallRate = totalExecs > 0 ? (repeated / totalExecs) * 100 : 0;

    const countGroups: YearCountGroup[] = [
      {
        times: 1,
        label: '1 vez',
        badge: '1x',
        badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        borderColor: 'border-indigo-400',
        color: '#6366f1',
        description: 'Cantados em apenas 1 culto',
        songs: groups[1]
      },
      {
        times: 2,
        label: '2 vezes',
        badge: '2x',
        badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
        borderColor: 'border-sky-400',
        color: '#0ea5e9',
        description: 'Cantados em 2 cultos',
        songs: groups[2]
      },
      {
        times: 3,
        label: '3 vezes',
        badge: '3x',
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        borderColor: 'border-emerald-400',
        color: '#10b981',
        description: 'Cantados em 3 cultos',
        songs: groups[3]
      },
      {
        times: 4,
        label: '4 vezes',
        badge: '4x',
        badgeBg: 'bg-teal-50 text-teal-700 border-teal-200',
        borderColor: 'border-teal-400',
        color: '#14b8a6',
        description: 'Cantados em 4 cultos',
        songs: groups[4]
      },
      {
        times: 5,
        label: '5 vezes',
        badge: '5x',
        badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
        borderColor: 'border-amber-400',
        color: '#f59e0b',
        description: 'Cantados em 5 cultos',
        songs: groups[5]
      },
      {
        times: 6,
        label: '6x ou +',
        badge: '6x+',
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
        borderColor: 'border-rose-400',
        color: '#f43f5e',
        description: 'Cantados 6x ou mais',
        songs: groups[6]
      }
    ];

    return {
      servicesCount: yearRecords.length,
      totalExecs,
      uniqueCount,
      repeated,
      overallRate,
      countGroups
    };
  }, [history, selectedYear, category]);

  // Lista do grupo anual filtrado
  const displayedYearSongs = useMemo(() => {
    let list: { song: string; count: number; lastDate: string | null }[] = [];
    if (selectedTimesFilter === 'all') {
      yearlyData.countGroups.forEach(g => {
        list = list.concat(g.songs);
      });
    } else {
      const g = yearlyData.countGroups.find(item => item.times === selectedTimesFilter);
      if (g) list = g.songs;
    }

    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(s => s.song.toLowerCase().includes(term));
  }, [yearlyData, selectedTimesFilter, searchTerm]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="w-full max-w-full overflow-hidden space-y-4 sm:space-y-6 animate-fadeIn">
      {/* 1. HEADER PRINCIPAL - RESPONSIVO E SEGURO NO MOBILE */}
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-md sm:shadow-xl p-4 sm:p-6 border border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-md shadow-indigo-600/30 shrink-0">
              <span className="material-icons text-xl sm:text-2xl">repeat</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-black text-slate-900 tracking-tight uppercase truncate">
                Taxa de Repetição
              </h2>
              <p className="text-[11px] text-slate-500 font-semibold truncate">
                Análise anual, repetições rápidas e visão mensal
              </p>
            </div>
          </div>

          {/* Filtro de Categoria */}
          <div className="w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-max">
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
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${
                    category === c.id
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO ENTRE ABAS */}
        {/* 1. Geral Ano | 2. &lt; 30 Dias | 3. Mês a Mês */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-3 sm:mt-4">
          <button
            onClick={() => setMainTab('ano')}
            className={`py-2.5 px-1 sm:px-3 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-center ${
              mainTab === 'ano'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <span className="material-icons text-base sm:text-lg">format_list_numbered</span>
            <span className="truncate">1. Geral Ano</span>
          </button>

          <button
            onClick={() => setMainTab('intervalos')}
            className={`py-2.5 px-1 sm:px-3 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-center relative ${
              mainTab === 'intervalos'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-rose-50/60 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
            }`}
          >
            <span className="material-icons text-base sm:text-lg">timer</span>
            <span className="truncate">2. &lt; 30 Dias</span>
            {fastRepetitionData.fastRepetitions.length > 0 && (
              <span className={`hidden sm:inline-block px-1.5 py-0.2 rounded-full text-[8px] font-black ${
                mainTab === 'intervalos' ? 'bg-white text-rose-600' : 'bg-rose-600 text-white'
              }`}>
                {fastRepetitionData.fastRepetitions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setMainTab('meses')}
            className={`py-2.5 px-1 sm:px-3 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-center ${
              mainTab === 'meses'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <span className="material-icons text-base sm:text-lg">calendar_month</span>
            <span className="truncate">3. Mês a Mês</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: GERAL DO ANO (PRIMEIRA E PRINCIPAL)                                */}
      {/* ========================================================================= */}
      {mainTab === 'ano' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-md sm:shadow-xl p-4 sm:p-6 border border-slate-100 space-y-4 sm:space-y-6 animate-scaleUp">
          {/* Seletor de Ano + Métricas em grid compacta */}
          <div className="flex flex-col gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Ano:
              </span>
              <div className="flex items-center gap-1 overflow-x-auto">
                {availableYears.map(y => (
                  <button
                    key={y}
                    onClick={() => { setSelectedYear(y); setSelectedTimesFilter(1); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 ${
                      selectedYear === y
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>

            {/* 3 Métricas Compactas em Grid Mobile */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
              <div className="min-w-0">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block truncate">Cultos</span>
                <strong className="text-slate-900 font-black text-sm">{yearlyData.servicesCount}</strong>
              </div>
              <div className="border-x border-slate-200 min-w-0">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block truncate">Total Cantado</span>
                <strong className="text-slate-900 font-black text-sm">{yearlyData.totalExecs}</strong>
              </div>
              <div className="min-w-0">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block truncate">Hinos Únicos</span>
                <strong className="text-indigo-600 font-black text-sm">{yearlyData.uniqueCount}</strong>
              </div>
            </div>
          </div>

          {/* CARD DE DESTAQUE: TAXA DE REPETIÇÃO GERAL DO ANO (SEM OVERFLOW) */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg relative overflow-hidden">
            <div className="relative z-10 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-indigo-300 text-[8px] sm:text-[9px] font-black uppercase tracking-widest mb-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                    Consolidado
                  </div>
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-white">
                    Taxa Geral de {selectedYear}
                  </h3>
                  <p className="text-[11px] text-slate-300 font-medium leading-tight mt-0.5 max-w-xs">
                    <strong>{yearlyData.repeated} repetições</strong> de um total de <strong>{yearlyData.totalExecs} louvores</strong> cantados.
                  </p>
                </div>

                {/* Caixa da Porcentagem Geral */}
                <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 border border-white/15 text-center shrink-0 min-w-[76px] sm:min-w-[90px]">
                  <span className="text-2xl sm:text-4xl font-black text-white tracking-tight block leading-none">
                    {yearlyData.overallRate.toFixed(1)}%
                  </span>
                  <span className="text-[7.5px] sm:text-[8px] font-black text-indigo-300 uppercase tracking-wider block mt-1">
                    Repetição
                  </span>
                </div>
              </div>

              {/* Barra de Progresso Visual Proporcional */}
              <div className="pt-2 border-t border-white/10">
                <div className="flex items-center justify-between text-[9px] font-black text-slate-300 mb-1">
                  <span>{yearlyData.uniqueCount} únicos ({((yearlyData.uniqueCount / (yearlyData.totalExecs || 1)) * 100).toFixed(0)}%)</span>
                  <span>{yearlyData.repeated} repetições ({yearlyData.overallRate.toFixed(0)}%)</span>
                </div>
                <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-emerald-400 transition-all duration-500" 
                    style={{ width: `${(yearlyData.uniqueCount / (yearlyData.totalExecs || 1)) * 100}%` }}
                    title="Hinos únicos"
                  />
                  <div 
                    className="h-full bg-indigo-400 transition-all duration-500" 
                    style={{ width: `${yearlyData.overallRate}%` }}
                    title="Repetições"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dica explicativa */}
          <p className="text-[11px] text-slate-600 font-bold">
            Toque nos blocos abaixo para ver os hinos de cada frequência:
          </p>

          {/* CARTÕES DE FREQUÊNCIA (1x, 2x, 3x, 4x, 5x, 6x+) */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {yearlyData.countGroups.map(g => {
              const isSelected = selectedTimesFilter === g.times;
              return (
                <button
                  key={g.times}
                  onClick={() => setSelectedTimesFilter(g.times)}
                  className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all active:scale-95 flex flex-col justify-between ${
                    isSelected
                      ? 'bg-white border-indigo-600 ring-2 ring-indigo-500 shadow-sm'
                      : 'bg-slate-50 border-slate-200/80 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                    <span className="text-[8px] font-black text-slate-400 uppercase">{g.badge}</span>
                  </div>
                  <div>
                    <h5 className="text-[10px] font-black text-slate-800 uppercase tracking-tight truncate">
                      {g.label}
                    </h5>
                    <p className="text-base sm:text-xl font-black text-slate-900 tracking-tight leading-none mt-0.5">
                      {g.songs.length}
                    </p>
                  </div>
                  <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider block mt-1 truncate">
                    {yearlyData.uniqueCount > 0 ? ((g.songs.length / yearlyData.uniqueCount) * 100).toFixed(0) : 0}% hinos
                  </span>
                </button>
              );
            })}
          </div>

          {/* LISTA DE HINOS DO BLOCO SELECIONADO */}
          <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-3 sm:p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
              <div className="min-w-0">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight truncate">
                  {selectedTimesFilter === 'all' 
                    ? `Todos os Louvores de ${selectedYear}` 
                    : `Cantados ${yearlyData.countGroups.find(g => g.times === selectedTimesFilter)?.label} em ${selectedYear}`}
                </h4>
                <p className="text-[9px] text-slate-500 font-semibold">
                  {displayedYearSongs.length} louvores listados
                </p>
              </div>

              {/* Busca rápida */}
              <div className="relative w-full sm:w-52">
                <span className="material-icons absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">search</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar hino..."
                  className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {displayedYearSongs.length === 0 ? (
              <div className="text-center py-6 text-slate-400 font-bold text-xs uppercase tracking-wider">
                Nenhum louvor encontrado
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-72 overflow-y-auto pr-0.5 custom-scrollbar">
                {displayedYearSongs.map(item => (
                  <div
                    key={item.song}
                    className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate block">
                        {item.song}
                      </span>
                      {item.lastDate && (
                        <span className="text-[8px] font-semibold text-slate-400 block mt-0.5">
                          Último: {formatDate(item.lastDate)}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 shrink-0">
                      {item.count}x
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: REPETIÇÃO EM MENOS DE 30 DIAS                                       */}
      {/* ========================================================================= */}
      {mainTab === 'intervalos' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-md sm:shadow-xl p-4 sm:p-6 border border-slate-100 space-y-4 sm:space-y-6 animate-scaleUp">
          {/* Cabeçalho do Tópico 2 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[9px] font-black uppercase tracking-widest mb-1 border border-rose-200">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                Alerta de Proximidade
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                Repetições em Menos de 30 Dias
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold">
                Louvores que voltaram a ser cantados em um curto intervalo de tempo em {selectedYear}
              </p>
            </div>

            {/* Seletor de Ano Rápido */}
            <div className="flex items-center gap-1 self-start sm:self-auto">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mr-1">Ano:</span>
              {availableYears.map(y => (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
                    selectedYear === y
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* CARD DE DESTAQUE: TAXA DE REPETIÇÃO RÁPIDA (&lt; 30 DIAS) */}
          <div className="bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg relative overflow-hidden">
            <div className="relative z-10 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[8.5px] font-black text-rose-300 uppercase tracking-widest block mb-1">
                    Taxa de Repetição em &lt; 30 Dias ({selectedYear})
                  </span>
                  <h4 className="text-sm sm:text-base font-black uppercase tracking-tight text-white">
                    {fastRepetitionData.songsWithFastRepeatCount} de {fastRepetitionData.totalUniqueSongsInYear} hinos únicos
                  </h4>
                  <p className="text-[11px] text-slate-300 font-medium leading-tight mt-0.5 max-w-sm">
                    <strong>{fastRepetitionData.fastRepetitions.length} episódios</strong> ocorreram onde o mesmo hino voltou ao repertório com 30 dias ou menos de intervalo.
                  </p>
                </div>

                {/* Porcentagem em Destaque */}
                <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 border border-white/15 text-center shrink-0 min-w-[80px] sm:min-w-[96px]">
                  <span className="text-2xl sm:text-4xl font-black text-white tracking-tight block leading-none">
                    {fastRepetitionData.fastRepeatRate.toFixed(1)}%
                  </span>
                  <span className="text-[7.5px] sm:text-[8px] font-black text-rose-300 uppercase tracking-wider block mt-1">
                    Taxa Rápida
                  </span>
                </div>
              </div>

              {/* Barra de Progresso Visual */}
              <div className="pt-2 border-t border-white/10">
                <div className="flex items-center justify-between text-[9px] font-black text-slate-300 mb-1">
                  <span>Espaçados &gt; 30 dias: {Math.max(0, fastRepetitionData.totalUniqueSongsInYear - fastRepetitionData.songsWithFastRepeatCount)} ({(100 - fastRepetitionData.fastRepeatRate).toFixed(0)}%)</span>
                  <span>Repetiram em &le; 30 dias: {fastRepetitionData.songsWithFastRepeatCount} ({fastRepetitionData.fastRepeatRate.toFixed(0)}%)</span>
                </div>
                <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-emerald-400 transition-all duration-500" 
                    style={{ width: `${100 - fastRepetitionData.fastRepeatRate}%` }}
                    title="Espaçados"
                  />
                  <div 
                    className="h-full bg-rose-500 transition-all duration-500" 
                    style={{ width: `${fastRepetitionData.fastRepeatRate}%` }}
                    title="Repetidos em < 30 dias"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3 CARDS DE FAIXAS DE INTERVALO (&lt;= 7 DIAS, 8-15 DIAS, 16-30 DIAS) */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setFastIntervalFilter(fastIntervalFilter === '7' ? 'all' : '7')}
              className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all active:scale-95 ${
                fastIntervalFilter === '7'
                  ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-400 shadow-xs'
                  : 'bg-slate-50 border-slate-200/80 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                <span className="text-[7.5px] sm:text-[8px] font-black text-rose-600 uppercase">Crítico</span>
              </div>
              <h5 className="text-[10px] font-black text-slate-800 uppercase tracking-tight truncate">
                &le; 7 dias
              </h5>
              <p className="text-base sm:text-xl font-black text-rose-700 tracking-tight leading-none mt-0.5">
                {fastRepetitionData.under7DaysCount}
              </p>
              <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider block mt-1">
                mesma semana
              </span>
            </button>

            <button
              onClick={() => setFastIntervalFilter(fastIntervalFilter === '15' ? 'all' : '15')}
              className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all active:scale-95 ${
                fastIntervalFilter === '15'
                  ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-400 shadow-xs'
                  : 'bg-slate-50 border-slate-200/80 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-[7.5px] sm:text-[8px] font-black text-amber-600 uppercase">Atenção</span>
              </div>
              <h5 className="text-[10px] font-black text-slate-800 uppercase tracking-tight truncate">
                8 a 15 dias
              </h5>
              <p className="text-base sm:text-xl font-black text-amber-700 tracking-tight leading-none mt-0.5">
                {fastRepetitionData.between8and15Count}
              </p>
              <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider block mt-1">
                em 2 semanas
              </span>
            </button>

            <button
              onClick={() => setFastIntervalFilter(fastIntervalFilter === '30' ? 'all' : '30')}
              className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all active:scale-95 ${
                fastIntervalFilter === '30'
                  ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-400 shadow-xs'
                  : 'bg-slate-50 border-slate-200/80 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                <span className="text-[7.5px] sm:text-[8px] font-black text-sky-600 uppercase">Regular</span>
              </div>
              <h5 className="text-[10px] font-black text-slate-800 uppercase tracking-tight truncate">
                16 a 30 dias
              </h5>
              <p className="text-base sm:text-xl font-black text-sky-700 tracking-tight leading-none mt-0.5">
                {fastRepetitionData.between16and30Count}
              </p>
              <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider block mt-1">
                no mesmo mês
              </span>
            </button>
          </div>

          {/* LISTA DETALHADA DOS HINOS QUE REPETIRAM EM MENOS DE 30 DIAS */}
          <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-3 sm:p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                    Hinos com Repetição Rápida
                  </h4>
                  {fastIntervalFilter !== 'all' && (
                    <button
                      onClick={() => setFastIntervalFilter('all')}
                      className="text-[8px] font-black text-rose-600 bg-rose-100 px-2 py-0.5 rounded-md hover:bg-rose-200"
                    >
                      Limpar filtro
                    </button>
                  )}
                </div>
                <p className="text-[9px] text-slate-500 font-semibold">
                  Mostrando {displayedFastRepeats.length} episódios ordenados por menor intervalo de dias
                </p>
              </div>

              {/* Busca rápida */}
              <div className="relative w-full sm:w-52">
                <span className="material-icons absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">search</span>
                <input
                  type="text"
                  value={fastSearchTerm}
                  onChange={e => setFastSearchTerm(e.target.value)}
                  placeholder="Buscar hino..."
                  className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {displayedFastRepeats.length === 0 ? (
              <div className="text-center py-8 text-slate-400 font-bold text-xs uppercase tracking-wider">
                {fastRepetitionData.fastRepetitions.length === 0
                  ? 'Nenhum hino repetiu em menos de 30 dias neste ano!'
                  : 'Nenhum louvor corresponde ao filtro de busca'}
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5 custom-scrollbar">
                {displayedFastRepeats.map((item, idx) => {
                  const badgeColor = item.daysInterval <= 7
                    ? 'bg-rose-100 text-rose-700 border-rose-200'
                    : item.daysInterval <= 15
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-sky-100 text-sky-800 border-sky-200';

                  return (
                    <div
                      key={`${item.song}-${item.firstDate}-${item.secondDate}-${idx}`}
                      className="p-3 bg-white rounded-xl border border-slate-100 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-xs font-black text-slate-900 uppercase block truncate">
                            {item.song}
                          </strong>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black border uppercase shrink-0 ${badgeColor}`}>
                            {item.daysInterval === 0 ? 'Mesmo dia' : item.daysInterval === 1 ? '1 dia depois' : `${item.daysInterval} dias depois`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-slate-500 font-semibold mt-1 flex-wrap">
                          <span>1º culto: <strong>{formatDate(item.firstDate)}</strong></span>
                          <span>&rarr;</span>
                          <span>2º culto: <strong>{formatDate(item.secondDate)}</strong></span>
                          {item.servicesBetween > 0 ? (
                            <span className="text-slate-400">({item.servicesBetween} culto(s) de intervalo)</span>
                          ) : (
                            <span className="text-rose-600 font-bold">(Cultos consecutivos!)</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                          {item.daysInterval}d
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: MÊS A MÊS (EVOLUÇÃO MENSAL + DETALHAMENTO DIRETO)                  */}
      {/* ========================================================================= */}
      {mainTab === 'meses' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-md sm:shadow-xl p-4 sm:p-6 border border-slate-100 space-y-4 sm:space-y-6 animate-scaleUp">
          {/* Cabeçalho da Aba Mês a Mês */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight">
                Taxa de Repetição Mês a Mês
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold">
                Evolução mensal e abertura dos hinos de cada mês
              </p>
            </div>

            {/* Legenda simples */}
            <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-sky-500"></span> &lt;20%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-emerald-500"></span> 20-44%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-rose-500"></span> &ge;45%
              </span>
            </div>
          </div>

          {allMonthsData.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Nenhum culto cadastrado ainda
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* GRÁFICO VISUAL MÊS A MÊS - ROLAGEM SUAVE */}
              <div className="overflow-x-auto pb-2 custom-scrollbar">
                <div className="min-w-[480px] flex items-end justify-between gap-2 pt-6 pb-2 px-2 bg-slate-50/80 rounded-2xl border border-slate-100">
                  {allMonthsData.map(m => {
                    const isSelected = activeMonth?.monthKey === m.monthKey;
                    const heightPercent = Math.max(16, Math.min(100, m.repetitionRate));
                    const colorClass = m.repetitionRate >= 45 
                      ? 'bg-rose-500' 
                      : m.repetitionRate >= 20 
                      ? 'bg-emerald-500' 
                      : 'bg-sky-500';

                    return (
                      <div
                        key={m.monthKey}
                        onClick={() => setSelectedMonthKey(m.monthKey)}
                        className="flex-1 flex flex-col items-center cursor-pointer group transition-all"
                        title="Toque para ver os hinos deste mês"
                      >
                        <span className={`text-[9px] font-black mb-1 ${
                          isSelected ? 'text-indigo-600 scale-110' : 'text-slate-600'
                        }`}>
                          {m.repetitionRate.toFixed(0)}%
                        </span>

                        <div className="w-full max-w-[36px] h-32 sm:h-40 bg-slate-200/60 rounded-xl flex items-end p-1 shadow-inner">
                          <div
                            className={`w-full rounded-lg transition-all duration-500 shadow-xs ${colorClass} ${
                              isSelected ? 'ring-2 ring-indigo-500/40 ring-offset-1' : ''
                            }`}
                            style={{ height: `${heightPercent}%` }}
                          >
                            <div className="h-full flex items-center justify-center text-[7.5px] font-black text-white/90">
                              {m.repeatedTimes > 0 ? `${m.repeatedTimes}r` : ''}
                            </div>
                          </div>
                        </div>

                        <span className={`text-[8.5px] font-black uppercase tracking-wider mt-2 truncate max-w-full text-center ${
                          isSelected ? 'text-indigo-600 font-black' : 'text-slate-600'
                        }`}>
                          {m.shortLabel}
                        </span>

                        <span className="text-[7px] font-semibold text-slate-400">
                          {m.servicesCount}c
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SELETOR DO MÊS ATIVO PARA DETALHAMENTO */}
              {activeMonth && (
                <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                        Mês em Detalhe:
                      </span>
                      <select
                        value={activeMonth.monthKey}
                        onChange={e => setSelectedMonthKey(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-black text-slate-900 uppercase outline-none focus:border-indigo-500"
                      >
                        {allMonthsData.map(m => (
                          <option key={m.monthKey} value={m.monthKey}>
                            {m.fullMonth} ({m.repetitionRate.toFixed(0)}% repetição)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 bg-white sm:bg-transparent p-2 sm:p-0 rounded-xl border sm:border-0 border-slate-200/60">
                      <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Taxa do Mês</span>
                        <span className="text-lg sm:text-xl font-black text-slate-900 leading-none block">
                          {activeMonth.repetitionRate.toFixed(1)}%
                        </span>
                      </div>
                      <span className={`text-[8.5px] font-black px-2 py-1 rounded-lg uppercase ${
                        activeMonth.repetitionRate >= 45 
                          ? 'bg-rose-100 text-rose-700' 
                          : activeMonth.repetitionRate >= 20 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-sky-100 text-sky-700'
                      }`}>
                        {activeMonth.servicesCount} cultos • {activeMonth.totalExecutions} louvores
                      </span>
                    </div>
                  </div>

                  {/* 3 BLOCOS DO MÊS: CANTADOS 1X, 2X E 3X OU MAIS */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* 1. Cantados 1x no mês */}
                    <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between pb-2 border-b border-emerald-200/50">
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-emerald-900 uppercase tracking-tight truncate">
                            Cantados 1 Vez
                          </h4>
                          <p className="text-[8px] font-bold text-emerald-700">Sem repetição no mês</p>
                        </div>
                        <span className="text-xs font-black bg-emerald-600 text-white px-2 py-0.5 rounded-lg shrink-0">
                          {activeMonth.onceSongs.length}
                        </span>
                      </div>

                      <div className="max-h-56 overflow-y-auto space-y-1.5 custom-scrollbar pr-0.5">
                        {activeMonth.onceSongs.map(song => (
                          <div key={song} className="text-[11px] font-bold text-slate-800 bg-white p-2 rounded-lg border border-emerald-100 shadow-2xs truncate">
                            {song}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 2. Cantados 2x no mês */}
                    <div className="bg-sky-50/60 border border-sky-100 rounded-2xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between pb-2 border-b border-sky-200/50">
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-sky-900 uppercase tracking-tight truncate">
                            Cantados 2 Vezes
                          </h4>
                          <p className="text-[8px] font-bold text-sky-700">Repetiram em 2 cultos</p>
                        </div>
                        <span className="text-xs font-black bg-sky-600 text-white px-2 py-0.5 rounded-lg shrink-0">
                          {activeMonth.twiceSongs.length}
                        </span>
                      </div>

                      <div className="max-h-56 overflow-y-auto space-y-1.5 custom-scrollbar pr-0.5">
                        {activeMonth.twiceSongs.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic text-center py-4">Nenhum hino</p>
                        ) : (
                          activeMonth.twiceSongs.map(song => (
                            <div key={song} className="text-[11px] font-bold text-slate-800 bg-white p-2 rounded-lg border border-sky-100 shadow-2xs flex items-center justify-between gap-1">
                              <span className="truncate flex-1">{song}</span>
                              <span className="text-[8px] font-black text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded shrink-0">2x</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* 3. Cantados 3x ou mais */}
                    <div className="bg-rose-50/60 border border-rose-100 rounded-2xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between pb-2 border-b border-rose-200/50">
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-rose-900 uppercase tracking-tight truncate">
                            Cantados 3x ou +
                          </h4>
                          <p className="text-[8px] font-bold text-rose-700">Mais frequentes</p>
                        </div>
                        <span className="text-xs font-black bg-rose-600 text-white px-2 py-0.5 rounded-lg shrink-0">
                          {activeMonth.manySongs.length}
                        </span>
                      </div>

                      <div className="max-h-56 overflow-y-auto space-y-1.5 custom-scrollbar pr-0.5">
                        {activeMonth.manySongs.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic text-center py-4">Nenhum hino</p>
                        ) : (
                          activeMonth.manySongs.map(item => (
                            <div key={item.song} className="text-[11px] font-bold text-slate-800 bg-white p-2 rounded-lg border border-rose-100 shadow-2xs flex items-center justify-between gap-1">
                              <span className="truncate flex-1">{item.song}</span>
                              <span className="text-[8px] font-black text-white bg-rose-500 px-1.5 py-0.5 rounded shrink-0">{item.count}x</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
