import Link from "next/link";
import { ChevronRight, Inbox, ArrowUpRight } from "lucide-react";
import { Card } from "./ui/card";
export function PageHeader({
  eyebrow = "FIELDOPS / ОПЕРАЦИИ",
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      <div className="header-actions">{children}</div>
    </div>
  );
}
export function SectionTitle({
  title,
  subtitle,
  href,
  link = "Все записи",
}: {
  title: string;
  subtitle?: string;
  href?: string;
  link?: string;
}) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="text-link">
          {link}
          <ChevronRight size={15} />
        </Link>
      )}
    </div>
  );
}
export function Empty({
  title = "Записей пока нет",
  text = "Измените фильтры или добавьте новую запись.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <div className="empty">
      <Inbox size={28} />
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}
export function Stat({
  label,
  value,
  detail,
  tone = "teal",
  href,
  icon,
}: {
  label: string;
  value: number | string;
  detail: string;
  tone?: string;
  href?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-icon ${tone}`}>{icon}</span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-bottom">
        <span>{detail}</span>
        {href && (
          <Link href={href} aria-label={label}>
            <ArrowUpRight size={17} />
          </Link>
        )}
      </div>
    </Card>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="detail">
      <dt>{label}</dt>
      <dd>{children || "—"}</dd>
    </div>
  );
}
export function FormPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="form-panel">
      <summary>
        {title}
        <span>+</span>
      </summary>
      <div className="form-panel-body">{children}</div>
    </details>
  );
}
export function SelectOptions({ items }: { items: Record<string, string> }) {
  return (
    <>
      {Object.entries(items).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </>
  );
}
