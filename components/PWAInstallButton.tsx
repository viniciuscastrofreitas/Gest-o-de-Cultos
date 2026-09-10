import React, { useState } from 'react';
import { usePWAInstall } from '../usePWAInstall';

interface Props {
  variant?: 'header' | 'banner' | 'menu';
}

export const PWAInstallButton: React.FC<Props> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // If already installed, don't show prompt
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (!ok) {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  const GuideModal = () => (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-fadeIn">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setShowGuideModal(false)} />
      <div className="relative bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 text-slate-900 animate-scaleUp">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black">
              <span className="material-icons text-xl">get_app</span>
            </div>
            <div>
              <h3 className="font-black text-base uppercase tracking-tight text-slate-900">Instalar no Celular</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acesso rápido e funcionamento offline</p>
            </div>
          </div>
          <button 
            onClick={() => setShowGuideModal(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
          >
            <span className="material-icons text-sm">close</span>
          </button>
        </div>

        {isIOS ? (
          <div className="space-y-4 my-4">
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              No <strong>iPhone / iPad (Safari)</strong>, você pode adicionar o app diretamente à sua tela inicial:
            </p>
            <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100 text-xs">
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">1</span>
                <p className="text-slate-700">Toque no botão <strong>Compartilhar</strong> (ícone com quadrado e seta para cima) na barra do Safari.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">2</span>
                <p className="text-slate-700">Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong> (+).</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">3</span>
                <p className="text-slate-700">Toque em <strong>"Adicionar"</strong> no canto superior direito.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 my-4">
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Instale o app para ter inicialização rápida e acesso direto como aplicativo no seu aparelho:
            </p>
            <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100 text-xs">
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">1</span>
                <p className="text-slate-700">Toque no menu do navegador (três pontinhos no topo ou na barra).</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">2</span>
                <p className="text-slate-700">Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</p>
              </div>
            </div>
            {isInstallable && (
              <button
                onClick={async () => {
                  await install();
                  setShowGuideModal(false);
                }}
                className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
              >
                <span className="material-icons text-sm">download</span>
                Instalar Agora
              </button>
            )}
          </div>
        )}

        <button
          onClick={() => setShowGuideModal(false)}
          className="w-full mt-2 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[11px] uppercase tracking-wider hover:bg-slate-200 transition-colors"
        >
          Entendido
        </button>
      </div>
    </div>
  );

  if (variant === 'banner') {
    if (bannerDismissed) return null;
    return (
      <>
        <div className="no-print mx-4 sm:mx-8 mb-6 p-4 md:p-5 bg-gradient-to-r from-indigo-900/90 via-slate-900/90 to-indigo-950/90 border border-indigo-500/30 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slideUp">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              <span className="material-icons text-2xl">install_mobile</span>
            </div>
            <div>
              <h4 className="text-white font-black text-xs md:text-sm uppercase tracking-tight">
                Instale o App de Gestão de Culto
              </h4>
              <p className="text-slate-300 text-[10px] md:text-[11px] font-medium mt-0.5">
                Abra instantaneamente da tela inicial e acesse mesmo sem internet.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
            <button
              onClick={handleClick}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/30 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span className="material-icons text-xs">get_app</span>
              Instalar App
            </button>
            <button
              onClick={() => setBannerDismissed(true)}
              className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition-colors"
              title="Dispensar"
            >
              <span className="material-icons text-sm">close</span>
            </button>
          </div>
        </div>
        {showGuideModal && <GuideModal />}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="no-print px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95"
        title="Instalar Aplicativo no Aparelho"
      >
        <span className="material-icons text-xs text-indigo-400">install_mobile</span>
        <span className="hidden sm:inline">Instalar App</span>
      </button>
      {showGuideModal && <GuideModal />}
    </>
  );
};
