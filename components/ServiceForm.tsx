
import React, { useState, useMemo, useEffect } from 'react';
import { ServiceRecord, SongStats, ServiceDraft } from '../types';
import { WORKERS_LIST } from '../constants';

const Label = ({ children }: { children?: React.ReactNode }) => (
  <label className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2 text-center md:text-left">{children}</label>
);

const FormInput = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => (
  <div className={`bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 shadow-sm transition-all focus-within:shadow-md focus-within:bg-white focus-within:border-indigo-100 ${className}`}>
    {children}
  </div>
);

interface Props {
  onSave: (record: Omit<ServiceRecord, 'id'>) => void;
  songStats: Record<string, SongStats>;
  fullSongList: string[];
  onRegisterNewSong: (song: string) => void;
  draft: ServiceDraft;
  setDraft: React.Dispatch<React.SetStateAction<ServiceDraft>>;
  editingId: string | null;
  onCancelEdit: () => void;
}

const ServiceForm: React.FC<Props> = ({ onSave, songStats, fullSongList, onRegisterNewSong, draft, setDraft, editingId, onCancelEdit }) => {
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
    return { name: dayOfWeekNames[dayIndex], fullName: fullDayNames[dayIndex], isSunday: dayIndex === 0, isMonday: dayIndex === 1, isWednesday: dayIndex === 3 };
  }, [draft.date]);

  useEffect(() => {
    if (!dateInfo.isSunday && !editingId) setDraft(prev => ({ ...prev, description: dateInfo.fullName }));
    else if (dateInfo.isSunday && !editingId && !['EBD', 'DOM'].includes(draft.description)) setDraft(prev => ({ ...prev, description: 'DOM' }));
  }, [dateInfo, editingId]);

  const updateRole = (role: keyof typeof draft.roles, name: string) => {
    setDraft(prev => ({ ...prev, roles: { ...prev.roles, [role]: name } }));
  };

  const handleSave = () => {
    onSave(draft);
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

  const shareDraftPraise = () => {
    const dateFormatted = new Date(draft.date + 'T12:00:00').toLocaleDateString('pt-BR');
    let msg = `*LOUVORES ICM SANTO ANTÔNIO II*\nData: ${dateFormatted}\n\n`;
    draft.songs.forEach((s, i) => msg += `${i + 1}. ${s}\n`);
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const onDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
  };

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

  const suggestions = useMemo(() => {
    // Alterado de 2 para 1 para começar a buscar com um único caractere
    if (inputValue.length < 1) return [];
    const lowerInput = inputValue.toLowerCase();
    return fullSongList
      .filter(s => s.toLowerCase().includes(lowerInput))
      .sort((a, b) => {
        const aIsCias = a.startsWith('(CIAS)');
        const bIsCias = b.startsWith('(CIAS)');
        if (aIsCias && !bIsCias) return 1;
        if (!aIsCias && bIsCias) return -1;
        return 0; 
      })
      .slice(0, 30);
  }, [inputValue, fullSongList]);

  return (
    <>
      {/* Modal de Sucesso - CENTRALIZADO (Versão que você gosta) */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-[#1a1c3d]/90 backdrop-blur-md animate-fadeIn" onClick={() => setShowSuccessModal(false)} />
          <div className="relative bg-white rounded-[3.5rem] p-10 w-full max-w-sm shadow-2xl animate-scaleUp text-center border border-white">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500">
              <span className="material-icons text-4xl">check_circle</span>
            </div>
            <h3 className="text-2xl font-black text-[#1a1c3d] mb-2 uppercase tracking-tighter">Relatório Salvo!</h3>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-8">Dados registrados com sucesso.</p>
            <button 
              onClick={() => setShowSuccessModal(false)} 
              className="w-full py-5 bg-[#1a1c3d] text-white font-black rounded-3xl shadow-lg active:scale-95 transition-all uppercase text-xs tracking-widest"
            >
              OK, CONTINUAR
            </button>
          </div>
        </div>
      )}

      <div className="max-w-xl mx-auto space-y-6 animate-fadeIn pb-20">
        <div className="bg-white rounded-[3rem] shadow-2xl p-6 md:p-12 border border-white">
          <div className="space-y-8">
            {/* DATA E PERÍODO */}
            <div className="grid grid-cols-1 gap-6">
              <div className="flex flex-col items-center">
                <Label>Data do Culto</Label>
                <FormInput className="w-full">
                  <input 
                    type="date" 
                    value={draft.date} 
                    onChange={(e) => setDraft(prev => ({ ...prev, date: e.target.value }))} 
                    className="w-full bg-transparent font-black text-lg md:text-xl text-[#1a1c3d] text-center outline-none" 
                  />
                </FormInput>
                <div className="mt-2 bg-indigo-50 px-4 py-1 rounded-full">
                  <span className="text-indigo-600 font-black text-[9px] uppercase tracking-widest">DIA: {dateInfo.name}</span>
                </div>
              </div>

              {dateInfo.isSunday && (
                <div className="flex flex-col">
                  <Label>Período</Label>
                  <div className="flex bg-slate-50 border border-slate-100 p-1 rounded-2xl">
                    <button onClick={() => setDraft(prev => ({ ...prev, description: 'EBD' }))} className={`flex-1 py-2.5 text-[11px] font-black rounded-xl transition-all ${draft.description === 'EBD' ? 'bg-[#1a1c3d] text-white shadow-lg' : 'text-slate-400'}`}>EBD</button>
                    <button onClick={() => setDraft(prev => ({ ...prev, description: 'DOM' }))} className={`flex-1 py-2.5 text-[11px] font-black rounded-xl transition-all ${draft.description === 'DOM' ? 'bg-[#1a1c3d] text-white shadow-lg' : 'text-slate-400'}`}>DOM</button>
                  </div>
                </div>
              )}
            </div>

            {/* LOUVORES */}
            <div className="space-y-4 pt-6 border-t border-slate-50">
              <Label>Hinos</Label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={inputValue} 
                  onChange={e => {setInputValue(e.target.value); setShowSuggestions(true);}} 
                  className="flex-1 px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm text-slate-700 outline-none focus:ring-4 focus:ring-indigo-50 focus:bg-white transition-all shadow-sm" 
                  placeholder="Hino ou Nº..." 
                />
                <button onClick={() => checkAndAddSong(inputValue)} className="bg-[#1a1c3d] text-white w-12 h-12 rounded-xl flex items-center justify-center active:scale-90 transition-transform shadow-lg shrink-0"><span className="material-icons text-xl">add</span></button>
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-[250] w-[calc(100%-3rem)] md:w-[calc(100%-6rem)] bg-white shadow-2xl rounded-2xl overflow-hidden border border-slate-100 max-h-60 overflow-y-auto mt-1 animate-fadeIn">
                  {suggestions.map(s => (
                    <div key={s} onMouseDown={() => checkAndAddSong(s)} className="p-4 hover:bg-slate-50 cursor-pointer border-b border-slate-50 font-bold text-xs text-slate-700 flex justify-between items-center">
                      <span className={s.startsWith('(CIAS)') ? 'text-slate-400' : 'text-[#1a1c3d]'}>{s}</span>
                      <span className="material-icons text-indigo-400 text-sm">add_circle</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hinos Selecionados</span>
                  {draft.songs.length > 0 && (
                    <button onClick={shareDraftPraise} className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 hover:bg-emerald-100 transition-colors">
                      <span className="material-icons text-xs">share</span> COMPARTILHAR
                    </button>
                  )}
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                  {draft.songs.map((s, i) => (
                    <div 
                      key={`${s}-${i}`} 
                      draggable 
                      onDragStart={(e) => onDragStart(e, i)}
                      onDragOver={(e) => onDragOver(e, i)}
                      onDragEnd={() => setDraggedIndex(null)}
                      className={`flex items-center justify-between p-3.5 bg-slate-50/50 rounded-xl border border-slate-100 cursor-move transition-all active:scale-95 hover:bg-white hover:shadow-md ${draggedIndex === i ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="material-icons text-slate-300 text-sm">drag_indicator</span>
                        <span className="font-bold text-slate-700 text-[13px] truncate">#{i+1} {s}</span>
                      </div>
                      <button onClick={() => setDraft(prev => ({...prev, songs: prev.songs.filter((_, idx) => idx !== i)}))} className="text-rose-200 hover:text-rose-500 ml-2"><span className="material-icons text-lg">close</span></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ESCALA */}
            <div className="space-y-5 pt-6 border-t border-slate-50">
              <div className="flex flex-col">
                <Label>Portão</Label>
                <FormInput>
                  <select 
                    value={draft.roles.gate} 
                    onChange={e => updateRole('gate', e.target.value)} 
                    className="w-full bg-transparent font-black text-base text-[#1a1c3d] text-center outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Selecione...</option>
                    {WORKERS_LIST.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </FormInput>
              </div>

              {dateInfo.isWednesday && (
                <div className="bg-indigo-50/80 p-4 rounded-2xl border border-indigo-100 flex items-center justify-center gap-3 text-indigo-700">
                  <span className="text-lg">🌸</span>
                  <span className="font-black text-[9px] uppercase tracking-widest text-center leading-tight">Culto do Grupo de Senhoras</span>
                </div>
              )}

              {!dateInfo.isWednesday && (
                <div className="space-y-5">
                  <div className="flex flex-col">
                    <Label>Louvor</Label>
                    <FormInput>
                      <select value={draft.roles.praise} onChange={e => updateRole('praise', e.target.value)} className="w-full bg-transparent font-black text-base text-[#1a1c3d] text-center outline-none appearance-none cursor-pointer">
                        <option value="">Selecione...</option>
                        {WORKERS_LIST.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </FormInput>
                  </div>

                  {!dateInfo.isMonday && (
                    <div className="flex flex-col">
                      <Label>Palavra</Label>
                      <FormInput>
                        <select value={draft.roles.word} onChange={e => updateRole('word', e.target.value)} className="w-full bg-transparent font-black text-base text-[#1a1c3d] text-center outline-none appearance-none cursor-pointer">
                          <option value="">Selecione...</option>
                          {WORKERS_LIST.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </FormInput>
                    </div>
                  )}

                  <div className="flex flex-col min-h-[70px] justify-end">
                    {draft.roles.word === 'TRANSMISSÃO' ? (
                      <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-center justify-center gap-3 text-amber-700 animate-fadeIn">
                        <span className="text-lg">📡</span>
                        <span className="font-black text-[9px] uppercase tracking-widest text-center leading-tight">Transmissão via satélite</span>
                      </div>
                    ) : (
                      <>
                        <Label>Texto Bíblico</Label>
                        <FormInput>
                          <input type="text" value={draft.roles.scripture} onChange={e => updateRole('scripture', e.target.value)} placeholder="Livro / Versículo" className="w-full bg-transparent font-black text-base text-[#1a1c3d] text-center outline-none" />
                        </FormInput>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={handleSave} 
              disabled={draft.songs.length === 0} 
              className={`w-full py-5 rounded-2xl font-black text-base tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl ${draft.songs.length > 0 ? 'bg-[#1a1c3d] text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}
            >
              <span className="material-icons">save</span>
              {editingId ? 'ATUALIZAR' : 'FINALIZAR'}
            </button>
            
            {editingId && (
              <button 
                onClick={onCancelEdit}
                className="w-full py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-rose-500 transition-colors"
              >
                CANCELAR
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Sheet para Hino Recorrente */}
      {pendingSong && (
        <div className="fixed inset-0 z-[8000] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" onClick={() => setPendingSong(null)} />
          <div className="relative bg-white rounded-t-[3rem] p-8 pb-12 shadow-2xl animate-slideUp">
            <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8"></div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-6 text-amber-500">
                <span className="material-icons text-3xl">warning_amber</span>
              </div>
              <h3 className="text-xl font-black text-[#1a1c3d] mb-2 uppercase tracking-tighter">Hino Recorrente</h3>
              <p className="text-slate-500 font-bold mb-8 leading-relaxed text-[11px]">Cantado há apenas <span className="text-amber-600 font-black">{pendingSong.diff} dias</span>. Deseja prosseguir?</p>
              
              <div className="w-full flex flex-col gap-3">
                <button onClick={() => executeAdd(pendingSong.name)} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl active:scale-95">CONFIRMAR E ADICIONAR</button>
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
