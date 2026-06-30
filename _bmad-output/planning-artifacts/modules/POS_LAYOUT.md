# Layout Detallado: Punto de Venta (POS) - Core de Operación
**Versión:** 1.0
**Plataformas:** Desktop & Mobile (Celular)

## Vista Desktop (Optimizado para Cajero)
*   **Zona Izquierda (Catálogo/Búsqueda):** Grid de productos con imágenes pequeñas. Buscador superior inteligente (Nombre, SKU, Categoría).
*   **Zona Derecha (Carrito/Checkout):** Listado de items con capacidad de editar cantidad.
*   **Pie de Pantalla:** Totales en VES y USD (enormes). Botón de "PAGAR / CERRAR VENTA" (Verde brillante).
*   **Atajos de Teclado:** F1: Buscar, F2: Pagar, Esc: Cancelar.

---

## Vista Mobile (Optimizado para Celular/Tablet)
*   **Pantalla Principal:** Lista de items del carrito con botón "+" gigante para agregar por escaneo (cámara).
*   **Barra Inferior:** Monto total en moneda base. Deslizar hacia arriba para ver el detalle.
*   **Checkout:** Selector de medios de pago con iconos grandes (Efectivo, Pago Móvil, Zelle).

---

## Funcionalidades Críticas de Layout
1.  **Indicador de Conexión:** Icono pequeño (Verde/Rojo) que indica si los datos están sincronizados con la nube de ARI.
2.  **Manejo de Vuelto:** Ventana emergente al finalizar el pago: "¿Deseas dar el vuelto en efectivo o acreditarlo al cliente?".
3.  **Factura Digital:** Botón para "Compartir recibo por WhatsApp" inmediatamente después de la venta.

---

## Caso de Borde: Offline
Si no hay internet, el sistema muestra un banner sutil: "Modo Offline Activo. Las ventas se guardarán localmente y se sincronizarán al recuperar conexión."
