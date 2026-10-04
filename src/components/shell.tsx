"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CircleAlert,
  BriefcaseBusiness,
  CalendarDays,
  MapPin,
  Monitor,
  Activity,
  BookOpen,
  ListChecks,
  Users,
  Settings,
  Search,
  Command,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Bell,
  ArrowUpRight,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { roles, type Actor } from "@/lib/domain";
const groups = [
  {
    title: "ОБЗОР",
    items: [{ href: "/dashboard", label: "Обзор сети", icon: LayoutDashboard }],
  },
  {
    title: "ОПЕРАЦИИ",
    items: [
      { href: "/incidents", label: "Инциденты", icon: CircleAlert },
      { href: "/my-work", label: "Моя работа", icon: BriefcaseBusiness },
      { href: "/visits", label: "Выезды", icon: CalendarDays },
    ],
  },
  {
    title: "ИНФРАСТРУКТУРА",
    items: [
      { href: "/locations", label: "Объекты", icon: MapPin },
      { href: "/equipment", label: "Оборудование", icon: Monitor },
      { href: "/monitoring", label: "Мониторинг", icon: Activity },
      { href: "/alerts", label: "Оповещения", icon: Bell },
    ],
  },
  {
    title: "БАЗА ЗНАНИЙ",
    items: [
      { href: "/knowledge", label: "База знаний", icon: BookOpen },
      { href: "/diagnostics", label: "Диагностика", icon: ListChecks },
    ],
  },
  {
    title: "УПРАВЛЕНИЕ",
    items: [
      { href: "/users", label: "Пользователи", icon: Users },
      { href: "/settings", label: "Настройки", icon: Settings },
    ],
  },
];
type Result = { id: string; label: string; detail: string; href: string };
export function Shell({
  actor,
  demo,
  children,
}: {
  actor: Actor;
  demo: boolean;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const [mobile, setMobile] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [searchError, setSearchError] = useState(false);
  const section = groups
    .flatMap((g) => g.items)
    .find((i) => path.startsWith(i.href));
  useEffect(() => {
    function key(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        dialog.current?.showModal();
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error();
        setResults(await response.json());
        setSearchError(false);
      } catch {
        if (!controller.signal.aborted) setSearchError(true);
      }
    }, 200);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);
  return (
    <div className="app-shell">
      {mobile && (
        <button
          aria-label="Закрыть меню"
          className="sidebar-scrim"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "is-open" : ""}`}>
        <Link
          href="/dashboard"
          className="brand"
          onClick={() => setMobile(false)}
        >
          <span className="brand-icon">
            F<span>•</span>
          </span>
          <div>
            <strong>
              FieldOps<span>®</span>
            </strong>
            <small>Retail engineering workspace</small>
          </div>
        </Link>
        <button
          className="mobile-close"
          onClick={() => setMobile(false)}
          aria-label="Закрыть меню"
        >
          <X size={20} />
        </button>
        <nav aria-label="Основная навигация">
          {groups.map((g) => (
            <div className="nav-group" key={g.title}>
              <p>{g.title}</p>
              {g.items
                .filter((i) => i.href !== "/users" || actor.role === "ADMIN")
                .map((i) => (
                  <Link
                    key={i.href}
                    href={i.href}
                    onClick={() => setMobile(false)}
                    className={`nav-item ${path.startsWith(i.href) ? "active" : ""}`}
                  >
                    <i.icon size={18} strokeWidth={1.8} />
                    <span>{i.label}</span>
                    {path.startsWith(i.href) && (
                      <span className="nav-active-dot" />
                    )}
                  </Link>
                ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="network-note">
            <span className="green-dot" />
            Учебная сеть<span className="mono">FO / 01</span>
          </div>
          <div className="user-card">
            <span className="avatar">
              {actor.name
                .split(" ")
                .map((s) => s[0])
                .join("")
                .slice(0, 2)}
            </span>
            <div>
              <strong>{actor.name}</strong>
              <small>{roles[actor.role]}</small>
            </div>
            <button
              title="Выйти"
              aria-label="Выйти"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="mobile-menu"
              aria-label="Открыть меню"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span>Рабочая среда</span>
            <ChevronRight size={13} />
            <strong>{section?.label ?? "FieldOps"}</strong>
          </div>
          <div className="topbar-right">
            <button
              className="search-trigger"
              onClick={() => dialog.current?.showModal()}
            >
              <Search size={16} />
              <span>Поиск в сети…</span>
              <kbd>
                <Command size={11} /> K
              </kbd>
            </button>
            {demo && <span className="demo-pill">DEMO</span>}
            <Link href="/alerts" className="icon-link" aria-label="Оповещения">
              <Bell size={18} />
            </Link>
          </div>
        </header>
        <main className="main-content">{children}</main>
        <footer className="workspace-footer">
          <span>FieldOps · Все данные вымышлены</span>
          <span>Портфолио / MVP v0.1</span>
        </footer>
      </div>
      <dialog ref={dialog} className="search-dialog">
        <div className="search-dialog-head">
          <Search size={20} />
          <input
            autoFocus
            aria-label="Глобальный поиск"
            placeholder="Инцидент, объект, IP, серийный номер…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            onClick={() => dialog.current?.close()}
            aria-label="Закрыть поиск"
          >
            <X size={20} />
          </button>
        </div>
        <div className="search-results">
          {query.trim().length < 2 ? (
            <p>
              Введите минимум 2 символа. Поиск по инцидентам, объектам и
              оборудованию.
            </p>
          ) : searchError ? (
            <p role="alert">Поиск недоступен. Повторите попытку.</p>
          ) : results.length ? (
            results.map((r) => (
              <Link
                href={r.href}
                key={r.id}
                onClick={() => dialog.current?.close()}
              >
                <div>
                  <strong>{r.label}</strong>
                  <small>{r.detail}</small>
                </div>
                <ArrowUpRight size={16} />
              </Link>
            ))
          ) : (
            <p>Совпадений нет</p>
          )}
        </div>
        <div className="search-footer">
          <kbd>esc</kbd> закрыть<span>Ctrl / ⌘ + K</span>
        </div>
      </dialog>
    </div>
  );
}
