import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router';
import { ProfileProvider, useProfiles } from './state/ProfileContext.tsx';
import { Layout } from './ui/Layout.tsx';
import { Onboarding } from './features/onboarding/Onboarding.tsx';
import { Dashboard } from './features/dashboard/Dashboard.tsx';
import { PlanPage } from './features/planner/PlanPage.tsx';
import { ModulesPage } from './features/modules/ModulesPage.tsx';
import { ModulePage } from './features/modules/ModulePage.tsx';
import { CardsPage } from './features/flashcards/CardsPage.tsx';
import { QuizHome } from './features/quiz/QuizHome.tsx';
import { QuizRun } from './features/quiz/QuizRun.tsx';
import { MistakesPage } from './features/mistakes/MistakesPage.tsx';
import { SettingsPage } from './features/settings/SettingsPage.tsx';

function RequireProfile() {
  const { loading, profile } = useProfiles();
  if (loading) return <p className="p-8 text-center text-muted">Loading…</p>;
  if (!profile) return <Navigate to="/welcome" replace />;
  return <Outlet />;
}

export function App() {
  return (
    <ProfileProvider>
      <HashRouter>
        <Routes>
          <Route path="/welcome" element={<Onboarding />} />
          <Route element={<RequireProfile />}>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="plan" element={<PlanPage />} />
              <Route path="modules" element={<ModulesPage />} />
              <Route path="modules/:n" element={<ModulePage />} />
              <Route path="cards" element={<CardsPage />} />
              <Route path="quiz" element={<QuizHome />} />
              <Route path="quiz/run" element={<QuizRun />} />
              <Route path="mistakes" element={<MistakesPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </HashRouter>
    </ProfileProvider>
  );
}
