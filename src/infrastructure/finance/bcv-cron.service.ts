import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ExchangeRateService } from './exchange-rate.service';

@Injectable()
export class BcvCronService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BcvCronService.name);
  private timer: NodeJS.Timeout | null = null;
  private isExecuting = false;

  constructor(private readonly exchangeRateService: ExchangeRateService) {}

  onModuleInit() {
    this.logger.log('🚀 Initializing BCV Cron Scheduler (08:30 AM & 05:30 PM VET)...');
    // Revisión periódica cada 60 segundos
    this.timer = setInterval(() => this.checkScheduleAndExecute(), 60 * 1000);
    // Ejecutar una verificación inicial diferida (10 segundos tras inicio)
    setTimeout(() => this.checkScheduleAndExecute(true), 10 * 1000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Verifica la hora actual (en zona horaria de Venezuela UTC-4 o local) y ejecuta en los slots programados
   */
  async checkScheduleAndExecute(isStartup = false) {
    if (this.isExecuting) return;

    const now = new Date();
    // Obtener hora y minutos en Venezuela (UTC-4)
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Caracas',
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    const weekday = parts.find((p) => p.type === 'weekday')?.value || '';

    const isBusinessDay = !['Sat', 'Sun'].includes(weekday);

    // Slot 1: 08:30 AM (Mañana)
    const isMorningSlot = isBusinessDay && hour === 8 && minute === 30;
    // Slot 2: 05:30 PM (Tarde)
    const isEveningSlot = isBusinessDay && hour === 17 && minute === 30;

    if (isMorningSlot || isEveningSlot || (isStartup && this.shouldRunStartupCatchup())) {
      const slot = isEveningSlot ? 'EVENING' : 'MORNING';
      await this.runScheduledSync(slot);
    }
  }

  private shouldRunStartupCatchup(): boolean {
    return false; // Evitar saturación en reinicios frecuentes
  }

  /**
   * Ejecuta el scraping y guarda el histórico con reintentos
   */
  async runScheduledSync(slot: 'MORNING' | 'EVENING') {
    this.isExecuting = true;
    this.logger.log(`⏰ Starting automated BCV Cronjob Execution for slot: ${slot}...`);

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        const result = await this.exchangeRateService.getOfficialBcvRate(slot);
        this.logger.log(
          `✅ BCV Automated Cron finished successfully! [USD: Bs. ${result.USD.rate} | EUR: Bs. ${result.EUR.rate} | Fecha Valor: ${result.value_date || 'N/A'}]`
        );
        break;
      } catch (err: any) {
        this.logger.warn(`⚠️ BCV Cron attempt ${attempts}/${maxAttempts} failed: ${err.message}`);
        if (attempts < maxAttempts) {
          await new Promise((res) => setTimeout(res, 5000));
        } else {
          this.logger.error(`❌ BCV Cron exhausted all ${maxAttempts} attempts.`);
        }
      }
    }

    this.isExecuting = false;
  }
}
