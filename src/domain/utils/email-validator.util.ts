import * as dns from 'dns';
import { promisify } from 'util';

const resolveMxAsync = promisify(dns.resolveMx);

export interface EmailValidationResult {
  isValidSyntax: boolean;
  hasValidMx: boolean;
  domain?: string;
  error?: string;
}

export class EmailValidator {
  private static readonly EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  /**
   * Validates email syntax and performs a real DNS MX record check for the domain.
   */
  public static async validate(email: string): Promise<EmailValidationResult> {
    if (!email || typeof email !== 'string') {
      return { isValidSyntax: false, hasValidMx: false, error: 'Email no proporcionado' };
    }

    const cleanEmail = email.trim().toLowerCase();
    const isValidSyntax = this.EMAIL_REGEX.test(cleanEmail);

    if (!isValidSyntax) {
      return { isValidSyntax: false, hasValidMx: false, error: 'Sintaxis de correo electrónico inválida' };
    }

    const domain = cleanEmail.split('@')[1];

    try {
      const mxRecords = await resolveMxAsync(domain);
      const hasValidMx = Array.isArray(mxRecords) && mxRecords.length > 0;

      return {
        isValidSyntax: true,
        hasValidMx,
        domain,
        error: hasValidMx ? undefined : `El dominio ${domain} no posee servidores de correo MX activos`,
      };
    } catch (err) {
      return {
        isValidSyntax: true,
        hasValidMx: false,
        domain,
        error: `El dominio ${domain} no existe o no tiene registros de correo activos`,
      };
    }
  }
}
