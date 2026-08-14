# Diseño de Sistema y Experiencia de Usuario: ARI (Master Guide)
**De:** Mary (Analista) & Chloe (UX Designer)
**Estado:** Guía de Estilo y Mapa de Layouts

## 1. Principios de Diseño "ARI"
Nuestra interfaz debe ser **Resiliente, Intuitiva y Rápida**.
*   **Modo Oscuro/Claro:** Soporte nativo para reducir la fatiga visual en jornadas largas.
*   **Densidad de Información:** Alta en Desktop (para administradores) y Baja/Enfocada en Celular (para cajeros).
*   **Retroalimentación:** Cada acción (venta, carga, error) debe tener una respuesta visual/háptica clara.

---

## 2. Mapa de Pantallas por Módulo
Para ver el detalle visual (Layouts Desktop y Mobile) de cada sección, consulta los archivos individuales en la carpeta `modules/`:

### A. Capa Operativa
1.  **[Onboarding & Registro](./modules/ONBOARDING_LAYOUT.md):** El flujo de los 90 días.
2.  **[POS / Punto de Venta](./modules/POS_LAYOUT.md):** Interfaz táctil y de teclado.
3.  **[Inventario](./modules/INVENTARIO_LAYOUT.md):** Gestión de SKUs y Movimientos.

### B. Capa de Inteligencia
4.  **[Dashboard Analítico](./modules/DASHBOARD_LAYOUT.md):** KPIs, Utilidad y Rotación.
5.  **[CRM & Clientes](./modules/CRM_LAYOUT.md):** Perfiles y Vuelto Digital.

### C. Capa Fiscal
6.  **[Facturación & Reportes](./modules/FACTURACION_LAYOUT.md):** Configuración de API externa y reportes SENIAT.

---

## 3. Elementos Globales de UI
*   **Sidebar (Desktop):** Colapsable para maximizar el área de trabajo.
*   **Bottom Navigation (Mobile):** Acceso rápido a POS, Inventario y Reportes del día.
*   **Banner de Sandbox:** Ubicado en la parte superior, color ámbar, indicando los días restantes de prueba (90 -> 0).
