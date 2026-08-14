# ARI: Estándares de Ingeniería, Tecnologías y Buenas Prácticas
**Documento para el Equipo de Desarrollo**
**Analista:** Mary | **PM:** John | **Arquitecto:** Winston
**Versión:** 1.0

---

## 1. Stack Tecnológico Oficial (Boring & Stable)
Para ARI, priorizamos la mantenibilidad y la facilidad de encontrar talento calificado.
*   **Backend:** Node.js + **NestJS** (TypeScript).
*   **Frontend Web:** **React** + Tailwind CSS.
*   **Mobile:** **React Native** (Lógica compartida con Web).
*   **Base de Datos:** **PostgreSQL** (Relacional para multitenancy robusto).
*   **Local Persistence:** **WatermelonDB** (Para sincronización asíncrona y offline-ready).
*   **API Documentation:** **Swagger / OpenAPI**.

---

## 2. Clean Architecture en ARI
Debemos mantener una separación estricta de responsabilidades para que el negocio (ej: cálculo de IGTF) no dependa de la tecnología (ej: base de datos).

### Capas del Sistema:
1.  **Dominio (Domain):** Entidades y reglas de negocio puras. Sin dependencias externas.
2.  **Casos de Uso (Use Cases):** Orquestadores de la lógica. Implementan la "intención" del usuario.
3.  **Adaptadores (Interface Adapters):** Controladores de API, Presentadores y Gateways de Base de Datos.
4.  **Infraestructura (Frameworks & Drivers):** NestJS, PostgreSQL, herramientas de terceros.

---

## 3. Buenas Prácticas de Programación
*   **SOLID & DRY:** Código limpio, escalable y sin repeticiones innecesarias.
*   **Naming Convencional:** Variables y funciones con nombres descriptivos en inglés (estándar global).
*   **Type Safety:** Uso obligatorio de TypeScript. Prohibido el uso de `any`.
*   **Git Flow:** Uso de ramas por funcionalidad (`feature/`), corrección (`fix/`) y despliegue (`production`).
*   **Commits Semánticos:** Mensajes claros (ej: `feat: add digital wallet ledger`).

---

## 4. Estándares de Seguridad y Calidad
*   **Tenant Isolation Guard:** Cada petición al backend *debe* pasar por un middleware que inyecte y valide el `tenant_id`. No se permiten queries globales.
*   **Inmutabilidad Financiera:** Los registros en `STOCK_MOVE` y `CREDIT_LEDGER` son de "Solo Inserción" (Append-only). Prohibido el `DELETE` o `UPDATE` en registros contables.
*   **Testing:** Cobertura mínima del 80% en lógica de negocio (Casos de Uso). Se requiere TDD para motores de cálculo (Nómina, Compras).
*   **Seguridad:** OWASP Top 10 como referencia. Sanitización de entradas, encriptación de datos sensibles y auditoría de logs.

---

## 5. Mentalidad PM (Cultura de Producto)
*   **Iterar sobre la Perfección:** "Ship the smallest thing that validates". Si un módulo es complejo, construye la versión funcional mínima primero.
*   **Documentar es Desarrollar:** Código sin README o sin Swagger no se considera terminado.
*   **Feedback Loop:** Cada despliegue debe permitir medir el uso de la funcionalidad para informar al equipo de producto.

---

**¡A construir ARI con excelencia!**
