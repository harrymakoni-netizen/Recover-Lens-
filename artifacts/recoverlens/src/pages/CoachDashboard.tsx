import { getListScreeningsQueryKey, useListScreenings } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LayoutDashboard, Users, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useRecoveryEvents } from '@/hooks/use-recovery-events';

export default function CoachDashboard() {
  const { status: liveStatus } = useRecoveryEvents();
  const { data: screenings, isLoading } = useListScreenings({ query: { queryKey: getListScreeningsQueryKey(), refetchInterval: 15_000 } });
  
  // Aggregate stats
  const totalScreened = screenings?.length || 0;
  const reviewCount = screenings?.filter(s => s.status === 'REVIEW').length || 0;
  const clearCount = totalScreened - reviewCount;

  return (
    <div className="max-w-6xl mx-auto space-y-8 fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Squad Screening Overview
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Team biomechanical readiness and risk profiles.
          </p>
          <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground" role="status">
            <span className={`h-2 w-2 rounded-full ${isLoading ? "bg-amber-500" : "bg-emerald-500"}`} />
            {isLoading
              ? "Loading screening data…"
              : liveStatus === "connected"
                ? "Screening data loaded · Live updates on"
                : "Screening data loaded · Auto-refresh on"}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Athletes Screened</p>
              <h3 className="text-3xl font-bold mt-1">{totalScreened}</h3>
            </div>
            <Users className="h-10 w-10 text-primary opacity-20" />
          </CardContent>
        </Card>
        <Card className="bg-green/5 border-green/20">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green uppercase tracking-wider">Cleared for Load</p>
              <h3 className="text-3xl font-bold mt-1 text-green">{clearCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-green/20 flex items-center justify-center">
              <span className="text-green font-bold text-xl">✓</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber/5 border-amber/20">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber uppercase tracking-wider">Needs Review</p>
              <h3 className="text-3xl font-bold mt-1 text-amber">{reviewCount}</h3>
            </div>
            <AlertTriangle className="h-10 w-10 text-amber opacity-80" />
          </CardContent>
        </Card>
      </div>

      {/* Roster List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            Recent Screenings
          </CardTitle>
          <CardDescription>Latest movement-screen results across all selected sports.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1,2,3,4].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />)}
            </div>
          ) : screenings && screenings.length > 0 ? (
            <div className="border rounded-md divide-y">
              {screenings.map((screen) => (
                <div key={screen.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 bg-card hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {screen.athlete.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-lg">{screen.athlete}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="secondary" className="capitalize">{screen.sport === 'football' ? 'Football / Soccer' : screen.sport === 'running' ? 'Running / Athletics' : screen.sport === 'general' ? 'General Fitness' : screen.sport}</Badge>
                        <span>Test Date: {format(new Date(screen.timestamp), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 sm:w-1/2 justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium line-clamp-1">{screen.finding}</div>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-3">
                      <div className="font-mono font-bold text-lg hidden md:block">{screen.score}</div>
                      {screen.status === 'CLEAR' ? (
                        <Badge variant="outline" className="bg-green/10 text-green border-green/20 w-20 justify-center">CLEAR</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber/10 text-amber border-amber/20 w-20 justify-center">REVIEW</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              No screenings found for this squad.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
