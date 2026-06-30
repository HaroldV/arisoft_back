import React, { useState } from 'react';

/**
 * RegisterForm Component
 * Purpose: Capture tenant information for the 90-day trial.
 * Layout: ONBOARDING_LAYOUT.md (The Gateway)
 */
export const RegisterForm: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    companyName: '',
    taxId: '', // RIF
  });

  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Logic for T2.1.3 (RIF Validation) will be added here
    console.log('Submitting registration:', formData);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-navy-blue mb-4">Comenzar mi prueba de 90 días</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            required
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Nombre de Empresa</label>
          <input
            type="text"
            required
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">RIF (V-00000000-0)</label>
          <input
            type="text"
            required
            placeholder="J-12345678-9"
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            value={formData.taxId}
            onChange={(e) => setFormData({ ...formData, taxId: e.target.value.toUpperCase() })}
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          className="w-full py-2 px-4 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors"
        >
          REGISTRAR MI EMPRESA
        </button>
      </form>
    </div>
  );
};
