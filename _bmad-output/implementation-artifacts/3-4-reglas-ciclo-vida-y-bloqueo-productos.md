# Story 3.4: Reglas de Ciclo de Vida y Bloqueo de Modificación de Productos

Status: done

## Story

**Como** administrador de control de inventario,  
**quiero** restringir la eliminación física y la modificación de datos clave (SKU y nombre) de productos que tengan historial de ventas,  
**para** proteger la integridad analítica, evitar descuadres históricos en reportes financieros y mantener el rastro de la actividad comercial.

## Acceptance Criteria

1. **Bloqueo de Modificación de Producto (AC: #1):**
    *   Si un producto registra al menos un asiento de tipo `SALE` en la tabla `STOCKS`, el sistema **no debe permitir** modificar sus campos clave `sku` (código de producto) ni `name` (nombre). Cualquier intento debe retornar un error `409 Conflict` con un mensaje claro: *"Cannot modify code or name of a product with sales history"*.
    *   Otros campos secundarios (como `description`, `price_usd` o `tax_rate`) sí pueden seguir editándose.
2. **Bloqueo de Eliminación (AC: #2):**
    *   Si un producto registra al menos un asiento de tipo `SALE` en la tabla `STOCKS`, el sistema **no debe permitir** su eliminación física de la base de datos (`DELETE`). Cualquier intento debe retornar un error `409 Conflict`.
3. **Edición y Eliminación sin Transacciones (AC: #3):**
    *   Si el producto no registra ningún movimiento de tipo `SALE` (es un producto recién cargado o sin uso comercial), se permite modificar su `sku`/`name` y realizar su eliminación física.

## Tasks / Subtasks

- [x] **Capa de Aplicación**
  - [x] Crear el caso de uso `UpdateProductUseCase` que valide la existencia de movimientos de venta en `STOCKS` antes de modificar `sku` o `name`.
  - [x] Crear el caso de uso `DeleteProductUseCase` que valide la misma condición antes de eliminar físicamente el producto.
- [x] **Capa de Presentación**
  - [x] Exponer los endpoints `PATCH /inventory/products/:id` y `DELETE /inventory/products/:id` en `InventoryController`.
- [x] **Validación y Pruebas**
  - [x] Crear pruebas unitarias y de integración que verifiquen las restricciones de bloqueo para productos con ventas y la libertad de edición para productos sin ventas.

## Dev Notes

### Arquitectura y Patrones (Clean Architecture)
- **Use Cases:** La lógica de validación e interacción debe crearse en `src/application/use-cases/inventory/update-product.use-case.ts` y `src/application/use-cases/inventory/delete-product.use-case.ts`.
- **Controllers:** Modificar `src/presentation/web/controllers/inventory.controller.ts` para registrar los nuevos endpoints.

### Estándares de Testing
- Cobertura mínima del 80% en los nuevos casos de uso.
- Verificar que el error retornado sea exactamente `409 Conflict`.

## Dev Agent Record

### Agent Model Used
Mary (Business Analyst) - proposed

### Completion Notes List
- [x] Bloqueo de cambio de SKU/nombre para productos con ventas (AC#1).
- [x] Bloqueo de eliminación física de productos usados (AC#2).
- [x] Libertad de edición/eliminación para productos sin uso comercial (AC#3).

### File List
- `backend/src/infrastructure/persistence/postgresql/repositories/stock-move.repository.ts`
- `backend/src/infrastructure/persistence/postgresql/repositories/product.repository.ts`
- `backend/src/application/use-cases/inventory/update-product.dto.ts`
- `backend/src/application/use-cases/inventory/update-product.use-case.ts`
- `backend/src/application/use-cases/inventory/delete-product.use-case.ts`
- `backend/src/presentation/web/controllers/inventory.controller.ts`
- `backend/src/app.module.ts`
- `backend/src/application/use-cases/inventory/tests/update-product.use-case.spec.ts`
- `backend/src/application/use-cases/inventory/tests/delete-product.use-case.spec.ts`
- `backend/src/presentation/web/controllers/tests/inventory.controller.spec.ts`
