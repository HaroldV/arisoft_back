# Layout Detallado: Administración de Bodegas (WMS Light)
**Versión:** 1.0
**Plataformas:** Desktop (Gestión) & Mobile (Operario de Bodega)

## 1. Mapa Visual de Bodega (Desktop)
*   **Visual:** Representación en 2D de la planta de la bodega (estantes y pasillos).
*   **Interacción:** Clic en un estante para ver el listado de productos y su ocupación (%).
*   **Alerta:** Estantes en rojo indican sobrecapacidad o productos próximos a vencer.

---

## 2. Escaneo de Ubicación y Producto (Mobile)
*   **Flujo:**
    1.  Escanea el QR de la ubicación (ej: Pasillo A, Estante 3).
    2.  Escanea el SKU del producto que vas a depositar o extraer.
    3.  Confirma la cantidad.
*   **Feedback:** "Ubicación actualizada correctamente. Stock en Estante 3: 45 unidades."

---

## 3. Transferencias Inter-Bodegas (Desktop & Mobile)
*   **Flujo:** Selección de bodega origen, bodega destino y productos.
*   **Estado:** "En Tránsito", "Recibido Parcial", "Completado".
*   **Desktop:** Listado de guías de despacho digitales.
*   **Mobile:** Botón rápido para "Confirmar Recepción" al llegar el camión.
