import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useLocale } from '@/lib/locale';
import { useCreateSession } from '@workspace/api-client-react';
import { 
  X, 
  Video, 
  Activity, 
  ArrowLeft 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRecoverLensAuth } from '@/lib/auth';

import imgReady from '@assets/01_ready_1788295982281.jpg';
import imgKeepTorsoCentered from '@assets/02_keep_torso_centered_1788295982280.jpg';
import imgCorrectForm from '@assets/03_correct_form_1788295982281.jpg';
import imgReadyResting from '@assets/04_ready_resting_1788295982281.jpg';
import imgSessionComplete from '@assets/05_session_complete_1788295982280.jpg';

// Mirror state machine
type MirrorState = 
  | 'READY' 
  | 'RAISING' 
  | 'KEEP_TORSO_CENTERED' 
  | 'CORRECT_FORM' 
  | 'HOLD' 
  | 'LOWERING' 
  | 'GOOD_REP' 
  | 'COMPLETE';

// Helper for dynamic colors
const getStatusColor = (state: MirrorState) => {
  switch (state) {
    case 'CORRECT_FORM':
    case 'HOLD':
    case 'GOOD_REP':
      return 'var(--green)';
    case 'KEEP_TORSO_CENTERED':
      return 'var(--amber)';
    case 'READY':
      return 'var(--teal)';
    default:
      return 'var(--teal)'; // default / lowering / raising
  }
};

const getStatusLabel = (state: MirrorState, t: any) => {
  switch (state) {
    case 'READY': return t('status.ready');
    case 'RAISING': return t('status.raising');
    case 'KEEP_TORSO_CENTERED': return t('status.keep_torso');
    case 'CORRECT_FORM': return t('status.correct_form');
    case 'HOLD': return t('status.hold');
    case 'LOWERING': return t('status.lowering');
    case 'GOOD_REP': return t('status.good_rep');
    case 'COMPLETE': return t('mirror.session_complete');
  }
};

