'use client';

import Toast from '@/app/_components/Toast';
import {
  useCompleteTask,
  useProject,
  useProjectHistory,
  useProjectPhotos,
  useRevertComplete,
  useRevertCompleteTask,
  useUpdateProjectDates,
} from '@/lib/api/hooks';
import { photoUrlFromKey } from '@/lib/photos';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = Number(params.id);

  const { data: projectData, refetch: refetchProject } = useProject(projectId);
  const { data: photosData, refetch: refetchPhotos } = useProjectPhotos(projectId);
  const { data: historyData, refetch: refetchHistory } = useProjectHistory(projectId, {
    limit: 10,
  });

  const [toast, setToast] = useState<string | null>(null);
  const [processingTasks, setProcessingTasks] = useState<Set<number>>(new Set());
  const [showDateEditModal, setShowDateEditModal] = useState(false);
  const [dateForm, setDateForm] = useState({
    projectDueOn: '',
    deliveryOn: '',
  });

  const project = projectData?.project;
  const customer = projectData?.customer;
  const delivery = projectData?.delivery;
  const tasks = projectData?.tasks || [];
  const photos = photosData?.data?.items || [];

  const revertComplete = useRevertComplete();
  const updateDates = useUpdateProjectDates(projectId);

  // タスク行コンポーネント
  const TaskRow = ({ task }: { task: any }) => {
    const completeTask = useCompleteTask(task.id);
    const revertCompleteTask = useRevertCompleteTask(task.id);
    const isProcessing = processingTasks.has(task.id);

    const toggleTaskStatus = async () => {
      if (isProcessing) return;

      setProcessingTasks((prev) => new Set(prev).add(task.id));

      try {
        if (task.status === 'done') {
          await revertCompleteTask.mutateAsync();
          setToast('タスクを未完了に戻しました。');
        } else {
          await completeTask.mutateAsync();
          setToast('タスクを完了にしました。');
        }
        refetchProject();
        refetchHistory(); // タスク完了/取り消し後にタイムラインも更新
      } catch (error: any) {
        if (error?.response?.status === 409) {
          setToast('操作が競合しました。少し時間をおいて再試行してください。');
        } else {
          setToast('操作に失敗しました。');
        }
      } finally {
        setProcessingTasks((prev) => {
          const newSet = new Set(prev);
          newSet.delete(task.id);
          return newSet;
        });
      }
    };

    return (
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-3">
          {task.dueOn ? (
            <span className="text-gray-900">
              {new Date(task.dueOn).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })}
            </span>
          ) : (
            <span className="text-gray-400">期日未定</span>
          )}
        </td>
        <td className="px-4 py-3">
          <span className="font-medium text-gray-900">{task.title}</span>
        </td>
        <td className="px-4 py-3">
          <span className="text-gray-600 text-xs break-words">
            {formatMaterialsSummary(task.materials)}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          {/* 在庫バッジ */}
          {task.stockSufficient ?? true ? (
            <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
              在庫OK
            </span>
          ) : (
            <div className="relative">
              <button
                onClick={() =>
                  setToast(
                    `在庫不足: ${(task.insufficientMaterials ?? [])
                      .map((im: any) => `${im.name} -${im.shortage}`)
                      .join(' / ')}`,
                  )
                }
                className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                title="クリックで詳細表示"
              >
                在庫不足
              </button>
            </div>
          )}
        </td>
        <td className="px-4 py-3 text-center">
          <span
            className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
              task.status === 'done' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}
          >
            {task.status === 'done' ? '完了' : '未完了'}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          <button
            onClick={toggleTaskStatus}
            disabled={isProcessing}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              task.status === 'done'
                ? 'border-red-300 text-red-700 hover:bg-red-50'
                : 'border-green-300 text-green-700 hover:bg-green-50'
            } disabled:opacity-50`}
          >
            {task.status === 'done' ? '取り消し' : '完了'}
          </button>
        </td>
      </tr>
    );
  };

  // ステータスバッジの判定
  const getStatusBadge = () => {
    if (project?.status === 'completed') {
      return { text: '完了', color: 'bg-green-100 text-green-800' };
    }
    if (delivery?.allPrepared) {
      return { text: '完了可能', color: 'bg-yellow-100 text-yellow-800' };
    }
    return { text: '進行中', color: 'bg-gray-100 text-gray-800' };
  };

  // 納品ステータスバッジの判定
  const getDeliveryStatusBadge = () => {
    if (!delivery) return null;

    switch (delivery.status) {
      case 'pending':
        return { text: '納品待ち', color: 'bg-gray-100 text-gray-800' };
      case 'delivered':
        return { text: '納品完了', color: 'bg-green-100 text-green-800' };
      case 'cancelled':
        return { text: 'キャンセル', color: 'bg-red-100 text-red-800' };
      default:
        return { text: delivery.status, color: 'bg-gray-100 text-gray-800' };
    }
  };

  // 材料サマリの整形
  const formatMaterialsSummary = (materials: any[]) => {
    if (!materials || materials.length === 0) return '材料なし';

    const summary = materials.map((m) => {
      const qty = m.qtyPlanned;
      const unit = qty === 1 ? '' : ` × ${qty}`;
      return `${m.materialName}${unit}`;
    });

    return summary.join(' / ');
  };

  // 期日編集モーダルを開く
  const openDateEditModal = () => {
    setDateForm({
      projectDueOn: project?.dueOn || '',
      deliveryOn: delivery?.date || '',
    });
    setShowDateEditModal(true);
  };

  // 期日編集を保存
  const handleUpdateDates = async () => {
    try {
      await updateDates.mutateAsync({
        projectDueOn: dateForm.projectDueOn || undefined,
        deliveryOn: dateForm.deliveryOn || undefined,
      });
      setToast('期日を更新しました');
      setShowDateEditModal(false);
    } catch (error: any) {
      if (error?.response?.status === 409) {
        setToast('別の端末から更新されました。画面を再読み込みして、もう一度お試しください。');
      } else {
        setToast('期日の更新に失敗しました。');
      }
    }
  };

  // 案件完了取り消し
  const handleRevertComplete = async () => {
    if (!project) return;

    try {
      await revertComplete.mutateAsync({ id: project.id });
      setToast('案件を再オープンしました。');
      refetchProject();
      // 一覧ページに戻る
      router.push('/projects');
    } catch (error: any) {
      if (error?.response?.status === 409) {
        setToast('操作が競合しました。少し時間をおいて再試行してください。');
      } else {
        setToast('操作に失敗しました。');
      }
    }
  };

  if (!project) {
    return (
      <main className="max-w-4xl mx-auto p-4">
        <p className="text-center py-8 text-gray-500">読み込み中...</p>
      </main>
    );
  }

  const statusBadge = getStatusBadge();
  const deliveryStatusBadge = getDeliveryStatusBadge();

  return (
    <main className="max-w-4xl mx-auto p-4 space-y-6">
      {/* A. ヘッダ（案件タイトル＋ステータス＋主要導線） */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">案件詳細 #{project.id}</h1>
          <h2 className="text-lg text-gray-700 mb-2">{project.title}</h2>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusBadge.color}`}>
              {statusBadge.text}
            </span>
            {project.dueOn && <span className="text-sm text-gray-600">期日: {project.dueOn}</span>}
          </div>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          {delivery && (
            <Link
              href={`/deliveries/${delivery.id}`}
              className="text-blue-600 underline hover:text-blue-800"
            >
              納品詳細へ
            </Link>
          )}
          <button
            onClick={openDateEditModal}
            className="text-sm text-blue-600 underline hover:text-blue-800"
          >
            期日を編集
          </button>
          <Link
            href={`/projects/${project.id}/photos`}
            className="text-blue-600 underline hover:text-blue-800"
          >
            写真を追加
          </Link>
          {project.status === 'completed' && (
            <button
              onClick={handleRevertComplete}
              disabled={revertComplete.isPending}
              className="text-red-600 underline hover:text-red-800 disabled:opacity-50"
            >
              完了を取り消す
            </button>
          )}
        </div>
      </div>

      {/* B. 納品サマリ（進捗可視化） */}
      {delivery && (
        <section className="rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">納品サマリ</h2>
            {deliveryStatusBadge && (
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${deliveryStatusBadge.color}`}
              >
                {deliveryStatusBadge.text}
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">納品日</span>
              <span className="font-medium">
                {new Date(delivery.date).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">タスク進捗</span>
              <span className="font-medium">
                {delivery.preparedCount} / {delivery.tasksCount} 件完了
              </span>
            </div>

            {/* 進捗バー */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    delivery.tasksCount > 0
                      ? (delivery.preparedCount / delivery.tasksCount) * 100
                      : 0
                  }%`,
                }}
              />
            </div>

            {delivery.allPrepared && (
              <div className="text-center">
                <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                  完了可能
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* C. タスク一覧（材料概要＆完了トグル） */}
      <section className="rounded-lg border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h2 className="text-lg font-semibold">タスク一覧</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">期日</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">作業名</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">材料と使用量</th>
                <th className="px-4 py-3 text-center text-gray-600 font-medium">在庫</th>
                <th className="px-4 py-3 text-center text-gray-600 font-medium">ステータス</th>
                <th className="px-4 py-3 text-center text-gray-600 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tasks.map((task: any) => (
                <TaskRow key={task.id} task={task} />
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    タスクがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* D. 写真プレビュー（最大6枚）＋「すべてを見る」 */}
      <section className="rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">写真</h2>
          <Link
            href={`/projects/${project.id}/photos`}
            className="text-sm text-blue-600 underline hover:text-blue-800"
          >
            写真を追加（一覧へ）
          </Link>
        </div>

        {photos.length === 0 ? (
          <p className="text-sm text-gray-500">まだ写真がありません。</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {photos.slice(0, 6).map((photo: any) => {
                const url = photoUrlFromKey(photo.key);
                return (
                  <div key={photo.id} className="border rounded overflow-hidden">
                    <div className="aspect-square bg-gray-50">
                      {url ? (
                        <img
                          src={url}
                          alt=""
                          className="object-cover w-full h-full"
                          onError={(e) => (e.currentTarget.style.opacity = '0.3')}
                        />
                      ) : (
                        <div className="p-3 text-xs text-gray-600 break-all">{photo.key}</div>
                      )}
                    </div>
                    <div className="p-2 text-xs text-gray-600">
                      <div className="font-medium">{photo.kind}</div>
                      <div className="text-gray-500">
                        {new Date(photo.createdAt).toLocaleDateString('ja-JP', {
                          timeZone: 'Asia/Tokyo',
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {photos.length > 6 && (
              <div className="text-center">
                <Link
                  href={`/projects/${project.id}/photos`}
                  className="text-sm text-blue-600 underline hover:text-blue-800"
                >
                  他{photos.length - 6}枚を含むすべての写真を見る
                </Link>
              </div>
            )}
          </div>
        )}
      </section>

      {/* E. タイムライン */}
      <section className="rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">タイムライン</h2>
        </div>

        {historyData?.data?.items && historyData.data.items.length > 0 ? (
          <div className="space-y-2">
            {historyData.data.items.map((item: any) => (
              <div
                key={item.id}
                className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-b-0"
              >
                <div className="text-xs text-gray-500 min-w-[120px]">
                  {new Date(item.createdAt).toLocaleString('ja-JP', {
                    timeZone: 'Asia/Tokyo',
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className="text-sm text-gray-700 flex-1">{item.summary}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">履歴がありません。</p>
        )}
      </section>

      {/* 期日編集モーダル */}
      {showDateEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">期日を編集</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">案件期日</label>
                <input
                  type="date"
                  value={dateForm.projectDueOn}
                  onChange={(e) =>
                    setDateForm((prev) => ({ ...prev, projectDueOn: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">納品日</label>
                <input
                  type="date"
                  value={dateForm.deliveryOn}
                  onChange={(e) => setDateForm((prev) => ({ ...prev, deliveryOn: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowDateEditModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleUpdateDates}
                disabled={updateDates.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </main>
  );
}
