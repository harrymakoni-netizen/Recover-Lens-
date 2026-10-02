import { useState } from 'react';
import { getListScreeningsQueryKey, useListScreenings, useCreateScreening, type Screening } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, TrendingUp, History, Activity, CircleDot, Footprints, Trophy, Dumbbell, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SPORT_PROFILES } from '@/lib/exercise-library';
import { useRecoverLensAuth } from '@/lib/auth';

const SPORT_ICONS = {
  football: CircleDot,
  basketball: Trophy,
  running: Footprints,
  general: Dumbbell,
};

export default function SportsScreening() {
  const { selectedPatientId: patientId } = useRecoverLensAuth();
  const { data: screenings, isLoading } = useListScreenings();
  const { mutate: createScreening, isPending } = useCreateScreening();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [screeningActive, setScreeningActive] = useState(false);
  const [activeSport, setActiveSport] = useState('general');
  const [latestResult, setLatestResult] = useState<Screening | null>(null);

  const selectedSport = SPORT_PROFILES.find(s => s.id === activeSport) ?? SPORT_PROFILES[3];

  // Mock flow for sports screening
  const runScreeningSimulation = () => {
    setScreeningActive(true);
    // Simulate a 3-second screening, then save result
    setTimeout(() => {
      createScreening(
        {
          data: {
            patientId: patientId ?? undefined,
            athlete: "Tariro Moyo",
            sport: selectedSport.id,
            score: 88,
            status: "REVIEW",
             finding: `A left-sided knee alignment pattern was observed during the ${selectedSport.screening.toLowerCase()}; clinician review is recommended.`,
            recommendation: selectedSport.recommendation,
          }
        },
        {
          onSuccess: (result) => {
            setLatestResult(result);
            queryClient.setQueryData<Screening[]>(getListScreeningsQueryKey(), (current = []) => [
              result,
              ...current.filter((screening) => screening.id !== result.id),
            ]);
            setScreeningActive(false);
            toast({
              title: "Movement Screen Complete",
              description: `${selectedSport.name} movement observations are ready for review.`,
            });
          },
          onError: () => {
            setScreeningActive(false);
            toast({
              title: "Unable to complete screening",
              description: "Please try the movement screen again.",
              variant: "destructive",
            });
          },
        }
      );
    }, 3000);
  };

  if (screeningActive) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="max-w-md space-y-8 animate-pulse">
          <ActivityPulse />
           <h2 className="text-2xl font-bold tracking-widest text-teal font-mono">OBSERVING MOVEMENT</h2>
          <p className="text-teal/80 font-semibold mb-2">SPORT: {selectedSport.name.toUpperCase()}</p>
          <p className="text-white/60">{selectedSport.instruction}</p>
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-teal w-full origin-left animate-[scaleX_3s_ease-in-out]" style={{ transformOrigin: '0% 50%' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Sports Screening
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
             A guided movement screen for athletes — not a diagnosis, injury prediction, or return-to-play clearance.
          </p>
        </div>
      </div>

      <Card className="border-amber/30 bg-amber/5">
        <CardContent className="flex gap-3 p-4 text-sm">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber" />
          <p className="text-muted-foreground">
            Results describe movement observations only. They do not diagnose injury or determine readiness to play.
            A qualified clinician or coach should review the result with the athlete before changing training.
          </p>
        </CardContent>
      </Card>

      <Card className="border-teal/30 bg-teal/5">
        <CardHeader>
          <CardTitle className="text-teal">Select Sport Profile</CardTitle>
          <CardDescription>Tailors the movement screen to sport-specific tasks for discussion with a qualified professional.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeSport} onValueChange={setActiveSport} className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto">
              {SPORT_PROFILES.map(sport => {
                const Icon = SPORT_ICONS[sport.id];
                return (
                <TabsTrigger key={sport.id} value={sport.id} className="gap-2 py-3 data-[state=active]:bg-teal data-[state=active]:text-white">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{sport.name}</span>
                  <span className="sm:hidden">{sport.id === 'football' ? 'Football' : sport.id === 'running' ? 'Running' : sport.name}</span>
                </TabsTrigger>
              )})}
            </TabsList>
            
            {SPORT_PROFILES.map(sport => (
              <TabsContent key={sport.id} value={sport.id} className="mt-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-card border rounded-lg p-6">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-teal" />
                      <h3 className="font-semibold text-lg">{sport.name} Analysis</h3>
                    </div>
                    <p className="text-muted-foreground">{sport.screening}</p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {sport.exercises.map((exercise) => (
                        <Badge key={exercise} variant="outline" className="bg-secondary/50 font-medium">
                          {exercise}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button size="lg" onClick={runScreeningSimulation} disabled={isPending} className="bg-teal hover:bg-teal/90 text-teal-foreground font-semibold w-full md:w-auto">
                    <Play className="h-5 w-5 mr-2" />
                     Run Movement Screen
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Recent Screenings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1,2,3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-md" />)}
                </div>
              ) : screenings && screenings.length > 0 ? (
                <div className="space-y-4">
                  {screenings.map((screen) => (
                    <div key={screen.id} className="bg-card border rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-primary/50">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{format(new Date(screen.timestamp), 'MMM d, yyyy - h:mm a')}</span>
                          {screen.status === 'CLEAR' ? (
                            <Badge variant="outline" className="bg-green/10 text-green border-green/20">CLEAR</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber/10 text-amber border-amber/20">REVIEW</Badge>
                          )}
                           <Badge variant="secondary">{screen.sport.replaceAll('-', ' ')}</Badge>
                        </div>
                         <p className="text-sm font-medium">A movement pattern was recorded for qualified review during this {screen.sport.replaceAll('-', ' ')} screen.</p>
                         <p className="text-xs text-muted-foreground mt-1">Next step: Discuss the observation with a qualified clinician or coach before changing training.</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-2xl font-bold font-mono">{screen.score}</div>
                        <div className="text-xs text-muted-foreground uppercase">SCORE</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-muted/30 rounded-md border border-dashed">
                  <p className="text-muted-foreground">No screening history available.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
             <CardTitle>Screening summary</CardTitle>
             <CardDescription>Observations to review with a qualified professional</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {latestResult ? (
                <>
                  <div className="flex flex-col items-center justify-center py-4">
                    <div className={`flex h-32 w-32 items-center justify-center rounded-full border-8 ${latestResult.status === 'CLEAR' ? 'border-green' : 'border-amber'}`}>
                      <div className="text-center">
                        <span className="text-2xl font-bold">{latestResult.status}</span>
                        <span className="block text-xs uppercase tracking-wider text-muted-foreground">{latestResult.score}/100</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between gap-4 text-sm">
                      <span>Sport</span>
                      <span className="text-right font-medium capitalize">{latestResult.sport.replaceAll('-', ' ')}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-sm">
                      <span>Asymmetry</span>
                      <span className={`text-right font-medium ${latestResult.score >= 85 ? 'text-green' : 'text-amber'}`}>{latestResult.score >= 85 ? 'Minimal (3%)' : 'Review recommended'}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-sm">
                      <span>Knee alignment</span>
                      <span className={`text-right font-medium ${latestResult.status === 'CLEAR' ? 'text-green' : 'text-amber'}`}>{latestResult.status === 'CLEAR' ? 'Within target' : 'Review left side'}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-sm">
                      <span>Depth</span>
                      <span className="text-right font-medium text-green">{latestResult.score >= 80 ? 'Optimal' : 'Developing'}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-dashed bg-muted/30 px-5 py-10 text-center">
                  <Activity className="mx-auto h-9 w-9 text-muted-foreground/50" />
                  <p className="mt-3 font-medium">Run a screening to see results here</p>
                  <p className="mt-1 text-sm text-muted-foreground">The summary will update with the selected sport’s completed movement screen.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Simple custom CSS animation component
function ActivityPulse() {
  return (
    <div className="flex justify-center mb-4">
      <div className="relative flex h-16 w-16">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-75"></span>
        <span className="relative inline-flex rounded-full h-16 w-16 bg-teal/20 border-2 border-teal items-center justify-center">
          <TrendingUp className="h-8 w-8 text-teal" />
        </span>
      </div>
    </div>
  );
}
