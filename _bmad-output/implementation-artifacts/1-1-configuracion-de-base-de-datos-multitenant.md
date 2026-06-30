# User Story: Configuración de Base de Datos Multitenant
**ID:** 1.1
**Epic:** EP-01: Fundamentos del Sistema (Infraestructura & SaaS)
**Status:** done
**Fecha:** 2026-03-11

---

## 📝 Descripción de la Historia
**Como** sistema, **quiero** que todas las tablas transaccionales incluyan un `tenant_id`, **para** garantizar el aislamiento total de datos entre empresas.

### Contexto de Negocio
ARI opera bajo un modelo SaaS donde múltiples empresas (tenants) comparten la misma infraestructura. Es crítico que los datos de una empresa jamás sean visibles para otra. Esta historia establece la base de seguridad para todo el ERP.

---

## ✅ Criterios de Aceptación (BDD)

### Escenario 1: Aislamiento de Datos por Tenant
*   **Dado** que el sistema utiliza una base de datos PostgreSQL.
*   **Cuando** se creen las tablas maestras y transaccionales (`TENANTS`, `USERS`, `PRODUCTS`, `SALES`, `STOCKS`).
*   **Entonces** cada tabla debe incluir una columna `tenant_id` de tipo UUID no nula. (COMPLETADO)

### Escenario 2: Middleware de Inyección Automática
*   **Dado** un backend desarrollado en NestJS.
*   **Cuando** se realice cualquier consulta a la base de datos desde un endpoint autenticado.
*   **Entonces** un Middleware o Interceptor debe inyectar automáticamente el filtro `WHERE tenant_id = current_tenant_id`. (COMPLETADO)

### Escenario 3: Rendimiento en Consultas
*   **Dado** el alto volumen de datos transaccionales esperado.
*   **Cuando** se realicen búsquedas filtradas por empresa.
*   **Entonces** deben existir índices compuestos que incluyan `tenant_id` en todas las tablas principales. (COMPLETADO)

---

## 🏗️ Requerimientos Técnicos y Arquitectura
*   **Stack:** Node.js (NestJS) + PostgreSQL.
*   **Modelo Multitenant:** Base de datos compartida con Esquema Discriminador (`tenant_id`).
*   **Seguridad:** Implementación de Interceptor para inyección de `tenant_id`.
*   **Clean Architecture:** Implementado en la capa de `Infrastructure`.

---

## 🎨 Estándares de Ingeniería
*   **TypeScript:** Uso estricto de tipos.
*   **Naming:** Tablas en PLURAL y MAYÚSCULAS.
*   **Testing:** Unit tests creados para validar inyección de `tenant_id`.

---

## 🛠️ Lista de Tareas para el Desarrollador
- [x] **T1.1.1:** Configurar el esquema inicial de PostgreSQL con la columna `tenant_id` (UUID) en tablas maestras.
- [x] **T1.1.2:** Implementar Middleware/Interceptor en NestJS para inyección automática de `tenant_id`.
- [x] **T1.1.3:** Configurar índices compuestos (`id`, `tenant_id`) en tablas transaccionales.
- [x] **T1.1.4:** Crear Unit Test que valide el aislamiento de datos entre dos `tenant_id` distintos.
- [x] **T1.1.5:** Documentar los nuevos endpoints en Swagger asegurando que el parámetro `tenant_id` no sea requerido manualmente por el cliente.

---

## 📑 Dev Agent Record (Amelia)
- **Implementación:** Se creó el archivo de migración SQL inicial con las tablas `TENANTS`, `USERS`, `PRODUCTS`, `SALES` y `STOCKS`. Todas incluyen la columna `tenant_id`.
- **Seguridad:** Se implementó `TenantInterceptor` para extraer e inyectar el `tenant_id` desde el JWT.
- **Pruebas:** Se crearon Unit Tests en `tenant_isolation.spec.ts` validando la inyección y el manejo de errores.
- **Documentación:** Se configuró el archivo base de Swagger en `swagger.config.ts`.
- **🔥 AI Code Review Fixes (Aplicados):** 
  - Se reemplazó el interceptor pasivo por `BaseTenantRepository` que inyecta *forzosamente* la condición `tenant_id` en las queries, resolviendo un riesgo crítico de fuga de datos.
  - Se actualizaron las pruebas en `tenant_isolation.spec.ts` para atacar directamente el repositorio base y verificar el comportamiento adversarial (intento de inyección de tenant falso).
  - Se documentó explícitamente en Swagger la inyección automática del token.
  - Se añadieron índices compuestos `(tenant_id, ...)` en la migración SQL para optimizar consultas de alto volumen.

### Archivos Creados/Modificados:
- `src/infrastructure/persistence/postgresql/migrations/001_initial_schema.sql`
- `src/infrastructure/common/interceptors/tenant.interceptor.ts`
- `src/infrastructure/persistence/postgresql/repositories/base-tenant.repository.ts`
- `src/infrastructure/persistence/postgresql/tests/tenant_isolation.spec.ts`
- `src/infrastructure/common/swagger/swagger.config.ts`
