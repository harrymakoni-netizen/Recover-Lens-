import { useState } from 'react';
import { useLocation } from 'wouter';
import { useLocale } from '@/lib/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Play, ClipboardList, ArrowRight, HeartHandshake, ShieldCheck, Info } from 'lucide-react';
import { useCreateSession } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useRecoverLensAuth } from '@/lib/auth';

export default function Caregiver() {
  const { t } = useLocale();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { mutate: createSession, isPending } = useCreateSession();
  const { selectedPatientId: patientId } = useRecoverLensAuth();

  const [step, setStep] = useState(1);
  const [assistedModeEnabled, setAssistedModeEnabled] = useState(true);
  
  // Form state
  const [exercise, setExercise] = useState('Shoulder Abduction');
  const [reps, setReps] = useState('5');
  const [painScore, setPainScore] = useState('2');
  const [notes, setNotes] = useState('');

  const handleStartAssist = () => {
    if (!patientId) return;
    if (assistedModeEnabled) {
      setLocation(`/mirror?mode=caregiver-assisted&exercise=${encodeURIComponent(exercise)}`);
    } else {
      setLocation(`/mirror?exercise=${encodeURIComponent(exercise)}`);
    }
  };

  const handleLogManual = () => {
    if (!patientId) return;
    createSession(
      {
        data: {
          patientId,
          exercise,
          totalReps: parseInt(reps, 10) || 5,
          correctReps: parseInt(reps, 10) || 5, // manual log assumes completed
          averageAngle: 85,
          movementScore: 90,
          torsoAlignment: 95,
          symmetry: 90,
          painScore: parseInt(painScore, 10),
          mode: 'caregiver-assisted',
          protocolMode: 'pilot-demo',
          recommendation: notes || 'Monitored by caregiver'
        }
      },
      {
        onSuccess: () => {
          toast({
            title: "Session Logged",
            description: "Caregiver session has been successfully recorded.",
          });
          setStep(1);
          setNotes('');
        }
      }
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 fade-in">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              {t('nav.caregiver') || 'Caregiver Portal'}
            </h1>
            <Badge className="bg-amber/20 text-amber-600 hover:bg-amber/30 border-amber/30 uppercase tracking-widest text-xs font-bold px-3 py-1">
              Caregiver Mode
            </Badge>
          </div>
          <p className="text-muted-foreground mt-2 text-lg">
            Assist the patient with their prescribed exercises safely.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-amber/30 bg-amber/5 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-500">
              <HeartHandshake className="h-6 w-6" />
              Live Assisted Session
            </CardTitle>
            <CardDescription className="text-sm">
              Launch the live camera mirror with assisted movement tracking.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              This is a demonstration build. Exercise targets are illustrative and not clinically validated for real patient use.
            </p>
            <div className="bg-background rounded-lg p-4 border border-border/50">
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="assisted-mode" className="text-base font-semibold cursor-pointer flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-amber-600" />
                  Assisted AI Mode
                </Label>
                <Switch 
                  id="assisted-mode" 
                  checked={assistedModeEnabled} 
                  onCheckedChange={setAssistedModeEnabled}
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {assistedModeEnabled 
                  ? "Caregiver tracking is active. The AI will mask your body and apply wider tolerances for supported movement." 
                  : "Standard AI mode. Strict tolerances apply. Do not enter the camera frame."}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mirror-exercise">Select Exercise</Label>
              <Input 
                id="mirror-exercise"
                value={exercise}
                onChange={(e) => setExercise(e.target.value)}
                className="h-12 text-lg"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button size="lg" className="w-full h-14 text-lg font-bold bg-amber-600 hover:bg-amber-700 text-white" onClick={handleStartAssist}>
               <Play className="h-6 w-6 mr-2" /> Start Assisted Session
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Manual Session Log
            </CardTitle>
            <CardDescription>
              Record an exercise session performed without the AI mirror.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 1 ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-base">Exercise Performed</Label>
                  <Input 
                    value={exercise}
                    onChange={(e) => setExercise(e.target.value)}
                    className="h-12 text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base">Reps Completed</Label>
                  <Input 
                    type="number" 
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    min="1"
                    className="h-12 text-lg"
                  />
                </div>
                <Button size="lg" className="w-full h-14 text-lg" onClick={() => setStep(2)}>
                  Continue to Assessment <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            ) : (
              <div className="space-y-6 fade-in">
                <div className="space-y-3">
                  <Label className="text-base">Pain Level (0-10)</Label>
                  <RadioGroup value={painScore} onValueChange={setPainScore} className="flex gap-3 flex-wrap">
                    {[0, 2, 4, 6, 8, 10].map((val) => (
                      <div key={val} className="flex items-center">
                        <RadioGroupItem value={val.toString()} id={`pain-${val}`} className="sr-only" />
                        <Label 
                          htmlFor={`pain-${val}`}
                          className={`flex h-12 w-12 text-lg items-center justify-center rounded-md border-2 cursor-pointer hover:bg-secondary transition-colors ${painScore === val.toString() ? 'bg-amber-600 text-white border-amber-600' : 'bg-card border-muted'}`}
                        >
                          {val}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-base">Caregiver Notes (Optional)</Label>
                  <Textarea 
                    placeholder="E.g., Patient felt stiff in the right shoulder..." 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[120px] text-base p-3"
                  />
                </div>
                
                <div className="flex gap-3">
                  <Button variant="outline" size="lg" className="flex-1 h-14 text-lg" onClick={() => setStep(1)}>
                    Back
                  </Button>
                   <Button size="lg" className="flex-[2] h-14 text-lg" onClick={handleLogManual} disabled={isPending}>
                     {isPending ? 'Saving...' : 'Save Log'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
