import React, { useState } from 'react';

/**
 * PayrollProcessor Component
 * Purpose: Manual incidence entry and payroll closing (T6.2.1).
 * Layout: NOMINA_LAYOUT.md
 */
export const PayrollProcessor: React.FC = () => {
  const [employees, setEmployees] = useState([
    { id: '1', name: 'Juan Pérez', base: 500, extra: 0, bonus: 0, net: 480 },
    { id: '2', name: 'María Sosa', base: 600, extra: 0, bonus: 0, net: 575 },
  ]);

  return (
    <div className="p-6 bg-white rounded-lg border shadow-sm">
      <h3 className="text-xl font-bold mb-6">Procesador de Nómina - Marzo 2026</h3>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="p-3">Empleado</th>
            <th className="p-3">Salario Base</th>
            <th className="p-3">Horas Extra</th>
            <th className="p-3">Bonos</th>
            <th className="p-3">Neto a Pagar</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => (
            <tr key={emp.id} className="border-b hover:bg-gray-50">
              <td className="p-3 font-medium">{emp.name}</td>
              <td className="p-3">${emp.base}</td>
              <td className="p-3">
                <input type="number" className="w-20 border rounded p-1" defaultValue={emp.extra} />
              </td>
              <td className="p-3">
                <input type="number" className="w-20 border rounded p-1" defaultValue={emp.bonus} />
              </td>
              <td className="p-3 font-bold text-blue-900">${emp.net}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-8 flex space-x-4">
        <button className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700">
          CERRAR NÓMINA Y GENERAR RECIBOS
        </button>
        <button className="bg-gray-100 text-gray-700 px-6 py-2 rounded font-bold hover:bg-gray-200">
          GENERAR TXT BANCARIO
        </button>
      </div>
    </div>
  );
};
