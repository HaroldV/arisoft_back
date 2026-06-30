/**
 * TxtGeneratorUtil
 * Purpose: Generate fixed-width or delimited files for bank transfers (T6.2.2).
 */
export class TxtGeneratorUtil {
  generateBankFile(payments: any[], bankCode: 'BANESCO' | 'MERCANTIL'): string {
    let content = '';
    
    payments.forEach((pay) => {
      if (bankCode === 'BANESCO') {
        // Sample format: Account(20) | Amount(12) | ID(10) | Name(30)
        content += `${pay.account.padEnd(20)}${pay.amount.toString().padStart(12, '0')}${pay.id.padEnd(10)}${pay.name.padEnd(30)}\n`;
      }
    });

    return content;
  }
}
