import React from 'react';

interface SandboxBannerProps {
  daysRemaining: number;
}

/**
 * SandboxBanner Component
 * Purpose: Persistent indicator of trial status.
 * Standard: UX/UI (Trial Awareness)
 */
export const SandboxBanner: React.FC<SandboxBannerProps> = ({ daysRemaining }) => {
  return (
    <div className="w-full bg-amber-100 border-b border-amber-200 py-2 px-4 flex justify-center items-center space-x-2">
      <span className="text-amber-800 font-medium">
        ⚠️ Modo de Prueba: Te quedan <span className="font-bold">{daysRemaining} días</span> de acceso total.
      </span>
      <button className="text-sm bg-amber-600 text-white px-3 py-1 rounded hover:bg-amber-700 transition-colors">
        SUSCRIBIRME AHORA
      </button>
    </div>
  );
};
