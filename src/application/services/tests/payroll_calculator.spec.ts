import { PayrollCalculatorService, PayrollConfig } from '../payroll-calculator.service';

describe('PayrollCalculatorService (LOTT Precision Tests)', () => {
  let service: PayrollCalculatorService;
  let defaultConfig: PayrollConfig;

  beforeEach(() => {
    service = new PayrollCalculatorService();
    defaultConfig = {
      ivssPercentage: 0.04,
      faovPercentage: 0.01,
      spfPercentage: 0.005
    };
  });

  it('should calculate deductions correctly within the cap', () => {
    const salary = 1000;
    const minWage = 130; // Cap 5 = 650
    
    const results = service.calculateLegalDeductions(salary, minWage, defaultConfig);

    // IVSS: 650 * 0.04 = 26
    expect(results.ivss).toBe(26);
    // FAOV: 1000 * 0.01 = 10
    expect(results.faov).toBe(10);
    // SPF: 650 * 0.005 = 3.25
    expect(results.spf).toBe(3.25);
  });

  it('should calculate deductions without cap if salary is below 5 min wages', () => {
    const salary = 500;
    const minWage = 130; // Cap 5 = 650
    
    const results = service.calculateLegalDeductions(salary, minWage, defaultConfig);

    // IVSS: 500 * 0.04 = 20
    expect(results.ivss).toBe(20);
    // FAOV: 500 * 0.01 = 5
    expect(results.faov).toBe(5);
  });
});
