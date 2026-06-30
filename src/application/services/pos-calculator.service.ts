import Decimal from 'decimal.js';

/**
 * PosCalculatorService
 * Purpose: Real-time calculation for POS totals (T4.1.4).
 * Standard: Monetary Precision (Decimal.js)
 */
export class PosCalculatorService {
  calculateTotals(items: any[], exchangeRate: number) {
    let subtotalUsd = new Decimal(0);
    let totalTaxUsd = new Decimal(0);

    items.forEach((item) => {
      const lineSubtotal = new Decimal(item.price_usd).mul(item.quantity);
      const lineTax = lineSubtotal.mul(new Decimal(item.tax_rate).div(100));
      
      subtotalUsd = subtotalUsd.plus(lineSubtotal);
      totalTaxUsd = totalTaxUsd.plus(lineTax);
    });

    const totalUsd = subtotalUsd.plus(totalTaxUsd);
    
    // Convert to VES (Sovereign Economy Standard)
    const subtotalVes = subtotalUsd.mul(exchangeRate);
    const totalTaxVes = totalTaxUsd.mul(exchangeRate);
    const totalVes = totalUsd.mul(exchangeRate);

    return {
      usd: {
        subtotal: subtotalUsd.toNumber(),
        tax: totalTaxUsd.toNumber(),
        total: totalUsd.toNumber(),
      },
      ves: {
        subtotal: subtotalVes.toNumber(),
        tax: totalTaxVes.toNumber(),
        total: totalVes.toNumber(),
      },
    };
  }
}
