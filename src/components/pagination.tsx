import Link from "next/link";
import { PAGE_SIZES, pageHref, type Pagination } from "@/lib/pagination";
import type { FilterInput } from "@/lib/queries/filters";
import { Field } from "./common";
import { Button } from "./ui/button";

export function PageSizeSelect({ pageSize }: { pageSize: number }) {
  return (
    <Field label="На странице">
      <select name="pageSize" defaultValue={pageSize}>
        {PAGE_SIZES.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function PaginationControls({
  pagination,
  pathname,
  filters,
}: {
  pagination: Pagination;
  pathname: string;
  filters: FilterInput;
}) {
  const { page, pageSize, total, totalPages } = pagination;
  const first = total ? (page - 1) * pageSize + 1 : 0;
  const last = Math.min(page * pageSize, total);
  const links = [
    { label: "Первая", target: 1, disabled: page === 1 },
    { label: "Назад", target: page - 1, disabled: page === 1 },
    { label: "Далее", target: page + 1, disabled: page === totalPages },
    { label: "Последняя", target: totalPages, disabled: page === totalPages },
  ];
  return (
    <nav className="pagination" aria-label="Страницы реестра">
      <span className="muted">
        {first}–{last} из {total}
      </span>
      <div className="pagination-actions">
        <span className="muted">
          Страница {page} из {totalPages}
        </span>
        {links.map(({ label, target, disabled }) =>
          disabled ? (
            <Button
              key={label}
              type="button"
              variant="outline"
              size="sm"
              disabled
            >
              {label}
            </Button>
          ) : (
            <Button key={label} asChild variant="outline" size="sm">
              <Link href={pageHref(pathname, filters, target, pageSize)}>
                {label}
              </Link>
            </Button>
          ),
        )}
      </div>
    </nav>
  );
}
