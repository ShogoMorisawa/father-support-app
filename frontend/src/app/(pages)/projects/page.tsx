'use client';

import { useEstimates, useProjects } from '@/lib/api/hooks';
import { isoToJstYmd, todayJstYmd, tomorrowJstYmd } from '@/lib/time';
import Link from 'next/link';
import { useMemo, useState } from 'react';

type TabType = 'active' | 'completed';

interface GroupedEstimates {
  today: any[];
  tomorrow: any[];
  later: any[];
}

export default function ProjectsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [searchQuery, setSearchQuery] = useState('');

  // 案件データ取得
  const { data: activeProjects, isLoading: activeLoading } = useProjects({
    status: 'active',
    order: 'due.asc',
    q: searchQuery || undefined,
    limit: 100,
  });

  const { data: completedProjects, isLoading: completedLoading } = useProjects({
    status: 'completed',
    order: 'completed.desc',
    q: searchQuery || undefined,
    limit: 100,
  });

  // 見積予定データ取得
  const { data: estimatesData } = useEstimates(undefined, 100);

  // 見積予定の日付グルーピング
  const groupedEstimates = useMemo((): GroupedEstimates => {
    const today = todayJstYmd();
    const tomorrow = tomorrowJstYmd();

    const groups: GroupedEstimates = {
      today: [],
      tomorrow: [],
      later: [],
    };

    if (estimatesData?.data?.items) {
      estimatesData.data.items
        .filter((e: any) => e.status === 'scheduled')
        .forEach((estimate: any) => {
          const estimateYmd = isoToJstYmd(estimate.scheduledAt);

          if (estimateYmd === today) {
            groups.today.push(estimate);
          } else if (estimateYmd === tomorrow) {
            groups.tomorrow.push(estimate);
          } else {
            groups.later.push(estimate);
          }
        });

      // 各グループ内を時刻順でソート
      const sortByTime = (a: any, b: any) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();

      groups.today.sort(sortByTime);
      groups.tomorrow.sort(sortByTime);
      groups.later.sort(sortByTime);
    }

    return groups;
  }, [estimatesData]);

  // バッジの判定とスタイル
  const getBadgeInfo = (project: any) => {
    if (!project.delivery) return { text: '準備中', color: 'bg-gray-100 text-gray-800' };

    if (project.delivery.status === 'delivered') {
      return { text: '完了', color: 'bg-green-100 text-green-800' };
    }

    if (project.delivery.allPrepared) {
      return { text: '完了可能', color: 'bg-yellow-100 text-yellow-800' };
    }

    return { text: '作業中', color: 'bg-blue-100 text-blue-800' };
  };

  // 見積予定セクションのレンダリング
  const renderEstimatesSection = () => (
    <section className="mb-6 rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">見積予定</h2>
        <Link href="/estimates" className="text-sm text-blue-600 underline hover:text-blue-800">
          一覧へ
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 今日 */}
        <div className="rounded border p-3">
          <h3 className="font-medium text-gray-700 mb-2">今日</h3>
          {groupedEstimates.today.length === 0 ? (
            <p className="text-sm text-gray-500">予定なし</p>
          ) : (
            <ul className="space-y-1">
              {groupedEstimates.today.slice(0, 3).map((estimate: any) => (
                <li key={estimate.id} className="text-sm">
                  <div className="text-gray-600">
                    {new Date(estimate.scheduledAt).toLocaleTimeString('ja-JP', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
                  </div>
                  <div className="font-medium">{estimate.customerName || '（無名）'}</div>
                </li>
              ))}
              {groupedEstimates.today.length > 3 && (
                <li className="text-xs text-gray-500">他{groupedEstimates.today.length - 3}件</li>
              )}
            </ul>
          )}
        </div>

        {/* 明日 */}
        <div className="rounded border p-3">
          <h3 className="font-medium text-gray-700 mb-2">明日</h3>
          {groupedEstimates.tomorrow.length === 0 ? (
            <p className="text-sm text-gray-500">予定なし</p>
          ) : (
            <ul className="space-y-1">
              {groupedEstimates.tomorrow.slice(0, 3).map((estimate: any) => (
                <li key={estimate.id} className="text-sm">
                  <div className="text-gray-600">
                    {new Date(estimate.scheduledAt).toLocaleTimeString('ja-JP', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
                  </div>
                  <div className="font-medium">{estimate.customerName || '（無名）'}</div>
                </li>
              ))}
              {groupedEstimates.tomorrow.length > 3 && (
                <li className="text-xs text-gray-500">
                  他{groupedEstimates.tomorrow.length - 3}件
                </li>
              )}
            </ul>
          )}
        </div>

        {/* 以降 */}
        <div className="rounded border p-3">
          <h3 className="font-medium text-gray-700 mb-2">以降</h3>
          {groupedEstimates.later.length === 0 ? (
            <p className="text-sm text-gray-500">予定なし</p>
          ) : (
            <ul className="space-y-1">
              {groupedEstimates.later.slice(0, 3).map((estimate: any) => (
                <li key={estimate.id} className="text-sm">
                  <div className="text-gray-600">
                    {new Date(estimate.scheduledAt).toLocaleDateString('ja-JP', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                  <div className="font-medium">{estimate.customerName || '（無名）'}</div>
                </li>
              ))}
              {groupedEstimates.later.length > 3 && (
                <li className="text-xs text-gray-500">他{groupedEstimates.later.length - 3}件</li>
              )}
            </ul>
          )}
        </div>
      </div>
    </section>
  );

  // 案件カードのレンダリング
  const renderProjectCard = (project: any) => {
    const badgeInfo = getBadgeInfo(project);

    return (
      <Link
        key={project.id}
        href={`/projects/${project.id}`}
        className="block rounded-lg border bg-white p-4 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 mb-1">{project.title}</h3>
            <p className="text-sm text-gray-600">{project.customerName}</p>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${badgeInfo.color}`}>
            {badgeInfo.text}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{project.dueOn ? `期日: ${project.dueOn}` : '期日未定'}</span>
          {project.delivery && (
            <span>
              {project.delivery.tasksCount > 0 &&
                `${project.delivery.preparedCount}/${project.delivery.tasksCount}件完了`}
            </span>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">案件一覧</h1>
        <p className="text-gray-600">進行中と完了済みの案件を管理できます</p>
      </div>

      {/* 見積予定セクション */}
      {renderEstimatesSection()}

      {/* 検索バー */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="案件名や顧客名で検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* タブ */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('active')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'active'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              進行中
              {activeProjects?.items && (
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                  {activeProjects.items.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'completed'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              完了済み
              {completedProjects?.items && (
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                  {completedProjects.items.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* 案件一覧 */}
      <div className="space-y-4">
        {activeTab === 'active' ? (
          activeLoading ? (
            <p className="text-center py-8 text-gray-500">読み込み中...</p>
          ) : activeProjects?.items && activeProjects.items.length > 0 ? (
            activeProjects.items.map(renderProjectCard)
          ) : (
            <p className="text-center py-8 text-gray-500">
              {searchQuery
                ? '検索条件に一致する進行中の案件がありません'
                : '進行中の案件がありません'}
            </p>
          )
        ) : completedLoading ? (
          <p className="text-center py-8 text-gray-500">読み込み中...</p>
        ) : completedProjects?.items && completedProjects.items.length > 0 ? (
          completedProjects.items.map(renderProjectCard)
        ) : (
          <p className="text-center py-8 text-gray-500">
            {searchQuery
              ? '検索条件に一致する完了済み案件がありません'
              : '完了済み案件がありません'}
          </p>
        )}
      </div>
    </div>
  );
}
