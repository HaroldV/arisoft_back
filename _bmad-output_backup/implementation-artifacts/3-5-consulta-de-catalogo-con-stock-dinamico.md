# Story 3.5: Consulta del Catálogo de Productos con Stock Dinámico

Status: done

## Story

**Como** operador de tienda,  
**quiero** listar los productos con sus precios y sus existencias en tiempo real,  
**para** conocer la disponibilidad de mercancía de forma inmediata.

## Acceptance Criteria

1. **Consistencia Multitenant (AC: #1):** El listado `GET /inventory/products` debe retornar únicamente los productos pertenecientes al `tenant_id` del usuario autenticado.
2. **Agregación de Stock (Doble Entrada) (AC: #2):** El JSON de respuesta para cada producto debe incluir el atributo dinámico `current_stock`, el cual se calcula sumando los movimientos históricos de la tabla `STOCKS` de cada producto.
3. **Filtros de Búsqueda (AC: #3):** Permitir buscar y filtrar productos por SKU o coincidencia parcial de nombre.

## Tasks / Subtasks

- [x] **Capa del Dominio & Persistencia**
  - [x] En `product.repository.ts`, agregar soporte para consultar todos los productos del tenant incluyendo la suma total de existencias asociadas desde `STOCKS` mediante un query builder optimizado (evitando N+1 queries).
- [x] **Capa de Presentación**
  - [x] Agregar el endpoint `GET /inventory/products` en `InventoryController` protegido con `JwtAuthGuard` y `ModulesGuard`.
  - [x] Soportar parámetros query opcionales `sku` y `name` para filtros de búsqueda.
- [x] **Validación y Pruebas**
  - [x] Crear pruebas de integración que validen que `current_stock` reportado sume correctamente inicializaciones, compras y reste ventas históricas.

## Dev Notes

### Arquitectura y Patrones (Clean Architecture)
- **Controller:** `GET /inventory/products` en `InventoryController`.
- **Query Builder:** Realizar un query builder con `LEFT JOIN` a la tabla `STOCKS` (agrupado por producto) para calcular existencias de manera atómica a nivel de base de datos en una sola petición.

## Dev Agent Record

### Agent Model Used
Mary (Business Analyst) - proposed

### Completion Notes List
- [x] Listado de productos aislado por tenant (AC#1).
- [x] Agregación de stock actual calculado desde diario contable (AC#2).
- [x] Filtros de búsqueda funcionales (AC#3).

### File List
- `backend/src/infrastructure/persistence/postgresql/repositories/product.repository.ts`
- `backend/src/presentation/web/controllers/inventory.controller.ts`
- `backend/src/infrastructure/persistence/postgresql/tests/product.repository.spec.ts`
- `backend/src/presentation/web/controllers/tests/inventory.controller.spec.ts`
