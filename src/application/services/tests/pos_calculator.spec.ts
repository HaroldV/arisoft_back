import { PosCalculatorService } from '../pos-calculator.service';

describe('PosCalculatorService (Financial Precision & SENIAT Compliance Tests)', () => {
  let service: PosCalculatorService;

  beforeEach(() => {
    service = new PosCalculatorService();
  });

  it('should calculate correct totals in USD and VES for standard items', () => {
    const mockItems = [
      { price_usd: 10, quantity: 2, tax_rate: 16 }, // Sub: 20, Tax: 3.2, Total: 23.2
      { price_usd: 5, quantity: 1, tax_rate: 0 },   // Sub: 5, Tax: 0, Total: 5
    ];
    const exchangeRate = 36.5;

    const totals = service.calculateTotals(mockItems, exchangeRate);

    expect(totals.usd.subtotal).toBe(25);
    expect(totals.usd.tax).toBe(3.2);
    expect(totals.usd.total).toBe(28.2);

    expect(totals.ves.total).toBe(Number((28.2 * 36.5).toFixed(2)));
  });

  it('should handle zero quantity items gracefully without crashing', () => {
    const mockItems = [
      { price_usd: 50, quantity: 0, tax_rate: 16 },
    ];
    const totals = service.calculateTotals(mockItems, 36.5);

    expect(totals.usd.subtotal).toBe(0);
    expect(totals.usd.tax).toBe(0);
    expect(totals.usd.total).toBe(0);
  });
});
