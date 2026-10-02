// Seeds demo patients, programs, sessions, alerts and screenings.
// Idempotent: existing rows with the same ids are left untouched.
import {
  alertsTable,
  db,
  patientsTable,
  pool,
  programsTable,
  screeningsTable,
  sessionsTable,
} from "./src/index";

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY);

const patients = [
  {
    id: "patient-1",
    name: "Tariro Moyo",
    initials: "TM",
    contact: "tariro@example.com",
    condition: "Post-op rotator cuff repair",
    assignedClinician: "Dr. Chipo Banda",
    sport: "football",
    recoveryScore: 72,
    adherence: 86,
    hasAlert: true,
    lastSession: daysAgo(1),
  },
  {
    id: "patient-2",
    name: "Jordan Lee",
    initials: "JL",
    contact: "jordan@example.com",
    condition: "ACL reconstruction (week 10)",
    assignedClinician: "Dr. Chipo Banda",
    sport: "basketball",
    recoveryScore: 64,
    adherence: 78,
    hasAlert: false,
    lastSession: daysAgo(2),
  },
  {
    id: "patient-3",
    name: "Amara Ndlovu",
    initials: "AN",
    contact: "amara@example.com",
    condition: "Knee osteoarthritis",
    assignedClinician: "Dr. Sam Okafor",
    sport: "running",
    recoveryScore: 81,
    adherence: 92,
    hasAlert: false,
    lastSession: daysAgo(1),
  },
  {
    id: "patient-4",
    name: "Noah Williams",
    initials: "NW",
    contact: "noah@example.com",
    condition: "Frozen shoulder",
    assignedClinician: "Dr. Sam Okafor",
    sport: null,
    recoveryScore: 58,
    adherence: 70,
    hasAlert: false,
    lastSession: daysAgo(4),
  },
];

const programs = [
  { id: "program-1", patientId: "patient-1", exercise: "Shoulder Abduction", targetReps: 10, targetSets: 3, targetAngle: 90, frequency: "Daily" },
  { id: "program-2", patientId: "patient-2", exercise: "Straight Leg Raise", targetReps: 10, targetSets: 3, targetAngle: 45, frequency: "Daily" },
  { id: "program-3", patientId: "patient-3", exercise: "Quadriceps Set", targetReps: 10, targetSets: 4, targetAngle: 0, frequency: "5x per week" },
  { id: "program-4", patientId: "patient-4", exercise: "Shoulder Flexion", targetReps: 10, targetSets: 3, targetAngle: 160, frequency: "Daily" },
];

// Seven sessions per patient over the last two weeks, trending upward.
const sessions = patients.flatMap((patient, p) => {
  const program = programs[p];
  return Array.from({ length: 7 }, (_, i) => {
    const progress = i / 6;
    const correct = Math.round(6 + progress * 3);
    return {
      id: `session-${patient.id}-${i + 1}`,
      patientId: patient.id,
      exercise: program.exercise,
      timestamp: daysAgo(14 - i * 2),
      totalReps: 10,
      correctReps: correct,
      averageAngle: Math.round(program.targetAngle * (0.7 + progress * 0.25)),
      movementScore: Math.round(55 + progress * 30 - p * 3),
      torsoAlignment: Math.round(70 + progress * 20),
      symmetry: Math.round(72 + progress * 18),
      painScore: Math.max(1, 5 - Math.round(progress * 3)),
      adherence: Math.round(patient.adherence - 6 + progress * 6),
      mode: i % 3 === 0 ? "caregiver-assisted" : "self",
      recommendation: "Continue current program; progress range as tolerated.",
    };
  });
});

const alerts = [
  {
    id: "alert-1",
    patientId: "patient-1",
    type: "pain increase",
    message: "Pain score rose from 2 to 5 during the last session. Review before progressing range.",
    createdAt: daysAgo(1),
    resolved: false,
  },
];

const screenings = [
  { id: "screening-1", patientId: "patient-1", athlete: "Tariro Moyo", sport: "football", score: 88, status: "CLEAR", finding: "Balanced landing with good knee-over-toe control.", recommendation: "Continue FIFA 11+ strength and landing preparation twice weekly.", timestamp: daysAgo(5) },
  { id: "screening-2", patientId: "patient-2", athlete: "Jordan Lee", sport: "basketball", score: 76, status: "REVIEW", finding: "Mild left-right asymmetry during repeated jump landings.", recommendation: "Add lateral hip strength and controlled landing drills.", timestamp: daysAgo(4) },
];

async function main() {
  await db.insert(patientsTable).values(patients).onConflictDoNothing();
  await db.insert(programsTable).values(programs).onConflictDoNothing();
  await db.insert(sessionsTable).values(sessions).onConflictDoNothing();
  await db.insert(alertsTable).values(alerts).onConflictDoNothing();
  await db.insert(screeningsTable).values(screenings).onConflictDoNothing();
  console.log(
    `Seeded ${patients.length} patients, ${programs.length} programs, ${sessions.length} sessions, ${alerts.length} alerts, ${screenings.length} screenings.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
