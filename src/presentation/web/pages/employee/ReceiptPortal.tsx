import React from 'react';

/**
 * ReceiptPortal Component
 * Purpose: Employee self-service for payroll (T6.2.5).
 * Layout: NOMINA_LAYOUT.md
 */
export const ReceiptPortal: React.FC = () => {
  const receipts = [
    { id: '101', period: 'Febrero 2026', amount: '450.00 VES' },
    { id: '98', period: 'Enero 2026', amount: '450.00 VES' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h2 className="text-2xl font-bold mb-8">Mis Recibos de Pago</h2>
      <div className="grid gap-4">
        {receipts.map((r) => (
          <div key={r.id} className="flex justify-between items-center p-4 bg-white rounded-lg border shadow-sm">
            <div>
              <p className="font-bold text-gray-800">{r.period}</p>
              <p className="text-sm text-gray-500">Monto depositado: {r.amount}</p>
            </div>
            <button className="flex items-center text-blue-600 font-medium hover:underline">
              <span className="mr-2">📄</span> Descargar PDF
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
