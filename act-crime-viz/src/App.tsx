import { lazy, Suspense } from "react";
import { I18nProvider, useI18n } from "./i18n/context";

const Dashboard = lazy(() => import("./Dashboard"));

function AppLoadingFallback() {
  const { t } = useI18n();
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0c1018",
        color: "#8892a8",
        fontSize: "0.95rem",
      }}
    >
      {t("loading")}
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <Suspense fallback={<AppLoadingFallback />}>
        <Dashboard />
      </Suspense>
    </I18nProvider>
  );
}
