
import React, { useState, useMemo, useEffect } from 'react';
import { ServiceRecord, SongStats, ServiceDraft } from '../types';

const Label = ({ children }: { children?: React.ReactNode }) => (
  <label className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3 text-center md:text-left">{children}</label>
);

const FormInput = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => (
  <div className={`bg-slate-50 border border-slate-200 rounded-2xl px-4 py-1 shadow-sm transition-all focus-within:shadow-md focus-within:bg-white focus-within:border-indigo-500/50 ${className}`}>
    {children}
  </div>
);

interface Props {
  onSave: (record: Omit<ServiceRecord, 'id'>) => void;
  songStats: Record<string, SongStats>;
  fullSongList: string[];
  workers: string[];
  onRegisterNewSong: (song: string) => void;
  draft: ServiceDraft;
  setDraft: React.Dispatch<React.SetStateAction<ServiceDraft>>;
  editingId: string | null;
  onCancelEdit: () => void;
}

const ServiceForm: React.FC<Props> = ({ onSave, songStats, fullSongList, workers, onRegisterNewSong, draft, setDraft, editingId, onCancelEdit }) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pendingSong, setPendingSong] = useState<{name: string, diff: number, lastDate: string} | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const dayOfWeekNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  const fullDayNames = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'];

  const dateInfo = useMemo(() => {
    const d = new Date(draft.date + 'T12:00:00');
    const dayIndex = d.getDay();
    let specialName = null;
    let specialColor = '';
    let specialEmoji = '';
    let specialBg = '';
    let specialBorder = '';
    let specialTextColor = '';
    
    if (dayIndex === 1) { 
      specialName = 'Glorificação'; 
      specialColor = 'bg-indigo-600'; 
      specialEmoji = '🎤';
      specialBg = 'bg-indigo-50/80';
      specialBorder = 'border-indigo-100';
      specialTextColor = 'text-indigo-700';
    }
    else if (dayIndex === 3) { 
      specialName = 'Senhoras'; 
      specialColor = 'bg-rose-500'; 
      specialEmoji = '🌸';
      specialBg = 'bg-rose-50/80';
      specialBorder = 'border-rose-100';
      specialTextColor = 'text-rose-700';
    }
    else if (dayIndex === 4) { 
      specialName = 'Oração'; 
      specialColor = 'bg-amber-500'; 
      specialEmoji = '🙏';
      specialBg = 'bg-amber-50/80';
      specialBorder = 'border-amber-100';
      specialTextColor = 'text-amber-700';
    }

    return { 
      name: dayOfWeekNames[dayIndex], 
      fullName: fullDayNames[dayIndex], 
      isSunday: dayIndex === 0, 
      isMonday: dayIndex === 1,
      isWednesday: dayIndex === 3,
      isThursday: dayIndex === 4,
      specialName,
      specialColor,
      specialEmoji,
      specialBg,
      specialBorder,
      specialTextColor
    };
  }, [draft.date]);

  useEffect(() => {
    if (!dateInfo.isSunday && !editingId) setDraft(prev => ({ ...prev, description: dateInfo.fullName }));
    else if (dateInfo.isSunday && !editingId && !['EBD', 'DOM'].includes(draft.description)) setDraft(prev => ({ ...prev, description: 'DOM' }));
  }, [dateInfo, editingId]);

  const updateRole = (role: keyof typeof draft.roles, name: string) => {
    setDraft(prev => ({ ...prev, roles: { ...prev.roles, [role]: name } }));
  };

  const handleShareHinosOnly = () => {
    if (draft.songs.length === 0) return;
    const d = new Date(draft.date + 'T12:00:00');
    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const text = `🎶 *LISTA DE LOUVORES - ${dateStr}*\n\n` + 
      draft.songs.map((s, i) => `${i + 1}. ${s}`).join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  const handleSave = () => {
    let finalDraft = { ...draft };
    if (dateInfo.isThursday) {
      finalDraft.roles.word = finalDraft.roles.praise;
    }
    onSave(finalDraft);
    setShowSuccessModal(true);
  };

  const checkAndAddSong = (songName: string) => {
    const name = songName.trim();
    if (!name) return;
    if (!fullSongList.includes(name)) onRegisterNewSong(name);
    
    const stats = songStats[name];
    if (stats && stats.lastDate) {
      const lastDate = new Date(stats.lastDate + 'T12:00:00');
      const today = new Date(); today.setHours(12, 0, 0, 0);
      const diffDays = Math.ceil(Math.abs(today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 30) { 
        setPendingSong({ name, diff: diffDays, lastDate: stats.lastDate }); 
        return; 
      }
    }
    executeAdd(name);
  };

  const executeAdd = (name: string) => {
    setDraft(prev => ({ ...prev, songs: [...prev.songs, name] }));
    setInputValue('');
    setShowSuggestions(false);
    setPendingSong(null);
  };

  const suggestions = useMemo(() => {
    if (inputValue.length < 1) return [];
    const lowerInput = inputValue.toLowerCase();
    return fullSongList
      .filter(s => s.toLowerCase().includes(lowerInput))
      .sort((a, b) => {
        const isCiasA = a.startsWith('(CIAS)');
        const isCiasB = b.startsWith('(CIAS)');
        if (isCiasA !== isCiasB) return isCiasA ? 1 : -1;
        return a.localeCompare(b, undefined, { numeric: true });
      })
      .slice(0, 30);
  }, [inputValue, fullSongList]);

  const onDragStart = (item: string, index: number) => setDraggedIndex(index);
  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const newSongs = [...draft.songs];
    const item = newSongs[draggedIndex];
    newSongs.splice(draggedIndex, 1);
    newSongs.splice(index, 0, item);
    setDraggedIndex(index);
    setDraft(prev => ({ ...prev, songs: newSongs }));
  };

  return (
    <>
      {showSuccessModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm animate-fadeIn" onClick={() => setShowSuccessModal(false)} />
          <div className="relative bg-white rounded-[3rem] p-10 w-full max-w-sm shadow-2xl animate-scaleUp text-center border border-slate-100">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-lg shadow-emerald-500/20">
              <span className="material-icons text-3xl">check</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Relatório Salvo!</h3>
            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-10">Sincronizado na nuvem.</p>
            <button onClick={() => setShowSuccessModal(false)} className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-xl active:scale-95 transition-all uppercase text-xs tracking-widest">OK, CONTINUAR</button>
          </div>
        </div>
      )}

      <div className="space-y-6 animate-fadeIn pb-20">
        <div className="section-header">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <span className="material-icons text-xl">{editingId ? 'edit' : 'add_circle'}</span>
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{editingId ? 'Editar Relatório' : 'Novo Relatório'}</h2>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preencha os dados do culto</p>
        </div>

        <div className="card-main p-8 md:p-12">
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-6">
              <div className="flex flex-col">
                <Label>Data do Culto</Label>
                <FormInput className="w-full">
                  <input type="date" value={draft.date} onChange={(e) => setDraft(prev => ({ ...prev, date: e.target.value }))} className="w-full bg-transparent font-black text-lg text-slate-900 text-center outline-none py-2" />
                </FormInput>
                <div className="mt-3 flex flex-wrap gap-2 justify-center">
                  <div className="bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-100">
                    <span className="text-indigo-600 font-black text-[9px] uppercase tracking-[0.2em]">dia: {dateInfo.name}</span>
                  </div>
                </div>
              </div>

              {dateInfo.isSunday && (
                <div className="flex flex-col">
                  <Label>Período</Label>
                  <div className="flex bg-slate-50 border border-slate-200 p-1 rounded-2xl">
                    <button onClick={() => setDraft(prev => ({ ...prev, description: 'EBD' }))} className={`flex-1 py-3 text-[11px] font-black rounded-xl transition-all ${draft.description === 'EBD' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>EBD</button>
                    <button onClick={() => setDraft(prev => ({ ...prev, description: 'DOM' }))} className={`flex-1 py-3 text-[11px] font-black rounded-xl transition-all ${draft.description === 'DOM' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>DOM</button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 pt-8 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <Label>Hinos do Culto</Label>
                {draft.songs.length > 0 && (
                  <button onClick={handleShareHinosOnly} className="text-emerald-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 mb-2 active:scale-95 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                    <span className="material-icons text-sm">whatsapp</span>
                    Enviar Lista
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <input type="text" value={inputValue} onChange={e => {setInputValue(e.target.value); setShowSuggestions(true);}} className="flex-1 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all placeholder:text-slate-300" placeholder="Hino ou Nº..." />
                <button onClick={() => checkAndAddSong(inputValue)} className="bg-indigo-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center active:scale-90 shadow-lg shrink-0"><span className="material-icons text-2xl">add</span></button>
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-[250] w-[calc(100%-4rem)] md:w-[calc(100%-10rem)] bg-white shadow-2xl rounded-2xl overflow-hidden border border-slate-200 max-h-60 overflow-y-auto mt-1">
                  {suggestions.map(s => (
                    <div key={s} onMouseDown={() => checkAndAddSong(s)} className="p-4 hover:bg-slate-50 cursor-pointer border-b border-slate-50 font-bold text-xs flex justify-between items-center transition-colors">
                      <span className={s.startsWith('(CIAS)') ? 'text-slate-400' : 'text-slate-900'}>{s}</span>
                      <span className="material-icons text-indigo-500 text-sm">add_circle</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                {draft.songs.map((s, i) => (
                  <div key={`${s}-${i}`} draggable onDragStart={() => onDragStart(s, i)} onDragOver={(e) => onDragOver(e, i)} className={`flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-move ${draggedIndex === i ? 'opacity-30' : ''}`}>
                    <span className="font-bold text-slate-700 text-[13px] truncate">#{i+1} {s}</span>
                    <button onClick={() => setDraft(prev => ({...prev, songs: prev.songs.filter((_, idx) => idx !== i)}))} className="text-slate-300 hover:text-rose-500"><span className="material-icons text-lg">close</span></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6 pt-8 border-t border-slate-100">
              {/* FAIXA DE IDENTIDADE DO CULTO */}
              {dateInfo.specialName && (
                <div className={`w-full py-4 px-6 ${dateInfo.specialBg} ${dateInfo.specialBorder} border rounded-2xl flex items-center justify-between shadow-sm animate-fadeIn mb-2`}>
                   <div className="flex items-center gap-3">
                     <span className="text-xl">{dateInfo.specialEmoji}</span>
                     <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${dateInfo.specialTextColor}`}>Culto de {dateInfo.specialName}</span>
                   </div>
                   <div className={`w-2 h-2 rounded-full ${dateInfo.specialColor} animate-pulse`}></div>
                </div>
              )}

              <div className="flex flex-col">
                <Label>Portão</Label>
                <FormInput>
                  <select value={draft.roles.gate} onChange={e => updateRole('gate', e.target.value)} className="w-full bg-transparent font-black text-base text-slate-900 text-center outline-none cursor-pointer py-2">
                    <option value="">Selecione...</option>
                    {workers.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </FormInput>
              </div>

              {!dateInfo.isWednesday && (
                <>
                  <div className="flex flex-col">
                    <Label>{dateInfo.isThursday ? 'Dirigente' : 'Louvor'}</Label>
                    <FormInput>
                      <select value={draft.roles.praise} onChange={e => updateRole('praise', e.target.value)} className="w-full bg-transparent font-black text-base text-slate-900 text-center outline-none cursor-pointer py-2">
                        <option value="">Selecione...</option>
                        {workers.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </FormInput>
                  </div>

                  {!dateInfo.isMonday && !dateInfo.isThursday && (
                    <div className="flex flex-col">
                      <Label>Palavra</Label>
                      <FormInput>
                        <select value={draft.roles.word} onChange={e => updateRole('word', e.target.value)} className="w-full bg-transparent font-black text-base text-slate-900 text-center outline-none cursor-pointer py-2">
                          <option value="">Selecione...</option>
                          {workers.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </FormInput>
                    </div>
                  )}

                  <div className="flex flex-col">
                    {draft.roles.word === 'TRANSMISSÃO' && !dateInfo.isMonday ? (
                      <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-center justify-center gap-3 text-amber-600"><span className="text-xl">📡</span><span className="font-black text-[10px] uppercase tracking-widest">Satélite</span></div>
                    ) : (
                      <>
                        <Label>Texto Bíblico</Label>
                        <FormInput>
                          <input type="text" value={draft.roles.scripture} onChange={e => updateRole('scripture', e.target.value)} placeholder="Livro / Versículo" className="w-full bg-transparent font-black text-base text-slate-900 text-center outline-none py-2 placeholder:text-slate-300" />
                        </FormInput>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            <button onClick={handleSave} disabled={draft.songs.length === 0 && !dateInfo.isWednesday} className={`w-full py-6 rounded-3xl font-black text-sm tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-3 shadow-2xl ${draft.songs.length > 0 || dateInfo.isWednesday ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
              <span className="material-icons">save</span>
              {editingId ? 'ATUALIZAR' : 'SALVAR RELATÓRIO'}
            </button>
          </div>
        </div>
      </div>

      {pendingSong && (
        <div className="fixed inset-0 z-[8000] flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setPendingSong(null)} />
          <div className="relative bg-white rounded-t-[3.5rem] p-10 pb-12 shadow-2xl animate-slideUp">
            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-10"></div>
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6 text-amber-500 border border-amber-100"><span className="material-icons text-4xl">warning</span></div>
              <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Hino Recorrente</h3>
              <p className="text-slate-500 font-bold mb-10 text-[11px] uppercase tracking-widest">Cantado há <span className="text-amber-500">{pendingSong.diff} dias</span>. Prosseguir?</p>
              <div className="w-full flex flex-col gap-3">
                <button onClick={() => executeAdd(pendingSong.name)} className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-xl active:scale-95">ADICIONAR MESMO ASSIM</button>
                <button onClick={() => setPendingSong(null)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">CANCELAR</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ServiceForm;
