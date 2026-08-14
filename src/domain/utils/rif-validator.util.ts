import { RifTypeEnum } from '../constants/domain.constants';

export interface RifValidationResult {
  isValid: boolean;
  formattedRif: string;
  type?: RifTypeEnum;
  error?: string;
}

export class RifValidator {
  private static readonly TYPE_WEIGHTS: Record<string, number> = {
    V: 1,
    E: 2,
    J: 3,
    P: 4,
    G: 5,
  };

  private static readonly MULTIPLIERS = [3, 2, 7, 6, 5, 4, 3, 2];

  /**
   * Validates a RIF string using SENIAT's Modulo 11 checksum algorithm
   * Format expected: J-12345678-9, J123456789, V-12345678-0, etc.
   */
  public static validate(rawRif: string): RifValidationResult {
    if (!rawRif || typeof rawRif !== 'string') {
      return { isValid: false, formattedRif: '', error: 'RIF no proporcionado' };
    }

    // Clean formatting characters
    const clean = rawRif.toUpperCase().replace(/[^VJGEP0-9]/g, '');

    if (clean.length < 9 || clean.length > 10) {
      return { 
        isValid: false, 
        formattedRif: rawRif, 
        error: 'El RIF debe tener 9 o 10 caracteres (ej. J-12345678-9)' 
      };
    }

    const typeChar = clean.charAt(0);
    if (!this.TYPE_WEIGHTS[typeChar]) {
      return { 
        isValid: false, 
        formattedRif: rawRif, 
        error: 'Tipo de RIF inválido. Debe comenzar con V, J, G, E o P' 
      };
    }

    // Extract body and checksum digit
    const bodyDigits = clean.substring(1, clean.length - 1).padStart(8, '0');
    const expectedDigit = parseInt(clean.charAt(clean.length - 1), 10);

    if (isNaN(expectedDigit)) {
      return { 
        isValid: false, 
        formattedRif: rawRif, 
        error: 'Dígito verificador inválido' 
      };
    }

    // Compute checksum
    let sum = this.TYPE_WEIGHTS[typeChar] * 4;

    for (let i = 0; i < 8; i++) {
      const digit = parseInt(bodyDigits.charAt(i), 10);
      if (isNaN(digit)) {
        return { isValid: false, formattedRif: rawRif, error: 'El RIF contiene números inválidos' };
      }
      sum += digit * this.MULTIPLIERS[i];
    }

    const remainder = sum % 11;
    let calculatedDigit = 11 - remainder;

    if (calculatedDigit >= 10) {
      calculatedDigit = 0;
    }

    const isValid = calculatedDigit === expectedDigit;
    const formattedRif = `${typeChar}-${bodyDigits}-${expectedDigit}`;

    const typeMap: Record<string, RifTypeEnum> = {
      J: RifTypeEnum.JURIDICO,
      V: RifTypeEnum.NATURAL_V,
      E: RifTypeEnum.NATURAL_E,
      G: RifTypeEnum.GUBERNAMENTAL,
      P: RifTypeEnum.PASAPORTE,
    };

    return {
      isValid,
      formattedRif,
      type: typeMap[typeChar],
      error: isValid ? undefined : `Dígito verificador no coincide (se esperaba ${calculatedDigit})`,
    };
  }
}
