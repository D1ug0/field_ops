import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "FieldOps — рабочая среда инженера",
    template: "%s | FieldOps",
  },
  description:
    "Учебная платформа выездного обслуживания распределённой розничной инфраструктуры",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
