import React, { useState, useRef, useEffect } from 'react';
import { ServiceRecord } from '../types';

interface Props {
  record?: ServiceRecord | null;
  records?: ServiceRecord[];
  title?: string;
  onClose: () => void;
  dayOfWeekNamesShort?: string[];
}

export const ReportModal: React.FC<Props> = ({
  record,
  records,
  title = 'Relatório de Culto',
  onClose,
  dayOfWeekNamesShort = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
}) => {
  const [activeFormat, setActiveFormat] = useState<'whatsapp' | 'pdf' | 'card'>('whatsapp');
  const [copied, setCopied] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // If a single record was passed, put it in an array for consistent handling
  const activeRecords = record ? [record] : (records || []);
  const isSingle = activeRecords.length === 1;
  const currentRecord = activeRecords[0] || null;

  // Format date helper
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // Generate WhatsApp text for one or multiple records
  const generateWhatsAppText = () => {
    return activeRecords.map(r => {
      const d = new Date(r.date + 'T12:00:00');
      const dateFormatted = formatDate(r.date);
      const dayName = dayOfWeekNamesShort[d.getDay()] || '';

      let text = `*🏛️ IGREJA CRISTÃ MARANATA*\n`;
      text += `*RELATÓRIO DE CULTO - ${dateFormatted} (${dayName} - ${r.description})*\n\n`;

      text += `*ESCALA DE OBREIROS:*\n`;
      if (r.roles.gate) text += `🚪 *Portão:* ${r.roles.gate}\n`;
      if (r.roles.praise) text += `🎵 *Louvor:* ${r.roles.praise}\n`;
      if (r.roles.word) text += `📖 *Palavra:* ${r.roles.word}\n`;
      if (r.roles.word === 'TRANSMISSÃO') {
        text += `📡 *Satélite:* Transmissão Oficial\n`;
      } else if (r.roles.scripture) {
        text += `📜 *Texto Bíblico:* ${r.roles.scripture}\n`;
      }

      if (r.attendance) {
        const att = r.attendance;
        if (r.description === 'EBD') {
          const totalMembers = (att.ebdMembersAdult || 0) + (att.ebdMembersCias || 0);
          const totalVisitors = (att.ebdVisitorsAdult || 0) + (att.ebdVisitorsCias || 0);
          const grandTotal = totalMembers + totalVisitors;
          text += `\n*FREQUÊNCIA EBD (TOTAL: ${grandTotal}):*\n`;
          text += `👥 Membros: ${totalMembers} (Adultos: ${att.ebdMembersAdult || 0} / CIAS: ${att.ebdMembersCias || 0})\n`;
          text += `🤝 Visitantes: ${totalVisitors} (Adultos: ${att.ebdVisitorsAdult || 0} / CIAS: ${att.ebdVisitorsCias || 0})\n`;
        } else {
          const total = (att.members || 0) + (att.visitors || 0);
          if (total > 0) {
            text += `\n*FREQUÊNCIA TOTAL: ${total}*\n`;
            text += `👥 Membros: ${att.members || 0} | 🤝 Visitantes: ${att.visitors || 0}\n`;
          }
        }
      }

      if (r.songs && r.songs.length > 0) {
        text += `\n*LOUVORES ENTOADOS (${r.songs.length}):*\n`;
        r.songs.forEach((song, idx) => {
          text += `${String(idx + 1).padStart(2, '0')}. ${song}\n`;
        });
      }

      return text;
    }).join('\n' + '─'.repeat(25) + '\n\n');
  };

  const whatsAppMessage = generateWhatsAppText();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(whatsAppMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = whatsAppMessage;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleOpenWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(whatsAppMessage)}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  // Generate Image card on Canvas
  useEffect(() => {
    if (activeFormat !== 'card' || !currentRecord) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1080;
    const height = 1350;
    canvas.width = width;
    canvas.height = height;

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(0.5, '#1e1b4b');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle border
    ctx.strokeStyle = '#312e81';
    ctx.lineWidth = 12;
    ctx.strokeRect(30, 30, width - 60, height - 60);

    // Church Header
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 36px Outfit, sans-serif';
    ctx.fillText('IGREJA CRISTÃ MARANATA', width / 2, 110);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '900 48px Outfit, sans-serif';
    const dateFormatted = formatDate(currentRecord.date);
    ctx.fillText(`RELATÓRIO DE CULTO • ${dateFormatted}`, width / 2, 180);

    ctx.fillStyle = '#818cf8';
    ctx.font = 'bold 30px Outfit, sans-serif';
    ctx.fillText(currentRecord.description.toUpperCase(), width / 2, 230);

    // Decorative line
    ctx.strokeStyle = '#4338ca';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, 270);
    ctx.lineTo(width - 100, 270);
    ctx.stroke();

    // Box: Frequência
    ctx.textAlign = 'left';
    let attTotal = 0;
    let attDetails = '';
    if (currentRecord.attendance) {
      if (currentRecord.description === 'EBD') {
        const mem = (currentRecord.attendance.ebdMembersAdult || 0) + (currentRecord.attendance.ebdMembersCias || 0);
        const vis = (currentRecord.attendance.ebdVisitorsAdult || 0) + (currentRecord.attendance.ebdVisitorsCias || 0);
        attTotal = mem + vis;
        attDetails = `Membros: ${mem} | Visitantes: ${vis}`;
      } else {
        attTotal = (currentRecord.attendance.members || 0) + (currentRecord.attendance.visitors || 0);
        attDetails = `Membros: ${currentRecord.attendance.members || 0} | Visitantes: ${currentRecord.attendance.visitors || 0}`;
      }
    }

    // Attendance Banner
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(80, 310, width - 160, 110, 24);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.fillText('FREQUÊNCIA TOTAL', 120, 355);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '900 46px Outfit, sans-serif';
    ctx.fillText(`${attTotal} PRESENTES`, 120, 400);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillText(attDetails, width - 120, 380);

    // Roles Box
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(80, 450, width - 160, 190, 24);
    ctx.fill();

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillText('ESCALA DE OBREIROS', 120, 495);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Outfit, sans-serif';
    const gateText = `Portão: ${currentRecord.roles.gate || 'Não registrado'}`;
    const praiseText = `Louvor: ${currentRecord.roles.praise || 'Não registrado'}`;
    const wordText = `Palavra: ${currentRecord.roles.word || 'Não registrado'}`;

    ctx.fillText(gateText, 120, 545);
    ctx.fillText(praiseText, 120, 595);
    ctx.fillText(wordText, 560, 545);

    if (currentRecord.roles.scripture) {
      ctx.fillStyle = '#a5b4fc';
      ctx.font = '22px Outfit, sans-serif';
      ctx.fillText(`Texto: ${currentRecord.roles.scripture}`, 560, 595);
    }

    // Songs Box
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(80, 670, width - 160, 560, 24);
    ctx.fill();

    ctx.fillStyle = '#818cf8';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillText(`LOUVORES ENTOADOS (${currentRecord.songs.length})`, 120, 715);

    ctx.fillStyle = '#ffffff';
    ctx.font = '500 24px Outfit, sans-serif';
    const songsToDisplay = currentRecord.songs.slice(0, 10);
    songsToDisplay.forEach((song, idx) => {
      const y = 765 + idx * 45;
      ctx.fillStyle = '#fde68a';
      ctx.fillText(`${idx + 1}.`, 120, y);
      ctx.fillStyle = '#f8fafc';
      const truncatedSong = song.length > 50 ? song.substring(0, 47) + '...' : song;
      ctx.fillText(truncatedSong, 165, y);
    });

    if (currentRecord.songs.length > 10) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'italic 20px Outfit, sans-serif';
      ctx.fillText(`+ ${currentRecord.songs.length - 10} outros louvores`, 120, 1200);
    }

    // Footer
    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.fillText('MARANATA: O SENHOR JESUS VEM!', width / 2, 1285);

    const dataUrl = canvas.toDataURL('image/png');
    setGeneratedImageUrl(dataUrl);
  }, [activeFormat, currentRecord]);

  const handleDownloadImage = () => {
    if (!generatedImageUrl) return;
    const link = document.createElement('a');
    link.download = `relatorio-culto-${currentRecord?.date || 'icm'}.png`;
    link.href = generatedImageUrl;
    link.click();
  };

  const handleShareImage = async () => {
    if (!generatedImageUrl || !navigator.share) {
      handleDownloadImage();
      return;
    }
    try {
      const blob = await (await fetch(generatedImageUrl)).blob();
      const file = new File([blob], `relatorio-culto-${currentRecord?.date || 'icm'}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Relatório de Culto ICM',
          text: `Relatório de Culto - ${formatDate(currentRecord?.date || '')}`
        });
      } else {
        handleDownloadImage();
      }
    } catch {
      handleDownloadImage();
    }
  };

  return (
    <div className="fixed inset-0 z-[9000] flex flex-col justify-end md:justify-center p-0 md:p-6 animate-fadeIn">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm no-print" onClick={onClose} />

      {/* Main Card */}
      <div className="relative bg-white text-slate-900 rounded-t-[3rem] md:rounded-[3rem] shadow-2xl max-w-4xl w-full mx-auto max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 animate-slideUp">
        
        {/* MODAL HEADER */}
        <div className="no-print p-6 md:p-8 pb-4 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
              <span className="material-icons text-2xl">description</span>
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">
                {title}
              </h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                {isSingle 
                  ? `${currentRecord?.description} • ${formatDate(currentRecord?.date || '')}`
                  : `${activeRecords.length} cultos selecionados`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-slate-700 rounded-2xl hover:bg-slate-100 transition-all"
          >
            <span className="material-icons text-xl">close</span>
          </button>
        </div>

        {/* FORMAT TOGGLE TABS */}
        <div className="no-print px-6 md:px-8 pt-4 pb-2 shrink-0">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1.5">
            <button
              onClick={() => setActiveFormat('whatsapp')}
              className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                activeFormat === 'whatsapp'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-icons text-sm">chat</span>
              WhatsApp
            </button>

            <button
              onClick={() => setActiveFormat('pdf')}
              className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                activeFormat === 'pdf'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-icons text-sm">print</span>
              PDF / Imprimir
            </button>

            {isSingle && (
              <button
                onClick={() => setActiveFormat('card')}
                className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                  activeFormat === 'card'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="material-icons text-sm">image</span>
                Cartão / Imagem
              </button>
            )}
          </div>
        </div>

        {/* TAB CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">

          {/* TAB 1: WHATSAPP TEXT PREVIEW */}
          {activeFormat === 'whatsapp' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Pré-visualização do texto
                </span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                  Formato compatível com WhatsApp
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 md:p-6 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed shadow-inner max-h-[45vh] overflow-y-auto custom-scrollbar">
                {whatsAppMessage}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                >
                  <span className="material-icons text-sm">{copied ? 'check' : 'content_copy'}</span>
                  {copied ? 'Copiado para a Área de Transferência!' : 'Copiar Texto Completo'}
                </button>

                <button
                  onClick={handleOpenWhatsApp}
                  className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all"
                >
                  <span className="material-icons text-sm">send</span>
                  Abrir no WhatsApp
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PDF / PRINTABLE OFFICIAL DOCUMENT */}
          {activeFormat === 'pdf' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="no-print flex items-center justify-between bg-indigo-50 border border-indigo-100 p-4 rounded-2xl text-xs text-indigo-950 font-medium">
                <div className="flex items-center gap-2">
                  <span className="material-icons text-indigo-600">info</span>
                  <span>O documento está formatado para impressão ou exportação direta em PDF pelo navegador.</span>
                </div>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all shrink-0"
                >
                  <span className="material-icons text-sm">print</span>
                  Imprimir / Salvar PDF
                </button>
              </div>

              {/* Printable Document Container */}
              <div className="printable-document bg-white border border-slate-200 rounded-3xl p-8 md:p-10 shadow-sm space-y-8 text-slate-900">
                {/* Official Church Header */}
                <div className="border-b-2 border-slate-900 pb-6 text-center space-y-1">
                  <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900">
                    IGREJA CRISTÃ MARANATA
                  </h1>
                  <h2 className="text-sm font-black uppercase tracking-widest text-indigo-900">
                    BOLETIM E RELATÓRIO OFICIAL DE CULTO
                  </h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Maranata: O Senhor Jesus Vem!
                  </p>
                </div>

                {/* Services in document */}
                {activeRecords.map((r, idx) => {
                  const d = new Date(r.date + 'T12:00:00');
                  const dateFormatted = formatDate(r.date);
                  const dayName = dayOfWeekNamesShort[d.getDay()] || '';

                  let attTotal = 0;
                  if (r.attendance) {
                    if (r.description === 'EBD') {
                      attTotal = (r.attendance.ebdMembersAdult || 0) + (r.attendance.ebdMembersCias || 0) +
                                 (r.attendance.ebdVisitorsAdult || 0) + (r.attendance.ebdVisitorsCias || 0);
                    } else {
                      attTotal = (r.attendance.members || 0) + (r.attendance.visitors || 0);
                    }
                  }

                  return (
                    <div key={r.id || idx} className="space-y-6 pt-2 pb-6 border-b border-slate-200 last:border-b-0">
                      {/* Meta information grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                        <div>
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Data</span>
                          <span className="text-sm font-black text-slate-900">{dateFormatted} ({dayName})</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Culto</span>
                          <span className="text-sm font-black text-indigo-700">{r.description}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Frequência Total</span>
                          <span className="text-sm font-black text-emerald-700">{attTotal} presentes</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Louvores</span>
                          <span className="text-sm font-black text-slate-900">{r.songs.length} entoados</span>
                        </div>
                      </div>

                      {/* Attendance breakdown */}
                      {r.attendance && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          {r.description === 'EBD' ? (
                            <>
                              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                                <span className="text-[9px] font-bold uppercase text-slate-400 block">Membros Adultos</span>
                                <span className="text-base font-black text-slate-800">{r.attendance.ebdMembersAdult || 0}</span>
                              </div>
                              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                                <span className="text-[9px] font-bold uppercase text-slate-400 block">Membros CIAS</span>
                                <span className="text-base font-black text-slate-800">{r.attendance.ebdMembersCias || 0}</span>
                              </div>
                              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                                <span className="text-[9px] font-bold uppercase text-slate-400 block">Visitantes Adultos</span>
                                <span className="text-base font-black text-slate-800">{r.attendance.ebdVisitorsAdult || 0}</span>
                              </div>
                              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                                <span className="text-[9px] font-bold uppercase text-slate-400 block">Visitantes CIAS</span>
                                <span className="text-base font-black text-slate-800">{r.attendance.ebdVisitorsCias || 0}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="p-3 bg-white border border-slate-200 rounded-xl col-span-2">
                                <span className="text-[9px] font-bold uppercase text-slate-400 block">Membros da Igreja</span>
                                <span className="text-base font-black text-slate-800">{r.attendance.members || 0}</span>
                              </div>
                              <div className="p-3 bg-white border border-slate-200 rounded-xl col-span-2">
                                <span className="text-[9px] font-bold uppercase text-slate-400 block">Visitantes / Novos</span>
                                <span className="text-base font-black text-slate-800">{r.attendance.visitors || 0}</span>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Roles Table */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                          Escala de Obreiros
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                            <span className="text-[8px] font-black uppercase text-slate-400 block">Portão / Recepção</span>
                            <span className="font-black text-slate-900">{r.roles.gate || 'Não registrado'}</span>
                          </div>
                          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                            <span className="text-[8px] font-black uppercase text-slate-400 block">Louvor</span>
                            <span className="font-black text-slate-900">{r.roles.praise || 'Não registrado'}</span>
                          </div>
                          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                            <span className="text-[8px] font-black uppercase text-slate-400 block">Palavra / Mensagem</span>
                            <span className="font-black text-slate-900">
                              {r.roles.word || 'Não registrado'}
                              {r.roles.scripture ? ` (${r.roles.scripture})` : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Songs list */}
                      {r.songs.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                            Louvores Entoados
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {r.songs.map((song, sIdx) => (
                              <div key={sIdx} className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                                <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-[10px] shrink-0">
                                  {sIdx + 1}
                                </span>
                                <span className="font-bold text-slate-800 truncate">{song}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Sign-off footer */}
                <div className="pt-8 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
                  <div>
                    <p className="font-bold text-slate-700">Responsável pelo Registro:</p>
                    <div className="w-48 h-8 border-b border-slate-300 mt-2" />
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-700">Visto Pastoral:</p>
                    <div className="w-48 h-8 border-b border-slate-300 mt-2" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VISUAL CARD GENERATION */}
          {activeFormat === 'card' && isSingle && currentRecord && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Cartão em Alta Definição (1080x1350)
                </span>
                <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg">
                  Ideal para enviar como imagem no WhatsApp
                </span>
              </div>

              {/* Hidden canvas used for rendering */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Image Preview */}
              {generatedImageUrl ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="max-w-xs md:max-w-sm rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-900 bg-slate-950">
                    <img 
                      src={generatedImageUrl} 
                      alt="Cartão de Culto" 
                      className="w-full h-auto object-cover"
                    />
                  </div>

                  <div className="flex gap-3 w-full max-w-sm">
                    <button
                      onClick={handleDownloadImage}
                      className="flex-1 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
                    >
                      <span className="material-icons text-sm">download</span>
                      Baixar Imagem
                    </button>
                    <button
                      onClick={handleShareImage}
                      className="flex-1 py-3.5 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-purple-600/30 active:scale-95 transition-all"
                    >
                      <span className="material-icons text-sm">share</span>
                      Compartilhar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center text-slate-400 font-black text-xs uppercase tracking-widest">
                  Gerando imagem do cartão...
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="no-print p-4 md:p-6 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-slate-100 transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
