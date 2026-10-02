import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { LocaleProvider } from '@/lib/locale';
import { AppShell } from '@/components/layout/AppShell';
import { AuthProvider, RoleRoute } from '@/lib/auth';

// Pages
import Home from '@/pages/Home';
import Mirror from '@/pages/LiveMirror';
import Caregiver from '@/pages/Caregiver';
import SportsScreening from '@/pages/SportsScreening';
import ClinicianDashboard from '@/pages/ClinicianDashboard';
import ClinicianPatientDetail from '@/pages/ClinicianPatientDetail';
import CoachDashboard from '@/pages/CoachDashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <AppShell>
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/"><Home /></Route>
          <Route path="/mirror"><RoleRoute roles={['patient', 'caregiver']}><Mirror /></RoleRoute></Route>
          <Route path="/caregiver"><RoleRoute roles={['caregiver']}><Caregiver /></RoleRoute></Route>
          <Route path="/sports"><RoleRoute roles={['coach']}><SportsScreening /></RoleRoute></Route>
          <Route path="/clinician"><RoleRoute roles={['clinician']}><ClinicianDashboard /></RoleRoute></Route>
          <Route path="/clinician/:patientId"><RoleRoute roles={['clinician']}><ClinicianPatientDetail /></RoleRoute></Route>
          <Route path="/coach"><RoleRoute roles={['coach']}><CoachDashboard /></RoleRoute></Route>
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </AppShell>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </LocaleProvider>
    </QueryClientProvider>
  );
}

export default App;
