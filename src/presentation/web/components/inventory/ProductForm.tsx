import React, { useState } from 'react';

/**
 * ProductForm Component
 * Purpose: Manual entry for new products (T3.1.2).
 */
export const ProductForm: React.FC = () => {
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    costUsd: 0,
    priceUsd: 0,
    taxRate: 16.00,
    initialStock: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Creating product:', formData);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm border">
      <h3 className="text-xl font-bold text-gray-800 mb-6">Registrar Nuevo Producto</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">SKU (Código Único)</label>
          <input
            type="text"
            required
            className="mt-1 block w-full border-gray-300 rounded-md"
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Nombre del Producto</label>
          <input
            type="text"
            required
            className="mt-1 block w-full border-gray-300 rounded-md"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Costo Base (USD)</label>
          <input
            type="number"
            step="0.01"
            className="mt-1 block w-full border-gray-300 rounded-md"
            value={formData.costUsd}
            onChange={(e) => setFormData({ ...formData, costUsd: parseFloat(e.target.value) })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Precio de Venta (USD)</label>
          <input
            type="number"
            step="0.01"
            className="mt-1 block w-full border-gray-300 rounded-md"
            value={formData.priceUsd}
            onChange={(e) => setFormData({ ...formData, priceUsd: parseFloat(e.target.value) })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Tasa IVA (%)</label>
          <select
            className="mt-1 block w-full border-gray-300 rounded-md"
            value={formData.taxRate}
            onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) })}
          >
            <option value={16.00}>16% (General)</option>
            <option value={8.00}>8% (Reducido)</option>
            <option value={0.00}>0% (Exento)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Stock Inicial</label>
          <input
            type="number"
            className="mt-1 block w-full border-gray-300 rounded-md"
            value={formData.initialStock}
            onChange={(e) => setFormData({ ...formData, initialStock: parseInt(e.target.value) })}
          />
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-all"
          >
            GUARDAR E INICIAR STOCK
          </button>
        </div>
      </form>
    </div>
  );
};
