# ARI: Especificación Maestra de Producto (SaaS ERP Industrial)
> **A**dministración **R**esiliente e **I**nteligente
> *"El motor tecnológico para el nuevo comercio en Venezuela"*

**Estado:** Documento de Definición Final (Auditado)
**Analista:** Mary (BMad Strategic Analyst)
**Versión:** 1.1

---

## 1. Visión Estratégica
**ARI** es un ecosistema de gestión empresarial (ERP) bajo modelo **SaaS Multitenant**, diseñado para transformar el comercio en Venezuela. Su propuesta de valor se basa en cuatro pilares:
*   **Resiliencia Operativa (Local-First):** Vende sin internet, sincroniza al recuperar conexión.
*   **Soberanía Económica:** Control absoluto de multimoneda (VES/USD) con tasas dinámicas.
*   **Modularidad "Plug & Play" (NUEVO):** Módulos totalmente autónomos. Una empresa puede adquirir solo lo que necesita (ej: solo Bodegas o solo Nómina).
*   **Fidelización Comunitaria:** El **Vuelto Digital** resuelve el problema del sencillo y crea lealtad.

---

## 2. El Ecosistema de Módulos (Detalle por Capa)

### Capa 1: Núcleo de Operación (Core)
1.  **Administración Multitenant:** Aislamiento total de datos con Trial de 90 días. Incluye flujo autogestionado de registro (Signup) de Tenant y Propietario en transacción atómica, inicio de sesión simplificado (Email/Password) con resolución automática de tenant, renovación de tokens (JWT duales) y cierre de sesión seguro (Logout).
2.  **Recuperación de Contraseñas:** Flujo de recuperación seguro mediante solicitud por email, emisión de token criptográfico temporal con expiración de 1 hora y cambio seguro de contraseña.
3.  **Inventario de Doble Entrada:** Rigor contable inmutable.
4.  **Punto de Venta (POS):** Rápido, multimoneda y offline-ready.

### Capa 2: Logística e Industria (Avanzado)
4.  **Administración de Bodegas (WMS):** Ubicaciones jerárquicas con QR. Funciona de forma autónoma para control de stock físico.
5.  **Planificación de Compras:** Algoritmo de **Lead Time** que predice cuándo comprar según el proveedor.
6.  **Digitalización Física:** Sincronización con balanzas e impresoras fiscales vía hardware.

### Capa 3: Finanzas y Cumplimiento
7.  **Facturación Electrónica:** Cumplimiento SENIAT vía API externa.
8.  **Nómina Tropicalizada:** Motor legal dinámico (IVSS, FAOV, Cestaticket) integrado a finanzas.
9.  **Tesorería y Flujo de Caja:** Control de deudas y conciliación bancaria.

### Capa 4: Crecimiento e Inteligencia
10. **CRM & Vuelto Digital:** Monedero digital multitenant para fidelización.
11. **Reportes Analíticos (BI):** Inteligencia de negocios (Rotación, Utilidad Neta).
12. **Planeación (Business OS):** Metas y tareas Kanban para equipos.

---

## 3. Flujos de Usuario Principales
*   **Registro y Onboarding (SaaS-Signup):** El administrador o dueño del comercio introduce su email, nombre de empresa y RIF venezolano (J-XXXXXXXX-X). El backend valida el RIF, calcula dinámicamente el Trial de 90 días, hashea la contraseña e inicializa el tenant y el usuario en una transacción PostgreSQL atómica.
*   **Recuperación de Contraseña:** El usuario introduce su correo electrónico para solicitar el cambio. Se emite un token de un solo uso criptográfico con validez de 1 hora y se envía el enlace. Tras pulsar el enlace, se introduce y hashea la nueva contraseña.
*   **Cierre de Sesión y Control de JWT:** El inicio de sesión emite tokens duales. El cierre de sesión (Logout) invalida inmediatamente las cookies seguras que guardan el Refresh Token.
*   **Ciclo de Venta y Almacenamiento (POS & Inventario):** (Se mantiene el flujo de ciclo de venta definido anteriormente).

---

## 4. Arquitectura de Negocio (SaaS Enchufable)
ARI utiliza un sistema de **Feature Flags**. La interfaz muestra todos los módulos, pero los no adquiridos presentan un "Teaser Aspiracional" que educa al usuario sobre los beneficios de escalar su suscripción.

---

## 5. Hoja de Ruta de Desarrollo (Roadmap)
Organizado en 5 hitos incrementales para liberar valor desde la Fase 1.

---

## 6. Conclusión Técnica
Stack moderno, seguro y profundamente adaptado a la realidad del terreno.
