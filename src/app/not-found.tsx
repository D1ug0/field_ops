import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty min-h-screen">
      <h1>Запись не найдена</h1>
      <p>Проверьте адрес страницы.</p>
      <Link className="text-link" href="/dashboard">
        Вернуться в рабочую среду →
      </Link>
    </div>
  );
}
