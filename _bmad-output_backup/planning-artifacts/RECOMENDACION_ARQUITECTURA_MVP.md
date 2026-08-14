# Recomendación de Arquitectura MVP: Nómina Tropicalizada & Finanzas
**De:** Mary (Analista) & Winston (Architect)
**Estado:** Especificación de Motor de Cálculo Legal

## 1. Modelo de Datos: Nómina y Retenciones Legales
Para manejar la complejidad venezolana (LOTT), implementamos un motor de fórmulas dinámico.

### Tabla: PAYROLL_FORMULA (Variables Legales)
*   `id (PK), tenant_id (FK), name (IVSS, FAOV, LPH), percentage, base_limit (Sueldos Mínimos), type (EMPLOYEE_DEDUCTION, COMPANY_COST)`.
*   **Lógica:** Permite que ARI se adapte a cambios de Gaceta Oficial sin actualizaciones de software.

### Tabla: EMPLOYEE_PAYROLL_ENTRY
*   `id (PK), employee_id (FK), payroll_period_id (FK), base_salary, cestaticket_amount, bonuses, deductions, net_payable, currency (VES)`.

---

## 2. Integración Financiera: El Gasto de Personal
*   **Cierre Automático:** Al marcar una nómina como "Pagada", ARI crea un registro en `CASH_FLOW` consolidando el total de sueldos + cargas patronales.
*   **Provisión de Prestaciones:** El sistema calcula mensualmente la provisión de prestaciones sociales y la muestra en los Reportes Analíticos como un "Pasivo Laboral Estimado", evitando sorpresas financieras al dueño.
