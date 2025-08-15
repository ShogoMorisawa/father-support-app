'use client';
import { api } from '@/lib/api/client';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

type Material = {
  materialId: number; // APIエンドポイントから返される構造に合わせる
  name: string;
  unit?: string | null;
  currentQty: number;
  thresholdQty: number;
};

type MaterialsResponse = {
  ok: boolean;
  data: {
    items: Material[];
  };
};

export default function InventoryQuickView() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: materialsData } = useQuery({
    queryKey: ['materials', 'low'],
    queryFn: () => api.get<MaterialsResponse>('/api/materials/low'),
  });

  const materials = materialsData?.data?.items ?? [];
  const lowStockCount = materials.filter((m) => m.currentQty < m.thresholdQty).length;

  const filteredMaterials = materials.filter((material) =>
    material.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // 外部から開けるように（例：完了トーストの「在庫を見る」）
  useEffect(() => {
    const open = () => setIsOpen(true);
    window.addEventListener('open-inventory', open as EventListener);
    return () => window.removeEventListener('open-inventory', open as EventListener);
  }, []);

  return (
    <>
      {/* 在庫クイックビューアイコン */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 text-gray-600 hover:text-gray-800 transition-colors"
        title="在庫クイックビュー"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
        {/* 低在庫バッジ */}
        {lowStockCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {lowStockCount}
          </span>
        )}
      </button>

      {/* モーダル */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">在庫状況</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* 検索バー */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="材料名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 在庫一覧 */}
            <div className="overflow-y-auto max-h-[60vh]">
              {filteredMaterials.length === 0 ? (
                <p className="text-gray-500 text-center py-4">材料が見つかりません</p>
              ) : (
                <div className="space-y-2">
                  {filteredMaterials.map((material) => {
                    const isLowStock = material.currentQty < material.thresholdQty;
                    return (
                      <div
                        key={material.materialId} // materialIdを使用
                        className={`p-3 border rounded-lg ${
                          isLowStock ? 'border-red-200 bg-red-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{material.name}</div>
                            <div className="text-sm text-gray-600">
                              現在: {material.currentQty} {material.unit || '個'}
                              {material.thresholdQty > 0 && (
                                <span className="ml-2">
                                  / 閾値: {material.thresholdQty} {material.unit || '個'}
                                </span>
                              )}
                            </div>
                          </div>
                          {isLowStock && (
                            <div className="flex items-center space-x-2">
                              <span className="text-red-600 text-sm font-medium">要発注</span>
                              <button
                                onClick={() => {
                                  // 発注メールのテンプレート生成（実装予定）
                                  alert(`${material.name}の発注メールを生成します`);
                                }}
                                className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                              >
                                発注
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
