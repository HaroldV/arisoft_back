import * as QRCode from 'qrcode';

/**
 * QrGeneratorUtil
 * Purpose: Generate QR codes for storage units (T5.2.1).
 * Standard: Industrial Labeling
 */
export class QrGeneratorUtil {
  async generateLocationTag(locationId: string): Promise<string> {
    try {
      // Data format: ari://location/{id}
      const data = `ari://location/${locationId}`;
      return await QRCode.toDataURL(data);
    } catch (err) {
      console.error('QR Generation failed', err);
      throw new Error('Could not generate QR code');
    }
  }
}
