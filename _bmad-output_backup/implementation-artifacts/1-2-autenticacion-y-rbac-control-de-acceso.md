# User Story: Autenticación y RBAC (Control de Acceso)
**ID:** 1.2
**Epic:** EP-01: Fundamentos del Sistema (Infraestructura & SaaS)
**Status:** done
**Fecha:** 2026-03-11

---

## 📝 Descripción de la Historia
**Como** administrador de ARI, **quiero** gestionar usuarios con roles específicos, **para** controlar qué acciones puede realizar cada empleado.

### Contexto de Negocio
La seguridad en un ERP es vital. No todos los empleados deben tener acceso a los reportes financieros o a la configuración de la empresa. El sistema de Roles (RBAC) asegura que cada persona solo vea y haga lo que su puesto requiere.

---

## ✅ Criterios de Aceptación (BDD)

### Escenario 1: Inicio de Sesión Seguro
*   **Dado** un usuario registrado en el sistema.
*   **Cuando** ingrese su email y contraseña correctos.
*   **Entonces** el sistema debe devolver un token JWT que incluya su `id`, `tenant_id` y `role`. (COMPLETADO)

### Escenario 2: Roles Predefinidos
*   **Dado** el sistema de permisos de ARI.
*   **Cuando** se cree un usuario.
*   **Entonces** debe asignarse uno de los siguientes roles: `OWNER`, `MANAGER` o `CASHIER`. (COMPLETADO)

### Escenario 3: Protección de Endpoints
*   **Dado** un usuario con rol `CASHIER`.
*   **Cuando** intente acceder a un endpoint restringido.
*   **Entonces** el sistema debe devolver un error `403 Forbidden`. (COMPLETADO)

---

## 🏗️ Requerimientos Técnicos y Arquitectura
*   **Tecnología:** Passport.js + NestJS JWT Module.
*   **Hashing:** Implementado con `bcrypt` (12 rounds).
*   **Clean Architecture:** Implementado con Decoradores y Guards.

---

## 🎨 Estándares de Ingeniería
*   **Seguridad:** RBAC configurado para validación de tenant y rol.
*   **Naming:** Enums en mayúsculas.
*   **Testing:** Pruebas de integración para validación de roles creadas.

---

## 🛠️ Lista de Tareas para el Desarrollador
- [x] **T1.2.1:** Crear la entidad `User` y el `Role` ENUM en el esquema de base de datos.
- [x] **T1.2.2:** Implementar el servicio de Autenticación (Login) con hashing de contraseñas.
- [x] **T1.2.3:** Configurar el módulo de JWT en NestJS para la generación y validación de tokens.
- [x] **T1.2.4:** Crear el `RolesGuard` para restringir el acceso a controladores basado en el rol del usuario.
- [x] **T1.2.5:** Crear pruebas de integración para validar el acceso autorizado y denegado según el rol.

---

## 📑 Dev Agent Record (Amelia)
- **Dominio:** Se definió la entidad `User` y el enum `UserRole`.
- **Seguridad:** Implementado `AuthService` con hashing de contraseñas y `RolesGuard` para RBAC.
- **Tokens:** Configurada `JwtStrategy` para validar tokens incluyendo `tenant_id` y `role`.
- **Pruebas:** Creados tests de integración que validan el flujo de autorización.

### Archivos Creados/Modificados:
- `src/domain/entities/user.entity.ts`
- `src/application/use-cases/auth/login.dto.ts`
- `src/application/use-cases/auth/auth.service.ts`
- `src/infrastructure/auth/strategies/jwt.strategy.ts`
- `src/infrastructure/auth/decorators/roles.decorator.ts`
- `src/infrastructure/auth/guards/roles.guard.ts`
- `src/infrastructure/auth/tests/auth_integration.spec.ts`
