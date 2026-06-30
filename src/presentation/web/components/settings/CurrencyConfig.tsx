import React, { useState } from 'react';

/**
 * CurrencyConfig Component
 * Purpose: Manage base currency and exchange rate mode.
 * Standard: Sovereign Economy (ST-2.2)
 */
export const CurrencyConfig: React.FC = () => {
  const [baseCurrency, setBaseCurrency] = useState<'VES' | 'USD'>('USD');
  const [isAutomatic, setIsAutomatic] = useState(true);
  const [manualRate, setManualRate] = useState('');

  const handleSave = async () => {
    console.log('Saving currency config:', { baseCurrency, isAutomatic, manualRate });
  };

  return (
    <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
      <h3 className="text-lg font-bold text-navy-blue mb-4">Configuración de Soberanía Económica</h3>
      
      <div className="space-y-6">
        {/* Base Currency Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Moneda Base de Reportes</label>
          <div className="flex space-x-4">
            <button
              onClick={() => setBaseCurrency('VES')}
              className={`px-4 py-2 rounded-md ${baseCurrency === 'VES' ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600'}`}
            >
              Bolívares (VES)
            </button>
            <button
              onClick={() => setBaseCurrency('USD')}
              className={`px-4 py-2 rounded-md ${baseCurrency === 'USD' ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600'}`}
            >
              Dólares (USD)
            </button>
          </div>
        </div>

        {/* Exchange Rate Mode */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-800">Usar tasa oficial BCV</p>
            <p className="text-xs text-gray-500">Se actualiza automáticamente cada día.</p>
          </div>
          <button
            onClick={() => setIsAutomatic(!isAutomatic)}
            className={`w-12 h-6 rounded-full transition-colors ${isAutomatic ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full transition-transform transform ${isAutomatic ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* Manual Rate Input */}
        {!isAutomatic && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tasa Manual (1 USD = X VES)</label>
            <input
              type="number"
              step="0.01"
              placeholder="Ej: 36.50"
              className="w-full border-gray-300 rounded-md shadow-sm"
              value={manualRate}
              onChange={(e) => setManualRate(e.target.value)}
            />
          </div>
        )}

        <button
          onClick={handleSave}
          className="w-full py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors"
        >
          GUARDAR CONFIGURACIÓN
        </button>
      </div>
    </div>
  );
};