export default function Mirror() {
  const { t } = useLocale();
  const [, setLocation] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { selectedPatientId: patientId } = useRecoverLensAuth();
  
  const [streamActive, setStreamActive] = useState(false);
  const [mirrorState, setMirrorState] = useState<MirrorState>('READY');
  const [reps, setReps] = useState(0);
  const targetReps = 5;
  const [movementScore, setMovementScore] = useState(84);
  const [leftShoulder, setLeftShoulder] = useState(6);
  const [rightShoulder, setRightShoulder] = useState(8);
  const [torso, setTorso] = useState(100);
  
  const { mutate: saveSession } = useCreateSession();

  // Attempt to get user media
  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStreamActive(true);
        }
      } catch (err) {
        console.log("Camera not available, falling back to demo mode");
        setStreamActive(false);
      }
    };
    startCamera();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Demo State Machine Runner
  useEffect(() => {
    if (mirrorState === 'COMPLETE') return;

    let timeoutId: NodeJS.Timeout;
    
    const runCycle = () => {
      switch (mirrorState) {
        case 'READY':
          timeoutId = setTimeout(() => {
            setMirrorState('RAISING');
            setLeftShoulder(45);
            setRightShoulder(46);
            setTorso(90);
          }, 2000);
          break;
        case 'RAISING':
          timeoutId = setTimeout(() => {
            setMirrorState('KEEP_TORSO_CENTERED');
            setMovementScore(94);
            setLeftShoulder(97);
            setRightShoulder(96);
            setTorso(95);
          }, 1500);
          break;
        case 'KEEP_TORSO_CENTERED':
          timeoutId = setTimeout(() => {
            setMirrorState('CORRECT_FORM');
            setMovementScore(100);
            setLeftShoulder(93);
            setRightShoulder(94);
            setTorso(100);
          }, 2000);
          break;
        case 'CORRECT_FORM':
          timeoutId = setTimeout(() => setMirrorState('HOLD'), 1000);
          break;
        case 'HOLD':
          timeoutId = setTimeout(() => setMirrorState('LOWERING'), 2000);
          break;
        case 'LOWERING':
          timeoutId = setTimeout(() => {
            setMirrorState('GOOD_REP');
            setLeftShoulder(10);
            setRightShoulder(12);
            setTorso(100);
          }, 1500);
          break;
        case 'GOOD_REP':
          timeoutId = setTimeout(() => {
            const newReps = reps + 1;
            setReps(newReps);
            if (newReps >= targetReps) {
              setMirrorState('COMPLETE');
              // Save session
              saveSession({
                data: {
                  patientId: patientId!,
                  exercise: 'Shoulder Abduction',
                  totalReps: newReps,
                  correctReps: newReps, // simplified
                  averageAngle: 94,
                  movementScore: 92,
                  torsoAlignment: 96,
                  symmetry: 98,
                  painScore: 0,
                  mode: 'self',
                  protocolMode: 'pilot-demo',
                  recommendation: 'Keep torso straight'
                }
              });
            } else {
              setMirrorState('READY');
              setMovementScore(84);
              setLeftShoulder(6);
              setRightShoulder(8);
            }
          }, 1500);
          break;
      }
    };
    
    runCycle();
    
    return () => clearTimeout(timeoutId);
  }, [mirrorState, reps, targetReps, saveSession]);

  const bgImageMap = {
    READY: imgReady,
    RAISING: imgReady,
    KEEP_TORSO_CENTERED: imgKeepTorsoCentered,
    CORRECT_FORM: imgCorrectForm,
    HOLD: imgCorrectForm,
    LOWERING: imgReadyResting,
    GOOD_REP: imgReadyResting,
    COMPLETE: imgSessionComplete,
  };

  if (mirrorState === 'COMPLETE') {
    return (
      <div className="fixed inset-0 z-50 bg-[#121212] flex items-center justify-center p-4">
        {/* Exact Layout of Session Complete */}
        <div className="max-w-2xl w-full border border-white/10 rounded-sm p-8 md:p-12 space-y-8 bg-[#181818]/80 backdrop-blur-md text-white font-mono">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: 'var(--green)' }}>
            {t('mirror.session_complete')}
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 text-lg">
            <div className="text-white/70">{t('mirror.exercise')}</div>
            <div className="font-medium">Shoulder Rehabilitation</div>
            
            <div className="text-white/70">{t('mirror.total_reps')}</div>
            <div className="font-medium">{reps}</div>
            
            <div className="text-white/70">{t('mirror.correct_reps')}</div>
            <div className="font-medium">{reps}</div>
            
            <div className="text-white/70">{t('mirror.avg_angle')}</div>
            <div className="font-medium">94.0 deg</div>
            
            <div className="text-white/70">Movement Score</div>
            <div className="font-medium">92%</div>
            
            <div className="text-white/70">{t('mirror.recommendation')}</div>
            <div className="font-medium">Keep torso straight</div>
          </div>
          
          <div className="pt-8 flex justify-center">
            <Button 
              size="lg" 
              variant="outline"
              className="border-white/20 hover:bg-white/10 text-white font-sans w-full md:w-auto min-w-[200px]"
              onClick={() => setLocation('/')}
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Return Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden flex flex-col font-sans select-none">
      {/* Top action bar */}
      <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-center z-20 bg-gradient-to-b from-black/60 to-transparent">
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white hover:bg-white/20 rounded-full"
          onClick={() => setLocation('/')}
        >
          <X className="h-8 w-8" />
        </Button>
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
          <Activity className="h-4 w-4 text-teal" />
          <span className="text-white text-sm font-medium tracking-wider">RECOVERLENS LIVE</span>
        </div>
      </div>

      {/* Main viewport */}
      <div className="relative flex-1 w-full h-full">
        {streamActive ? (
          <video 
            ref={videoRef}
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover -scale-x-100" 
          />
        ) : (
          <div className="w-full h-full relative">
            <img 
              src={bgImageMap[mirrorState as keyof typeof bgImageMap]} 
              alt="Demo Mode" 
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            {/* Fallback pattern if images are missing */}
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black -z-10 flex items-center justify-center">
              <div className="text-center space-y-4">
                <Video className="h-16 w-16 text-white/20 mx-auto" />
                <p className="text-white/40 font-mono">CAMERA INACTIVE / DEMO MODE</p>
                {/* SVG Skeleton overlay mock */}
                <div className="w-64 h-64 mx-auto relative border border-white/10 rounded">
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-4 transition-all duration-1000">
                     {/* Simplified representation of movement */}
                     <div className={`h-2 w-20 transition-all duration-500 rounded-full bg-[${getStatusColor(mirrorState)}]`} 
                          style={{ transform: `rotate(${mirrorState === 'KEEP_TORSO_CENTERED' || mirrorState === 'CORRECT_FORM' || mirrorState === 'HOLD' ? -90 : 0}deg)` }} />
                     <div className="h-4 w-4 rounded-full bg-white" />
                     <div className={`h-2 w-20 transition-all duration-500 rounded-full bg-[${getStatusColor(mirrorState)}]`}
                          style={{ transform: `rotate(${mirrorState === 'KEEP_TORSO_CENTERED' || mirrorState === 'CORRECT_FORM' || mirrorState === 'HOLD' ? 90 : 0}deg)` }} />
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Skeleton Canvas Overlay (would be a real canvas driven by PoseNet/MoveNet) */}
        {/* We use the images that already have the skeleton drawn to represent this correctly as requested */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[34%] bg-gradient-to-t from-black via-black/85 to-transparent" />
      </div>

      {/* Bottom overlay panels (Exact styling from reference) */}
      <div className="absolute bottom-0 inset-x-0 p-4 md:p-8 flex flex-col md:flex-row justify-between items-end gap-4 z-20">
        
        {/* Left Panel: Status */}
        <div className="mirror-panel p-5 md:p-6 w-full md:w-[450px] space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-teal font-bold tracking-widest text-sm md:text-base">
              {t('mirror.ai_rehab')}
            </h2>
          </div>
          
          <div className="font-mono text-white/90 text-sm md:text-base">
            {t('mirror.exercise')} Shoulder Abduction
          </div>
          
          <div className="flex items-center gap-3 pt-2">
            <span className="font-mono text-white/70 text-sm">{t('mirror.status')}</span>
            <span 
              className="text-xl md:text-2xl font-bold tracking-wider mirror-text-glow transition-colors duration-300"
              style={{ color: getStatusColor(mirrorState) }}
            >
              {getStatusLabel(mirrorState, t)}
            </span>
          </div>
          
          <div className="space-y-1 font-mono text-sm md:text-base text-white/90 pt-2">
            <div>{t('mirror.movement_score')} {movementScore} / 100</div>
            <div>{t('mirror.rep_count')} {String(reps).padStart(2, '0')} / {String(targetReps).padStart(2, '0')}</div>
          </div>
        </div>

        {/* Right Panel: Live Metrics */}
        <div className="mirror-panel p-5 md:p-6 w-full md:w-[400px] space-y-4">
          <h2 className="text-teal font-bold tracking-widest text-sm md:text-base">
            {t('mirror.live_data')}
          </h2>
          
          <div className="space-y-2 font-mono text-sm md:text-base">
            <div className="flex justify-between">
              <span className="text-white/70">{t('mirror.left_shoulder')}</span>
              <span className="text-white">{leftShoulder} deg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">{t('mirror.right_shoulder')}</span>
              <span className="text-white">{rightShoulder} deg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">{t('mirror.torso_alignment')}</span>
              <span className="text-white">{torso}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">{t('mirror.symmetry')}</span>
              <span className="text-white">98%</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
