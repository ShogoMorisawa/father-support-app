'use client';
import Toast from '@/app/_components/Toast';
import { useProjectPhotos } from '@/lib/api/hooks';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const { data, refetch } = useProjectPhotos(projectId);
  const items: any[] = data?.data?.items ?? [];

  // 一時的に無効化
  // const presign = usePresignPhoto();
  // const attach = useAttachPhoto();
  // const del = useDeleteProjectPhoto(projectId);

  const [toast, setToast] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<'before' | 'after' | 'other'>('other');
  const disabled = true; // 一時的に無効化

  const onUpload = async () => {
    // 一時的に無効化
    setToast('写真アップロード機能は一時的に無効化されています。');
    /*
    if (!file) return;
    try {
      const p = await presign.mutateAsync({
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        byteSize: file.size,
        scope: 'project',
        projectId,
      });
      const put = p?.data;
      if (!put?.url || !put?.key) throw new Error('presign failed');

      await fetch(put.url, { method: put.method || 'PUT', headers: put.headers || {}, body: file });
      await attach.mutateAsync({ projectId, kind, blobKey: put.key });
      setFile(null);
      setToast('写真を添付しました。');
      refetch();
    } catch {
      setToast('アップロードに失敗しました。環境設定をご確認ください。');
    }
    */
  };

  return (
    <main className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">案件詳細 #{projectId}</h1>
        <Link className="text-sm underline" href="/projects/completed">
          完了済み一覧へ
        </Link>
      </div>

      {/* ギャラリー */}
      <section className="rounded border bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-bold">写真</div>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">まだ写真がありません。</p>
        ) : (
          <ul className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {items.map((ph) => (
              <li key={ph.id} className="border rounded p-2">
                {/* 画像読み込み失敗時も崩れないように */}
                <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden rounded">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ph.url}
                    alt=""
                    className="object-cover w-full h-full"
                    onError={(e) => (e.currentTarget.style.opacity = '0.3')}
                  />
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  {ph.kind} /{' '}
                  {new Date(ph.createdAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <button
                    className="underline text-xs"
                    onClick={async () => {
                      // 一時的に無効化
                      setToast('写真削除機能は一時的に無効化されています。');
                      /*
                      try {
                        await del.mutateAsync(ph.id);
                        setToast('写真を削除しました。');
                        refetch();
                      } catch {
                        setToast('削除に失敗しました。');
                      }
                      */
                    }}
                  >
                    削除
                  </button>
                  {/* 直近の削除は履歴からUndo可能 */}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 写真アップロード */}
      <section className="rounded border bg-white p-4">
        <div className="font-bold mb-2">写真を追加</div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1">種類</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={kind}
              onChange={(e) => setKind(e.target.value as any)}
            >
              <option value="before">施工前</option>
              <option value="after">施工後</option>
              <option value="other">その他</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">ファイル</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <button
            className="rounded bg-black text-white px-3 py-2 disabled:opacity-50"
            disabled={disabled}
            onClick={onUpload}
          >
            アップロード
          </button>
        </div>
      </section>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </main>
  );
}
