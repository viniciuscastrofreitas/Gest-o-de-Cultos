import React, { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  messageText: string;
}

export const ShareRepetitionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  messageText,
}) => {
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(messageText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = messageText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setShareError(null);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Erro ao copiar:', err);
      setShareError('Não foi possível copiar automaticamente.');
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text: messageText,
        });
        setShareError(null);
      } catch (err: unknown) {
        if ((err as Error)?.name !== 'AbortError') {
          handleOpenWhatsApp();
        }
      }
    } else {
      handleOpenWhatsApp();
    }
  };

  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(messageText);
    const url = `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs" 
        onClick={onClose} 
      />

      {/* Modal Dialog */}
      <div className="relative bg-white text-slate-900 rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 animate-scaleUp">
        {/* Header */}
        <div className="p-4 sm:p-6 pb-3 sm:pb-4 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
              <span className="material-icons text-xl sm:text-2xl">share</span>
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors shrink-0"
            title="Fechar"
            aria-label="Fechar"
          >
            <span className="material-icons text-xl">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 custom-scrollbar">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
            <span>Pré-visualização para Envio</span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
              Formatado p/ WhatsApp
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed shadow-inner max-h-[46vh] overflow-y-auto custom-scrollbar select-all">
            {messageText}
          </div>

          {shareError && (
            <p className="text-[11px] font-bold text-rose-500 bg-rose-50 px-3 py-1.5 rounded-lg">
              {shareError}
            </p>
          )}

          {copied && (
            <div className="flex items-center gap-2 text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl animate-fadeIn">
              <span className="material-icons text-sm text-emerald-600">check_circle</span>
              <span>Texto copiado com sucesso! Pronto para colar no WhatsApp.</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 pt-3 border-t border-slate-100 bg-slate-50/70 shrink-0 space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleNativeShare}
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
            >
              <span className="material-icons text-base">send</span>
              <span>Enviar no WhatsApp</span>
            </button>

            <button
              onClick={handleCopy}
              className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
            >
              <span className="material-icons text-base">
                {copied ? 'check' : 'content_copy'}
              </span>
              <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
