# Story 3.1: Creación de Productos y Stock Inicial

Status: done

## Story

**Como** administrador de inventario,
**quiero** registrar nuevos productos e inicializar su stock mediante un diario de movimientos,
**para** garantizar que el inventario sea inmutable, auditable y preciso desde el primer día.

## Acceptance Criteria

1. **Persistencia en PostgreSQL (AC: #1):** Al crear un producto, los datos deben guardarse en la tabla `PRODUCTS` respetando el aislamiento por `tenant_id`.
2. **Diario de Movimientos Inmutable (AC: #2):** El stock inicial no se guarda como un número estático, sino como un registro de tipo `INITIAL_LOAD` en la tabla `STOCKS`.
3. **Validación de SKU Único (AC: #3):** El sistema debe impedir la creación de productos con el mismo SKU dentro del mismo tenant (pero permitirlo entre tenants distintos).
4. **API Endpoint (AC: #4):** Debe existir un endpoint `POST /inventory/products` que reciba el JSON del producto y el stock inicial.
5. **Carga Masiva (AC: #5):** Soporte para procesar una lista de productos en una sola transacción o lote, generando sus respectivos asientos en el diario.

## Tasks / Subtasks

- [x] **Infraestructura de Persistencia (AC: #1, #2, #3)**
  - [x] Implementar `ProductRepository` extendiendo de `BaseTenantRepository`.
  - [x] Implementar `StockMoveRepository` para manejar el diario de movimientos.
  - [x] Asegurar que el `tenant_id` se inyecte automáticamente en todas las operaciones.
- [x] **Capa de Aplicación (AC: #1, #2, #5)**
  - [x] Actualizar `BulkUploadProductsUseCase` para usar los repositorios reales.
  - [x] Implementar lógica de validación de SKU previa a la inserción.
  - [x] Envolver la creación del producto y el movimiento inicial en una transacción de base de datos.
- [x] **Capa de Presentación (AC: #4)**
  - [x] Crear `InventoryController` en `src/presentation/web/controllers/`.
  - [x] Definir DTOs para validación de entrada (class-validator).
  - [x] Documentar el endpoint con Swagger.
- [x] **Validación y Pruebas (AC: #1, #2, #3)**
  - [x] Crear pruebas de integración que verifiquen el aislamiento de datos (Tenant A no ve productos de Tenant B).
  - [x] Verificar que el cálculo de `current_stock` (agregación de `STOCKS`) sea correcto tras la carga inicial.

### Review Findings

- [x] [Review][Patch] Vulnerabilidad de Escalación Horizontal (x-tenant-id no validado y falta de ParseUUIDPipe) [backend/src/presentation/web/controllers/inventory.controller.ts:18]
- [x] [Review][Patch] Falta de Transaccionalidad en Carga Masiva (Riesgo de Inconsistencia) [backend/src/application/use-cases/inventory/bulk-upload-products.use-case.ts:29]
- [x] [Review][Patch] Operaciones N+1 Secuenciales de Guardado [backend/src/application/use-cases/inventory/bulk-upload-products.use-case.ts:29]
- [x] [Review][Patch] Incompatibilidad de Esquema: Columna current_stock no existe en DB [backend/src/domain/entities/product.entity.ts:31]
- [x] [Review][Patch] ProductRepository no extiende BaseTenantRepository [backend/src/infrastructure/persistence/postgresql/repositories/product.repository.ts:7]
- [x] [Review][Patch] Omisión de Validación en Petición por Lotes [backend/src/presentation/web/controllers/inventory.controller.ts:20]
- [x] [Review][Patch] Uso de as any en stockMoveRepo.save [backend/src/application/use-cases/inventory/bulk-upload-products.use-case.ts:55]
- [x] [Review][Patch] Campo description asignado a sku (Placeholder) y falta de sanitización/trim en SKU [backend/src/application/use-cases/inventory/bulk-upload-products.use-case.ts:41]

## Dev Notes

### Arquitectura y Patrones (Clean Architecture)
- **Domain:** Las entidades `Product` y `StockMove` ya existen en `src/domain/entities/`.
- **Use Cases:** La lógica base de `BulkUploadProductsUseCase` existe pero es mock. Debe actualizarse.
- **Persistence:** Usar el patrón Repository. El esquema SQL ya está en `migrations/001_initial_schema.sql`.
- **Standard:** Inmutabilidad Financiera (ST-3.1). **PROHIBIDO** hacer `UPDATE` sobre la cantidad de stock directamente; siempre usar `INSERT` en `STOCKS`.

### Componentes a Tocar
- `src/application/use-cases/inventory/bulk-upload-products.use-case.ts`
- `src/infrastructure/persistence/postgresql/repositories/` (Crear nuevos repositorios)
- `src/presentation/web/controllers/inventory.controller.ts` (Crear)

### Estándares de Testing
- Cobertura mínima del 80% en Use Cases.
- Pruebas de aislamiento de Tenant obligatorias para repositorios.

## Dev Agent Record

### Agent Model Used
Amelia (Senior Developer Agent) - Gemini 2.0 Flash

### Debug Log References
- Jest configured with ts-jest and experimental decorators enabled in tsconfig.
- Mock repositories implemented extending BaseTenantRepository.
- UseCase updated to enforce SKU uniqueness and immutable stock journaling.

### Completion Notes List
- [x] Persistencia de productos con aislamiento de tenant (AC#1).
- [x] Diario de movimientos inmutable INITIAL_LOAD (AC#2).
- [x] Validación de SKU único por tenant (AC#3).
- [x] API Endpoint POST /inventory/products con Swagger (AC#4).
- [x] Pruebas de integración para aislamiento y lógica de negocio.

### File List
- `backend/jest.config.js`
- `backend/tsconfig.json`
- `backend/src/infrastructure/persistence/postgresql/repositories/product.repository.ts`
- `backend/src/infrastructure/persistence/postgresql/repositories/stock-move.repository.ts`
- `backend/src/infrastructure/persistence/postgresql/tests/product.repository.spec.ts`
- `backend/src/infrastructure/persistence/postgresql/tests/stock-move.repository.spec.ts`
- `backend/src/application/use-cases/inventory/bulk-upload-products.use-case.ts`
- `backend/src/application/use-cases/inventory/tests/bulk-upload-products.use-case.spec.ts`
- `backend/src/presentation/web/controllers/inventory.controller.ts`
- `backend/src/presentation/web/controllers/tests/inventory.controller.spec.ts`
- `backend/src/application/use-cases/inventory/create-product.dto.ts`
- `backend/src/infrastructure/auth/strategies/jwt.strategy.ts`
- `backend/src/app.module.ts`
- `backend/src/infrastructure/auth/guards/jwt-auth.guard.ts`
- `backend/src/domain/entities/product.entity.ts`
