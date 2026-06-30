# User Story: Interfaz de Venta y Carrito (POS)
**ID:** 4.1
**Epic:** EP-04: Punto de Venta (POS) Local-First (The Heart)
**Status:** done
**Fecha:** 2026-03-11

---

## 📝 Descripción de la Historia
**Como** cajero, **quiero** buscar productos y agregarlos a un carrito, **para** procesar ventas rápidamente de forma táctil o con teclado.

### Contexto de Negocio
El POS es el corazón transaccional de ARI. En Venezuela, la velocidad y la capacidad de operar sin internet son críticas. Esta interfaz debe ser la más pulida y rápida de todo el sistema, permitiendo vender en segundos.

---

## ✅ Criterios de Aceptación (BDD)

### Escenario 1: Búsqueda y Selección Rápida
*   **Dado** la interfaz del POS abierta.
*   **Cuando** el cajero escriba el nombre o escanee el SKU de un producto.
*   **Entonces** el producto debe aparecer instantáneamente en el listado y agregarse al carrito al seleccionarlo. (COMPLETADO)

### Escenario 2: Resiliencia Offline (Local-First)
*   **Dado** una falla en la conexión a internet.
*   **Cuando** el cajero agregue productos al carrito.
*   **Entonces** el sistema debe permitir continuar la operación guardando los datos en la base local (`WatermelonDB`) y mostrar un indicador visual de "Modo Offline". (COMPLETADO)

### Escenario 3: Totales Multimoneda
*   **Dado** un carrito con productos.
*   **Cuando** se actualicen las cantidades.
*   **Entonces** el pie de pantalla debe mostrar el Subtotal, IVA y Total tanto en VES como en USD, usando la tasa configurada por el tenant. (COMPLETADO)

---

## 🏗️ Requerimientos Técnicos y Arquitectura
*   **Frontend:** `PosInterface.tsx` con soporte responsivo y atajos de teclado.
*   **Persistencia:** Esquema de `WatermelonDB` configurado para productos y carrito.
*   **Motor Financiero:** `PosCalculatorService` para precisión monetaria multimoneda.

---

## 🎨 Estándares de Ingeniería
*   **Resiliencia:** Indicador Online/Offline implementado.
*   **Precisión:** Uso de `decimal.js` para todos los cálculos de IVA y totales.
*   **Testing:** Suite de pruebas creada para el motor de cálculo.

---

## 🛠️ Lista de Tareas para el Desarrollador
- [x] **T4.1.1:** Desarrollar la interfaz base del POS (Split screen Desktop / Single list Mobile).
- [x] **T4.1.2:** Configurar `WatermelonDB` para el almacenamiento local del catálogo y carritos.
- [x] **T4.1.3:** Implementar el buscador inteligente con filtrado por SKU y Nombre.
- [x] **T4.1.4:** Crear el motor de cálculo de totales en tiempo real (multimoneda + IVA).
- [x] **T4.1.5:** Implementar el indicador visual de estado de sincronización (Online/Offline).

---

## 📑 Dev Agent Record (Amelia)
- **UI:** Se implementó la interfaz principal del POS respetando la dualidad Desktop/Mobile.
- **Persistencia:** Configurada la base de datos local para garantizar soberanía operativa sin internet.
- **Finanzas:** El motor de cálculo maneja IVA y multimoneda con precisión decimal.
- **Pruebas:** `pos_calculator.spec.ts` confirma que los montos en USD y VES son exactos.

### Archivos Creados/Modificados:
- `src/presentation/web/components/pos/PosInterface.tsx`
- `src/infrastructure/persistence/local/schema.ts`
- `src/application/services/pos-calculator.service.ts`
- `src/application/services/tests/pos_calculator.spec.ts`
