# Story 2.4: Registro Real de Empresa y Propietario (Onboarding)

Status: done

## Story

**Como** dueño de negocio,
**quiero** registrar mi empresa y mi cuenta de propietario en una transacción atómica,
**para** inicializar mi periodo de prueba de 90 días con total seguridad de datos.

## Acceptance Criteria

1. **Persistencia Transaccional (AC: #1):** El registro del Tenant (empresa) y del Usuario Propietario (OWNER) debe realizarse en una única transacción atómica en PostgreSQL. Si alguna de las operaciones falla, toda la transacción debe revertirse.
2. **Validación de RIF Venezolano (AC: #2):** El sistema debe validar el formato del RIF usando la expresión regular estándar venezolana (`^[JjVvGgEe]-\d{8}-\d$`) tanto en el backend como en el frontend.
3. **Validación de Unicidad (AC: #3):** El correo electrónico y el RIF del tenant deben ser únicos globalmente en la base de datos para evitar duplicados.
4. **Hasheo de Contraseña Seguro (AC: #4):** La contraseña del propietario debe ser cifrada usando `bcrypt` con un mínimo de 12 rondas de sal antes de ser guardada en la base de datos.
5. **Cálculo de Trial Expiration (AC: #5):** Al crearse el Tenant, se debe establecer su tipo de plan en `TRIAL_90` y calcular la fecha de expiración exactamente 90 días en el futuro a partir de la fecha de creación.
6. **API Endpoint y UI (AC: #6):** Debe crearse el endpoint `POST /auth/register` en el backend y una pantalla de registro `/register` en el frontend que se conecte a este endpoint y muestre feedback claro.

## Tasks / Subtasks

- [x] **Persistencia y Dominio (AC: #1, #3, #4, #5)**
  - [x] Modificar `RegisterTenantUseCase` en el backend para usar la transacción de TypeORM.
  - [x] Integrar `TenantRepository` y `UserRepository` para realizar la persistencia real.
  - [x] Implementar la validación de unicidad de email y RIF.
  - [x] Hashear la contraseña con `bcrypt` en el backend.
  - [x] Calcular la fecha de vencimiento a 90 días.
- [x] **Controladores y DTOs (AC: #2, #6)**
  - [x] Crear el DTO `RegisterTenantDto` y aplicar validadores (`IsEmail`, `IsNotEmpty`, Regex para RIF).
  - [x] Exponer el endpoint `POST /auth/register` in `AuthController`.
- [x] **Frontend de Registro (AC: #2, #6)**
  - [x] Crear la página de registro `/register` (o actualizar `RegisterForm.tsx` en el lugar correspondiente de Next.js).
  - [x] Configurar validaciones de formulario con React Hook Form y Zod.
- [x] **Validación y Pruebas (AC: #1, #2, #3)**
  - [x] Crear pruebas de integración en el backend para verificar el registro transaccional y el aislamiento/unicidad.

## Dev Notes

### Arquitectura y Patrones (Clean Architecture)
- **Domain:** Las entidades `Tenant` y `User` ya existen en `src/domain/entities/`.
- **Use Cases:** Reemplazar la simulación de `RegisterTenantUseCase` por la lógica transaccional TypeORM.
- **Persistence:** Usar el `TenantRepository` y el `UserRepository` inyectados en NestJS.

### Componentes a Tocar
- `backend/src/application/use-cases/tenant/register-tenant.use-case.ts`
- `backend/src/presentation/web/controllers/auth.controller.ts`
- `frontend/src/app/register/page.tsx` o `frontend/src/components/auth/RegisterForm.tsx`
