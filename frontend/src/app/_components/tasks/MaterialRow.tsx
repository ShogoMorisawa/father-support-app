'use client';

import { MaterialPicker } from '@/app/_components/estimate/MaterialPicker';
import { paths } from '@/lib/api/types';

type MaterialsAvailabilityItem =
  paths['/materials/availability']['get']['responses']['200']['content']['application/json']['data']['items'][0];

interface MaterialRowProps {
  materialId: number | null;
  materialName: string;
  qtyPlanned: number;
  unit: string;
  availability: MaterialsAvailabilityItem[];
  onMaterialChange: (materialId: number | null, materialName: string, unit: string) => void;
  onQtyChange: (qty: number) => void;
  onRemove: () => void;
}

export function MaterialRow({
  materialId,
  materialName,
  qtyPlanned,
  unit,
  availability,
  onMaterialChange,
  onQtyChange,
  onRemove,
}: MaterialRowProps) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center">
      <div className="col-span-6">
        <MaterialPicker
          value={materialId}
          onChange={(id, name, unit) => onMaterialChange(id, name, unit || '')}
          availability={availability}
          placeholder="材料を選択"
        />
      </div>
      <div className="col-span-3">
        <input
          type="number"
          step="0.001"
          min="0"
          value={qtyPlanned || ''}
          onChange={(e) => onQtyChange(parseFloat(e.target.value) || 0)}
          className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="数量"
        />
      </div>
      <div className="col-span-2 text-sm text-gray-600">{unit}</div>
      <div className="col-span-1">
        <button onClick={onRemove} className="text-xs underline text-red-600 hover:text-red-800">
          削除
        </button>
      </div>
    </div>
  );
}
