import Dashboard from "./Dashboard";
import { I18nProvider } from "./i18n/context";

export default function App() {
  return (
    <I18nProvider>
      <Dashboard />
    </I18nProvider>
  );
}
