import Decimal from 'decimal.js';

export interface PayrollConfig {
  ivssPercentage: number;
  faovPercentage: number;
  spfPercentage: number;
}

/**
 * PayrollCalculatorService
 * Purpose: Tropicalized payroll logic for Venezuela (T6.1.2 & T6.1.3).
 * Fixes: Code Review CRITICAL Finding #2 (Removed hardcoded percentages)
 * Standard: LOTT / SENIAT Compliance
 */
export class PayrollCalculatorService {
  calculateLegalDeductions(salaryIntegral: number, minWage: number, config: PayrollConfig) {
    const salary = new Decimal(salaryIntegral);
    const mWage = new Decimal(minWage);
    const cap5 = mWage.mul(5);

    // IVSS (dynamic % with 5 min wage cap)
    const ivssBase = salary.gt(cap5) ? cap5 : salary;
    const ivss = ivssBase.mul(config.ivssPercentage);

    // FAOV (dynamic % no cap)
    const faov = salary.mul(config.faovPercentage);

    // Paro Forzoso (dynamic % with 5 min wage cap)
    const spfBase = salary.gt(cap5) ? cap5 : salary;
    const spf = spfBase.mul(config.spfPercentage);

    return {
      ivss: ivss.toDecimalPlaces(2).toNumber(),
      faov: faov.toDecimalPlaces(2).toNumber(),
      spf: spf.toDecimalPlaces(2).toNumber(),
      totalDeductions: ivss.plus(faov).plus(spf).toDecimalPlaces(2).toNumber(),
    };
  }
}
