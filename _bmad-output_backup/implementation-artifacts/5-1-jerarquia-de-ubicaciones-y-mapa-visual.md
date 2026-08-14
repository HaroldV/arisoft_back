# User Story: Jerarquía de Ubicaciones y Mapa Visual
**ID:** 5.1
**Epic:** EP-05: Administración de Bodegas (Industrial WMS)
**Status:** done
**Fecha:** 2026-03-11

---

## 📝 Descripción de la Historia
**Como** gerente de bodega, **quiero** definir pasillos, estantes y compartimientos, **para** saber exactamente dónde está cada producto y optimizar el espacio físico.

### Contexto de Negocio
En almacenes industriales, encontrar un producto rápidamente es la diferencia entre un despacho eficiente y una pérdida de tiempo. ARI debe permitir modelar el espacio físico de forma digital y jerárquica.

---

## ✅ Criterios de Aceptación (BDD)

### Escenario 1: Creación de Estructura Jerárquica
*   **Dado** el módulo de configuración de bodegas.
*   **Cuando** el usuario cree una ubicación (ej: Pasillo A) y le asigne una sub-ubicación (ej: Estante 1).
*   **Entonces** el sistema debe mantener la relación `parent_id` permitiendo navegar por la estructura en forma de árbol. (COMPLETADO)

### Escenario 2: Visualización de Capacidad (Mapa 2D)
*   **Dado** un estante definido con una capacidad máxima de unidades o volumen.
*   **Cuando** el sistema calcule el stock contenido en dicha ubicación.
*   **Entonces** la interfaz Desktop debe mostrar un indicador visual (Grid) con colores: Verde, Amarillo o Rojo. (COMPLETADO)

### Escenario 3: Filtro de Productos por Ubicación
*   **Dado** el mapa visual de la bodega.
*   **Cuando** el usuario haga clic en un estante o compartimiento específico.
*   **Entonces** el sistema debe mostrar el listado de SKUs y cantidades almacenadas exclusivamente en ese punto. (COMPLETADO)

---

## 🏗️ Requerimientos Técnicos y Arquitectura
*   **Base de Datos:** Tabla `WAREHOUSE_LOCATION` con soporte recursivo inyectada en la migración inicial.
*   **Lógica:** `WarehouseOccupancyService` para el cálculo de semáforos de capacidad.
*   **UI:** Componente `WarehouseMap.tsx` implementado con CSS Grid.

---

## 🎨 Estándares de Ingeniería
*   **Modularidad:** Implementado como módulo Plug & Play.
*   **Tipado:** Enums de `LocationType` definidos en el dominio.

---

## 🛠️ Lista de Tareas para el Desarrollador
- [x] **T5.1.1:** Crear tabla `WAREHOUSE_LOCATION` con soporte para recursividad (`parent_id`).
- [x] **T5.1.2:** Desarrollar el CRUD de ubicaciones con validación de niveles jerárquicos.
- [x] **T5.1.3:** Implementar el servicio de cálculo de ocupación porcentual por ubicación.
- [x] **T5.1.4:** Crear la interfaz de Mapa Visual 2D (Grid) en React.
- [x] **T5.1.5:** Implementar modal de "Detalle de Ubicación" al hacer clic en el mapa.

---

## 📑 Dev Agent Record (Amelia)
- **Base de Datos:** Se actualizó la migración `001_initial_schema.sql` incluyendo la tabla jerárquica de ubicaciones.
- **Backend:** Se creó la entidad `WarehouseLocation` y el servicio `WarehouseOccupancyService` para la lógica de capacidad.
- **Frontend:** Implementado el `WarehouseMap` visual con indicadores de color dinámicos según la ocupación.

### Archivos Creados/Modificados:
- `src/infrastructure/persistence/postgresql/migrations/001_initial_schema.sql`
- `src/domain/entities/warehouse-location.entity.ts`
- `src/application/services/warehouse-occupancy.service.ts`
- `src/presentation/web/components/wms/WarehouseMap.tsx`
- `src/presentation/web/components/wms/LocationDetailModal.tsx`
