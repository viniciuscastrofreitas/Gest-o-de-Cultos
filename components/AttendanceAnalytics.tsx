import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { ServiceRecord, ServiceAttendance } from '../types';

interface Props {
  history: ServiceRecord[];
  onUpdateHistory: (newHistory: ServiceRecord[]) => void;
  onSelectRecordForEdit?: (record: ServiceRecord) => void;
}

interface AttendanceCalculated {
  record: ServiceRecord;
  members: number;
  visitors: number;
  grandTotal: number;
  isEBD: boolean;
  hasData: boolean;
}

export const calculateAttendance = (record: ServiceRecord): AttendanceCalculated => {
  const att = record.attendance || {};
  const isEBD = record.description.toUpperCase().includes('EBD');
  
  if (isEBD) {
    const memAdult = att.ebdMembersAdult ?? 0;
    const memCias = att.ebdMembersCias ?? 0;
    const visAdult = att.ebdVisitorsAdult ?? 0;
    const visCias = att.ebdVisitorsCias ?? 0;
    const members = memAdult + memCias;
    const visitors = visAdult + visCias;
    const hasData = (memAdult > 0 || memCias > 0 || visAdult > 0 || visCias > 0) || 
      (att.members !== undefined || att.visitors !== undefined);
    
    // Fallback se tiver preenchido members/visitors direto
    const finalMembers = members > 0 ? members : (att.members || 0);
    const finalVisitors = visitors > 0 ? visitors : (att.visitors || 0);
    
    return {
      record,
      members: finalMembers,
      visitors: finalVisitors,
      grandTotal: finalMembers + finalVisitors,
      isEBD: true,
      hasData: hasData && (finalMembers + finalVisitors > 0)
    };
  } else {
    const members = att.members ?? 0;
    const visitors = att.visitors ?? 0;
    const hasData = att.members !== undefined || att.visitors !== undefined;
    return {
      record,
      members,
      visitors,
      grandTotal: members + visitors,
      isEBD: false,
      hasData: hasData && (members + visitors > 0)
    };
  }
};

