import { useState } from 'react';
import { useLocation } from 'wouter';
import { useLocale } from '@/lib/locale';
import { useGetPatient, useListPrograms, getGetPatientQueryKey, getListProgramsQueryKey } from '@workspace/api-client-react';
import { Activity, Play, Calendar, TrendingUp, AlertTriangle, ChevronRight, Dumbbell, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KNEE_EXERCISES, SHOULDER_EXERCISES } from '@/lib/exercise-library';
import { useRecoverLensAuth } from '@/lib/auth';

export default function Home() {
  const { t } = useLocale();
  const [, setLocation] = useLocation();
  const { selectedPatientId, roles } = useRecoverLensAuth();
  const patientId = selectedPatientId ?? '';
  const [inviteCode, setInviteCode] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [activeTab, setActiveTab] = useState('shoulder');

  const { data: patient } = useGetPatient(patientId, {
    query: {
      enabled: Boolean(patientId),
      queryKey: getGetPatientQueryKey(patientId)
    }
  });

  const { data: programs, isLoading: isProgramsLoading } = useListPrograms(
    { patientId },
    { query: { enabled: Boolean(patientId), queryKey: getListProgramsQueryKey({ patientId }) } },
  );

  const startExercise = (exerciseName: string) => {
    setLocation(`/mirror?exercise=${encodeURIComponent(exerciseName)}`);
  };

  if (!patientId) {
    const destination = roles.includes('clinician') ? '/clinician' : roles.includes('coach') ? '/coach' : null;
    const redeemInvite = async () => {
      setInviteError('');
      const response = await fetch('/api/access/invitations/redeem', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: inviteCode }),
      });
      if (!response.ok) {
        setInviteError('That invitation is invalid, expired, or already used.');
        return;
      }
      window.location.reload();
    };
    return (
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Account access is not linked yet</CardTitle>
          <CardDescription>Your signed-in account does not have an active patient relationship. Ask your care organization to grant access.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} placeholder="Enter invitation code" data-testid="input-invitation-code" />
          {inviteError && <p className="text-sm text-destructive" data-testid="status-invitation-error">{inviteError}</p>}
        </CardContent>
        <CardFooter className="gap-3">
          <Button onClick={redeemInvite} disabled={inviteCode.trim().length < 6} data-testid="button-redeem-invitation">Link account</Button>
          {destination && <Button variant="outline" onClick={() => setLocation(destination)} data-testid="button-open-role-dashboard">Open dashboard</Button>}
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 fade-in">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            {t('home.welcome') || 'Welcome'}{patient ? `, ${patient.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            {patient ? patient.condition : 'Loading your recovery plan...'}
          </p>
        </div>
        
        {patient?.hasAlert && (
          <div className="bg-amber/10 border border-amber/20 text-amber px-4 py-2 rounded-md flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">Clinician note available</span>
          </div>
        )}
      </header>

      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        This is a demonstration build. Exercise targets are for illustration and have not been clinically validated for real patient use.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {t('home.prescribed') || 'Prescribed Exercises'}
            </CardTitle>
            <CardDescription>
              Your clinician has assigned the following exercises for today.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isProgramsLoading ? (
              <div className="space-y-4">
                <div className="h-16 bg-muted animate-pulse rounded-md" />
                <div className="h-16 bg-muted animate-pulse rounded-md" />
              </div>
            ) : programs && programs.length > 0 ? (
              <div className="space-y-3">
                {programs.map((program) => (
                  <div key={program.id} className="bg-card border rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{program.exercise}</h3>
                      <p className="text-sm text-muted-foreground">
                        {program.targetSets} sets • {program.targetReps} reps • target angle {program.targetAngle}°
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => startExercise(program.exercise)}
                    >
                       <Play className="h-4 w-4 mr-2" /> Start Exercise
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card border rounded-lg p-6 text-center">
                <p className="text-muted-foreground font-medium mb-1">No personalised program assigned yet.</p>
                <p className="mb-4 text-sm text-muted-foreground">You can try a guided exercise below. Your clinician can assign a tailored plan.</p>
                <Button onClick={() => startExercise('Shoulder Abduction')} variant="outline" className="border-primary text-primary hover:bg-primary/10">
                   <Play className="h-4 w-4 mr-2" /> Start Exercise
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Recovery Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Overall Score</span>
                <span className="font-bold">{patient?.recoveryScore ?? 0}/100</span>
              </div>
              <Progress value={patient?.recoveryScore ?? 0} className="h-2 [&>div]:bg-primary" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Adherence</span>
                <span className="font-bold">{patient?.adherence ?? 0}%</span>
              </div>
              <Progress value={patient?.adherence ?? 0} className="h-2 [&>div]:bg-green" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold tracking-tight mb-4 flex items-center gap-2">
          <Dumbbell className="h-6 w-6 text-primary" /> Exercise Library
        </h2>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="shoulder">Shoulder</TabsTrigger>
            <TabsTrigger value="knee">Knee</TabsTrigger>
          </TabsList>
          
          <TabsContent value="shoulder" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {SHOULDER_EXERCISES.map(ex => (
                <Card key={ex.id} className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md group" onClick={() => startExercise(ex.name)}>
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold group-hover:text-primary transition-colors">{ex.name}</h3>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 min-h-10">{ex.description}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="bg-secondary/50 font-normal">{ex.bodyArea}</Badge>
                      <Badge variant="outline" className="font-normal">{ex.sets} sets · {ex.reps} reps</Badge>
                    </div>
                     <Button size="sm" className="mt-4 w-full" onClick={(event) => { event.stopPropagation(); startExercise(ex.name); }}>
                       <Play className="mr-2 h-4 w-4" />Start Exercise
                     </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="knee" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {KNEE_EXERCISES.map(ex => (
                <Card key={ex.id} className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md group" onClick={() => startExercise(ex.name)}>
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold group-hover:text-primary transition-colors">{ex.name}</h3>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 min-h-10">{ex.description}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="bg-secondary/50 font-normal">{ex.bodyArea}</Badge>
                      <Badge variant="outline" className="font-normal">{ex.sets} sets · {ex.reps} reps</Badge>
                    </div>
                     <Button size="sm" className="mt-4 w-full" onClick={(event) => { event.stopPropagation(); startExercise(ex.name); }}>
                       <Play className="mr-2 h-4 w-4" />Start Exercise
                     </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
