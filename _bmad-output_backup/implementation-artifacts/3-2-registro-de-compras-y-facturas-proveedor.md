# Story 3.2: Registro de Compras y Facturas de Proveedores

Status: done

## Story

**Como** administrador de inventario o compras,  
**quiero** registrar facturas de proveedores asociando los productos recibidos, su costo de adquisición y el comprobante físico,  
**para** respaldar legalmente las entradas al almacén y evitar registros ficticios o huérfanos.

## Acceptance Criteria

1. **Trazabilidad y Comprobante (AC: #1):** La tabla `PURCHASE_INVOICES` debe contar con la columna `proof_file_path` (VARCHAR, nullable) para guardar la ruta del comprobante físico subido.
2. **Atribución de Usuario (AC: #2):** El registro en `PURCHASE_INVOICES` y los correspondientes asientos en `STOCKS` deben registrar obligatoriamente la columna `created_by_user_id` (UUID) para identificar qué usuario del tenant registró la compra.
3. **Asiento Contable Inmutable (AC: #3):** Por cada línea de la factura de compra, se debe insertar un registro en `STOCKS` con `type: 'PURCHASE'`, la cantidad en positivo, el costo de compra unitario, y las referencias `source_type: 'PURCHASE_INVOICE'`, `source_id: purchase_invoice.id` y `created_by_user_id`.
4. **Actualización de Costo (AC: #4):** El registro de la factura debe actualizar el campo `cost_usd` del producto en la tabla `PRODUCTS` para reflejar el último costo de compra.
5. **API Endpoint Transaccional (AC: #5):** Exposición de `POST /inventory/purchases` protegido por JWT que reciba los metadatos de la factura, el comprobante y el detalle de ítems, procesando todo dentro de una transacción PostgreSQL única.

## Tasks / Subtasks

- [x] **Base de Datos**
  - [x] Crear migración SQL `004_purchase_invoices.sql` para definir las tablas `PURCHASE_INVOICES`, `PURCHASE_ITEMS` con las columnas `proof_file_path` y `created_by_user_id`.
  - [x] Alterar la tabla `STOCKS` para agregar `source_type` (VARCHAR), `source_id` (UUID), `justification` (TEXT, nullable) y `created_by_user_id` (UUID, nullable).
- [x] **Capa del Dominio & Persistencia**
  - [x] Definir las entidades `PurchaseInvoice` y `PurchaseItem`.
  - [x] Crear `PurchaseInvoiceRepository` heredando de `BaseTenantRepository` y con alcance de solicitud (`Scope.REQUEST`).
- [x] **Capa de Aplicación**
  - [x] Crear el caso de uso `RegisterPurchaseUseCase` para procesar la transacción de compra de forma atómica.
- [x] **Capa de Presentación**
  - [x] Agregar el endpoint `POST /inventory/purchases` en `InventoryController` validando la sesión JWT y el isolation de tenant.
  - [x] Crear DTOs de validación con class-validator.
- [x] **Validación y Pruebas**
  - [x] Crear pruebas de integración para validar la transacción de compra, la inmutabilidad de los asientos contables en `STOCKS` y la actualización del costo en `PRODUCTS`.

## Dev Notes

### Arquitectura y Patrones (Clean Architecture)
- **Domain:** Las nuevas entidades `PurchaseInvoice` y `PurchaseItem` deben crearse en `src/domain/entities/`.
- **Use Cases:** La lógica de negocio para registrar la compra debe crearse en `src/application/use-cases/inventory/register-purchase.use-case.ts`.
- **Persistence:** Usar el patrón Repository. El esquema SQL debe agregarse como migración en `migrations/004_purchase_invoices.sql`.

### Estándares de Testing
- Cobertura mínima del 80% en el Use Case.
- Pruebas de aislamiento de Tenant obligatorias para el repositorio.

## Dev Agent Record

### Agent Model Used
Mary (Business Analyst) - proposed

### Completion Notes List
- [x] Trazabilidad de factura y comprobante cargado (AC#1).
- [x] Atribución de autor de registro (AC#2).
- [x] Asiento contable de entrada inmutable en diario (AC#3).
- [x] Actualización de costo en catálogo de productos (AC#4).
- [x] API Endpoint POST /inventory/purchases transaccional (AC#5).

### File List
- `backend/src/infrastructure/persistence/postgresql/migrations/004_purchase_invoices.sql`
- `backend/src/domain/entities/purchase-invoice.entity.ts`
- `backend/src/domain/entities/purchase-item.entity.ts`
- `backend/src/domain/entities/product.entity.ts`
- `backend/src/domain/entities/stock-move.entity.ts`
- `backend/src/infrastructure/persistence/postgresql/repositories/purchase-invoice.repository.ts`
- `backend/src/infrastructure/persistence/postgresql/repositories/product.repository.ts`
- `backend/src/application/use-cases/inventory/register-purchase.dto.ts`
- `backend/src/application/use-cases/inventory/register-purchase.use-case.ts`
- `backend/src/app.module.ts`
- `backend/src/presentation/web/controllers/inventory.controller.ts`
- `backend/src/application/use-cases/inventory/tests/register-purchase.use-case.spec.ts`
- `backend/src/presentation/web/controllers/tests/inventory.controller.spec.ts`
