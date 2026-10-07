import { normalizeFilters, type FilterInput } from "@/lib/queries/filters";

export const PAGE_SIZES = [25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = PAGE_SIZES[0];

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PageResult<T> = { items: T[]; pagination: Pagination };

export function parsePagination(input: FilterInput) {
  const f = normalizeFilters(input);
  const requestedPage = Number(f.page);
  return {
    page:
      f.page && /^[1-9]\d*$/.test(f.page) && Number.isSafeInteger(requestedPage)
        ? requestedPage
        : 1,
    pageSize:
      PAGE_SIZES.find((size) => String(size) === f.pageSize) ??
      DEFAULT_PAGE_SIZE,
  };
}

export function paginationFor(total: number, input: FilterInput): Pagination {
  const { page, pageSize } = parsePagination(input);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { page: Math.min(page, totalPages), pageSize, total, totalPages };
}

export function pageHref(
  pathname: string,
  input: FilterInput,
  page: number,
  pageSize: number,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(normalizeFilters(input))) {
    if (value && key !== "page" && key !== "pageSize") params.set(key, value);
  }
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  return `${pathname}?${params}`;
}
