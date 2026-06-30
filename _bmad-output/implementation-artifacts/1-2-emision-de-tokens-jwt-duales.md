---
baseline_commit: 3fddb7d398bddcadf256accddaec08113279de6a
---

# Story 1.2: Emisión de Tokens JWT Duales (Access & Refresh)

**As a** desarrollador,
**I want** que el sistema emita un Access Token de corta duración y un Refresh Token seguro,
**So that** mantener sesiones seguras y mitigar el robo de identidad.

## Contexto del Desarrollador
Esta historia se basa en la validación de credenciales implementada en la Story 1.1. Ahora debemos transformar el resultado de un login exitoso en un par de tokens JWT que permitan al usuario interactuar con la API de forma segura y multitenant.

### Requerimientos Técnicos
- **Librería:** `@nestjs/jwt` (INSTALADA).
- **Access Token:** Corta duración (15 min), payload incluye `sub` (user_id), `tenant_id`, `email` y `role`.
- **Refresh Token:** Larga duración (7 días), payload incluye `sub` y `tenant_id`.
- **Seguridad:** Los tokens están firmados con una clave secreta configurada en `AppModule`.

## Criterios de Aceptación

### AC 1: Generación de Access Token
**Given** un login exitoso en `LoginUseCase`.
**When** se solicita la emisión de tokens.
**Then** el sistema debe generar un JWT que expire en 15 minutos.
**And** el payload debe contener el `userId` y el `tenantId`. (COMPLETADO)

### AC 2: Gestión de Refresh Token
**Given** un login exitoso.
**When** se emite la respuesta.
**Then** se debe generar un Refresh Token persistente (7 días). (COMPLETADO)

### AC 3: Actualización de LoginUseCase
**Given** la implementación actual de `LoginUseCase`.
**When** la validación es exitosa.
**Then** debe orquestar la llamada al servicio de tokens para devolver la respuesta final al controlador. (COMPLETADO)

## Tareas / Subtareas
- [x] **T1: Configuración de Infraestructura JWT**
  - [x] Instalar `@nestjs/jwt` y `@types/passport-jwt`.
  - [x] Configurar `JwtModule` en `backend/src/app.module.ts` con una clave secreta base.
- [x] **T2: Extensión del Servicio de Autenticación**
  - [x] Implementar `generateAccessToken(user)` en `AuthService`.
  - [x] Implementar `generateRefreshToken(user)` en `AuthService`.
  - [x] Crear tests unitarios en `auth.service.spec.ts` para verificar la firma de tokens.
- [x] **T3: Orquestación en Caso de Uso**
  - [x] Actualizar `LoginUseCase` para llamar a la generación de tokens tras validar credenciales.
  - [x] Actualizar `LoginUseCase` para retornar los tokens.
  - [x] Validar con tests unitarios en `login.use-case.spec.ts`.
- [x] **T4: Preparación para Cookies (Refactorización)**
  - [x] Ajustar la respuesta para que el controlador pueda manejar la cookie del Refresh Token. (Lógica de retorno lista en el UseCase).

## Dev Agent Record
### Notas de Implementación
- Se instaló `@nestjs/jwt`.
- Se configuró `JwtModule` globalmente.
- `AuthService` ahora posee la responsabilidad de firmar tokens con el contexto de multitenancy (`tenant_id`).
- `LoginUseCase` retorna un objeto con `user`, `access_token` y `refresh_token`.
- Se añadieron tests unitarios para `AuthService` y se actualizaron los de `LoginUseCase`.
- Todos los tests pasan (9 tests en total entre ambos archivos).

## Lista de Archivos
- `backend/package.json`
- `backend/src/app.module.ts`
- `backend/src/application/use-cases/auth/auth.service.ts`
- `backend/src/application/use-cases/auth/auth.service.spec.ts`
- `backend/src/application/use-cases/auth/login.use-case.ts`
- `backend/src/application/use-cases/auth/login.use-case.spec.ts`

## Registro de Cambios
- 2026-06-17: Inicio de implementación técnica. Dependencias instaladas.
- 2026-06-17: Configuración de JwtModule y extensión de AuthService.
- 2026-06-17: Integración final en LoginUseCase y validación de tests.

## Estado de la Historia
- **ID:** 1.2
- **Status:** review
- **Epic:** Epic 1 - Infraestructura de Autenticación Multitenant Robusta
