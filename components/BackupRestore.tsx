
import React, { useRef } from 'react';
import { ServiceRecord, PraiseLearningItem } from '../types';

interface Props {
  history: ServiceRecord[];
  customSongs: string[];
  learningList: PraiseLearningItem[];
  onRestore: (history: ServiceRecord[], customSongs: string[], learningList: PraiseLearningItem[]) => void;
}

const BackupRestore: React.FC<Props> = ({ history, customSongs, learningList, onRestore }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackup = () => {
    const dataStr = JSON.stringify({ history, customSongs, learningList }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_igreja_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json && Array.isArray(json.history)) {
          if (window.confirm("Isso substituirá seus dados atuais pelos dados do arquivo. Continuar?")) {
            onRestore(json.history, json.customSongs || [], json.learningList || []);
          }
        }
      } catch (err) { alert("Arquivo inválido."); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-10 animate-fadeIn max-w-4xl mx-auto pb-10">
      <div className="px-2">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <span className="material-icons text-indigo-600">save_alt</span>
          Arquivos de Segurança
        </h2>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Gerencie cópias manuais para segurança extra</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 flex flex-col items-center text-center group transition-all hover:shadow-2xl">
          <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center mb-8 text-indigo-600 group-hover:scale-110 transition-transform">
            <span className="material-icons text-4xl">download</span>
          </div>
          <h4 className="text-xl font-black text-[#1a1c3d] mb-3 uppercase tracking-tight">Exportar</h4>
          <p className="text-slate-400 text-[10px] font-bold uppercase mb-10 tracking-widest leading-relaxed">Crie uma cópia física dos seus dados para guardar no seu aparelho.</p>
          <button 
            onClick={handleBackup} 
            className="w-full py-6 bg-indigo-600 text-white font-black rounded-[2.5rem] shadow-xl active:scale-95 transition-all text-xs tracking-widest uppercase"
          >
            GERAR ARQUIVO JSON
          </button>
        </div>

        <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 flex flex-col items-center text-center group transition-all hover:shadow-2xl">
          <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center mb-8 text-emerald-600 group-hover:scale-110 transition-transform">
            <span className="material-icons text-4xl">upload</span>
          </div>
          <h4 className="text-xl font-black text-[#1a1c3d] mb-3 uppercase tracking-tight">Importar</h4>
          <p className="text-slate-400 text-[10px] font-bold uppercase mb-10 tracking-widest leading-relaxed">Restaurar registros a partir de um arquivo de backup anterior.</p>
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="w-full py-6 bg-emerald-500 text-white font-black rounded-[2.5rem] shadow-xl active:scale-95 transition-all text-xs tracking-widest uppercase"
          >
            SELECIONAR ARQUIVO
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
        </div>
      </div>

      <div className="bg-[#1a1c3d] rounded-[2.5rem] p-8 text-center border border-white/5">
         <span className="material-icons text-amber-400 text-3xl mb-4">info</span>
         <p className="text-white/60 font-medium text-[11px] leading-relaxed max-w-xs mx-auto">
           A sincronização automática via nuvem pode ser acessada diretamente no <span className="text-white font-black">topo do menu lateral</span>.
         </p>
      </div>
    </div>
  );
};

export default BackupRestore;
