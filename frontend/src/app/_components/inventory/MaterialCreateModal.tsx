'use client';

import Toast from '@/app/_components/Toast';
import { useCreateMaterial } from '@/lib/api/hooks';
import { useState } from 'react';

interface MaterialCreateModalProps {
  open: boolean;
  onClose: () => void;
}

export function MaterialCreateModal({ open, onClose }: MaterialCreateModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: '' as '障子' | '網戸' | '襖' | '',
    unit: '',
    thresholdQty: 0,
    currentQty: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  const createMaterial = useCreateMaterial();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // クライアントサイドバリデーション
    const validationErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      validationErrors.name = '名前を入力してください';
    }

    if (!formData.category) {
      validationErrors.category = 'カテゴリを選択してください';
    }

    if (!formData.unit.trim()) {
      validationErrors.unit = '単位を入力してください';
    }

    if (formData.thresholdQty < 0) {
      validationErrors.thresholdQty = '閾値は0以上で入力してください';
    }

    if (formData.currentQty < 0) {
      validationErrors.currentQty = '初期在庫は0以上で入力してください';
    }

    // 小数3桁までのチェック
    const decimalRegex = /^\d+(\.\d{1,3})?$/;
    if (!decimalRegex.test(formData.thresholdQty.toString())) {
      validationErrors.thresholdQty = '閾値は小数3桁まで入力できます';
    }

    if (!decimalRegex.test(formData.currentQty.toString())) {
      validationErrors.currentQty = '初期在庫は小数3桁まで入力できます';
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      await createMaterial.mutateAsync({
        name: formData.name.trim(),
        category: formData.category as '障子' | '網戸' | '襖',
        unit: formData.unit.trim(),
        thresholdQty: formData.thresholdQty,
        currentQty: formData.currentQty,
      });

      setToast('資材を登録しました');

      // フォームをリセット
      setFormData({
        name: '',
        category: '',
        unit: '',
        thresholdQty: 0,
        currentQty: 0,
      });

      // 少し待ってからモーダルを閉じる
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error: any) {
      if (error.response?.status === 409) {
        setErrors({ name: '同名の資材が既に存在します' });
      } else if (error.response?.status === 422) {
        const serverErrors = error.response.data?.errors || [];
        const fieldErrors: Record<string, string> = {};

        serverErrors.forEach((err: string) => {
          if (err.includes('名前')) fieldErrors.name = err;
          else if (err.includes('カテゴリ')) fieldErrors.category = err;
          else if (err.includes('単位')) fieldErrors.unit = err;
          else if (err.includes('閾値')) fieldErrors.thresholdQty = err;
          else if (err.includes('在庫')) fieldErrors.currentQty = err;
        });

        setErrors(fieldErrors);
      } else {
        setToast('登録に失敗しました。しばらく時間をおいて再試行してください。');
      }
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // エラーをクリア
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">新しい資材を登録</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
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

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 名前 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  名前 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="例：障子紙（標準）"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              {/* カテゴリ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  カテゴリ <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.category ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">選択してください</option>
                  <option value="障子">障子</option>
                  <option value="網戸">網戸</option>
                  <option value="襖">襖</option>
                </select>
                {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
              </div>

              {/* 単位 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  単位 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => handleInputChange('unit', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.unit ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="例：枚、m、本"
                />
                {errors.unit && <p className="mt-1 text-sm text-red-600">{errors.unit}</p>}
              </div>

              {/* 閾値 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  閾値 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={formData.thresholdQty}
                  onChange={(e) =>
                    handleInputChange('thresholdQty', parseFloat(e.target.value) || 0)
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.thresholdQty ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0"
                />
                {errors.thresholdQty && (
                  <p className="mt-1 text-sm text-red-600">{errors.thresholdQty}</p>
                )}
              </div>

              {/* 初期在庫 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">初期在庫</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={formData.currentQty}
                  onChange={(e) => handleInputChange('currentQty', parseFloat(e.target.value) || 0)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.currentQty ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0"
                />
                {errors.currentQty && (
                  <p className="mt-1 text-sm text-red-600">{errors.currentQty}</p>
                )}
              </div>

              {/* ボタン */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={createMaterial.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md transition-colors"
                >
                  {createMaterial.isPending ? '登録中...' : '登録'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}
