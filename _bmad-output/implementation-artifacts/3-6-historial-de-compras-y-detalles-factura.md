# Story 3.6: Historial de Compras y Detalles de Facturas

Status: done

## Story

**Como** auditor de inventario,  
**quiero** consultar las facturas de compras registradas y descargar su comprobante,  
**para** realizar conciliaciones de auditoría frente al inventario físico.

## Acceptance Criteria

1. **Historial de Facturas (AC: #1):** Endpoint `GET /inventory/purchases` para listar todas las facturas de compra del tenant (número de factura, proveedor, monto total, comprobante, fecha, y usuario que registró).
2. **Detalle de Compra (AC: #2):** Endpoint `GET /inventory/purchases/:id` que devuelva los detalles de los productos comprados (SKU, nombre, cantidad y costo unitario) y la ruta del archivo adjunto.

## Tasks / Subtasks

- [x] **Capa del Dominio & Persistencia**
  - [x] Implementar consultas de listado y de detalle con joins para obtener los productos de cada línea de la factura.
- [x] **Capa de Aplicación**
  - [x] Crear el caso de uso `GetPurchaseHistoryUseCase` (o integrarlo directamente en consultas del repositorio).
  - [x] Crear el caso de uso `GetPurchaseDetailUseCase` para obtener la factura por ID validando el aislamiento del tenant.
- [x] **Capa de Presentación**
  - [x] Exponer los endpoints `GET /inventory/purchases` y `GET /inventory/purchases/:id` en `InventoryController`.
- [x] **Validación y Pruebas**
  - [x] Crear pruebas unitarias y de integración para validar que un tenant no pueda consultar facturas de compras de otro tenant.

## Dev Notes

### Arquitectura y Patrones (Clean Architecture)
- **Controller:** endpoints en `InventoryController`.
- **Authorization:** protegidos por JwtAuthGuard y módulos correspondientes.

## Dev Agent Record

### Agent Model Used
Mary (Business Analyst) - proposed

### Completion Notes List
- [x] Endpoint de historial de facturas de compra (AC#1).
- [x] Endpoint de detalle de compra con líneas y comprobante (AC#2).

### File List
- `backend/src/infrastructure/persistence/postgresql/repositories/purchase-invoice.repository.ts`
- `backend/src/presentation/web/controllers/inventory.controller.ts`
- `backend/src/infrastructure/persistence/postgresql/tests/purchase-invoice.repository.spec.ts`
- `backend/src/presentation/web/controllers/tests/inventory.controller.spec.ts`
