// 'use client';

// import Toast from '@/app/_components/Toast';
// import { api } from '@/lib/api/client';
// import { useCompleteProject } from '@/lib/api/hooks';
// import { useQuery, useQueryClient } from '@tanstack/react-query';
// import { useMemo, useState } from 'react';

// type TaskListItem = {
//   taskId: number;
//   projectId: number;
//   customerName: string;
//   title: string;
//   dueOn: string; // ISO
//   address?: string;
//   kind?: string;
//   material?: string;
//   quantity?: number;
// };

// async function fetchTasks(): Promise<{ ok: boolean; data: TaskListItem[] }> {
//   const res = await fetch('/api/tasks?order=due.asc', { cache: 'no-store' });
//   return res.json();
// }

// export default function TasksPage() {
//   const qc = useQueryClient();
//   const { data, isLoading, error } = useQuery({
//     queryKey: ['tasks'],
//     queryFn: fetchTasks,
//   });

//   const [toast, setToast] = useState<string | null>(null);
//   const [toastAction, setToastAction] = useState<null | (() => void)>(null);
//   const [hidden, setHidden] = useState<number[]>([]); // 完了後に行を隠して軽い達成感を出す

//   const tasks = useMemo(
//     () => (data?.data ?? []).filter((t) => !hidden.includes(t.taskId)),
//     [data, hidden],
//   );

//   const completeMut = useCompleteProject();

//   if (isLoading) return <p className="p-4">読み込み中です…</p>;
//   if (error) return <p className="p-4 text-red-600">通信に失敗しました。再試行してください</p>;

//   return (
//     <main className="p-4 space-y-4">
//       <h1 className="text-xl font-semibold">作業一覧</h1>
//       {/* 低在庫トースト（在庫を見るアクション付き） */}
//       {toast && (
//         <Toast
//           message={toastAction ? `${toast}「在庫を見る」を押すと一覧が開きます。` : toast}
//           onClose={() => {
//             setToast(null);
//             setToastAction(null);
//           }}
//           actionLabel={toastAction ? '在庫を見る' : undefined}
//           onAction={toastAction ?? undefined}
//         />
//       )}

//       <ul className="space-y-3">
//         {tasks.map((t) => {
//           const due = new Date(t.dueOn);
//           const today = new Date();
//           const isOverdue = due < new Date(today.getFullYear(), today.getMonth(), today.getDate());

//           return (
//             <li
//               key={t.taskId}
//               className={`rounded border p-3 ${isOverdue ? 'border-red-500' : ''}`}
//             >
//               <div className="flex items-start justify-between gap-3">
//                 <div>
//                   {/* 期日バッジ（JSTローカル表示） */}
//                   <div
//                     className={`inline-block text-xs rounded px-2 py-0.5 border ${
//                       isOverdue ? 'border-red-500 text-red-600' : 'border-gray-300 text-gray-700'
//                     }`}
//                   >
//                     {due.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
//                   </div>
//                   <div className="mt-1 font-medium">
//                     {t.customerName}　{t.title}
//                   </div>
//                   <div className="text-sm opacity-80">
//                     {t.kind ?? ''} {t.material ?? ''} {t.quantity ? `${t.quantity}枚` : ''}
//                   </div>
//                   {t.address && (
//                     <div className="text-xs mt-1">
//                       <a
//                         className="underline"
//                         href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
//                           t.address,
//                         )}`}
//                         target="_blank"
//                         rel="noreferrer"
//                       >
//                         地図
//                       </a>
//                       <span className="opacity-60 ml-1">{t.address}</span>
//                     </div>
//                   )}
//                 </div>

//                 <button
//                   className="px-3 py-1 rounded bg-black text-white disabled:opacity-50"
//                   disabled={completeMut.isPending}
//                   onClick={async () => {
//                     try {
//                       await completeMut.mutateAsync(t.projectId);
//                       setHidden((ids) => [...ids, t.taskId]); // 擬似的に行を隠す

//                       // 低在庫チェック
//                       try {
//                         const low = await api.get<{
//                           ok: boolean;
//                           data: { items: Array<{ name: string }> };
//                         }>('/api/materials/low');
//                         const count = low?.data?.items?.length ?? 0;
//                         if (count > 0) {
//                           setToast(`在庫が不足している資材が ${count} 件あります。`);
//                           setToastAction(() => () => {
//                             // グローバルイベントでクイックビューを開く
//                             window.dispatchEvent(new Event('open-inventory'));
//                             setToast(null);
//                             setToastAction(null);
//                           });
//                         } else {
//                           setToast('作業を完了しました。');
//                           setToastAction(null);
//                         }
//                       } catch {
//                         setToast('作業を完了しました。');
//                         setToastAction(null);
//                       }
//                     } catch (e: unknown) {
//                       setToast(
//                         (e as { message?: string })?.message ??
//                           '通信に失敗しました。再試行してください',
//                       );
//                     }
//                   }}
//                 >
//                   完了
//                 </button>
//               </div>
//             </li>
//           );
//         })}
//       </ul>
//     </main>
//   );
// }
