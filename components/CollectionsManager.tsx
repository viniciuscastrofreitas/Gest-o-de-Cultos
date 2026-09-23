import React, { useState, useMemo } from 'react';
import { isGroupHeaderOrMarker } from '../utils/praiseCategories';

interface Props {
  praiseCollection: string[];
  setPraiseCollection: (newList: string[]) => void;
  onRenameSongInHistory: (oldName: string, newName: string) => void;
  onAddSong?: (newSong: string) => void;
  onDeleteSongFromCollection?: (songName: string) => void;
}

interface GroupDefinition { name: string; min: number; max: number; }

const CATEGORIES: GroupDefinition[] = [
  { name: "CONTRA CAPA", min: 0, max: 0 },
  { name: "CLAMOR", min: 1, max: 56 },
  { name: "INVOCAÇÃO E COMUNHÃO", min: 57, max: 96 },
  { name: "DEDICAÇÃO", min: 97, max: 200 },
  { name: "MORTE, RESSURREIÇÃO E SALVAÇÃO", min: 201, max: 294 },
  { name: "CONSOLO E ENCORAJAMENTO", min: 295, max: 385 },
  { name: "SANTIFICAÇÃO E DERRAMAMENTO DO E.S.", min: 386, max: 477 },
  { name: "VOLTA DE JESUS E ETERNIDADE", min: 478, max: 571 },
  { name: "LOUVOR", min: 572, max: 649 },
  { name: "SALMOS DE LOUVOR", min: 650, max: 665 },
  { name: "GRUPO DE LOUVOR", min: 666, max: 730 },
  { name: "CORINHOS", min: 731, max: 794 },
];

const CIAS_CATEGORIES: GroupDefinition[] = [
  { name: "CLAMOR", min: 1, max: 13 },
  { name: "INVOCAÇÃO E COMUNHÃO", min: 14, max: 22 },
  { name: "DEDICAÇÃO", min: 23, max: 59 },
  { name: "MORTE, RESSURREIÇÃO E SALVAÇÃO", min: 60, max: 108 },
  { name: "CONSOLO E ENCORAJAMENTO", min: 109, max: 132 },
  { name: "SANTIFICAÇÃO E DERRAMAMENTO DO E.S.", min: 133, max: 180 },
  { name: "VOLTA DE JESUS E ETERNIDADE", min: 181, max: 219 },
  { name: "LOUVOR", min: 220, max: 241 },
];

