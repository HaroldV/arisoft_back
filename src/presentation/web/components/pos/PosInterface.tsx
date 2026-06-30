import React, { useState } from 'react';

/**
 * PosInterface Component
 * Purpose: Main sales screen (T4.1.1).
 * Layout: POS_LAYOUT.md
 */
export const PosInterface: React.FC = () => {
  const [cart, setCart] = useState<any[]>([]);
  const [isOffline, setIsOffline] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Top Bar / Resilience Indicator */}
      <div className="bg-navy-blue text-white p-2 flex justify-between items-center px-4">
        <span className="font-bold">ARI POS</span>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isOffline ? 'bg-red-500' : 'bg-green-500'}`} />
          <span className="text-xs">{isOffline ? 'Modo Offline' : 'Sincronizado'}</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Left Side: Product Search & Grid (Desktop) / Main List (Mobile) */}
        <div className="flex-1 p-4 overflow-y-auto border-r bg-white">
          <input
            type="text"
            placeholder="Buscar producto (SKU o Nombre)..."
            className="w-full p-3 border-2 border-gray-200 rounded-lg mb-4"
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Product Cards would go here */}
            <p className="text-gray-400 italic">Comienza a buscar para ver productos...</p>
          </div>
        </div>

        {/* Right Side: Cart / Checkout (Desktop) */}
        <div className="w-full md:w-96 bg-gray-50 flex flex-col border-t md:border-t-0">
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Carrito de Compra</h3>
            <div className="space-y-3">
              {cart.length === 0 ? (
                <p className="text-center text-gray-500 mt-10">El carrito está vacío</p>
              ) : (
                <p>Items del carrito...</p>
              )}
            </div>
          </div>

          {/* Totals Section (T4.1.4) */}
          <div className="p-4 bg-white border-t space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>$0.00 / 0.00 VES</span>
            </div>
            <div className="flex justify-between text-xl font-black text-blue-900">
              <span>TOTAL</span>
              <div className="text-right">
                <div>$0.00</div>
                <div className="text-sm">0.00 VES</div>
              </div>
            </div>
            <button className="w-full py-4 bg-green-600 text-white font-bold text-xl rounded-lg mt-2 hover:bg-green-700 shadow-md transition-all">
              PAGAR / CERRAR VENTA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
