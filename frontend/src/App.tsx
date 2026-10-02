import { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { Skeleton } from './components/ui';
import { AppProvider } from './lib/appContext';
import Caregiver from './pages/Caregiver';
import Home from './pages/Home';
import NotFound from './pages/NotFound';

// Camera and chart-heavy routes load on demand so Home opens fast.
const Mirror = lazy(() => import('./pages/Mirror'));
const ScreeningRun = lazy(() => import('./pages/ScreeningRun'));
const SportsScreening = lazy(() => import('./pages/SportsScreening'));
const ClinicianPortal = lazy(() => import('./pages/ClinicianPortal'));
const PatientDetail = lazy(() => import('./pages/PatientDetail'));
const CoachPortal = lazy(() => import('./pages/CoachPortal'));

function Loading() {
  return (
    <div className="space-y-4 p-2">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            {/* Full-screen camera routes: no sidebar or tab bar (SPEC §7.1) */}
            <Route path="/mirror/:exerciseId" element={<Mirror />} />
            <Route path="/sports/run/:sport" element={<ScreeningRun />} />
            <Route element={<AppShell />}>
              <Route path="/" element={<Home />} />
              <Route path="/caregiver" element={<Caregiver />} />
              <Route path="/sports" element={<SportsScreening />} />
              <Route path="/clinician" element={<ClinicianPortal />} />
              <Route path="/clinician/:patientId" element={<PatientDetail />} />
              <Route path="/coach" element={<CoachPortal />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AppProvider>
  );
}
