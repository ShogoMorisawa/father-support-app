'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Nav() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'ホーム' },
    { href: '/estimates', label: '見積' },
    { href: '/tasks', label: '作業' },
    { href: '/deliveries', label: '納品' },
    { href: '/customers', label: '顧客' },
    { href: '/inventory', label: '在庫' },
    { href: '/history', label: '履歴' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <header className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur">
      <nav className="mx-auto max-w-5xl p-3" aria-label="メイン">
        <ul className="flex gap-1 overflow-x-auto">
          {links.map(({ href, label }) => {
            const active = isActive(href);
            return (
              <li key={href} className="shrink-0">
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap border transition-colors',
                    active
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border-transparent',
                  ].join(' ')}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
