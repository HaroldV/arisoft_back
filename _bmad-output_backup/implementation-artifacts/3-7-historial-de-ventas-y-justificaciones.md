# Story 3.7: Historial de Ventas y Justificaciones del POS

Status: done

## Story

**Como** supervisor de tienda,  
**quiero** auditar el registro de ventas históricas,  
**para** validar egresos financieros y revisar los motivos de las ventas autorizadas en negativo.

## Acceptance Criteria

1. **Historial de Ventas (AC: #1):** Endpoint `GET /sales` que liste las transacciones del tenant (ID de venta, cajero, monto total, tasa de cambio aplicada, fecha, estado).
2. **Detalle de Venta (AC: #2):** Endpoint `GET /sales/:id` que devuelva las líneas de artículos vendidos (producto, cantidad, precio histórico) y la justificación obligatoria si existió stock negativo.

## Tasks / Subtasks

- [x] **Capa del Dominio & Persistencia**
  - [x] Implementar consultas de listado de ventas y de detalle individual mapeadas a `SALE_ITEMS` y `SALES`.
- [x] **Capa de Aplicación**
  - [x] Crear casos de uso para consulta de historial de ventas y de detalle de venta.
- [x] **Capa de Presentación**
  - [x] Exponer los endpoints `GET /sales` y `GET /sales/:id` en `SalesController`.
- [x] **Validación y Pruebas**
  - [x] Validar que las justificaciones de stock negativo registradas en `STOCKS` se retornen correctamente en los detalles de las líneas de la venta correspondientes.

## Dev Notes

### Arquitectura y Patrones (Clean Architecture)
- **Controller:** endpoints en `SalesController` protegidos con JwtAuthGuard y módulos POS.

## Dev Agent Record

### Agent Model Used
Mary (Business Analyst) - proposed

### Completion Notes List
- [x] Endpoint de historial de ventas (AC#1).
- [x] Endpoint de detalle de venta con justificaciones de stock (AC#2).

### File List
- `backend/src/infrastructure/persistence/postgresql/repositories/sale.repository.ts`
- `backend/src/presentation/web/controllers/sales.controller.ts`
- `backend/src/infrastructure/persistence/postgresql/tests/sale.repository.spec.ts`
- `backend/src/presentation/web/controllers/tests/sales.controller.spec.ts`
