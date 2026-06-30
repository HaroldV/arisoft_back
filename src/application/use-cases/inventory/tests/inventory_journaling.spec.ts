import { StockMove, StockMoveType } from '../../../../domain/entities/stock-move.entity';

describe('Inventory Journaling (Double Entry Tests)', () => {
  it('should calculate current stock correctly based on multiple moves', () => {
    const mockMoves: StockMove[] = [
      new StockMove({ type: StockMoveType.INITIAL_LOAD, quantity: 100, cost_at_time: 10 }),
      new StockMove({ type: StockMoveType.SALE, quantity: -20, cost_at_time: 10 }),
      new StockMove({ type: StockMoveType.PURCHASE, quantity: 50, cost_at_time: 11 }),
      new StockMove({ type: StockMoveType.ADJUSTMENT, quantity: -5, cost_at_time: 11 }),
    ];

    const currentStock = mockMoves.reduce((acc, move) => acc + move.quantity, 0);

    expect(currentStock).toBe(125); // 100 - 20 + 50 - 5 = 125
  });

  it('should handle empty moves resulting in zero stock', () => {
    const mockMoves: StockMove[] = [];
    const currentStock = mockMoves.reduce((acc, move) => acc + move.quantity, 0);
    expect(currentStock).toBe(0);
  });
});
