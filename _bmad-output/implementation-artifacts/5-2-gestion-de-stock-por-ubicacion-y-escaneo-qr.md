# User Story: Gestión de Stock por Ubicación y Escaneo QR
**ID:** 5.2
**Epic:** EP-05: Administración de Bodegas (Industrial WMS)
**Status:** done
**Fecha:** 2026-03-11

---

## 📝 Descripción de la Historia
**Como** operario de bodega, **quiero** usar mi celular para registrar movimientos de productos escaneando códigos QR, **para** reducir errores manuales y agilizar las transferencias internas.

### Contexto de Negocio
La precisión en la bodega es crítica para el éxito del ERP. Eliminar el ingreso manual de datos mediante el escaneo de QR en las ubicaciones asegura que el inventario digital coincida exactamente con la realidad física.

---

## ✅ Criterios de Aceptación (BDD)

### Escenario 1: Generación de Etiquetas QR
*   **Dado** una ubicación de tipo `BIN` (compartimiento final) creada.
*   **Cuando** el administrador solicite la etiqueta de ubicación.
*   **Entonces** el sistema debe generar un código QR que contenga el `location_id` único y permitir su impresión. (COMPLETADO)

### Escenario 2: Movimiento de Stock vía Mobile
*   **Dado** un operario con la aplicación móvil de ARI.
*   **Cuando** realice el flujo: Escanear QR de Ubicación -> Escanear SKU de Producto -> Ingresar Cantidad -> Confirmar.
*   **Entonces** el sistema debe validar que haya stock suficiente (si es salida) y registrar el movimiento inmutable en `STOCK_MOVE`. (COMPLETADO)

### Escenario 3: Transferencia Inter-Bodegas
*   **Dado** un lote de productos en la Bodega Principal.
*   **Cuando** se inicie una transferencia hacia una Sede Sucursal.
*   **Entonces** el sistema debe marcar el stock como "En Tránsito" hasta que el operario de destino escanee el QR de recepción. (COMPLETADO)

---

## 🏗️ Requerimientos Técnicos y Arquitectura
*   **Utilidad:** `QrGeneratorUtil.ts` implementado para la creación de etiquetas industriales.
*   **Mobile:** Pantalla `WarehouseScanner.tsx` desarrollada en React Native con flujo de escaneo guiado.
*   **Lógica:** `TransferStockUseCase` orquesta los movimientos entre ubicaciones con estados de tránsito.

---

## 🎨 Estándares de Ingeniería
*   **Feedback:** Visualización de "Último Escaneo" y pasos claros en la UI móvil.
*   **Atómica:** Las transferencias generan movimientos apareados (Salida/Entrada) para integridad contable.

---

## 🛠️ Lista de Tareas para el Desarrollador
- [x] **T5.2.1:** Implementar servicio de generación de códigos QR (Backend).
- [x] **T5.2.2:** Desarrollar la interfaz móvil de escaneo de ubicaciones y productos.
- [x] **T5.2.3:** Crear el flujo de "Transferencia en Tránsito" con estados de validación.
- [x] **T5.2.4:** Implementar el registro automático en `STOCK_MOVE` tras escaneo exitoso.
- [x] **T5.2.5:** Añadir feedback visual y sonoro para confirmación de escaneo en Mobile.

---

## 📑 Dev Agent Record (Amelia)
- **Backend:** Se creó el generador de QR y el caso de uso para transferencias industriales.
- **Mobile:** Implementada la pantalla de escáner que guía al operario a través de los pasos de ubicación, producto y cantidad.
- **Integridad:** El sistema de transferencias asegura que el stock no se "pierda" durante el movimiento entre sedes.

### Archivos Creados/Modificados:
- `src/infrastructure/common/utils/qr-generator.util.ts`
- `src/presentation/mobile/screens/WarehouseScanner.tsx`
- `src/application/use-cases/inventory/transfer-stock.dto.ts`
- `src/application/use-cases/inventory/transfer-stock.use-case.ts`
