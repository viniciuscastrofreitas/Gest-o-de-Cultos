
import React, { useRef, useState } from 'react';
import { ServiceRecord, PraiseLearningItem } from '../types';

interface Props {
  history: ServiceRecord[];
  customSongs: string[];
  learningList: PraiseLearningItem[];
  onRestore: (history: ServiceRecord[], customSongs: string[], learningList: PraiseLearningItem[]) => void;
}

const BackupRestore: React.FC<Props> = ({ history, customSongs, learningList, onRestore }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [pendingData, setPendingData] = useState<{ history: ServiceRecord[], customSongs: string[], learningList: PraiseLearningItem[] } | null>(null);

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
          setPendingData({
            history: json.history,
            customSongs: json.customSongs || [],
            learningList: json.learningList || []
          });
          setShowConfirmModal(true);
        } else {
          // Erro silencioso ou modal de erro poderia ser adicionado aqui
          console.error("Arquivo inválido.");
        }
      } catch (err) { 
        console.error("Erro ao ler arquivo.");
      } finally {
        // Limpa o input para permitir selecionar o mesmo arquivo novamente se necessário
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const executeRestore = () => {
    if (pendingData) {
      onRestore(pendingData.history, pendingData.customSongs, pendingData.learningList);
      setShowConfirmModal(false);
      setShowSuccessModal(true);
      setPendingData(null);
    }
  };

  return (
    <div className="space-y-10 animate-fadeIn max-w-4xl mx-auto pb-10">
      <div className="px-2">
        <h2 className="text-2xl font-black text-white flex items-center gap-3">
          <span className="material-icons text-indigo-400">save_alt</span>
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
            className="w-full py-6 bg-[#1a1c3d] text-white font-black rounded-[2.5rem] shadow-xl active:scale-95 transition-all text-xs tracking-widest uppercase"
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

      <div className="bg-white/5 rounded-[2.5rem] p-8 text-center border border-white/10">
         <span className="material-icons text-amber-400 text-3xl mb-4">info</span>
         <p className="text-white/60 font-medium text-[11px] leading-relaxed max-w-xs mx-auto">
           A sincronização automática via nuvem pode ser acessada diretamente no <span className="text-white font-black">topo do menu lateral</span>.
         </p>
      </div>

      {/* Modal de Confirmação de Restauração Local */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-[#1a1c3d]/95 backdrop-blur-xl animate-fadeIn" onClick={() => setShowConfirmModal(false)} />
          <div className="relative bg-white border border-white rounded-[3rem] p-10 w-full max-w-sm shadow-2xl animate-scaleUp text-center">
            <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-rose-500 shadow-xl shadow-rose-400/10">
              <span className="material-icons text-4xl">warning_amber</span>
            </div>
            <h2 className="text-[#1a1c3d] font-black text-2xl uppercase tracking-tighter">Substituir Dados?</h2>
            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-4 leading-relaxed px-4">
              Ao importar este arquivo, seus dados atuais serão <span className="text-rose-600 font-black">totalmente substituídos</span> pela versão selecionada.
            </p>
            <div className="mt-10 space-y-3">
              <button 
                onClick={executeRestore}
                className="w-full py-5 bg-rose-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"
              >
                SIM, IMPORTAR ARQUIVO
              </button>
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-[#1a1c3d] transition-all"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Sucesso de Restauração Local */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-[#1a1c3d]/90 backdrop-blur-md animate-fadeIn" onClick={() => setShowSuccessModal(false)} />
          <div className="relative bg-white rounded-[3.5rem] p-10 w-full max-w-sm shadow-2xl animate-scaleUp text-center border border-white">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500">
              <span className="material-icons text-4xl">check_circle</span>
            </div>
            <h3 className="text-2xl font-black text-[#1a1c3d] mb-2 uppercase tracking-tighter">Backup Importado!</h3>
            <p className="text-slate-600 font-bold text-[10px] uppercase tracking-[0.2em] mb-8">Seus registros foram restaurados com sucesso.</p>
            <button 
              onClick={() => setShowSuccessModal(false)} 
              className="w-full py-5 bg-[#1a1c3d] text-white font-black rounded-3xl shadow-lg active:scale-95 transition-all uppercase text-xs tracking-widest"
            >
              CONCLUÍDO
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupRestore;
