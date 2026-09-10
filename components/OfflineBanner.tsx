import React from 'react';
import { useOnlineStatus } from '../useOnlineStatus';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 z-[9999] flex items-center gap-3 bg-amber-500 text-slate-950 font-black px-4 py-3 rounded-2xl shadow-2xl border border-amber-300 animate-toastIn">
      <div className="w-2.5 h-2.5 rounded-full bg-amber-950 animate-ping shrink-0" />
      <div className="text-xs">
        <span className="uppercase tracking-wider">Modo Offline Ativo</span>
        <p className="text-[10px] font-bold opacity-90">Seus registros continuam salvos no celular e sincronizarão ao reconectar.</p>
      </div>
    </div>
  );
};
