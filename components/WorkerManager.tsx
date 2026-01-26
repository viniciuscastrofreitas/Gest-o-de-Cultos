
import React, { useState } from 'react';

interface Props {
  workers: string[];
  setWorkers: React.Dispatch<React.SetStateAction<string[]>>;
}

const WorkerManager: React.FC<Props> = ({ workers, setWorkers }) => {
  const [newWorker, setNewWorker] = useState('');

  const handleAddWorker = () => {
    const name = newWorker.trim().toUpperCase();
    if (!name) return;
    if (workers.includes(name)) {
      alert("Obreiro já cadastrado!");
      return;
    }
    setWorkers(prev => [...prev, name].sort());
    setNewWorker('');
  };

  const handleRemoveWorker = (name: string) => {
    if (['VISITANTE', 'TRANSMISSÃO'].includes(name)) {
      alert("Este obreiro é reservado do sistema e não pode ser removido.");
      return;
    }
    if (window.confirm(`Remover o obreiro ${name} da lista? Isso não apagará os registros de histórico dele.`)) {
      setWorkers(prev => prev.filter(w => w !== name));
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="section-header">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <span className="material-icons text-xl">person_add</span>
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Gerenciar Obreiros</h2>
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Personalize a lista de obreiros da igreja</p>
      </div>

      <div className="card-main p-8 md:p-12">
        <div className="space-y-6">
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Novo Obreiro</label>
            <div className="flex gap-3">
              <input 
                type="text" 
                value={newWorker} 
                onChange={e => setNewWorker(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleAddWorker()}
                placeholder="NOME DO OBREIRO"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-black text-sm text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all uppercase"
              />
              <button 
                onClick={handleAddWorker}
                className="bg-indigo-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg active:scale-90 shrink-0"
              >
                <span className="material-icons">add</span>
              </button>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-50">
            <div className="flex justify-between items-center mb-6">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Lista Atual ({workers.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {workers.map(worker => (
                <div key={worker} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex justify-between items-center group">
                  <span className="font-black text-slate-700 text-xs tracking-tight">{worker}</span>
                  {!['VISITANTE', 'TRANSMISSÃO'].includes(worker) && (
                    <button 
                      onClick={() => handleRemoveWorker(worker)}
                      className="text-slate-300 hover:text-rose-500 transition-colors"
                    >
                      <span className="material-icons text-lg">close</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-indigo-600/10 border border-indigo-500/20 p-8 rounded-[2.5rem] flex items-start gap-4">
        <span className="material-icons text-indigo-400">info</span>
        <div>
          <h4 className="text-white font-black text-[10px] uppercase tracking-widest mb-1">Dica de Gestão</h4>
          <p className="text-slate-400 text-[11px] font-medium leading-relaxed">
            Ao adicionar um novo obreiro aqui, ele aparecerá imediatamente em todos os dropdowns de seleção e nos rankings de participação.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WorkerManager;
