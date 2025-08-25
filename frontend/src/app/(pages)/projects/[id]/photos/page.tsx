'use client';

import Toast from '@/app/_components/Toast';
import { useDetachPhoto, useProjectPhotos, useUploadProjectPhoto } from '@/lib/api/hooks';
import { photoUrlFromKey } from '@/lib/photos';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

type Kind = 'before' | 'after' | 'other';

export default function ProjectPhotosPage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const router = useRouter();

  const { data, refetch, isLoading, error } = useProjectPhotos(projectId);
  const items: any[] = data?.data?.items ?? [];

  const upload = useUploadProjectPhoto();
  const detach = useDetachPhoto();
  const [kind, setKind] = useState<Kind>('other');
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const uploading = upload.isPending;

  const onChoose = () => fileRef.current?.click();

  const onFiles = async (files?: FileList | null) => {
    if (!files || files.length === 0) return;

    try {
      for (const f of Array.from(files)) {
        // ファイル形式の事前チェック
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(f.type)) {
          setToast('許可されていないファイル形式です。JPEG、PNG、GIF、WebPのみ対応しています。');
          continue;
        }

        await upload.mutateAsync({ projectId, file: f, kind });
      }
      setToast('写真をアップロードしました。');
      refetch();
    } catch (e: any) {
      setToast(e?.message || 'アップロードに失敗しました。しばらくして再試行してください。');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onDetach = async (photoId: number) => {
    try {
      await detach.mutateAsync({ photoId });
      setToast('写真を削除しました。');
      refetch();
    } catch {
      setToast('削除に失敗しました。時間をおいて再試行してください。');
    }
  };

  return (
    <main className="max-w-5xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">写真の追加</h1>
        <div className="text-sm flex gap-3">
          <Link className="underline" href="/projects/completed">
            完了済み一覧へ戻る
          </Link>
          <Link className="underline" href="/history">
            履歴を見る
          </Link>
        </div>
      </div>

      <section className="rounded border bg-white p-4 space-y-3">
        <div className="grid md:grid-cols-3 gap-3 items-end">
          <label className="block">
            <span className="text-sm text-gray-600">種別</span>
            <select
              className="mt-1 w-full border rounded px-3 py-2"
              value={kind}
              onChange={(e) => setKind(e.target.value as Kind)}
            >
              <option value="before">before（施工前）</option>
              <option value="after">after（施工後）</option>
              <option value="other">other（その他）</option>
            </select>
          </label>

          <div className="md:col-span-2 flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={(e) => onFiles(e.target.files)}
              className="hidden"
            />
            <button className="rounded border px-3 py-2" onClick={onChoose} disabled={uploading}>
              画像を選択
            </button>
            <span className="text-sm text-gray-600">JPG/PNGなど。複数選択可。</span>
          </div>
        </div>

        {/* ドロップ対応（簡易） */}
        <div
          className="mt-3 border-2 border-dashed rounded p-6 text-center text-sm text-gray-600"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFiles(e.dataTransfer?.files);
          }}
        >
          ここにドラッグ＆ドロップでもアップロードできます。
        </div>

        {uploading && <p className="text-sm text-gray-600 mt-2">アップロード中…</p>}
      </section>

      <section className="rounded border bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-bold">写真一覧</div>
          <div className="text-sm text-gray-600">合計 {items.length} 件</div>
        </div>

        {isLoading && <p className="text-sm text-gray-500">読み込み中…</p>}
        {error && <p className="text-sm text-red-600">読み込みに失敗しました。</p>}

        {items.length === 0 ? (
          <p className="text-sm text-gray-500">
            まだ写真はありません。上のフォームから追加してください。
          </p>
        ) : (
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {items.map((ph) => {
              const url = photoUrlFromKey(ph.key);
              const created = ph.createdAt
                ? new Date(ph.createdAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
                : '';

              return (
                <li key={ph.id} className="border rounded overflow-hidden bg-white">
                  <div className="aspect-square bg-gray-50 flex items-center justify-center">
                    {url ? (
                      // 画像を直接表示できる場合
                      <img src={url} alt={ph.key} className="w-full h-full object-cover" />
                    ) : (
                      // ベースURL未設定時はキー文字列のみ
                      <div className="p-3 text-xs text-gray-600 break-all">{ph.key}</div>
                    )}
                  </div>
                  <div className="p-2 text-xs flex items-center justify-between">
                    <span className="opacity-70">{ph.kind ?? 'other'}</span>
                    <span className="opacity-60">{created}</span>
                  </div>
                  <div className="px-2 pb-2">
                    <button
                      className="text-xs underline"
                      onClick={() => onDetach(ph.id)}
                      disabled={detach.isPending}
                    >
                      削除
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </main>
  );
}
