import { Injectable } from '@nestjs/common';

/**
 * WarehouseOccupancyService
 * Purpose: Calculate real-time capacity usage (T5.1.3).
 */
@Injectable()
export class WarehouseOccupancyService {
  calculateOccupancy(currentStock: number, capacityLimit: number): number {
    if (!capacityLimit || capacityLimit === 0) return 0;
    
    const percentage = (currentStock / capacityLimit) * 100;
    return Math.min(Math.round(percentage), 100); // Caps at 100%
  }

  getOccupancyColor(percentage: number): 'GREEN' | 'YELLOW' | 'RED' {
    if (percentage < 70) return 'GREEN';
    if (percentage < 90) return 'YELLOW';
    return 'RED';
  }
}
