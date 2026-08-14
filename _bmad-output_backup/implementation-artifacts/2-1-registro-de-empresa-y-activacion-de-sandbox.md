# User Story: Registro de Empresa y Activación de Sandbox
**ID:** 2.1
**Epic:** EP-02: Onboarding & Registro (The 3-Minute Win)
**Status:** done
**Fecha:** 2026-03-11

---

## 📝 Descripción de la Historia
**Como** dueño de negocio, **quiero** registrar mi empresa con mi RIF, **para** activar mi prueba gratuita de 90 días y empezar a usar ARI.

### Contexto de Negocio
Este es el punto de entrada al ecosistema ARI. Debemos garantizar que el registro sea extremadamente simple pero que capture los datos fiscales necesarios (RIF) para que el tenant sea legalmente válido desde el inicio. El periodo de 90 días es una promesa de valor que debe ser visible para el usuario.

---

## ✅ Criterios de Aceptación (BDD)

### Escenario 1: Registro Exitoso
*   **Dado** un usuario en la landing page de registro.
*   **Cuando** ingrese un Email válido, Nombre de Empresa y RIF (formato venezolano J-00000000-0).
*   **Entonces** el sistema debe crear un nuevo `TENANT`, un usuario con rol `OWNER` y redirigir al dashboard de bienvenida. (COMPLETADO)

### Escenario 2: Activación de Sandbox (Trial)
*   **Dado** un nuevo tenant recién registrado.
*   **Cuando** se cree el registro en la tabla `TENANTS`.
*   **Entonces** el campo `plan_type` debe ser `TRIAL_90` y la fecha `trial_expires_at` debe ser exactamente 90 días después de la fecha actual. (COMPLETADO)

### Escenario 3: Validación de RIF
*   **Dado** el formulario de registro.
*   **Cuando** el usuario ingrese un RIF con formato inválido.
*   **Entonces** el sistema debe mostrar un mensaje de error: "Por favor, ingresa un RIF válido (Ej: J-12345678-9)". (COMPLETADO)

---

## 🏗️ Requerimientos Técnicos y Arquitectura
*   **Stack:** React + NestJS.
*   **Transacción:** Lógica atómica para creación de Tenant y Usuario.
*   **UX:** Layout responsivo implementado según `ONBOARDING_LAYOUT.md`.

---

## 🎨 Estándares de Ingeniería
*   **Validación:** Regex estricto para RIF venezolano.
*   **Trial:** Cálculo dinámico de 90 días persistido en DB.

---

## 🛠️ Lista de Tareas para el Desarrollador
- [x] **T2.1.1:** Crear el formulario de registro responsivo (React) según el layout de onboarding.
- [x] **T2.1.2:** Implementar el endpoint de registro en NestJS con lógica de transacción atómica (Tenant + User).
- [x] **T2.1.3:** Implementar validador de formato RIF (Regex) en frontend y backend.
- [x] **T2.1.4:** Configurar el cálculo automático de la fecha de expiración del trial (90 días).
- [x] **T2.1.5:** Crear el componente visual "Banner de Sandbox" que muestre la cuenta regresiva de días.

---

## 📑 Dev Agent Record (Amelia)
- **Frontend:** Se creó `RegisterForm.tsx` con validaciones y `SandboxBanner.tsx` para feedback visual del trial.
- **Backend:** Implementado `RegisterTenantUseCase` que orquesta la creación atómica y el cálculo de los 90 días.
- **Validación:** Se integró Regex de RIF en el `RegisterTenantDto`.

### Archivos Creados/Modificados:
- `src/presentation/web/components/auth/RegisterForm.tsx`
- `src/application/use-cases/tenant/register-tenant.dto.ts`
- `src/application/use-cases/tenant/register-tenant.use-case.ts`
- `src/presentation/web/components/common/SandboxBanner.tsx`
