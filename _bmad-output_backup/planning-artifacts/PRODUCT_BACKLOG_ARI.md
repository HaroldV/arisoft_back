# Backlog de Producto: ERP "ARI"
**Estado:** Especificación Completa para Desarrollo
**Product Manager:** John (BMad PM)
**Hitos Cubiertos:** 1, 2, 3, 4 y 5 (Ciclo Completo SaaS Industrial)

---

## EP-01: Fundamentos del Sistema (Infraestructura & SaaS)
*(Definido previamente: Multitenancy, RBAC, JWT, Logout y Refresco de Token)*

## EP-02: Onboarding & Registro (The 3-Minute Win)
*(Definido previamente: Registro de Empresa y Propietario en DB, Trial 90 días, Configuración Tasa BCV, Recuperación de Contraseñas)*

## EP-03: Inventario de Doble Entrada (The Motor)
*(Definido previamente: SKU, Costo/Precio USD, Movimientos Inmutables)*

## EP-04: Punto de Venta (POS) Local-First (The Heart)
*(Definido previamente: Búsqueda SKU, Offline-ready, Pagos Fraccionados, IGTF)*

## EP-05: Administración de Bodegas (Industrial WMS)
*(Definido previamente: Jerarquía Ubicaciones, Mapa Visual, Movimientos QR)*

## EP-06: Nómina Tropicalizada (LOTT & Fiscal)
*(Definido previamente: Motor Fórmulas Legales, TXT Bancario, Recibos Digitales)*

---

## EP-07: CRM & Vuelto Digital (Fidelización)
**Objetivo:** Resolver la escasez de efectivo mediante un monedero digital empresarial.

### ST-7.1: Ledger de Créditos para Clientes
*   **Como** sistema, **quiero** registrar cada "vuelto" como un crédito inmutable, **para** que el cliente pueda usarlo en futuras compras.
*   **Criterios de Aceptación:**
    1.  Tabla `CUSTOMER_CREDIT_LEDGER` registra: `tenant_id`, `customer_id`, `amount`, `currency` y `type` (Vuelto o Gasto).
    2.  Al cerrar venta en POS, si hay excedente, mostrar botón "Cargar al Monedero".
    3.  Envío automático de saldo actualizado al cliente vía WhatsApp/SMS al finalizar la carga.

---

## EP-08: Planificación de Compras Inteligente
**Objetivo:** Automatizar el reabastecimiento basado en Lead Time.

### ST-8.1: Algoritmo de Punto de Reorden
*   **Como** gerente de compras, **quiero** que el sistema sugiera órdenes de compra, **para** evitar quiebres de stock.
*   **Criterios de Aceptación:**
    1.  Cálculo: `(Venta diaria prom. * Días despacho proveedor) + Stock Seguridad`.
    2.  Dashboard muestra productos en "Zona de Reorden" con botón para autogenerar Orden de Compra.
    3.  Scorecard de proveedor comparando fecha prometida vs fecha real de entrega.

---

## EP-09: Facturación Electrónica (Compliance)
**Objetivo:** Integración fiscal automatizada.

### ST-9.1: Integración con API de Proveedor Fiscal
*   **Como** sistema, **quiero** enviar los datos de la factura a un proveedor externo, **para** obtener el comprobante fiscal legal.
*   **Criterios de Aceptación:**
    1.  Adaptador de API para enviar JSON de venta y recibir PDF/XML fiscal.
    2.  Manejo de estados: "Enviado", "Firmado", "Error de Comunicación".
    3.  Reintento automático de envío si falla la conexión con el proveedor externo.

---

## EP-10: Business Intelligence & Analíticas
**Objetivo:** Transformar datos en decisiones estratégicas.

### ST-10.1: Dashboard de Salud Financiera y Rotación
*   **Como** dueño de negocio, **quiero** ver mi utilidad neta y rotación de inventario, **para** optimizar mi rentabilidad.
*   **Criterios de Aceptación:**
    1.  Gráfico de áreas: Ventas vs Costos (Margen Neto).
    2.  Matriz ABC: Productos Estrellas (Alta rotación/margen) vs Huesos (Baja rotación).
    3.  Resumen ejecutivo móvil con KPIs del día (↑↓ vs ayer).

---

## EP-11: Digitalización de Tienda Física (IoT Sync)
**Objetivo:** Sincronizar hardware industrial con el software.

### ST-11.1: Gateway de Periféricos (Balanzas e Impresoras)
*   **Como** cajero, **quiero** pesar productos directamente en el POS, **para** agilizar la venta a granel.
*   **Criterios de Aceptación:**
    1.  Uso de WebUSB/WebSerial para capturar peso de balanzas RS232/USB.
    2.  Impresión directa en ticketeras térmicas (protocolo ESC/POS).
    3.  Kiosco de consulta de precios optimizado para tablet fija.

---

## EP-12: Planeación y Organización (Business OS)
**Objetivo:** Gestión de metas y tareas operativas.

### ST-12.1: Tablero Kanban de Tareas ERP
*   **Como** administrador, **quiero** asignar tareas vinculadas a documentos del sistema, **para** organizar la operación.
*   **Criterios de Aceptación:**
    1.  Tarjetas Kanban permiten adjuntar Facturas o Productos.
    2.  Calendario de vencimientos integrado (Cuentas por Pagar, Expiración de Lotes).
    3.  Dashboard de Metas con círculos de progreso visuales.

---

## EP-13: Motor de SaaS y Upsell (Growth)
**Objetivo:** Gestionar el modelo de negocio y el escalamiento de clientes.

### ST-13.1: Feature Flags y Reseñas de Módulos
*   **Como** sistema, **quiero** mostrar todos los módulos pero restringir acceso según plan, **para** incentivar el Upsell.
*   **Criterios de Aceptación:**
    1.  Menú lateral dinámico basado en `TENANT_MODULE_CONFIG`.
    2.  Módulos inactivos muestran "Modal de Valor" con beneficios y CTA de activación.
    3.  Seguridad a nivel de API bloquea endpoints de módulos no suscritos.

---

## Nota Final para Implementación
ARI debe construirse como un **Monolito Modular** siguiendo **Clean Architecture**. La resiliencia (offline-first) y la seguridad (aislamiento tenant) son los requerimientos no funcionales de mayor prioridad.
