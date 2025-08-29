'use client';

import { paths } from '@/lib/api/types';
import Link from 'next/link';
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
  placeholder = '材料を選択してください',
}: MaterialPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const selectedMaterial = availability.find((m) => m.id === value);

  // 検索フィルタリング（材料マスターからのみ）
  const filteredMaterials = availability.filter(
    (material) =>
      material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.name.includes(searchTerm),
  );

  const handleSearchChange = (input: string) => {
    setSearchTerm(input);
  };

  const handleMaterialSelect = (material: MaterialsAvailabilityItem) => {
    onChange(material.id, material.name, material.unit || undefined, undefined);
    setSearchTerm(material.name); // 選択された材料名を検索フィールドに表示
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null, '');
    setSearchTerm('');
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        {/* 材料選択フィールド（自由入力不可） */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
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
                    <div className="text-xs text-gray-400 mt-1">
                      {(material as any).category && (
                        <span className="mr-2">カテゴリー: {(material as any).category}</span>
                      )}
                      {material.unit && <span>単位: {material.unit}</span>}
                    </div>
                  </div>
                ))
              ) : searchTerm ? (
                <div className="px-3 py-2 text-gray-500">「{searchTerm}」は見つかりません</div>
              ) : (
                <div className="px-3 py-2 text-gray-500">材料を選択してください</div>
              )}
            </div>
          )}
        </div>

        {/* クリアボタン */}
        {(selectedMaterial || searchTerm) && (
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

      {/* 材料が見つからない場合の警告と在庫一覧へのリンク */}
      {searchTerm && !selectedMaterial && filteredMaterials.length === 0 && (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
          <div className="text-yellow-800 mb-2">
            <span className="font-medium">材料が見つかりません。</span>
            新規登録は在庫一覧から行ってください。
          </div>
          <Link
            href="/inventory?new=1"
            target="_blank"
            className="inline-flex items-center px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded border border-blue-300 transition-colors"
          >
            在庫一覧で新規資材を登録
          </Link>
        </div>
      )}
    </div>
  );
}
