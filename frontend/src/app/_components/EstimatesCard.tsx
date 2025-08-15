// 'use client';
// import { useEstimates } from '@/lib/api/hooks';
// import Link from 'next/link';
// import { useEffect, useMemo } from 'react';

// function todayJst() {
//   const now = new Date();
//   const utc = now.getTime() + now.getTimezoneOffset() * 60000;
//   const jst = new Date(utc + 9 * 60 * 60000);
//   const y = jst.getFullYear();
//   const m = String(jst.getMonth() + 1).padStart(2, '0');
//   const d = String(jst.getDate()).padStart(2, '0');
//   return `${y}-${m}-${d}`;
// }

// export default function EstimatesCard() {
//   const from = useMemo(() => todayJst(), []);
//   const { data, refetch } = useEstimates({ from, limit: 3 });

//   useEffect(() => {
//     const i = setInterval(() => refetch(), 60_000);
//     return () => clearInterval(i);
//   }, [refetch]);

//   const items = data?.data?.items ?? [];

//   return (
//     <div className="rounded-lg border p-4 bg-white">
//       <div className="flex items-center justify-between mb-2">
//         <h2 className="text-lg font-bold">見積もり予定（3件）</h2>
//         <Link href="/estimates" className="text-sm underline">
//           すべて見る
//         </Link>
//       </div>
//       {items.length === 0 ? (
//         <p className="text-sm text-gray-500">直近の見積もり予定はありません。</p>
//       ) : (
//         <ul className="space-y-2">
//           {items.slice(0, 3).map((e, index) => (
//             <li key={`estimate-${e.id}-${index}`} className="text-sm">
//               <div className="font-medium">{e.customerName}</div>
//               <div className="text-gray-600">
//                 {new Date(e.scheduledAt).toLocaleString('ja-JP', {
//                   timeZone: 'Asia/Tokyo',
//                   month: 'numeric',
//                   day: 'numeric',
//                   hour: '2-digit',
//                   minute: '2-digit',
//                 })}
//                 {' / '}
//                 {e.address}
//               </div>
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// }
