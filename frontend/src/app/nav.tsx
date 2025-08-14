import Link from "next/link";

export default function Nav() {
  const links = [
    { href: "/", label: "ホーム" },
    { href: "/calendar", label: "カレンダー" },
    { href: "/tasks", label: "作業" },
    { href: "/inventory", label: "在庫" },
    { href: "/customers", label: "顧客" },
    { href: "/history", label: "履歴" },
  ];
  return (
    <header className="sticky top-0 z-10 border-b bg-white/70 backdrop-blur">
      <nav className="mx-auto max-w-3xl flex gap-3 p-3 text-sm">
        {links.map(l => (
          <Link key={l.href} href={l.href} className="px-2 py-1 rounded hover:bg-gray-100">
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
