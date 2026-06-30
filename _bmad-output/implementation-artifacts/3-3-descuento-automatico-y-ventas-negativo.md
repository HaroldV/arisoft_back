# Story 3.3: Descuento Automático y Ventas en Negativo en POS

Status: done

## Story

**Como** cajero del punto de venta (POS),  
**quiero** vender productos descontando automáticamente el inventario disponible y pudiendo justificar las ventas en negativo autorizadas,  
**para** mantener existencias exactas en tiempo real y registrar incidencias operativas justificadas.

## Acceptance Criteria

1. **Detalle de Venta (AC: #1):** Creación de la tabla `SALE_ITEMS` para persistir los artículos, cantidades y precios facturados de cada venta en la tabla `SALES`.
2. **Egreso Inmutable con Atribución (AC: #2):** Cada producto vendido genera un asiento en `STOCKS` con `type: 'SALE'`, la cantidad en negativo (ej: `-2`), el costo a la fecha de venta, y las referencias `source_type: 'SALE'`, `source_id` apuntando a la venta, y `created_by_user_id` apuntando al cajero autenticado.
3. **Control de Stock Negativo Autorizado (AC: #3):**
    *   Si el stock actual es insuficiente para la venta, el sistema debe consultar el flag `allow_negative_stock` (BOOLEAN) dentro de `TENANTS.settings` (JSONB).
    *   Si `allow_negative_stock` es `false` (o no está definido), la transacción debe fallar con un error `400 Bad Request` indicando stock insuficiente.
    *   Si `allow_negative_stock` es `true`, el sistema debe permitir registrar la venta, pero **exigirá obligatoriamente** un parámetro `negative_stock_justification` en la petición de venta.
4. **Auditoría de Incidencia (AC: #4):** Cuando ocurra una venta en negativo, la justificación provista debe quedar registrada en la columna `justification` del asiento `STOCKS` asociado al egreso.
5. **Transaccionalidad POS (AC: #5):** La persistencia de la venta, el detalle de artículos, la validación del flag de stock negativo y la inserción del movimiento deben ocurrir en una transacción de base de datos atómica.

## Tasks / Subtasks

- [x] **Base de Datos**
  - [x] Crear archivo de migración SQL `005_sale_items.sql` para definir la tabla `SALE_ITEMS` con claves foráneas e índices.
- [x] **Capa del Dominio & Persistencia**
  - [x] Definir la entidad `SaleItem`.
  - [x] Crear `SaleRepository` (o ampliarlo si ya existe) para manejar el guardado del detalle de ventas.
- [x] **Capa de Aplicación**
  - [x] Actualizar o crear `CreateSaleUseCase` para soportar validaciones de stock, lectura de settings de tenant, almacenamiento de justificación y atribución del usuario ejecutor en `STOCKS`.
- [x] **Validación y Pruebas**
  - [x] Crear pruebas de integración para validar la transacción, la restricción de stock negativo y el cálculo dinámico de existencias finales.

## Dev Notes

### Arquitectura y Patrones (Clean Architecture)
- **Domain:** La entidad `SaleItem` debe crearse en `src/domain/entities/sale-item.entity.ts`.
- **Use Cases:** La lógica de negocio para procesar la venta y egreso debe implementarse o actualizarse en `src/application/use-cases/pos/create-sale.use-case.ts`.
- **Persistence:** El esquema SQL de `SALE_ITEMS` debe agregarse como migración en `migrations/005_sale_items.sql`.

### Estándares de Testing
- Cobertura mínima del 80% en el Use Case.
- Validar las condiciones de carrera concurrentes para evitar doble venta sobre existencias límite.

## Dev Agent Record

### Agent Model Used
Mary (Business Analyst) - proposed

### Completion Notes List
- [x] Creación de entidad y persistencia de items vendidos (AC#1).
- [x] Asiento contable de egreso inmutable con autoría (AC#2).
- [x] Validación del parámetro de venta en negativo (AC#3).
- [x] Registro de justificación en diario contable (AC#4).
- [x] API Endpoint POS integrado y transaccional (AC#5).

### File List
- `backend/src/infrastructure/persistence/postgresql/migrations/005_sale_items.sql`
- `backend/src/domain/entities/sale.entity.ts`
- `backend/src/domain/entities/sale-item.entity.ts`
- `backend/src/infrastructure/persistence/postgresql/repositories/sale.repository.ts`
- `backend/src/infrastructure/persistence/postgresql/repositories/stock-move.repository.ts`
- `backend/src/application/use-cases/pos/create-sale.dto.ts`
- `backend/src/application/use-cases/pos/create-sale.use-case.ts`
- `backend/src/presentation/web/controllers/sales.controller.ts`
- `backend/src/app.module.ts`
- `backend/src/application/use-cases/pos/tests/create-sale.use-case.spec.ts`
