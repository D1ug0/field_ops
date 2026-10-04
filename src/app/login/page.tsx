import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { ShieldCheck, MapPin, ListChecks, Monitor } from "lucide-react";
export const dynamic = "force-dynamic";
export default async function LoginPage() {
  if (await auth()) redirect("/dashboard");
  return (
    <div className="login-page">
      <section className="login-story">
        <div className="login-brand">
          <span className="brand-icon">
            F<span>•</span>
          </span>
          <strong>FieldOps</strong>
        </div>
        <div className="login-story-main">
          <p className="eyebrow">RETAIL FIELD ENGINEERING</p>
          <h1>
            Каждый объект.
            <br />
            Каждый инцидент.
            <br />
            <span>Под контролем.</span>
          </h1>
          <p>
            Рабочая среда инженера для обслуживания распределённой розничной
            инфраструктуры.
          </p>
          <div className="login-features">
            <span>
              <MapPin size={18} />
              Объекты и выезды
            </span>
            <span>
              <Monitor size={18} />
              Оборудование и история
            </span>
            <span>
              <ListChecks size={18} />
              Пошаговая диагностика
            </span>
          </div>
        </div>
        <p className="login-disclaimer">
          Портфолио-проект. Все объекты и данные вымышлены.
        </p>
      </section>
      <section className="login-panel">
        <div className="login-box">
          <span className="login-security">
            <ShieldCheck size={18} />
            Доступ для сотрудников
          </span>
          <h2>Добро пожаловать</h2>
          <p>Войдите, чтобы продолжить работу с сетью.</p>
          <LoginForm
            demoPassword={
              process.env.DEMO_ENABLED === "true"
                ? process.env.DEMO_PASSWORD
                : undefined
            }
          />
          <p className="login-help">
            Доступ и назначение ролей контролирует администратор.
          </p>
        </div>
      </section>
    </div>
  );
}
