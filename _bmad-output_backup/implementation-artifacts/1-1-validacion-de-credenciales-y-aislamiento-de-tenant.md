---
baseline_commit: 3fddb7d398bddcadf256accddaec08113279de6a
---

# Story 1.1: Validación de Credenciales y Aislamiento de Tenant

**As a** sistema de seguridad,
**I want** validar las credenciales del usuario y su pertenencia a un tenant,
**So that** asegurar que solo personal autorizado acceda a los datos de su empresa.

## Contexto del Desarrollador
Esta es la primera historia de la Épica de Autenticación Robusta. Debemos implementar la lógica de validación fundamental que servirá de base para la emisión de tokens JWT. ARI es un sistema multitenant, por lo que la validación SIEMPRE debe incluir el identificador de la empresa.

### Requerimientos Técnicos
- **Framework:** NestJS
- **Seguridad:** Bcrypt para comparación de contraseñas.
- **Multitenancy:** Validación obligatoria de `tenant_id`.
- **Persistencia:** PostgreSQL vía repositorios de infraestructura.

## Criterios de Aceptación

### AC 1: Validación de Existencia y Pertenencia
**Given** un email, password y tenant_id.
**When** el usuario intenta iniciar sesión.
**Then** el sistema debe buscar al usuario por email y verificar que su `tenant_id` coincida con el proporcionado.
**And** si el usuario no existe o el tenant es incorrecto, debe retornar un error 401.

### AC 2: Verificación de Contraseña Insegura
**Given** un usuario encontrado correctamente en el tenant.
**When** se compara la contraseña proporcionada con el hash almacenado.
**Then** el sistema debe usar `AuthService.comparePassword` (bcrypt).
**And** si la contraseña es incorrecta, debe retornar un error 401.

### AC 3: Usuario Desactivado
**Given** credenciales válidas.
**When** el estado del usuario es "inactive".
**Then** el sistema debe denegar el acceso con un error descriptivo (401 o 403 según política).

## Tareas / Subtareas
- [x] **T1: Infraestructura de Pruebas**
  - [x] Crear test unitario para `LoginUseCase` en `backend/src/application/use-cases/auth/login.use-case.spec.ts`.
  - [x] Definir escenarios de prueba para AC1, AC2 y AC3 (RED phase).
- [x] **T2: Implementación de Lógica Core**
  - [x] Crear/Actualizar `LoginUseCase` inyectando `UserRepository` y `AuthService`.
  - [x] Implementar método `execute` con validación de tenant y email.
  - [x] Implementar comparación de hash de contraseña (GREEN phase).
- [x] **T3: Refactorización y Seguridad**
  - [x] Asegurar mensajes de error genéricos para evitar enumeración de cuentas.
  - [x] Validar que todas las pruebas pasen (REFACTOR phase).

## Dev Agent Record
### Plan de Implementación
1. **Red:** Escribir pruebas que fallen para la validación de email, tenant y contraseña. (COMPLETADO)
2. **Green:** Implementar la lógica mínima en `LoginUseCase` para satisfacer los tests. (COMPLETADO)
3. **Refactor:** Limpiar el código y asegurar el cumplimiento de las normas de seguridad. (COMPLETADO)

### Notas de Implementación
- Se implementó `LoginUseCase` siguiendo Clean Architecture.
- Se introdujo `IUserRepository` en la capa de dominio para desacoplar la persistencia.
- Se implementó `UserRepository` en la capa de infraestructura extendiendo de `BaseTenantRepository` para garantizar el aislamiento de datos (Multitenancy).
- Se utiliza `AuthService` para la comparación segura de contraseñas con bcrypt.
- Todos los tests unitarios pasan (6/6).

## Guía de Implementación
1. Implementar `LoginUseCase` en `backend/src/application/use-cases/auth/`.
2. Utilizar el `UserRepository` para buscar el usuario.
3. Inyectar `AuthService` para la comparación de hashes.
4. Asegurar que el error retornado no de pistas sobre si falló el email o la contraseña (Seguridad).

## Lista de Archivos
- `backend/src/domain/repositories/user.repository.interface.ts`
- `backend/src/application/use-cases/auth/login.use-case.ts`
- `backend/src/application/use-cases/auth/login.use-case.spec.ts`
- `backend/src/infrastructure/persistence/postgresql/repositories/user.repository.ts`

## Registro de Cambios
- 2026-06-17: Inicio de implementación de Story 1.1.
- 2026-06-17: Implementación completa de lógica de validación y multitenancy. Tests pasando.

## Estado de la Historia
- **ID:** 1.1
- **Status:** review
- **Epic:** Epic 1 - Infraestructura de Autenticación Multitenant Robusta