const CollectionsManager: React.FC<Props> = ({ 
  praiseCollection, 
  setPraiseCollection, 
  onRenameSongInHistory,
  onAddSong,
  onDeleteSongFromCollection
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newSongValue, setNewSongValue] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Estado para cadastro de Louvores Avulsos dedicado
  const [showAddAvulso, setShowAddAvulso] = useState(false);
  const [avulsoName, setAvulsoName] = useState('');
  const [useAvulsoPrefix, setUseAvulsoPrefix] = useState(false);

  // Notificação toast temporária
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [isPrincipaisExpanded, setIsPrincipaisExpanded] = useState(true);
  const [isCiasExpanded, setIsCiasExpanded] = useState(true);
  const [isAvulsosExpanded, setIsAvulsosExpanded] = useState(true);
  const [expandedSubCats, setExpandedSubCats] = useState<Record<string, boolean>>({});
  const [expandedCiasSubCats, setExpandedCiasSubCats] = useState<Record<string, boolean>>({});

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const extractNumber = (song: string): number | null => {
    const match = song.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  const { groupedMain, groupedCias, avulsos } = useMemo(() => {
    const mainGroups: Record<string, { song: string, originalIndex: number }[]> = {};
    CATEGORIES.forEach(cat => mainGroups[cat.name] = []);
    const ciasGroups: Record<string, { song: string, originalIndex: number }[]> = {};
    CIAS_CATEGORIES.forEach(cat => ciasGroups[cat.name] = []);
    const avulsosList: { song: string, originalIndex: number }[] = [];

    praiseCollection.forEach((song, index) => {
      const item = { song, originalIndex: index };
      if (searchTerm && !song.toLowerCase().includes(searchTerm.toLowerCase())) return;

      const isCias = song.startsWith('(CIAS)');
      const num = extractNumber(song);

      if (isCias) {
        if (num !== null) {
          let found = false;
          for (const cat of CIAS_CATEGORIES) {
            if (num >= cat.min && num <= cat.max) {
              ciasGroups[cat.name].push(item);
              found = true;
              break;
            }
          }
          if (!found) avulsosList.push(item);
        } else {
          avulsosList.push(item);
        }
      } else {
        if (num !== null) {
          let found = false;
          for (const cat of CATEGORIES) {
            if (num >= cat.min && num <= cat.max) {
              mainGroups[cat.name].push(item);
              found = true;
              break;
            }
          }
          if (!found) avulsosList.push(item);
        } else {
          avulsosList.push(item);
        }
      }
    });

    return { groupedMain: mainGroups, groupedCias: ciasGroups, avulsos: avulsosList };
  }, [praiseCollection, searchTerm]);

  const handleStartEdit = (index: number, value: string) => {
    setEditingIndex(index);
    setEditValue(value);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null || !editValue.trim()) return;
    const oldName = praiseCollection[editingIndex];
    const newName = editValue.trim();
    if (oldName === newName) { setEditingIndex(null); return; }

    if (isGroupHeaderOrMarker(newName)) {
      showToast('Nomes como "GRUPO DE..." são organizadores de lista e não devem ser usados em louvores.', 'error');
      return;
    }

    const newList = [...praiseCollection];
    newList[editingIndex] = newName;
    setPraiseCollection(newList);
    if (window.confirm(`Deseja atualizar o nome "${oldName}" para "${newName}" em todo o histórico?`)) {
      onRenameSongInHistory(oldName, newName);
    }
    showToast(`Louvor atualizado para "${newName}"!`);
    setEditingIndex(null);
  };

  const handleAddSong = () => {
    if (!newSongValue.trim()) return;
    const name = newSongValue.trim();

    if (isGroupHeaderOrMarker(name)) {
      showToast('Nomes como "GRUPO DE LOUVOR/SENHORAS/JOVENS" são organizadores de lista e não contam como louvores.', 'error');
      return;
    }

    if (praiseCollection.some(s => s.toLowerCase() === name.toLowerCase())) { 
      showToast('Este hino já existe na coletânea.', 'error'); 
      return; 
    }

    if (onAddSong) {
      onAddSong(name);
    } else {
      setPraiseCollection([...praiseCollection, name].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
    }

    setNewSongValue('');
    setShowAddForm(false);
    showToast(`Hino "${name}" cadastrado com sucesso!`);
  };

  const handleAddAvulsoSong = () => {
    const raw = avulsoName.trim();
    if (!raw) return;

    if (isGroupHeaderOrMarker(raw)) {
      showToast('Nomes como "GRUPO DE SENHORAS/JOVENS" são divisores de lista e não louvores avulsos.', 'error');
      return;
    }

    const finalName = useAvulsoPrefix && !raw.toUpperCase().startsWith('(AVULSO)')
      ? `(AVULSO) ${raw}`
      : raw;

    if (praiseCollection.some(s => s.toLowerCase() === finalName.toLowerCase())) {
      showToast(`O louvor "${finalName}" já está cadastrado na coletânea.`, 'error');
      return;
    }

    if (onAddSong) {
      onAddSong(finalName);
    } else {
      setPraiseCollection([...praiseCollection, finalName].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
    }

    setAvulsoName('');
    setShowAddAvulso(false);
    showToast(`Louvor avulso "${finalName}" cadastrado com sucesso! Já disponível para cantar nos cultos.`);
  };

  const handleDeleteSong = (index: number) => {
    const name = praiseCollection[index];
    if (window.confirm(`Remover "${name}" da coletânea?`)) {
      if (onDeleteSongFromCollection) {
        onDeleteSongFromCollection(name);
      } else {
        setPraiseCollection(praiseCollection.filter((_, i) => i !== index));
      }
      showToast(`"${name}" removido da coletânea.`);
    }
  };

  const renderSongItem = (item: { song: string, originalIndex: number }) => (
    <div key={item.originalIndex} className="group flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition-all">
      <div className="flex-1">
        {editingIndex === item.originalIndex ? (
          <div className="flex gap-2">
            <input 
              autoFocus
              type="text" 
              className="flex-1 px-3 py-1.5 bg-slate-50 border border-indigo-500 rounded-lg font-bold text-xs text-slate-900 outline-none"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingIndex(null); }}
            />
            <button onClick={handleSaveEdit} className="bg-emerald-500 text-white p-1.5 rounded-lg active:scale-90"><span className="material-icons text-sm">check</span></button>
            <button onClick={() => setEditingIndex(null)} className="bg-slate-200 text-slate-500 p-1.5 rounded-lg active:scale-90"><span className="material-icons text-sm">close</span></button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 text-[11px] uppercase tracking-tight truncate mr-2">{item.song}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button onClick={() => handleStartEdit(item.originalIndex, item.song)} className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Editar nome"><span className="material-icons text-base">edit</span></button>
              <button onClick={() => handleDeleteSong(item.originalIndex)} className="p-1.5 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Remover da coletânea"><span className="material-icons text-base">delete</span></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-20 relative">
      {/* Toast de Feedback */}
      {feedbackMsg && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border animate-bounce ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-900 text-emerald-100 border-emerald-500' 
            : 'bg-rose-900 text-rose-100 border-rose-500'
        }`}>
          <span className="material-icons text-lg">
            {feedbackMsg.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <p className="text-xs font-bold">{feedbackMsg.text}</p>
        </div>
      )}

      {/* Header Principal */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-1">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">Gerenciar Coletâneas</h2>
          <p className="text-[10px] text-slate-400 font-black mt-1 uppercase tracking-[0.2em]">Adicione louvores avulsos e edite o repertório</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm">search</span>
            <input 
              type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar hino..."
              className="w-full pl-11 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-slate-900 outline-none focus:border-indigo-500 shadow-2xl text-xs font-bold"
            />
          </div>
          <button 
            onClick={() => setShowAddForm(!showAddForm)} 
            className="bg-indigo-600 text-white p-4 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center shrink-0"
            title="Adicionar hino à coletânea"
          >
            <span className="material-icons">add</span>
          </button>
        </div>
      </div>

      {/* Formulário Geral de Adicionar Hino */}
      {showAddForm && (
        <div className="p-6 bg-white rounded-[2.5rem] border border-indigo-100 shadow-xl animate-scaleUp space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Adicionar Novo Hino ou Louvor</h3>
            <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600 p-1"><span className="material-icons text-base">close</span></button>
          </div>
          <p className="text-xs text-slate-500">
            Digite o nome do hino. Se for da coletânea geral, inclua o número (ex: <span className="font-mono text-indigo-600 font-bold">795 - NOME</span>). Se for louvor avulso, pode digitar apenas o nome (ex: <span className="font-mono text-amber-600 font-bold">BONDADE DE DEUS</span>).
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input 
              type="text" 
              placeholder="Ex: 000 - NOME DO HINO ou NOME DO AVULSO" 
              className="flex-1 px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 text-slate-900"
              value={newSongValue} 
              onChange={(e) => setNewSongValue(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleAddSong()}
            />
            <button onClick={handleAddSong} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">SALVAR</button>
          </div>
        </div>
      )}

      {/* Grid de Seções */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* SEÇÃO 1: Coletânea Principal */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden flex flex-col">
          <button onClick={() => setIsPrincipaisExpanded(!isPrincipaisExpanded)} className="w-full p-8 flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-100">
            <div className="flex items-center gap-4">
              <span className={`material-icons text-indigo-600 transition-transform duration-300 ${isPrincipaisExpanded ? '' : '-rotate-90'}`}>keyboard_arrow_down</span>
              <h3 className="font-black text-slate-900 uppercase tracking-[0.2em] text-xs">Coletânea Principal</h3>
            </div>
          </button>
          {isPrincipaisExpanded && (
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {CATEGORIES.map(cat => (
                <div key={cat.name} className="border border-slate-100 rounded-3xl overflow-hidden">
                  <button onClick={() => setExpandedSubCats({ ...expandedSubCats, [cat.name]: !expandedSubCats[cat.name] })} className={`w-full px-6 py-5 flex justify-between items-center transition-colors ${expandedSubCats[cat.name] ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
                    <div className="flex flex-col items-start">
                      <span className={`text-[10px] font-black tracking-widest text-left pr-4 ${expandedSubCats[cat.name] ? 'text-indigo-600' : 'text-slate-500'}`}>{cat.name}</span>
                      <span className="text-[8px] font-black text-slate-300 uppercase mt-1">{groupedMain[cat.name].length} hinos</span>
                    </div>
                    <span className="material-icons text-slate-200 text-xl">{expandedSubCats[cat.name] ? 'expand_less' : 'expand_more'}</span>
                  </button>
                  {expandedSubCats[cat.name] && (
                    <div className="p-4 grid gap-2 animate-fadeIn bg-slate-50/50">
                      {groupedMain[cat.name].length > 0 ? groupedMain[cat.name].map(renderSongItem) : <p className="py-4 text-center text-[9px] font-black text-slate-300 uppercase tracking-widest">Nenhum hino nesta categoria</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SEÇÃO 2: CIAS */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden flex flex-col">
          <button onClick={() => setIsCiasExpanded(!isCiasExpanded)} className="w-full p-8 flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-100">
            <div className="flex items-center gap-4">
              <span className={`material-icons text-emerald-600 transition-transform duration-300 ${isCiasExpanded ? '' : '-rotate-90'}`}>keyboard_arrow_down</span>
              <h3 className="font-black text-slate-900 uppercase tracking-[0.2em] text-xs">Coletânea CIAS</h3>
            </div>
          </button>
          {isCiasExpanded && (
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {CIAS_CATEGORIES.map(cat => (
                <div key={cat.name} className="border border-slate-100 rounded-3xl overflow-hidden">
                  <button onClick={() => setExpandedCiasSubCats({ ...expandedCiasSubCats, [cat.name]: !expandedCiasSubCats[cat.name] })} className={`w-full px-6 py-5 flex justify-between items-center transition-colors ${expandedCiasSubCats[cat.name] ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
                    <div className="flex flex-col items-start">
                      <span className={`text-[10px] font-black tracking-widest text-left pr-4 ${expandedCiasSubCats[cat.name] ? 'text-emerald-600' : 'text-slate-500'}`}>{cat.name}</span>
                      <span className="text-[8px] font-black text-slate-300 uppercase mt-1">{groupedCias[cat.name].length} hinos</span>
                    </div>
                    <span className="material-icons text-slate-200 text-xl">{expandedCiasSubCats[cat.name] ? 'expand_less' : 'expand_more'}</span>
                  </button>
                  {expandedCiasSubCats[cat.name] && (
                    <div className="p-4 grid gap-2 animate-fadeIn bg-slate-50/50">
                      {groupedCias[cat.name].length > 0 ? groupedCias[cat.name].map(renderSongItem) : <p className="py-4 text-center text-[9px] font-black text-slate-300 uppercase tracking-widest">Nenhum hino nesta categoria</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SEÇÃO 3: LOUVORES AVULSOS (COM ADIÇÃO DIRETA ANTES DE CANTAR) */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden flex flex-col md:col-span-2">
          <div className="w-full p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 border-b border-slate-100">
            <button 
              onClick={() => setIsAvulsosExpanded(!isAvulsosExpanded)} 
              className="flex items-center gap-4 text-left group"
            >
              <span className={`material-icons text-amber-600 transition-transform duration-300 ${isAvulsosExpanded ? '' : '-rotate-90'}`}>keyboard_arrow_down</span>
              <div>
                <h3 className="font-black text-slate-900 uppercase tracking-[0.2em] text-xs">
                  Hinos Avulsos / Fora de Categoria <span className="text-amber-600 font-extrabold">({avulsos.length})</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Louvores extras cadastrados para cantar nos cultos</p>
              </div>
            </button>

            {/* BOTÃO DEDICADO PARA ADICIONAR LOUVOR AVULSO ANTES DE CANTAR */}
            <button
              onClick={() => {
                setIsAvulsosExpanded(true);
                setShowAddAvulso(true);
              }}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-xl text-[11px] font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center gap-2 self-stretch sm:self-auto justify-center"
            >
              <span className="material-icons text-base">library_add</span>
              + Adicionar Louvor Avulso
            </button>
          </div>

          {/* PAINEL DE ADIÇÃO DE LOUVOR AVULSO */}
          {showAddAvulso && (
            <div className="p-6 bg-gradient-to-br from-amber-50/70 to-orange-50/30 border-b border-amber-200/60 animate-scaleUp">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-icons text-amber-600 text-lg">queue_music</span>
                  <h4 className="text-xs font-black text-amber-900 uppercase tracking-widest">
                    Cadastrar Louvor Avulso Antes de Cantar
                  </h4>
                </div>
                <button 
                  onClick={() => setShowAddAvulso(false)} 
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                  title="Fechar"
                >
                  <span className="material-icons text-sm">close</span>
                </button>
              </div>
              <p className="text-xs text-slate-600 mb-4 font-medium">
                Cadastre os louvores avulsos com antecedência. Eles ficarão salvos na coletânea e prontos para seleção automática quando for registrar o culto.
              </p>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Ex: BONDADE DE DEUS ou PORQUE ELE VIVE"
                    className="flex-1 px-5 py-3.5 bg-white border border-amber-200 rounded-2xl font-bold text-sm outline-none focus:border-amber-500 text-slate-900 shadow-xs"
                    value={avulsoName}
                    onChange={(e) => setAvulsoName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddAvulsoSong();
                      if (e.key === 'Escape') setShowAddAvulso(false);
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddAvulsoSong}
                      className="flex-1 sm:flex-none px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <span className="material-icons text-sm">check</span>
                      Salvar Avulso
                    </button>
                    <button
                      onClick={() => setShowAddAvulso(false)}
                      className="px-4 py-3.5 bg-white hover:bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs border border-slate-200 active:scale-95 transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>

                {/* Opção de prefixo (AVULSO) */}
                <div className="flex items-center gap-2 pt-1">
                  <label className="flex items-center gap-2 text-[11px] font-bold text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={useAvulsoPrefix}
                      onChange={(e) => setUseAvulsoPrefix(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300"
                    />
                    <span>Incluir prefixo <span className="font-mono text-amber-700 font-extrabold">(AVULSO)</span> no início do nome</span>
                  </label>
                  {avulsoName.trim() && (
                    <span className="text-[10px] font-mono text-slate-400 italic">
                      Como ficará: <span className="text-amber-800 font-bold">{useAvulsoPrefix && !avulsoName.toUpperCase().startsWith('(AVULSO)') ? `(AVULSO) ${avulsoName.trim()}` : avulsoName.trim()}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {isAvulsosExpanded && (
            <div className="p-6 sm:p-8">
              {avulsos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  {avulsos.map(renderSongItem)}
                </div>
              ) : (
                <div className="py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 p-8">
                  <span className="material-icons text-5xl text-amber-400 mb-3">library_music</span>
                  <p className="text-xs font-black text-slate-700 uppercase tracking-widest mb-1">
                    Nenhum Louvor Avulso Cadastrado
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium mb-5 max-w-sm mx-auto">
                    Cadastre louvores avulsos com antecedência para que fiquem disponíveis na lista de sugestões ao criar o culto.
                  </p>
                  <button
                    onClick={() => setShowAddAvulso(true)}
                    className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md active:scale-95 transition-all inline-flex items-center gap-2"
                  >
                    <span className="material-icons text-base">add</span>
                    Cadastrar Primeiro Louvor Avulso
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default CollectionsManager;
