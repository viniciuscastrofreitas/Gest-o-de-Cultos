
import React, { useState, useMemo } from 'react';

interface Props {
  praiseCollection: string[];
  setPraiseCollection: (newList: string[]) => void;
  onRenameSongInHistory: (oldName: string, newName: string) => void;
}

interface GroupDefinition { name: string; min: number; max: number; }

const CATEGORIES: GroupDefinition[] = [
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

const CollectionsManager: React.FC<Props> = ({ praiseCollection, setPraiseCollection, onRenameSongInHistory }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newSongValue, setNewSongValue] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [isPrincipaisExpanded, setIsPrincipaisExpanded] = useState(true);
  const [isCiasExpanded, setIsCiasExpanded] = useState(true);
  const [isAvulsosExpanded, setIsAvulsosExpanded] = useState(true);
  const [expandedSubCats, setExpandedSubCats] = useState<Record<string, boolean>>({});
  const [expandedCiasSubCats, setExpandedCiasSubCats] = useState<Record<string, boolean>>({});

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

    const newList = [...praiseCollection];
    newList[editingIndex] = newName;
    setPraiseCollection(newList);
    if (window.confirm(`Deseja atualizar o nome "${oldName}" para "${newName}" em todo o histórico?`)) {
      onRenameSongInHistory(oldName, newName);
    }
    setEditingIndex(null);
  };

  const handleAddSong = () => {
    if (!newSongValue.trim()) return;
    const name = newSongValue.trim();
    if (praiseCollection.includes(name)) { alert('Este hino já existe.'); return; }
    setPraiseCollection([...praiseCollection, name].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
    setNewSongValue('');
    setShowAddForm(false);
  };

  const handleDeleteSong = (index: number) => {
    const name = praiseCollection[index];
    if (window.confirm(`Remover "${name}" da coletânea?`)) {
      setPraiseCollection(praiseCollection.filter((_, i) => i !== index));
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
            <button onClick={handleSaveEdit} className="bg-emerald-500 text-white p-1.5 rounded-lg"><span className="material-icons text-sm">check</span></button>
            <button onClick={() => setEditingIndex(null)} className="bg-slate-200 text-slate-500 p-1.5 rounded-lg"><span className="material-icons text-sm">close</span></button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 text-[11px] uppercase tracking-tight">{item.song}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleStartEdit(item.originalIndex, item.song)} className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><span className="material-icons text-base">edit</span></button>
              <button onClick={() => handleDeleteSong(item.originalIndex)} className="p-1.5 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg"><span className="material-icons text-base">delete</span></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-1">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">Gerenciar Coletâneas</h2>
          <p className="text-[10px] text-slate-400 font-black mt-1 uppercase tracking-[0.2em]">Edite nomes e numerações do sistema</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm">search</span>
            <input 
              type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar hino..."
              className="w-full pl-11 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-slate-900 outline-none focus:border-indigo-500 shadow-2xl text-xs font-bold"
            />
          </div>
          <button onClick={() => setShowAddForm(!showAddForm)} className="bg-indigo-600 text-white p-4 rounded-2xl shadow-xl active:scale-95 transition-all"><span className="material-icons">add</span></button>
        </div>
      </div>

      {showAddForm && (
        <div className="p-6 bg-white rounded-[2.5rem] border border-indigo-100 shadow-xl animate-scaleUp">
          <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4">Adicionar Novo Hino</h3>
          <div className="flex gap-2">
            <input 
              type="text" placeholder="Ex: 000 - NOME DO HINO" 
              className="flex-1 px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500"
              value={newSongValue} onChange={(e) => setNewSongValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddSong()}
            />
            <button onClick={handleAddSong} className="bg-indigo-600 text-white px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg">SALVAR</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Principais */}
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

        {/* CIAS */}
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

        {/* Avulsos */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden flex flex-col md:col-span-2">
          <button onClick={() => setIsAvulsosExpanded(!isAvulsosExpanded)} className="w-full p-8 flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-100">
            <div className="flex items-center gap-4">
              <span className={`material-icons text-amber-600 transition-transform duration-300 ${isAvulsosExpanded ? '' : '-rotate-90'}`}>keyboard_arrow_down</span>
              <h3 className="font-black text-slate-900 uppercase tracking-[0.2em] text-xs">Hinos Avulsos / Fora de Categoria <span className="text-amber-600">({avulsos.length})</span></h3>
            </div>
          </button>
          {isAvulsosExpanded && (
            <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {avulsos.length > 0 ? avulsos.map(renderSongItem) : (
                <div className="col-span-full py-10 text-center">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhum hino avulso encontrado</p>
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
