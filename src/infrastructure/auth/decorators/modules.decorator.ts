import { SetMetadata } from '@nestjs/common';

export enum AppModule {
  POS = 'POS',
  INVENTORY = 'INVENTORY',
  PAYROLL = 'PAYROLL',
  WMS = 'WMS',
  REPORTS = 'REPORTS',
  SETTINGS = 'SETTINGS',
  BANKS = 'BANKS',
}

export const MODULES_KEY = 'modules';
export const ANY_MODULES_KEY = 'any_modules';
export const RequiredModules = (...modules: AppModule[]) => SetMetadata(MODULES_KEY, modules);
export const RequireAnyModule = (...modules: AppModule[]) => SetMetadata(ANY_MODULES_KEY, modules);

