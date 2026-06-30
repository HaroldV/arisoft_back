import React, { useState } from 'react';
import { RegisterForm } from '../../components/auth/RegisterForm';
import { CurrencyConfig } from '../../components/settings/CurrencyConfig';

/**
 * OnboardingWizard Page
 * Purpose: Guided flow for new businesses (T2.2.5).
 * Layout: ONBOARDING_LAYOUT.md
 */
export const OnboardingWizard: React.FC = () => {
  const [step, setStep] = useState(1);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      {/* Progress Indicator */}
      <div className="mb-8 flex space-x-2">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`w-3 h-3 rounded-full ${step >= s ? 'bg-blue-600' : 'bg-gray-300'}`}
          />
        ))}
      </div>

      <div className="w-full max-w-2xl">
        {step === 1 && (
          <div>
            <RegisterForm />
            <button
              onClick={() => setStep(2)}
              className="mt-4 text-blue-600 font-medium hover:underline block mx-auto"
            >
              Ya me registré, pasar a configuración
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <CurrencyConfig />
            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(1)} className="text-gray-500">Volver</button>
              <button onClick={() => setStep(3)} className="bg-blue-600 text-white px-6 py-2 rounded-md font-bold">Continuar</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Carga de Inventario</h2>
            <p className="text-gray-600 mb-6">Próximamente: Carga masiva y escaneo de productos.</p>
            <button onClick={() => setStep(4)} className="bg-blue-600 text-white px-6 py-2 rounded-md font-bold">Saltar por ahora</button>
          </div>
        )}

        {step === 4 && (
          <div className="text-center p-8 bg-blue-50 rounded-xl border-2 border-dashed border-blue-200">
            <h2 className="text-3xl font-extrabold text-blue-900 mb-4">¡Todo listo para ARI!</h2>
            <p className="text-blue-700 mb-8">Comienza a transformar tu negocio hoy mismo.</p>
            <button className="bg-blue-600 text-white px-10 py-4 rounded-full text-xl font-bold shadow-lg hover:bg-blue-700 transition-all">
              IR AL PUNTO DE VENTA (POS)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
