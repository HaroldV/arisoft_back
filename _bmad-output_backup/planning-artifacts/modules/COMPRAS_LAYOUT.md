# Layout Detallado: Planificación de Compras e Inteligencia de Suministro
**Versión:** 1.0
**Plataformas:** Desktop (Gestión) & Mobile (Notificaciones)

## 1. Dashboard de Compras Sugeridas (Desktop)
*   **Visual:** Listado de productos que han tocado su "Punto de Reorden".
*   **Columnas Clave:** Producto, Proveedor Recomendado, Tiempo de Respuesta, Stock Actual, Cantidad Sugerida.
*   **Acción:** Botón "Generar Orden de Compra" (Convierte la sugerencia en documento formal con un clic).

---

## 2. Ficha de Proveedor: Scorecard de Cumplimiento (Desktop)
*   **Indicadores Visuales:**
    *   **Puntualidad:** Gráfico circular (Ej: 95% de entregas a tiempo).
    *   **Tiempo Promedio:** Historial de días reales de entrega vs prometidos.
*   **Alerta de Ajuste:** Banner informativo: "Este proveedor suele tardar 3 días más de lo configurado. ¿Deseas ajustar la planificación?".

---

## 3. Alertas en Tiempo Real (Mobile)
*   **Notificación Push:** "¡Alerta de Stock! Tu producto [X] se agotará en 3 días. El Proveedor [Y] tarda 2 días en despachar. Recomendamos pedir hoy."
*   **Interacción:** Al tocar la notificación, abre el resumen de la orden de compra sugerida.

---

## 4. Comparador de Proveedores (Desktop)
*   **Visual:** Tabla comparativa para un mismo producto:
    *   **Proveedor A:** $1.20 / 2 días.
    *   **Proveedor B:** $1.10 / 15 días.
*   **Sugerencia:** "Usa Proveedor A si tienes urgencia, usa Proveedor B para maximizar margen si tu stock actual lo permite."
