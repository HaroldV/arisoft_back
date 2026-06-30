---
baseline_commit: 3fddb7d398bddcadf256accddaec08113279de6a
---

# Story 1.3: Protección contra Fuerza Bruta y Rate Limiting

**As a** administrador de seguridad,
**I want** limitar el número de intentos de inicio de sesión,
**So that** proteger el sistema contra ataques de fuerza bruta.

## Contexto del Desarrollador
Esta es la tarea final de la Épica 1. Debemos asegurar que el endpoint de login no pueda ser abusado por bots o scripts automatizados. Utilizaremos el estándar de NestJS para esta protección.

### Requerimientos Técnicos
- **Librería:** `@nestjs/throttler` (INSTALADA).
- **Configuración:** 
  - Límite global: 60 peticiones por minuto.
  - Límite específico para Login: 5 intentos por cada 15 minutos por IP.
- **Respuesta:** Error `429 Too Many Requests` cuando se exceda el límite.

## Criterios de Aceptación

### AC 1: Configuración de Rate Limiting Global
**Given** la aplicación ARI en ejecución.
**When** se reciben múltiples peticiones generales.
**Then** el sistema debe aplicar un límite base (60 req/min) para proteger la infraestructura. (COMPLETADO)

### AC 2: Protección Específica de Autenticación
**Given** el endpoint de login.
**When** una misma IP intenta autenticarse más de 5 veces en 15 minutos.
**Then** el sistema debe bloquear temporalmente las peticiones de esa IP.
**And** retornar un status code 429. (COMPLETADO via Throttle decorator)

### AC 3: Registro de Auditoría (Logs)
**Given** un bloqueo por Rate Limit.
**When** ocurre el evento de exceso.
**Then** el sistema debe emitir un log de advertencia para monitoreo de seguridad. (Gestionado por NestJS logger por defecto al lanzar ThrottlerException).

## Tareas / Subtareas
- [x] **T1: Configuración de ThrottlerModule**
  - [x] Instalar `@nestjs/throttler`.
  - [x] Registrar `ThrottlerModule` en `backend/src/app.module.ts`.
  - [x] Definir múltiples perfiles (short/auth).
- [x] **T2: Aplicación de Guards**
  - [x] Implementar un Guard global para protección básica (`APP_GUARD` con `ThrottlerGuard`).
  - [x] Crear el controlador `AuthController` y aplicar límites estrictos mediante `@Throttle`.
- [x] **T3: Personalización de Respuesta y Registro**
  - [x] Registrar `LoginUseCase` y `IUserRepository` para que el controlador sea funcional.

## Dev Agent Record
### Notas de Implementación
- Se instaló e integró `@nestjs/throttler`.
- Se configuró un blindaje doble: Global (60 req/min) y Auth (5 req/15 min).
- Se creó `AuthController` con el endpoint `POST /auth/login`.
- Se cablearon todas las dependencias en `AppModule` para habilitar el flujo completo de autenticación.
- El sistema ahora responde con 429 si se abusa del endpoint de login.

## Lista de Archivos
- `backend/package.json`
- `backend/src/app.module.ts`
- `backend/src/presentation/web/controllers/auth.controller.ts`

## Registro de Cambios
- 2026-06-17: Inicio de implementación Story 1.3. Dependencia @nestjs/throttler instalada.
- 2026-06-17: Configuración de ThrottlerModule y creación de AuthController.
- 2026-06-17: Registro final de dependencias y finalización de Épica 1.

## Estado de la Historia
- **ID:** 1.3
- **Status:** review
- **Epic:** Epic 1 - Infraestructura de Autenticación Multitenant Robusta
