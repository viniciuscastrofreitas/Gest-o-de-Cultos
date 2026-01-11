import React, { useRef } from 'react';
import { ServiceRecord } from '../types';

interface Props {
  history: ServiceRecord[];
  customSongs: string[];
  onRestore: (history: ServiceRecord[], customSongs: string[]) => void;
}

const BackupRestore: React.FC<Props> = ({ history, customSongs, onRestore }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateBackupData = () => {
    return JSON.stringify({ history, customSongs }, null, 2);
  };

  const handleBackup = () => {
    if (history.length === 0 && customSongs.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }
    const dataStr = generateBackupData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_igreja_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json && Array.isArray(json.history)) {
          if (window.confirm("Isso substituirá seus dados atuais. Continuar?")) {
            onRestore(json.history, json.customSongs || []);
          }
        } else {
          alert("Arquivo inválido.");
        }
      } catch (err) {
        alert("Erro ao ler o arquivo.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 animate-fadeIn border border-slate-100">
      <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
        <span className="material-icons text-indigo-600">settings</span>
        Opções e Segurança
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Botão de Download */}
        <button 
          onClick={handleBackup} 
          className="flex flex-col items-center justify-center p-8 border-2 border-indigo-100 rounded-2xl hover:bg-indigo-50 transition group shadow-sm"
        >
          <span className="material-icons text-5xl text-indigo-600 mb-3 group-hover:scale-110 transition">file_download</span>
          <span className="font-bold text-indigo-800 text-base">Baixar Arquivo</span>
          <span className="text-[10px] text-slate-400 mt-1 uppercase font-black">Salvar Backup na Memória</span>
        </button>

        {/* Botão de Restaurar */}
        <button 
          onClick={() => fileInputRef.current?.click()} 
          className="flex flex-col items-center justify-center p-8 border-2 border-emerald-100 rounded-2xl hover:bg-emerald-50 transition group shadow-sm"
        >
          <span className="material-icons text-5xl text-emerald-600 mb-3 group-hover:scale-110 transition">upload_file</span>
          <span className="font-bold text-emerald-800 text-base">Restaurar Dados</span>
          <span className="text-[10px] text-slate-400 mt-1 uppercase font-black">Abrir arquivo .json</span>
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
      </div>

      <div className="mt-10 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
        <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest px-1">Estado do Sistema</h4>
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-50">
            <span className="text-sm font-bold text-slate-600">Relatórios Salvos</span>
            <span className="bg-indigo-50 px-4 py-1 rounded-full text-indigo-600 font-black text-xs border border-indigo-100">{history.length}</span>
          </div>
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-50">
            <span className="text-sm font-bold text-slate-600">Hinos Customizados</span>
            <span className="bg-indigo-50 px-4 py-1 rounded-full text-indigo-600 font-black text-xs border border-indigo-100">{customSongs.length}</span>
          </div>
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-50">
            <span className="text-sm font-bold text-slate-600">Sincronização</span>
            <span className="flex items-center gap-1.5 text-emerald-600 font-black text-[10px] uppercase">
              <span className="material-icons text-sm">verified</span> Local Ativo
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackupRestore;