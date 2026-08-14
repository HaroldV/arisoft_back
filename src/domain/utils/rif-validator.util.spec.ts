import { RifValidator } from '../../domain/utils/rif-validator.util';

describe('RifValidator (SENIAT Modulo 11 Algorithm)', () => {
  it('should validate correct Juridico RIFs', () => {
    // Standard test RIFs
    const result1 = RifValidator.validate('J-31456982-1');
    expect(result1.isValid).toBe(true);
    expect(result1.formattedRif).toBe('J-31456982-1');
    expect(result1.type).toBe('JURIDICO');

    const result2 = RifValidator.validate('J314569821');
    expect(result2.isValid).toBe(true);
    expect(result2.formattedRif).toBe('J-31456982-1');
  });

  it('should reject RIF with invalid checksum digit', () => {
    const result = RifValidator.validate('J-31456982-9');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Dígito verificador no coincide');
  });

  it('should reject invalid RIF types', () => {
    const result = RifValidator.validate('X-12345678-9');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Tipo de RIF inválido');
  });
});