const AttendanceAnalytics: React.FC<Props> = ({ history, onUpdateHistory, onSelectRecordForEdit }) => {
  const [periodFilter, setPeriodFilter] = useState<'30' | '90' | '180' | 'year' | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [importNotification, setImportNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | 'table'>('overview');
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Parse de registros ordenados da data mais antiga para mais recente para os gráficos
  const calculatedList = useMemo(() => {
    return history
      .map(r => calculateAttendance(r))
      .sort((a, b) => new Date(a.record.date + 'T12:00:00').getTime() - new Date(b.record.date + 'T12:00:00').getTime());
  }, [history]);

  // Filtro de período
  const filteredList = useMemo(() => {
    const now = new Date();
    return calculatedList.filter(item => {
      const itemDate = new Date(item.record.date + 'T12:00:00');
      
      // Filtro de período
      if (periodFilter === '30') {
        const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 30) return false;
      } else if (periodFilter === '90') {
        const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 90) return false;
      } else if (periodFilter === '180') {
        const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 180) return false;
      } else if (periodFilter === 'year') {
        if (itemDate.getFullYear() !== now.getFullYear()) return false;
      }

      // Filtro de tipo
      if (typeFilter !== 'all') {
        if (typeFilter === 'EBD') {
          if (!item.isEBD) return false;
        } else if (typeFilter === 'DOM') {
          if (item.isEBD || (!item.record.description.includes('DOM') && !item.record.description.toUpperCase().includes('DOMINGO'))) return false;
        } else if (typeFilter === 'SEGUNDA') {
          if (!item.record.description.toUpperCase().includes('SEGUNDA') && !item.record.description.toUpperCase().includes('GLORIFICAÇÃO')) return false;
        } else if (typeFilter === 'QUARTA') {
          if (!item.record.description.toUpperCase().includes('QUARTA') && !item.record.description.toUpperCase().includes('SENHORAS')) return false;
        } else if (typeFilter === 'QUINTA') {
          if (!item.record.description.toUpperCase().includes('QUINTA') && !item.record.description.toUpperCase().includes('ORAÇÃO')) return false;
        }
      }

      // Filtro de busca
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const dateFormatted = item.record.date.split('-').reverse().join('/');
        const matchDesc = item.record.description.toLowerCase().includes(q);
        const matchDate = item.record.date.includes(q) || dateFormatted.includes(q);
        if (!matchDesc && !matchDate) return false;
      }

      return true;
    });
  }, [calculatedList, periodFilter, typeFilter, searchTerm]);

  // Lista com dados de presença válidos
  const validDataList = useMemo(() => {
    return filteredList.filter(item => item.hasData);
  }, [filteredList]);

  // Estatísticas e KPIs
  const stats = useMemo(() => {
    const totalServices = validDataList.length;
    if (totalServices === 0) {
      return {
        totalServices: 0,
        totalAttendance: 0,
        avgAttendance: 0,
        avgMembers: 0,
        avgVisitors: 0,
        visitorPercentage: 0,
        peakAttendance: 0,
        peakRecord: null as AttendanceCalculated | null,
        lowestAttendance: 0,
        missingAttendanceCount: filteredList.length - validDataList.length,
      };
    }

    let sumTotal = 0;
    let sumMembers = 0;
    let sumVisitors = 0;
    let peak = validDataList[0];
    let min = validDataList[0];

    validDataList.forEach(item => {
      sumTotal += item.grandTotal;
      sumMembers += item.members;
      sumVisitors += item.visitors;
      if (item.grandTotal > peak.grandTotal) peak = item;
      if (item.grandTotal < min.grandTotal) min = item;
    });

    const avgAttendance = Math.round(sumTotal / totalServices);
    const avgMembers = Math.round(sumMembers / totalServices);
    const avgVisitors = Math.round((sumVisitors / totalServices) * 10) / 10;
    const visitorPercentage = sumTotal > 0 ? Math.round((sumVisitors / sumTotal) * 100) : 0;

    return {
      totalServices,
      totalAttendance: sumTotal,
      avgAttendance,
      avgMembers,
      avgVisitors,
      visitorPercentage,
      peakAttendance: peak.grandTotal,
      peakRecord: peak,
      lowestAttendance: min.grandTotal,
      missingAttendanceCount: filteredList.length - totalServices,
    };
  }, [validDataList, filteredList]);

  // Médias por dia/tipo de culto
  const averagesByType = useMemo(() => {
    const groups: Record<string, { label: string; count: number; sumTotal: number; sumMembers: number; sumVisitors: number; color: string; icon: string }> = {
      domingoNoite: { label: 'Domingo à Noite', count: 0, sumTotal: 0, sumMembers: 0, sumVisitors: 0, color: 'indigo', icon: 'nightlight_round' },
      ebd: { label: 'Escola Bíblica (EBD)', count: 0, sumTotal: 0, sumMembers: 0, sumVisitors: 0, color: 'emerald', icon: 'menu_book' },
      segunda: { label: 'Segunda (Glorificação)', count: 0, sumTotal: 0, sumMembers: 0, sumVisitors: 0, color: 'violet', icon: 'auto_awesome' },
      quarta: { label: 'Quarta (Senhoras)', count: 0, sumTotal: 0, sumMembers: 0, sumVisitors: 0, color: 'rose', icon: 'favorite' },
      quinta: { label: 'Quinta (Oração)', count: 0, sumTotal: 0, sumMembers: 0, sumVisitors: 0, color: 'amber', icon: 'volunteer_activism' },
      outros: { label: 'Outros Cultos', count: 0, sumTotal: 0, sumMembers: 0, sumVisitors: 0, color: 'slate', icon: 'church' },
    };

    validDataList.forEach(item => {
      const desc = item.record.description.toUpperCase();
      let key = 'outros';
      if (item.isEBD) key = 'ebd';
      else if (desc.includes('DOM') || desc.includes('DOMINGO')) key = 'domingoNoite';
      else if (desc.includes('SEGUNDA') || desc.includes('GLORIFICAÇÃO')) key = 'segunda';
      else if (desc.includes('QUARTA') || desc.includes('SENHORAS')) key = 'quarta';
      else if (desc.includes('QUINTA') || desc.includes('ORAÇÃO')) key = 'quinta';

      groups[key].count++;
      groups[key].sumTotal += item.grandTotal;
      groups[key].sumMembers += item.members;
      groups[key].sumVisitors += item.visitors;
    });

    return Object.values(groups)
      .filter(g => g.count > 0)
      .map(g => ({
        ...g,
        avgTotal: Math.round(g.sumTotal / g.count),
        avgMembers: Math.round(g.sumMembers / g.count),
        avgVisitors: Math.round((g.sumVisitors / g.count) * 10) / 10,
      }))
      .sort((a, b) => b.avgTotal - a.avgTotal);
  }, [validDataList]);

  // Detalhamento EBD (Adultos vs CIAS)
  const ebdBreakdown = useMemo(() => {
    const ebdRecords = validDataList.filter(item => item.isEBD);
    if (ebdRecords.length === 0) return null;

    let totalAdults = 0;
    let totalCias = 0;
    let totalAdultVisitors = 0;
    let totalCiasVisitors = 0;

    ebdRecords.forEach(item => {
      const att = item.record.attendance || {};
      totalAdults += att.ebdMembersAdult || 0;
      totalCias += att.ebdMembersCias || 0;
      totalAdultVisitors += att.ebdVisitorsAdult || 0;
      totalCiasVisitors += att.ebdVisitorsCias || 0;
    });

    const sumAdults = totalAdults + totalAdultVisitors;
    const sumCias = totalCias + totalCiasVisitors;
    const grand = sumAdults + sumCias;

    return {
      count: ebdRecords.length,
      avgTotal: Math.round(grand / ebdRecords.length),
      avgAdults: Math.round(sumAdults / ebdRecords.length),
      avgCias: Math.round(sumCias / ebdRecords.length),
      ciasPercent: grand > 0 ? Math.round((sumCias / grand) * 100) : 0,
      adultsPercent: grand > 0 ? Math.round((sumAdults / grand) * 100) : 0,
      totalCiasVisitors,
      totalAdultVisitors
    };
  }, [validDataList]);

  // Gerar e baixar Planilha Modelo Excel (.xlsx)
  const handleDownloadTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Aba 1: Dados / Modelo
      const templateData = [
        {
          "Data (AAAA-MM-DD)": "2026-03-01",
          "Tipo do Culto": "EBD",
          "Membros Adultos (EBD)": 45,
          "Membros CIAS (EBD)": 28,
          "Visitantes Adultos (EBD)": 5,
          "Visitantes CIAS (EBD)": 4,
          "Membros (Culto Regular)": "",
          "Visitantes (Culto Regular)": "",
          "Observações": "Exemplo de preenchimento para EBD"
        },
        {
          "Data (AAAA-MM-DD)": "2026-03-01",
          "Tipo do Culto": "DOMINGO",
          "Membros Adultos (EBD)": "",
          "Membros CIAS (EBD)": "",
          "Visitantes Adultos (EBD)": "",
          "Visitantes CIAS (EBD)": "",
          "Membros (Culto Regular)": 95,
          "Visitantes (Culto Regular)": 14,
          "Observações": "Exemplo de Domingo à noite"
        },
        {
          "Data (AAAA-MM-DD)": "2026-03-02",
          "Tipo do Culto": "SEGUNDA-FEIRA",
          "Membros Adultos (EBD)": "",
          "Membros CIAS (EBD)": "",
          "Visitantes Adultos (EBD)": "",
          "Visitantes CIAS (EBD)": "",
          "Membros (Culto Regular)": 60,
          "Visitantes (Culto Regular)": 4,
          "Observações": "Culto de Glorificação / Doutrina"
        },
        {
          "Data (AAAA-MM-DD)": "2026-03-04",
          "Tipo do Culto": "QUARTA-FEIRA",
          "Membros Adultos (EBD)": "",
          "Membros CIAS (EBD)": "",
          "Visitantes Adultos (EBD)": "",
          "Visitantes CIAS (EBD)": "",
          "Membros (Culto Regular)": 52,
          "Visitantes (Culto Regular)": 6,
          "Observações": "Culto de Senhoras"
        },
        {
          "Data (AAAA-MM-DD)": "2026-03-05",
          "Tipo do Culto": "QUINTA-FEIRA",
          "Membros Adultos (EBD)": "",
          "Membros CIAS (EBD)": "",
          "Visitantes Adultos (EBD)": "",
          "Visitantes CIAS (EBD)": "",
          "Membros (Culto Regular)": 58,
          "Visitantes (Culto Regular)": 5,
          "Observações": "Culto de Oração"
        }
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);

      // Larguras de coluna
      ws['!cols'] = [
        { wch: 18 }, // Data
        { wch: 20 }, // Tipo do Culto
        { wch: 22 }, // Membros Adultos EBD
        { wch: 22 }, // Membros CIAS EBD
        { wch: 24 }, // Visitantes Adultos EBD
        { wch: 24 }, // Visitantes CIAS EBD
        { wch: 24 }, // Membros Culto Regular
        { wch: 24 }, // Visitantes Culto Regular
        { wch: 35 }, // Observações
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Frequência de Cultos");

      // Aba 2: Instruções de preenchimento
      const instructions = [
        { "Instrução": "COMO PREENCHER A PLANILHA DE FREQUÊNCIA" },
        { "Instrução": "1. Data: Digite no formato AAAA-MM-DD (ex: 2026-03-01) ou DD/MM/AAAA (ex: 01/03/2026)." },
        { "Instrução": "2. Tipo do Culto: Use 'EBD', 'DOMINGO' (ou DOM), 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA' ou 'SÁBADO'." },
        { "Instrução": "3. Para EBD: Preencha as colunas de Membros e Visitantes divididos entre Adultos e CIAS (Crianças, Intermediários e Adolescentes)." },
        { "Instrução": "4. Para os demais cultos: Preencha apenas as colunas 'Membros (Culto Regular)' e 'Visitantes (Culto Regular)'." },
        { "Instrução": "5. Atualização inteligente: Se a data e o tipo já existirem no aplicativo, a presença será atualizada sem apagar os hinos e obreiros existentes!" },
        { "Instrução": "6. Novos cultos: Se o culto ainda não estiver cadastrado, o sistema criará o registro para manter o histórico completo." },
      ];
      const wsInstructions = XLSX.utils.json_to_sheet(instructions);
      wsInstructions['!cols'] = [{ wch: 90 }];
      XLSX.utils.book_append_sheet(wb, wsInstructions, "Instruções");

      XLSX.writeFile(wb, "modelo_frequencia_cultos.xlsx");
      setImportNotification({ type: 'success', message: 'Planilha modelo baixada com sucesso! Preencha e importe quando desejar.' });
    } catch (err) {
      console.error(err);
      setImportNotification({ type: 'error', message: 'Não foi possível gerar a planilha modelo.' });
    }
  };

  // Exportar histórico real em Excel (.xlsx)
  const handleExportRealData = () => {
    try {
      const dataToExport = history.map(r => {
        const att = r.attendance || {};
        const isEBD = r.description.toUpperCase().includes('EBD');
        const calculated = calculateAttendance(r);
        return {
          "Data": r.date,
          "Dia / Descrição": r.description,
          "É EBD?": isEBD ? "SIM" : "NÃO",
          "Membros Adultos (EBD)": isEBD ? (att.ebdMembersAdult ?? '') : '',
          "Membros CIAS (EBD)": isEBD ? (att.ebdMembersCias ?? '') : '',
          "Visitantes Adultos (EBD)": isEBD ? (att.ebdVisitorsAdult ?? '') : '',
          "Visitantes CIAS (EBD)": isEBD ? (att.ebdVisitorsCias ?? '') : '',
          "Total Membros": calculated.members,
          "Total Visitantes": calculated.visitors,
          "Público Total": calculated.grandTotal,
          "Louvores Cantados": r.songs.join('; '),
          "Palavra / Texto": `${r.roles.word || ''} - ${r.roles.scripture || ''}`.trim(),
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      ws['!cols'] = [
        { wch: 12 }, { wch: 20 }, { wch: 10 },
        { wch: 20 }, { wch: 20 }, { wch: 22 }, { wch: 22 },
        { wch: 14 }, { wch: 14 }, { wch: 14 },
        { wch: 45 }, { wch: 30 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, "Histórico de Presença");
      XLSX.writeFile(wb, `relatorio_frequencia_${new Date().toISOString().slice(0, 10)}.xlsx`);
      setImportNotification({ type: 'success', message: 'Histórico de frequência exportado com sucesso!' });
    } catch (err) {
      console.error(err);
      setImportNotification({ type: 'error', message: 'Erro ao exportar dados.' });
    }
  };

  // Importar planilha Excel (.xlsx / .xls / .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportNotification(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        
        // Pega a primeira planilha
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rows || rows.length === 0) {
          setImportNotification({ type: 'error', message: 'A planilha selecionada está vazia.' });
          setIsImporting(false);
          return;
        }

        let updatedCount = 0;
        let createdCount = 0;

        // Trabalhamos sobre uma cópia do histórico atual
        const historyCopy = [...history];

        rows.forEach(row => {
          // Extrair data
          let dateStr = '';
          const rawDate = row['Data (AAAA-MM-DD)'] || row['Data'] || row['DATA'] || row['date'] || row['Data do Culto'];
          
          if (rawDate instanceof Date) {
            dateStr = `${rawDate.getFullYear()}-${String(rawDate.getMonth() + 1).padStart(2, '0')}-${String(rawDate.getDate()).padStart(2, '0')}`;
          } else if (typeof rawDate === 'string') {
            const clean = rawDate.trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
              dateStr = clean;
            } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
              const [d, m, y] = clean.split('/');
              dateStr = `${y}-${m}-${d}`;
            } else if (/^\d{2}-\d{2}-\d{4}$/.test(clean)) {
              const [d, m, y] = clean.split('-');
              dateStr = `${y}-${m}-${d}`;
            }
          } else if (typeof rawDate === 'number') {
            // Excel serial date number
            const dateObj = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
            dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
          }

          if (!dateStr) return;

          // Descrição do culto
          const rawDesc = String(row['Tipo do Culto'] || row['Tipo'] || row['Descrição'] || row['Culto'] || '').trim();
          let description = rawDesc;
          if (!description) {
            const dayOfWeek = new Date(dateStr + 'T12:00:00').getDay();
            const days = ['DOM', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'];
            description = days[dayOfWeek];
          }

          const isEBD = description.toUpperCase().includes('EBD');

          // Parse dos valores de presença
          const parseNum = (val: any) => {
            const n = parseInt(String(val).replace(/\D/g, ''), 10);
            return isNaN(n) ? 0 : n;
          };

          const ebdMemAdult = parseNum(row['Membros Adultos (EBD)'] || row['EBD Membros Adultos'] || row['Adultos Membros'] || row['Membros Adultos']);
          const ebdMemCias = parseNum(row['Membros CIAS (EBD)'] || row['EBD Membros CIAS'] || row['CIAS Membros'] || row['Membros CIAS']);
          const ebdVisAdult = parseNum(row['Visitantes Adultos (EBD)'] || row['EBD Visitantes Adultos'] || row['Adultos Visitantes'] || row['Visitantes Adultos']);
          const ebdVisCias = parseNum(row['Visitantes CIAS (EBD)'] || row['EBD Visitantes CIAS'] || row['CIAS Visitantes'] || row['Visitantes CIAS']);
          
          const regMembers = parseNum(row['Membros (Culto Regular)'] || row['Membros'] || row['MEMBROS'] || row['Total Membros']);
          const regVisitors = parseNum(row['Visitantes (Culto Regular)'] || row['Visitantes'] || row['VISITANTES'] || row['Total Visitantes']);

          const newAttendance: ServiceAttendance = isEBD ? {
            ebdMembersAdult: ebdMemAdult,
            ebdMembersCias: ebdMemCias,
            ebdVisitorsAdult: ebdVisAdult,
            ebdVisitorsCias: ebdVisCias,
            members: (ebdMemAdult + ebdMemCias) || regMembers,
            visitors: (ebdVisAdult + ebdVisCias) || regVisitors
          } : {
            members: regMembers,
            visitors: regVisitors
          };

          // Procura culto já existente com a mesma data e descrição similar
          const existingIndex = historyCopy.findIndex(item => {
            if (item.date !== dateStr) return false;
            const itemIsEbd = item.description.toUpperCase().includes('EBD');
            if (isEBD) return itemIsEbd;
            return !itemIsEbd;
          });

          if (existingIndex >= 0) {
            // Atualiza a presença do culto existente preservando hinos e obreiros
            historyCopy[existingIndex] = {
              ...historyCopy[existingIndex],
              attendance: {
                ...historyCopy[existingIndex].attendance,
                ...newAttendance
              }
            };
            updatedCount++;
          } else {
            // Cria um novo registro para manter o histórico de frequência
            historyCopy.push({
              id: crypto.randomUUID(),
              date: dateStr,
              description: isEBD ? 'EBD' : description,
              songs: [],
              roles: { gate: '', praise: '', word: '', scripture: '' },
              attendance: newAttendance
            });
            createdCount++;
          }
        });

        // Ordena histórico por data decrescente
        historyCopy.sort((a, b) => new Date(b.date + 'T12:00:00').getTime() - new Date(a.date + 'T12:00:00').getTime());
        
        onUpdateHistory(historyCopy);
        setImportNotification({
          type: 'success',
          message: `Importação concluída! ${updatedCount} cultos atualizados e ${createdCount} novos cultos adicionados com frequência.`
        });
      } catch (err) {
        console.error(err);
        setImportNotification({ type: 'error', message: 'Erro ao processar o arquivo Excel. Verifique se o arquivo segue o modelo correto.' });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      setImportNotification({ type: 'error', message: 'Falha ao ler o arquivo selecionado.' });
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-1">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">
            <span className="material-icons text-indigo-400 text-3xl">insights</span>
            Análise de Frequência
          </h2>
          <p className="text-[10px] text-slate-400 font-black mt-1 uppercase tracking-[0.2em]">
            Controle de presença, médias de culto e alcance evangelístico
          </p>
        </div>

        {/* Botões de Ação para Excel */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Download Modelo */}
          <button
            onClick={handleDownloadTemplate}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-black/20"
            title="Baixar planilha modelo Excel (.xlsx) com instruções"
          >
            <span className="material-icons text-indigo-400 text-lg">download</span>
            <span>Baixar Modelo</span>
          </button>

          {/* Importar Planilha */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-xl shadow-indigo-950/40 disabled:opacity-50"
            title="Importar planilha preenchida em Excel (.xlsx ou .csv)"
          >
            <span className="material-icons text-lg">upload_file</span>
            <span>{isImporting ? 'Importando...' : 'Importar Excel'}</span>
          </button>

          {/* Input oculto de arquivo */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Exportar histórico atual */}
          {history.length > 0 && (
            <button
              onClick={handleExportRealData}
              className="flex items-center justify-center p-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80 rounded-2xl transition-all active:scale-95"
              title="Exportar dados de presença cadastrados (.xlsx)"
            >
              <span className="material-icons text-lg">file_download</span>
            </button>
          )}
        </div>
      </div>

      {/* Notificação de Sucesso/Erro */}
      {importNotification && (
        <div className={`p-5 rounded-2xl border flex items-center justify-between gap-4 animate-scaleUp ${
          importNotification.type === 'success' 
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center gap-3">
            <span className="material-icons text-xl">
              {importNotification.type === 'success' ? 'check_circle' : 'error_outline'}
            </span>
            <span className="text-xs font-bold leading-relaxed">{importNotification.message}</span>
          </div>
          <button
            onClick={() => setImportNotification(null)}
            className="p-1 hover:opacity-75 transition-opacity text-slate-400"
          >
            <span className="material-icons text-sm">close</span>
          </button>
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="bg-[#1e293b] p-5 rounded-3xl border border-white/5 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
          {/* Período */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 custom-scrollbar">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2 shrink-0">Período:</span>
            {[
              { id: 'all', label: 'Todo o Histórico' },
              { id: 'year', label: 'Ano Atual' },
              { id: '180', label: '6 Meses' },
              { id: '90', label: '90 Dias' },
              { id: '30', label: '30 Dias' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setPeriodFilter(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 ${
                  periodFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/50'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Alternador de Visualização (Visão Geral vs Tabela) */}
          <div className="flex items-center bg-white/5 p-1 rounded-2xl border border-white/5 self-end lg:self-auto">
            <button
              onClick={() => setActiveView('overview')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                activeView === 'overview'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-icons text-xs">dashboard</span>
              <span>Visão Geral</span>
            </button>
            <button
              onClick={() => setActiveView('table')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                activeView === 'table'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-icons text-xs">table_rows</span>
              <span>Lista Detalhada</span>
            </button>
          </div>
        </div>

        {/* Linha secundária: Filtro de Culto e Busca */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-white/5">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto custom-scrollbar">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mr-1 shrink-0">Culto:</span>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'DOM', label: 'Dom Noite' },
              { id: 'EBD', label: 'EBD' },
              { id: 'SEGUNDA', label: 'Segunda' },
              { id: 'QUARTA', label: 'Quarta' },
              { id: 'QUINTA', label: 'Quinta' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all shrink-0 ${
                  typeFilter === t.id
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64 sm:ml-auto">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por data ou tipo..."
              className="w-full pl-9 pr-4 py-2 bg-slate-900/60 border border-white/10 rounded-xl text-white text-xs font-bold placeholder:text-slate-500 outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Cards de KPIs / Indicadores Principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Média por Culto */}
        <div className="bg-[#1e293b] p-6 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Média por Culto</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <span className="material-icons text-base">groups</span>
            </div>
          </div>
          <div className="text-3xl font-black text-white tracking-tight">
            {stats.avgAttendance}
          </div>
          <p className="text-[9px] font-bold text-slate-400 mt-2">
            Pessoas presentes por reunião
          </p>
        </div>

        {/* Membros vs Visitantes */}
        <div className="bg-[#1e293b] p-6 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Membros / Visitantes</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <span className="material-icons text-base">person_add</span>
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight flex items-baseline gap-2">
            <span>{stats.avgMembers}</span>
            <span className="text-xs font-bold text-slate-400">membros</span>
            <span className="text-emerald-400 text-lg">+{stats.avgVisitors}</span>
            <span className="text-xs font-bold text-emerald-400">vis.</span>
          </div>
          <p className="text-[9px] font-bold text-emerald-400 mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            {stats.visitorPercentage}% do público são visitantes
          </p>
        </div>

        {/* Maior Público (Recorde) */}
        <div className="bg-[#1e293b] p-6 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Maior Público</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <span className="material-icons text-base">emoji_events</span>
            </div>
          </div>
          <div className="text-3xl font-black text-white tracking-tight">
            {stats.peakAttendance}
          </div>
          <p className="text-[9px] font-bold text-slate-400 mt-2 truncate">
            {stats.peakRecord 
              ? `${stats.peakRecord.record.date.split('-').reverse().join('/')} • ${stats.peakRecord.record.description}`
              : 'Nenhum registro'}
          </p>
        </div>

        {/* Cultos com Frequência */}
        <div className="bg-[#1e293b] p-6 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cultos Registrados</span>
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
              <span className="material-icons text-base">fact_check</span>
            </div>
          </div>
          <div className="text-3xl font-black text-white tracking-tight">
            {stats.totalServices}
          </div>
          <p className="text-[9px] font-bold text-slate-400 mt-2">
            {stats.missingAttendanceCount > 0 
              ? `${stats.missingAttendanceCount} cultos sem presença lançada`
              : 'Todos os cultos preenchidos'}
          </p>
        </div>
      </div>

      {/* Conteúdo Principal de Acordo com a Visualização Selecionada */}
      {activeView === 'overview' ? (
        <div className="space-y-8">
          {/* Gráfico Visual de Evolução Temporal */}
          <div className="bg-[#1e293b] p-7 rounded-3xl border border-white/5 shadow-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="material-icons text-indigo-400 text-lg">show_chart</span>
                  Evolução da Frequência
                </h3>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                  Linha cronológica com detalhamento de membros e visitantes
                </p>
              </div>

              {/* Legenda */}
              <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-wider">
                <div className="flex items-center gap-1.5 text-indigo-300">
                  <span className="w-3 h-3 rounded-md bg-indigo-500"></span>
                  <span>Membros</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-300">
                  <span className="w-3 h-3 rounded-md bg-emerald-500"></span>
                  <span>Visitantes</span>
                </div>
              </div>
            </div>

            {validDataList.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-dashed border-white/5">
                <span className="material-icons text-slate-500 text-4xl mb-2">bar_chart</span>
                <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Nenhum dado de frequência no período selecionado</p>
                <p className="text-slate-500 text-[10px] mt-1">Importe uma planilha Excel acima ou preencha a presença ao cadastrar/editar cultos.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Visualizador de Barras Cronológico */}
                <div className="h-64 flex items-end gap-2 overflow-x-auto pb-4 pt-6 px-2 custom-scrollbar">
                  {validDataList.slice(-25).map((item, idx) => {
                    const maxScale = Math.max(...validDataList.map(v => v.grandTotal), 10);
                    const totalHeightPercent = Math.max(8, (item.grandTotal / maxScale) * 100);
                    const memberShare = item.grandTotal > 0 ? (item.members / item.grandTotal) : 1;
                    const visitorShare = item.grandTotal > 0 ? (item.visitors / item.grandTotal) : 0;

                    const dateFormatted = item.record.date.slice(5).replace('-', '/'); // MM/DD

                    return (
                      <div
                        key={item.record.id || idx}
                        className="flex flex-col items-center flex-1 min-w-[36px] max-w-[48px] h-full justify-end group cursor-pointer"
                        onClick={() => onSelectRecordForEdit && onSelectRecordForEdit(item.record)}
                        title={`${item.record.date.split('-').reverse().join('/')} - ${item.record.description}\nTotal: ${item.grandTotal} (${item.members} membros + ${item.visitors} visitantes)`}
                      >
                        {/* Indicador de Valor no Topo */}
                        <span className="text-[10px] font-black text-slate-300 mb-1.5 group-hover:text-white group-hover:scale-110 transition-transform">
                          {item.grandTotal}
                        </span>

                        {/* Barra Composta (Membros + Visitantes) */}
                        <div
                          className="w-full rounded-t-xl overflow-hidden flex flex-col justify-end bg-slate-800/80 group-hover:brightness-125 transition-all shadow-md"
                          style={{ height: `${totalHeightPercent}%` }}
                        >
                          {/* Visitantes (Topo verde) */}
                          {item.visitors > 0 && (
                            <div
                              className="w-full bg-emerald-500 transition-all"
                              style={{ height: `${visitorShare * 100}%` }}
                            />
                          )}
                          {/* Membros (Base roxa/índigo) */}
                          <div
                            className="w-full bg-indigo-600 transition-all flex-1"
                            style={{ height: `${memberShare * 100}%` }}
                          />
                        </div>

                        {/* Label da Data */}
                        <div className="mt-2 text-center">
                          <span className="text-[9px] font-black text-slate-400 block group-hover:text-indigo-400 transition-colors">
                            {dateFormatted}
                          </span>
                          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter truncate max-w-[40px] block">
                            {item.isEBD ? 'EBD' : item.record.description.slice(0, 3)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 px-2 pt-1 border-t border-white/5">
                  <span>Exibindo últimos {Math.min(25, validDataList.length)} cultos com dados</span>
                  <span>Passe o mouse ou toque para ver detalhes</span>
                </div>
              </div>
            )}
          </div>

          {/* Grids de Comparações: Médias por Dia e Detalhes da EBD */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Médias por Dia da Semana / Tipo de Culto */}
            <div className="bg-[#1e293b] p-7 rounded-3xl border border-white/5 shadow-2xl flex flex-col justify-between">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2 mb-1">
                  <span className="material-icons text-amber-400 text-lg">calendar_month</span>
                  Média por Dia de Culto
                </h3>
                <p className="text-[10px] font-bold text-slate-400 mb-6">
                  Comparativo de público típico em cada reunião
                </p>

                {averagesByType.length === 0 ? (
                  <p className="text-slate-500 text-xs text-center py-8">Nenhum dado por categoria disponível.</p>
                ) : (
                  <div className="space-y-4">
                    {averagesByType.map(cat => {
                      const maxAvg = Math.max(...averagesByType.map(a => a.avgTotal), 1);
                      const percent = Math.round((cat.avgTotal / maxAvg) * 100);

                      return (
                        <div key={cat.label} className="p-4 bg-slate-900/40 rounded-2xl border border-white/5 space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2.5">
                              <span className="material-icons text-sm text-slate-400">{cat.icon}</span>
                              <span className="text-xs font-black text-white uppercase tracking-wider">{cat.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-white">{cat.avgTotal}</span>
                              <span className="text-[9px] font-bold text-slate-400">méd. ({cat.count} cultos)</span>
                            </div>
                          </div>

                          {/* Barra de Progresso Relativa */}
                          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                cat.color === 'indigo' ? 'bg-indigo-500' :
                                cat.color === 'emerald' ? 'bg-emerald-500' :
                                cat.color === 'rose' ? 'bg-rose-500' :
                                cat.color === 'amber' ? 'bg-amber-500' : 'bg-violet-500'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>

                          <div className="flex justify-between text-[9px] font-bold text-slate-400">
                            <span>{cat.avgMembers} membros típicos</span>
                            <span className="text-emerald-400">+{cat.avgVisitors} visitantes</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Painel EBD: Adultos vs CIAS */}
            <div className="bg-[#1e293b] p-7 rounded-3xl border border-white/5 shadow-2xl flex flex-col justify-between">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2 mb-1">
                  <span className="material-icons text-emerald-400 text-lg">school</span>
                  Análise da Escola Bíblica (EBD)
                </h3>
                <p className="text-[10px] font-bold text-slate-400 mb-6">
                  Distribuição de Adultos e Crianças/Intermediários/Adolescentes (CIAS)
                </p>

                {ebdBreakdown ? (
                  <div className="space-y-6">
                    {/* Barra de Comparação Visual */}
                    <div className="p-5 bg-slate-900/40 rounded-2xl border border-white/5 space-y-3">
                      <div className="flex justify-between text-xs font-black">
                        <span className="text-indigo-300 uppercase tracking-wider">Adultos: {ebdBreakdown.adultsPercent}% ({ebdBreakdown.avgAdults} méd.)</span>
                        <span className="text-rose-300 uppercase tracking-wider">CIAS: {ebdBreakdown.ciasPercent}% ({ebdBreakdown.avgCias} méd.)</span>
                      </div>

                      <div className="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-indigo-500 transition-all duration-700"
                          style={{ width: `${ebdBreakdown.adultsPercent}%` }}
                        />
                        <div
                          className="h-full bg-rose-500 transition-all duration-700"
                          style={{ width: `${ebdBreakdown.ciasPercent}%` }}
                        />
                      </div>

                      <p className="text-[9px] font-bold text-slate-400 text-center">
                        Média total de {ebdBreakdown.avgTotal} participantes por domingo de manhã
                      </p>
                    </div>

                    {/* Destaques EBD */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-900/30 rounded-2xl border border-white/5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Aulas Realizadas</span>
                        <span className="text-xl font-black text-white">{ebdBreakdown.count} domingos</span>
                      </div>
                      <div className="p-4 bg-slate-900/30 rounded-2xl border border-white/5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Visitantes na EBD</span>
                        <span className="text-xl font-black text-emerald-400">+{ebdBreakdown.totalAdultVisitors + ebdBreakdown.totalCiasVisitors}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-dashed border-white/5">
                    <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Nenhuma EBD registrada no filtro</p>
                    <p className="text-slate-500 text-[10px] mt-1">Ao lançar a EBD, preencha os campos de Adultos e CIAS.</p>
                  </div>
                )}
              </div>

              <div className="mt-6 p-4 bg-indigo-950/20 border border-indigo-500/20 rounded-2xl flex items-center gap-3">
                <span className="material-icons text-indigo-400 text-xl">info</span>
                <span className="text-[10px] text-slate-300 font-bold leading-relaxed">
                  Dica: Para atualizar históricos antigos, baixe a planilha modelo Excel e preencha as colunas correspondentes.
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Visualização em Lista / Tabela */
        <div className="bg-[#1e293b] rounded-3xl border border-white/5 shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-white/5 flex justify-between items-center">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider">Histórico Detalhado de Presença</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">{filteredList.length} cultos no período</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/60 border-b border-white/5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <th className="py-4 px-6">Data</th>
                  <th className="py-4 px-6">Tipo / Culto</th>
                  <th className="py-4 px-6 text-center">Membros</th>
                  <th className="py-4 px-6 text-center">Visitantes</th>
                  <th className="py-4 px-6 text-center">Total</th>
                  <th className="py-4 px-6 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs font-bold">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 text-xs font-bold">
                      Nenhum culto encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredList.map(item => {
                    const dateFmt = item.record.date.split('-').reverse().join('/');
                    const att = item.record.attendance || {};

                    return (
                      <tr key={item.record.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 px-6 font-black text-white">
                          {dateFmt}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                            item.isEBD ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' :
                            item.record.description.includes('DOM') ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {item.record.description}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center text-slate-300">
                          {item.hasData ? (
                            <div>
                              <span>{item.members}</span>
                              {item.isEBD && (att.ebdMembersAdult || att.ebdMembersCias) ? (
                                <span className="text-[9px] text-slate-500 block font-normal">
                                  ({att.ebdMembersAdult || 0} ad. + {att.ebdMembersCias || 0} cias)
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-slate-600 italic text-[10px]">Sem dados</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {item.hasData ? (
                            <span className="text-emerald-400 font-black">
                              +{item.visitors}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {item.hasData ? (
                            <span className="text-sm font-black text-white bg-slate-900/60 px-3 py-1 rounded-xl border border-white/5">
                              {item.grandTotal}
                            </span>
                          ) : (
                            <span className="text-slate-600 italic text-[10px]">Pendente</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          {onSelectRecordForEdit && (
                            <button
                              onClick={() => onSelectRecordForEdit(item.record)}
                              className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                            >
                              Editar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceAnalytics;
