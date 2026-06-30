import React from 'react';

interface Shelf {
  id: string;
  name: string;
  occupancy: number;
}

/**
 * WarehouseMap Component
 * Purpose: Visual 2D Grid of storage units (T5.1.4).
 * Layout: BODEGAS_LAYOUT.md
 */
export const WarehouseMap: React.FC<{ shelves: Shelf[] }> = ({ shelves }) => {
  const getColorClass = (pct: number) => {
    if (pct < 70) return 'bg-green-500';
    if (pct < 90) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg border">
      <h3 className="text-xl font-bold mb-6 flex items-center">
        <span className="mr-2">🏭</span> Mapa Visual de Bodega
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {shelves.map((shelf) => (
          <div
            key={shelf.id}
            className="cursor-pointer group relative flex flex-col items-center p-4 border rounded-lg hover:shadow-md transition-all"
          >
            <div className={`w-full h-4 rounded-full mb-2 ${getColorClass(shelf.occupancy)}`} />
            <span className="text-sm font-bold text-gray-700">{shelf.name}</span>
            <span className="text-xs text-gray-500">{shelf.occupancy}% ocupado</span>
            
            {/* Tooltip on hover */}
            <div className="absolute hidden group-hover:block bottom-full mb-2 p-2 bg-navy-blue text-white text-xs rounded shadow-lg z-10 w-32 text-center">
              Haz clic para ver inventario detallado
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
