import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import { SystemSettingRepository } from '../persistence/typeorm/repositories/system-setting.repository';
import { ExchangeRateHistoryRepository } from '../persistence/typeorm/repositories/exchange-rate-history.repository';

export interface CurrencyRateDetail {
  rate: number;
  code: 'USD' | 'EUR' | 'USDT';
  symbol: string;
  name: string;
}

export interface DualMasterBcvRateData {
  USD: CurrencyRateDetail;
  EUR: CurrencyRateDetail;
  BINANCE?: CurrencyRateDetail;
  source: 'AUTO_SCRAPING' | 'MANUAL' | 'INITIAL_SEED' | 'FALLBACK';
  updated_at: string;
  value_date?: string;
  execution_slot?: 'MORNING' | 'EVENING' | 'MANUAL_OVERRIDE';
}

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);
  private readonly httpsAgent = new https.Agent({ rejectUnauthorized: false });

  constructor(
    private readonly systemSettingRepository: SystemSettingRepository,
    private readonly exchangeRateHistoryRepository: ExchangeRateHistoryRepository,
  ) {}

  /**
   * Obtiene la matriz de tasas vigentes (USD, EUR y Binance P2P USDT si está disponible).
   */
  async getCurrentMasterRate(): Promise<DualMasterBcvRateData> {
    try {
      const setting = await this.systemSettingRepository.findByKey('master_bcv_rates');
      if (setting && setting.value) {
        const val = setting.value;
        return {
          USD: {
            rate: Number(val.USD?.rate) || 772.54,
            code: 'USD',
            symbol: '$',
            name: 'Dólar Estadounidense',
          },
          EUR: {
            rate: Number(val.EUR?.rate) || 894.49,
            code: 'EUR',
            symbol: '€',
            name: 'Euro',
          },
          BINANCE: val.BINANCE
            ? {
                rate: Number(val.BINANCE?.rate) || 1013.50,
                code: 'USDT',
                symbol: '₮',
                name: 'Binance P2P (USDT/VES)',
              }
            : {
                rate: 1013.50,
                code: 'USDT',
                symbol: '₮',
                name: 'Binance P2P (USDT/VES)',
              },
          source: val.source || 'SAVED_STATE',
          updated_at: val.updated_at || setting.updated_at?.toISOString() || new Date().toISOString(),
          value_date: val.value_date,
          execution_slot: val.execution_slot,
        };
      }
    } catch (err) {
      this.logger.warn('Could not read master_bcv_rates from SystemSettingRepository, using fallback:', err);
    }

    return {
      USD: { rate: 772.54, code: 'USD', symbol: '$', name: 'Dólar Estadounidense' },
      EUR: { rate: 894.49, code: 'EUR', symbol: '€', name: 'Euro' },
      BINANCE: { rate: 1013.50, code: 'USDT', symbol: '₮', name: 'Binance P2P (USDT/VES)' },
      source: 'FALLBACK',
      updated_at: new Date().toISOString(),
      execution_slot: 'MORNING',
    };
  }

  /**
   * Registra manualmente la tasa de USD, EUR o ambas
   */
  async setManualMasterRate(rates: { usdRate?: number; eurRate?: number; binanceRate?: number }, valueDate?: string, note?: string): Promise<DualMasterBcvRateData> {
    const current = await this.getCurrentMasterRate();

    const cleanUsd = rates.usdRate !== undefined ? Number(Number(rates.usdRate).toFixed(4)) : current.USD.rate;
    const cleanEur = rates.eurRate !== undefined ? Number(Number(rates.eurRate).toFixed(4)) : current.EUR.rate;
    const cleanBinance = rates.binanceRate !== undefined ? Number(Number(rates.binanceRate).toFixed(4)) : (current.BINANCE?.rate || 1013.50);

    if (cleanUsd <= 0 || cleanEur <= 0 || isNaN(cleanUsd) || isNaN(cleanEur)) {
      throw new Error('Las tasas deben ser números positivos mayores a cero');
    }

    const payload: DualMasterBcvRateData = {
      USD: { rate: cleanUsd, code: 'USD', symbol: '$', name: 'Dólar Estadounidense' },
      EUR: { rate: cleanEur, code: 'EUR', symbol: '€', name: 'Euro' },
      BINANCE: { rate: cleanBinance, code: 'USDT', symbol: '₮', name: 'Binance P2P (USDT/VES)' },
      source: 'MANUAL',
      updated_at: new Date().toISOString(),
      value_date: valueDate || new Date().toISOString().split('T')[0],
      execution_slot: 'MANUAL_OVERRIDE',
    };

    await this.saveMasterRateToDb(payload);
    await this.exchangeRateHistoryRepository.record('USD', cleanUsd, 'MANUAL', 'MANUAL_OVERRIDE', payload.value_date);
    await this.exchangeRateHistoryRepository.record('EUR', cleanEur, 'MANUAL', 'MANUAL_OVERRIDE', payload.value_date);

    this.logger.log(`Manual Master BCV Rates saved: USD = ${cleanUsd}, EUR = ${cleanEur}, BINANCE = ${cleanBinance}`);
    return payload;
  }

  /**
   * Realiza scraping en vivo a bcv.org.ve para USD y EUR, y a Binance P2P para USDT/VES.
   * Guarda en settings e histórico.
   */
  async getOfficialBcvRate(slotOverride?: 'MORNING' | 'EVENING'): Promise<DualMasterBcvRateData> {
    try {
      const scraped = await this.scrapeBcvWebsite(slotOverride);
      if (scraped && scraped.USD.rate > 0 && scraped.EUR.rate > 0) {
        // Consultar tasa Binance P2P en paralelo
        try {
          const binanceRate = await this.scrapeBinanceP2pRate();
          if (binanceRate > 0) {
            scraped.BINANCE = {
              rate: binanceRate,
              code: 'USDT',
              symbol: '₮',
              name: 'Binance P2P (USDT/VES)',
            };
          }
        } catch (binanceErr: any) {
          this.logger.warn(`Could not fetch live Binance P2P rate: ${binanceErr.message}. Keeping cached/fallback.`);
          const current = await this.getCurrentMasterRate();
          if (current.BINANCE) scraped.BINANCE = current.BINANCE;
        }

        await this.saveMasterRateToDb(scraped);
        await this.exchangeRateHistoryRepository.record('USD', scraped.USD.rate, 'AUTO_SCRAPING', scraped.execution_slot, scraped.value_date);
        await this.exchangeRateHistoryRepository.record('EUR', scraped.EUR.rate, 'AUTO_SCRAPING', scraped.execution_slot, scraped.value_date);

        this.logger.log(`Official Dual BCV & Binance Rates fetched: USD=${scraped.USD.rate}, EUR=${scraped.EUR.rate}, BINANCE=${scraped.BINANCE?.rate ?? 'N/A'}`);
        return scraped;
      }
    } catch (error: any) {
      this.logger.error('Failed to scrape live BCV website, returning current cached rates:', error.message);
    }

    return this.getCurrentMasterRate();
  }

  /**
   * Consulta el precio promedio de mercado Binance P2P (USDT/VES)
   */
  async scrapeBinanceP2pRate(): Promise<number> {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        asset: 'USDT',
        fiat: 'VES',
        merchantCheck: false,
        page: 1,
        payTypes: [],
        publisherType: null,
        rows: 10,
        tradeType: 'BUY',
      });

      const options: https.RequestOptions = {
        hostname: 'p2p.binance.com',
        port: 443,
        path: '/bapi/c2c/v2/friendly/c2c/adv/search',
        method: 'POST',
        timeout: 8000,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.setEncoding('utf8');

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            const items = parsed.data || [];
            const prices = items
              .map((item: any) => parseFloat(item.adv?.price))
              .filter((price: number) => !isNaN(price) && price > 0);

            if (prices.length > 0) {
              const avg = prices.reduce((acc: number, val: number) => acc + val, 0) / prices.length;
              resolve(Number(avg.toFixed(2)));
              return;
            }

            reject(new Error('No ads found in Binance P2P response'));
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout connecting to Binance P2P API'));
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Scraping directo a la web oficial del Banco Central de Venezuela
   */
  private scrapeBcvWebsite(slotOverride?: 'MORNING' | 'EVENING'): Promise<DualMasterBcvRateData> {
    return new Promise((resolve, reject) => {
      const options: https.RequestOptions = {
        hostname: 'www.bcv.org.ve',
        port: 443,
        path: '/',
        method: 'GET',
        agent: this.httpsAgent,
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        },
      };

      const req = https.request(options, (res) => {
        let html = '';
        res.setEncoding('utf8');

        res.on('data', (chunk) => {
          html += chunk;
        });

        res.on('end', () => {
          try {
            // Extraer USD (#dolar)
            const dolarMatch = html.match(/id=["']dolar["'][\s\S]*?<strong[^>]*>\s*([0-9.,]+)\s*<\/strong>/i);
            // Extraer EUR (#euro)
            const euroMatch = html.match(/id=["']euro["'][\s\S]*?<strong[^>]*>\s*([0-9.,]+)\s*<\/strong>/i);
            
            // Extraer Fecha Valor
            const dateMatch = html.match(/Fecha\s+Valor:\s*<span[^>]*>([^<]+)<\/span>/i);
            const valueDate = dateMatch ? dateMatch[1].trim() : undefined;

            if (dolarMatch && dolarMatch[1] && euroMatch && euroMatch[1]) {
              const usdRate = parseFloat(dolarMatch[1].trim().replace(/\./g, '').replace(',', '.'));
              const eurRate = parseFloat(euroMatch[1].trim().replace(/\./g, '').replace(',', '.'));

              // Inferir slot según hora local (antes de las 13:00 = MORNING, después = EVENING)
              const hour = new Date().getHours();
              const inferredSlot = slotOverride || (hour < 13 ? 'MORNING' : 'EVENING');

              if (!isNaN(usdRate) && usdRate > 0 && !isNaN(eurRate) && eurRate > 0) {
                resolve({
                  USD: { rate: Number(usdRate.toFixed(4)), code: 'USD', symbol: '$', name: 'Dólar Estadounidense' },
                  EUR: { rate: Number(eurRate.toFixed(4)), code: 'EUR', symbol: '€', name: 'Euro' },
                  source: 'AUTO_SCRAPING',
                  updated_at: new Date().toISOString(),
                  value_date: valueDate,
                  execution_slot: inferredSlot,
                });
                return;
              }
            }

            reject(new Error('No se pudieron extraer las tasas USD y EUR del HTML oficial del BCV'));
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Tiempo de espera agotado al conectar con bcv.org.ve'));
      });

      req.end();
    });
  }

  /**
   * Persiste la matriz de tasas en el repositorio tipado
   */
  private async saveMasterRateToDb(data: DualMasterBcvRateData): Promise<void> {
    try {
      await this.systemSettingRepository.upsertSetting(
        'master_bcv_rates',
        data,
        'Tasas Maestras Globales Oficiales BCV (USD / EUR)'
      );

      // Compatibilidad con la key singular previa
      await this.systemSettingRepository.upsertSetting(
        'master_bcv_rate',
        { rate: data.USD.rate, source: data.source, updated_at: data.updated_at, value_date: data.value_date },
        'Tasa Maestra Global Oficial BCV (USD)'
      );
    } catch (err) {
      this.logger.error('Error saving dual master rates to SystemSettingRepository:', err);
    }
  }
}
