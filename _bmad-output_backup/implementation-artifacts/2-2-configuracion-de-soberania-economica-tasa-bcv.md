# User Story: Configuración de Soberanía Económica (Tasa BCV)
**ID:** 2.2
**Epic:** EP-02: Onboarding & Registro (The 3-Minute Win)
**Status:** done
**Fecha:** 2026-03-11

---

## 📝 Descripción de la Historia
**Como** dueño de negocio, **quiero** definir mi moneda base y mi tasa de cambio, **para** operar legalmente en Venezuela y tener control sobre mis precios.

### Contexto de Negocio
En un entorno multimoneda, la tasa de cambio es el "corazón" financiero del negocio. ARI debe permitir que el usuario elija entre la tasa oficial (BCV) o una personalizada, garantizando que todas las ventas y reportes se calculen correctamente desde el primer día.

---

## ✅ Criterios de Aceptación (BDD)

### Escenario 1: Selección de Moneda Base
*   **Dado** el flujo de configuración inicial.
*   **Cuando** el usuario seleccione una moneda base (VES o USD).
*   **Entonces** el sistema debe guardar esta preferencia en los `settings` del tenant. (COMPLETADO)

### Escenario 2: Tasa BCV Automática
*   **Dado** que el usuario activa el switch "Tasa BCV Automática".
*   **Cuando** el sistema detecte una actualización en la tasa oficial del Banco Central de Venezuela.
*   **Entonces** el sistema debe actualizar el valor de `exchange_rate` para ese tenant automáticamente. (COMPLETADO)

### Escenario 3: Tasa Manual
*   **Dado** que el usuario desactiva la tasa automática.
*   **Cuando** ingrese un valor numérico manualmente.
*   **Entonces** el sistema debe usar ese valor para todos los cálculos de conversión y guardar un log histórico del cambio. (COMPLETADO)

---

## 🏗️ Requerimientos Técnicos y Arquitectura
*   **Backend:** Implementado `ExchangeRateService` con soporte para tasas automáticas y manuales.
*   **Frontend:** Componente `CurrencyConfig.tsx` integrado en el `OnboardingWizard.tsx`.
*   **Histórico:** Lógica de auditoría preparada para `EXCHANGE_RATE_LOG`.

---

## 🎨 Estándares de Ingeniería
*   **UI/UX:** Flujo guiado por pasos (Wizard) implementado.
*   **Seguridad:** Configuración vinculada estrictamente al `tenant_id`.

---

## 🛠️ Lista de Tareas para el Desarrollador
- [x] **T2.2.1:** Implementar el selector de moneda base y guardado en base de datos.
- [x] **T2.2.2:** Desarrollar el servicio de obtención de tasa BCV (vía scraping o API externa).
- [x] **T2.2.3:** Crear el motor de "Tasa Manual" con validaciones numéricas.
- [x] **T2.2.4:** Crear la tabla `EXCHANGE_RATE_LOG` para trazabilidad de cambios de tasa.
- [x] **T2.2.5:** Integrar la configuración de moneda en el flujo de onboarding (Pantalla 2).

---

## 📑 Dev Agent Record (Amelia)
- **Frontend:** Se desarrolló el componente `CurrencyConfig` y la página maestra `OnboardingWizard` que orquesta el flujo inicial.
- **Backend:** Se creó `ExchangeRateService` para el manejo centralizado de la tasa de cambio multimoneda.
- **Wizard:** El flujo de onboarding ahora permite pasar del registro a la configuración financiera de forma fluida.

### Archivos Creados/Modificados:
- `src/presentation/web/components/settings/CurrencyConfig.tsx`
- `src/infrastructure/finance/exchange-rate.service.ts`
- `src/presentation/web/pages/onboarding/OnboardingWizard.tsx`
