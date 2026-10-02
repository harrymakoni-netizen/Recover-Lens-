import { useState, useRef } from 'react';
import { useParams, Link } from 'wouter';
import { useGetPatient, useGetPatientTrend, useListPrograms, useUpdateProgram } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Edit2, Activity, Calendar, Save } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { getListProgramsQueryKey } from '@workspace/api-client-react';
import { useRecoveryEvents } from '@/hooks/use-recovery-events';

export default function ClinicianPatientDetail() {
  const { patientId: id } = useParams<{ patientId: string }>();
  const { status: liveStatus } = useRecoveryEvents();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: patient, isLoading: isPatientLoading } = useGetPatient(id);
  const { data: trend, isLoading: isTrendLoading } = useGetPatientTrend(id);
  const { data: programs, isLoading: isProgramsLoading } = useListPrograms({ patientId: id });
  
  const { mutate: updateProgram } = useUpdateProgram();

  const [editingProgram, setEditingProgram] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ targetSets: 0, targetReps: 0, targetAngle: 0 });

  const handleEditClick = (prog: any) => {
    setEditingProgram(prog.id);
    setEditForm({
      targetSets: prog.targetSets,
      targetReps: prog.targetReps,
      targetAngle: prog.targetAngle
    });
  };

  const handleSaveProgram = (progId: string, baseProgram: any) => {
    updateProgram(
      {
        programId: progId,
        data: {
          patientId: id,
          exercise: baseProgram.exercise,
          frequency: baseProgram.frequency,
          ...editForm
        }
      },
      {
        onSuccess: (updated) => {
          setEditingProgram(null);
          toast({ title: "Program updated successfully" });
          
          // Optimistic local update
          queryClient.setQueryData(getListProgramsQueryKey({ patientId: id }), (old: any) => {
            if (!old) return old;
            return old.map((p: any) => p.id === progId ? updated : p);
          });
        }
      }
    );
  };

  if (isPatientLoading) return <div className="p-8 animate-pulse text-center">Loading patient data...</div>;
  if (!patient) return <div className="p-8 text-center text-muted-foreground">Patient not found</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/clinician">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            {patient.name}
            {patient.hasAlert && <Badge variant="destructive">Needs Review</Badge>}
          </h1>
          <p className="text-muted-foreground mt-1">
            ID: {patient.id} • {patient.condition}
          </p>
          <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground" role="status">
            <span className={`h-2 w-2 rounded-full ${liveStatus === "connected" ? "bg-emerald-500" : "bg-amber-500"}`} />
            {liveStatus === "connected" ? "Live progress updates connected" : "Reconnecting — progress will refresh automatically"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Trend Chart */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Recovery Trend (Last 7 Sessions)
              </CardTitle>
              <CardDescription>{trend?.summary || "Analyzing kinematic progress..."}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {isTrendLoading ? (
                  <div className="w-full h-full bg-muted/50 animate-pulse rounded-md" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend?.points || []} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="var(--muted-foreground)" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                      />
                      <YAxis 
                        stroke="var(--muted-foreground)" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                        labelStyle={{ color: 'var(--foreground)' }}
                        itemStyle={{ color: 'var(--primary)' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="movementScore" 
                        name="Movement Score" 
                        stroke="var(--primary)" 
                        strokeWidth={3}
                        dot={{ r: 4, fill: 'var(--primary)' }} 
                        activeDot={{ r: 6 }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="averageAngle" 
                        name="Avg Angle" 
                        stroke="var(--amber)" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Programs */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Assigned Programs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isProgramsLoading ? (
                <div className="space-y-3">
                  <div className="h-24 bg-muted animate-pulse rounded-md" />
                </div>
              ) : programs && programs.length > 0 ? (
                programs.map((program) => (
                  <div key={program.id} className="border rounded-lg p-4 bg-card shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold">{program.exercise}</h4>
                      {editingProgram !== program.id && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleEditClick(program)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    {editingProgram === program.id ? (
                      <div className="space-y-3 bg-secondary/30 p-3 rounded-md border">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Sets</Label>
                            <Input 
                              type="number" 
                              className="h-8 text-sm" 
                              value={editForm.targetSets} 
                              onChange={e => setEditForm(p => ({ ...p, targetSets: Number(e.target.value) }))} 
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Reps</Label>
                            <Input 
                              type="number" 
                              className="h-8 text-sm" 
                              value={editForm.targetReps} 
                              onChange={e => setEditForm(p => ({ ...p, targetReps: Number(e.target.value) }))} 
                            />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">Target Angle (deg)</Label>
                            <Input 
                              type="number" 
                              className="h-8 text-sm" 
                              value={editForm.targetAngle} 
                              onChange={e => setEditForm(p => ({ ...p, targetAngle: Number(e.target.value) }))} 
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end pt-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditingProgram(null)}>Cancel</Button>
                          <Button size="sm" onClick={() => handleSaveProgram(program.id, program)}>
                            <Save className="h-4 w-4 mr-1" /> Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="bg-secondary px-2 py-1 rounded text-center">
                          <span className="block text-xs text-muted-foreground">Sets</span>
                          <span className="font-semibold">{program.targetSets}</span>
                        </div>
                        <div className="bg-secondary px-2 py-1 rounded text-center">
                          <span className="block text-xs text-muted-foreground">Reps</span>
                          <span className="font-semibold">{program.targetReps}</span>
                        </div>
                        <div className="bg-secondary px-2 py-1 rounded text-center">
                          <span className="block text-xs text-muted-foreground">Angle</span>
                          <span className="font-semibold">{program.targetAngle}°</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No active programs.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
