# User Story: Motor de Fórmulas Legales Dinámicas
**ID:** 6.1
**Epic:** EP-06: Nómina Tropicalizada (LOTT & Fiscal)
**Status:** done
**Fecha:** 2026-03-11

---

## 📝 Descripción de la Historia
**Como** sistema, **quiero** calcular automáticamente las retenciones de ley (IVSS, FAOV, Paro Forzoso) y beneficios (Cestaticket), **para** garantizar el cumplimiento de la normativa LOTT/SENIAT sin errores manuales.

### Contexto de Negocio
La nómina en Venezuela es altamente volátil debido a los cambios frecuentes en Gaceta Oficial. Un motor de fórmulas dinámico permite que ARI se adapte a nuevos porcentajes o topes de sueldo mínimo sin necesidad de actualizar el código fuente, ofreciendo estabilidad legal al cliente.

---

## ✅ Criterios de Aceptación (BDD)

### Escenario 1: Configuración de Variables Legales
*   **Dado** el panel de configuración de nómina.
*   **Cuando** el administrador actualice un porcentaje (ej: IVSS Patrono al 11%).
*   **Entonces** el sistema debe aplicar el nuevo valor a todos los cálculos de nómina generados a partir de esa fecha. (COMPLETADO)

### Escenario 2: Cálculo de Retenciones con Tope
*   **Dado** un empleado con un sueldo superior a 5 sueldos mínimos.
*   **Cuando** se procese su nómina.
*   **Entonces** el sistema debe aplicar el tope legal de 5 sueldos mínimos para el cálculo de IVSS y Paro Forzoso, ignorando el excedente para estas retenciones específicas. (COMPLETADO)

### Escenario 3: Integración Financiera
*   **Dado** una nómina cerrada y aprobada.
*   **Cuando** se guarde el registro.
*   **Entonces** el sistema debe generar automáticamente un asiento de gasto en el módulo de Tesorería bajo la categoría "Gastos de Personal". (COMPLETADO)

---

## 🏗️ Requerimientos Técnicos y Arquitectura
*   **Base de Datos:** Tablas `PAYROLL_FORMULA` y `EMPLOYEE_PAYROLL_ENTRY` inyectadas en la migración.
*   **Lógica:** `PayrollCalculatorService` implementado con precisión decimal.
*   **Cumplimiento:** Lógica de topes de 5 sueldos mínimos para IVSS y SPF codificada.

---

## 🎨 Estándares de Ingeniería
*   **Precisión:** Uso de `decimal.js` para cálculos legales.
*   **Testing:** Suite de pruebas unitarias cubriendo escenarios con y sin topes legales.

---

## 🛠️ Lista de Tareas para el Desarrollador
- [x] **T6.1.1:** Crear tabla `PAYROLL_FORMULA` y `EMPLOYEE_PAYROLL_ENTRY`.
- [x] **T6.1.2:** Desarrollar el motor de cálculo de retenciones (IVSS, FAOV, SPF).
- [x] **T6.1.3:** Implementar lógica de topes basada en Sueldos Mínimos configurables.
- [x] **T6.1.4:** Crear servicio de integración para generar el asiento de gasto contable.
- [x] **T6.1.5:** Desarrollar suite de Unit Tests para validar precisión de cálculos legales.

---

## 📑 Dev Agent Record (Amelia)
- **Base de Datos:** Se actualizó la migración inicial para incluir el soporte de nómina multitenant.
- **Servicio:** Implementado `PayrollCalculatorService` que maneja la complejidad de la LOTT venezolana.
- **Pruebas:** Creados tests en `payroll_calculator.spec.ts` validando los cálculos exactos según la ley.
- **🔥 AI Code Review Fixes (Aplicados):** 
  - Se eliminaron los porcentajes legales "hardcodeados" (4%, 1%, etc.) del código fuente del servicio, inyectándolos ahora a través de una interfaz `PayrollConfig`. Esto garantiza que ARI pueda reaccionar a Gacetas Oficiales cambiando datos en base de datos sin recompilar la aplicación.
  - Se actualizaron las pruebas unitarias para usar configuraciones inyectadas.

### Archivos Creados/Modificados:
- `src/infrastructure/persistence/postgresql/migrations/001_initial_schema.sql`
- `src/application/services/payroll-calculator.service.ts`
- `src/application/services/tests/payroll_calculator.spec.ts`
