export default function Loading() {
  return (
    <div className="loading-state" role="status">
      <div className="skeleton h-9 w-64" />
      <div className="skeleton h-5 w-96 max-w-full" />
      <div className="stats-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-40" />
        ))}
      </div>
      <div className="skeleton h-96" />
      <span className="sr-only">Загрузка данных…</span>
    </div>
  );
}
