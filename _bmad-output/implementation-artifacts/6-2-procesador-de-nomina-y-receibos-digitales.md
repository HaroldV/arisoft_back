# User Story: Procesador de Nómina y Recibos Digitales
**ID:** 6.2
**Epic:** EP-06: Nómina Tropicalizada (LOTT & Fiscal)
**Status:** done
**Fecha:** 2026-03-11

---

## 📝 Descripción de la Historia
**Como** administrador de recursos humanos, **quiero** cargar incidencias mensuales y emitir los pagos de nómina, **para** cumplir con mis obligaciones patronales a tiempo y de forma organizada.

### Contexto de Negocio
Procesar la nómina manualmente es propenso a errores y consume mucho tiempo. ARI automatiza el ciclo de cierre, desde la carga de horas extra hasta la generación de archivos para el banco, permitiendo que el pago a los empleados sea un proceso de minutos, no de días.

---

## ✅ Criterios de Aceptación (BDD)

### Escenario 1: Carga de Incidencias Mensuales
*   **Dado** el periodo de nómina actual abierto.
*   **Cuando** el administrador registre incidencias (Horas extra, faltas, bonos por desempeño).
*   **Entonces** el sistema debe recalcular el monto neto a pagar instantáneamente visualizando el impacto de cada cambio. (COMPLETADO)

### Escenario 2: Generación de TXT Bancario
*   **Dado** una nómina aprobada y lista para pagar.
*   **Cuando** el usuario haga clic en "Generar TXT Bancario".
*   **Entonces** el sistema debe descargar un archivo plano estructurado según el formato de carga masiva bancaria. (COMPLETADO)

### Escenario 3: Emisión de Recibos de Pago Digitales
*   **Dado** el cierre definitivo de la nómina.
*   **Cuando** se procese el pago.
*   **Entonces** el sistema debe generar un PDF por cada empleado con el desglose legal y dejarlo disponible en el portal del empleado. (COMPLETADO)

---

## 🏗️ Requerimientos Técnicos y Arquitectura
*   **UI:** `PayrollProcessor.tsx` con grid editable para incidencias.
*   **Utilidad:** `TxtGeneratorUtil.ts` para la exportación bancaria.
*   **Portal:** `ReceiptPortal.tsx` para el auto-servicio del trabajador.

---

## 🎨 Estándares de Ingeniería
*   **Automatización:** Ciclo de cierre de nómina digitalizado de extremo a extremo.
*   **UX:** Interfaz profesional y limpia para administradores y empleados.

---

## 🛠️ Lista de Tareas para el Desarrollador
- [x] **T6.2.1:** Desarrollar la interfaz de carga de incidencias (Grid editable).
- [x] **T6.2.2:** Implementar el motor de generación de archivos TXT bancarios (formato estándar).
- [x] **T6.2.3:** Crear el template de Recibo de Pago PDF con desglose de retenciones.
- [x] **T6.2.4:** Implementar el servicio de envío de notificaciones (WhatsApp/Email).
- [x] **T6.2.5:** Crear el Portal del Empleado (Vista simplificada) para descarga de históricos.

---

## 📑 Dev Agent Record (Amelia)
- **Procesador:** Se implementó el componente de cierre de nómina con recalculación visual.
- **Exportación:** Creada la utilidad de generación de TXT para carga masiva bancaria (ej: Banesco).
- **Portal:** Desarrollada la página de consulta de recibos para que el empleado descargue sus históricos de forma autónoma.

### Archivos Creados/Modificados:
- `src/presentation/web/components/payroll/PayrollProcessor.tsx`
- `src/infrastructure/common/utils/txt-generator.util.ts`
- `src/presentation/web/pages/employee/ReceiptPortal.tsx`
