import { useState } from 'react';
import { Link } from 'wouter';
import { getListAlertsQueryKey, getListPatientsQueryKey, useCreatePatient, useListPatients, useListAlerts, useReviewAlert } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, AlertCircle, ChevronRight, Search, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EXERCISE_LIBRARY } from '@/lib/exercise-library';
import { useRecoveryEvents } from '@/hooks/use-recovery-events';

export default function ClinicianDashboard() {
  const { status: liveStatus } = useRecoveryEvents();
  const { data: patients, isLoading: isLoadingPatients } = useListPatients({ query: { queryKey: getListPatientsQueryKey(), refetchInterval: 15_000 } });
  const { data: alerts, isLoading: isLoadingAlerts } = useListAlerts({ query: { queryKey: getListAlertsQueryKey(), refetchInterval: 15_000 } });
  const { mutate: reviewAlert } = useReviewAlert();
  const { mutate: createPatient, isPending: isSubmitting } = useCreatePatient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);

  // Form State
  const [newPatient, setNewPatient] = useState({
    name: '',
    contact: '',
    condition: '',
    initialExercise: 'Shoulder Abduction'
  });

  const handleAddPatient = (e: React.FormEvent) => {
    e.preventDefault();
    createPatient(
      {
        data: {
          name: newPatient.name,
          contact: newPatient.contact,
          condition: newPatient.condition,
          initialExercise: newPatient.initialExercise,
        },
      },
      {
        onSuccess: (result) => {
          queryClient.setQueryData(getListPatientsQueryKey(), (current: typeof patients | undefined) => {
            if (!current) return [result.patient];
            return [...current, result.patient].sort((a, b) => a.name.localeCompare(b.name));
          });
          setIsAddPatientOpen(false);
          setNewPatient({ name: '', contact: '', condition: '', initialExercise: 'Shoulder Abduction' });
          toast({
            title: "Patient added",
            description: `Invite code ${result.inviteCode} is ready to share with ${result.patient.name}.`,
          });
        },
        onError: () => {
          toast({
            title: "Unable to add patient",
            description: "Please check the details and try again.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const filteredPatients = patients?.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.condition.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Clinician Dashboard
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Monitor patient progress and review recovery alerts.
          </p>
          <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground" role="status">
            <span className={`h-2 w-2 rounded-full ${isLoadingPatients || isLoadingAlerts ? "bg-amber-500" : "bg-emerald-500"}`} />
            {isLoadingPatients || isLoadingAlerts
              ? "Loading dashboard data…"
              : liveStatus === "connected"
                ? "Dashboard data loaded · Live updates on"
                : "Dashboard data loaded · Auto-refresh on"}
          </p>
        </div>
        
        <Dialog open={isAddPatientOpen} onOpenChange={setIsAddPatientOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="bg-primary text-primary-foreground font-semibold">
              <UserPlus className="h-5 w-5 mr-2" />
              Add Patient
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Patient</DialogTitle>
              <DialogDescription>
                Create a new patient profile and assign their initial exercise program.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddPatient} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  placeholder="e.g. Jane Doe" 
                  required 
                  value={newPatient.name}
                  onChange={e => setNewPatient({...newPatient, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">Email or Phone</Label>
                <Input 
                  id="contact" 
                  placeholder="jane@example.com" 
                  required
                  value={newPatient.contact}
                  onChange={e => setNewPatient({...newPatient, contact: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="condition">Diagnosis / Condition</Label>
                <Input 
                  id="condition" 
                  placeholder="e.g. Post-op Rotator Cuff Repair" 
                  required
                  value={newPatient.condition}
                  onChange={e => setNewPatient({...newPatient, condition: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exercise">Initial Exercise Assignment</Label>
                <Select 
                  value={newPatient.initialExercise} 
                  onValueChange={val => setNewPatient({...newPatient, initialExercise: val})}
                >
                  <SelectTrigger id="exercise">
                    <SelectValue placeholder="Select exercise" />
                  </SelectTrigger>
                    <SelectContent>
                      {EXERCISE_LIBRARY.map((exercise) => (
                        <SelectItem key={exercise.id} value={exercise.name}>{exercise.name}</SelectItem>
                      ))}
                    </SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAddPatientOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Create Patient'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Alerts & Key Metrics */}
        <div className="space-y-6">
          <Card className="border-amber/30 bg-amber/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                <AlertCircle className="h-5 w-5" />
                Action Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingAlerts ? (
                <div className="space-y-3">
                  <div className="h-16 bg-muted/50 animate-pulse rounded-md" />
                </div>
              ) : alerts && alerts.length > 0 ? (
                <div className="space-y-3">
                  {alerts.filter(a => !a.resolved).map(alert => (
                    <div key={alert.id} className="bg-card border border-amber/20 rounded-lg p-3 text-sm space-y-2">
                      <div className="font-medium text-foreground">{alert.message}</div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                        </span>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 text-amber-600 hover:text-amber-700 hover:bg-amber/10"
                          onClick={() => reviewAlert({ alertId: alert.id })}
                        >
                          Mark Reviewed
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">No active alerts to review.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Patient Roster */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" /> Patient Roster
            </h2>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search patients..." 
                className="pl-9 bg-card" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <Card>
            <CardContent className="p-0">
              {isLoadingPatients ? (
                <div className="p-6 space-y-4">
                  {[1,2,3,4].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />)}
                </div>
              ) : filteredPatients && filteredPatients.length > 0 ? (
                <div className="divide-y">
                  {filteredPatients.map((patient) => (
                    <Link 
                      key={patient.id} 
                      href={`/clinician/${patient.id}`}
                      className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors block"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10 border bg-primary/10">
                          <AvatarFallback className="text-primary font-medium">
                            {patient.initials || patient.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            {patient.name}
                            {patient.hasAlert && <span className="h-2 w-2 rounded-full bg-amber-500" />}
                          </div>
                          <div className="text-sm text-muted-foreground">{patient.condition}</div>
                          {!patient.lastSession && (
                            <div className="mt-1 text-xs font-medium text-primary">Awaiting first session</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-8">
                        <div className="hidden sm:block text-right">
                          <div className="text-sm font-medium">Score: {patient.recoveryScore}</div>
                          <div className="text-xs text-muted-foreground">Adherence: {patient.adherence}%</div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-10 text-center text-muted-foreground">
                  {searchQuery ? 'No patients found matching your search.' : 'No patients found.'}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
