'use client';

import { paths } from '@/lib/api/types';
import { useState } from 'react';

type MaterialsAvailabilityItem =
  paths['/materials/availability']['get']['responses']['200']['content']['application/json']['data']['items'][0];

interface MaterialPickerProps {
  value: number | null;
  onChange: (
    materialId: number | null,
    materialName: string,
    unit?: string,
    category?: string,
  ) => void;
  availability: MaterialsAvailabilityItem[];
  placeholder?: string;
}

export function MaterialPicker({
  value,
  onChange,
  availability,
  placeholder = '材料を選択または入力',
}: MaterialPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');

  const selectedMaterial = availability.find((m) => m.id === value);

  // 検索フィルタリング
  const filteredMaterials = availability.filter(
    (material) =>
      material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.name.includes(searchTerm),
  );

  const handleMaterialSelect = (material: MaterialsAvailabilityItem) => {
    onChange(material.id, material.name, material.unit || undefined, undefined);
    setCustomInput('');
    setIsOpen(false);
  };

  const handleCustomInput = (input: string) => {
    setCustomInput(input);
    if (input.trim()) {
      onChange(null, input.trim());
    }
  };

  const handleClear = () => {
    onChange(null, '');
    setCustomInput('');
    setSearchTerm('');
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        {/* 材料選択ドロップダウン */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsOpen(true)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {isOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {filteredMaterials.length > 0 ? (
                filteredMaterials.map((material) => (
                  <div
                    key={material.id}
                    onClick={() => handleMaterialSelect(material)}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{material.name}</span>
                      <span className="text-sm text-gray-500">在庫 {material.availableQty}</span>
                    </div>
                    {material.unit && (
                      <div className="text-xs text-gray-400 mt-1">単位: {material.unit}</div>
                    )}
                  </div>
                ))
              ) : (
                <div className="px-3 py-2 text-gray-500">材料が見つかりません</div>
              )}
            </div>
          )}
        </div>

        {/* カスタム入力 */}
        <input
          type="text"
          placeholder="自由入力"
          value={customInput}
          onChange={(e) => handleCustomInput(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        {/* クリアボタン */}
        {(selectedMaterial || customInput) && (
          <button
            onClick={handleClear}
            className="px-3 py-2 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            クリア
          </button>
        )}
      </div>

      {/* 選択された材料の情報表示 */}
      {selectedMaterial && (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
          <div className="text-blue-800">
            <span className="font-medium">選択中:</span> {selectedMaterial.name}
            {selectedMaterial.unit && <span className="ml-2">({selectedMaterial.unit})</span>}
          </div>
          <div className="text-blue-600 mt-1">
            在庫: {selectedMaterial.availableQty} / 予定消費: {selectedMaterial.committedQty}
          </div>
        </div>
      )}

      {/* カスタム入力の情報表示 */}
      {customInput && !selectedMaterial && (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
          <div className="text-yellow-800">
            <span className="font-medium">カスタム入力:</span> {customInput}
          </div>
          <div className="text-yellow-600 mt-1">在庫不明（材料マスターに登録されていません）</div>
        </div>
      )}
    </div>
  );
}
