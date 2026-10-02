import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  alertsTable,
  accessInvitationsTable,
  db,
  patientsTable,
  programsTable,
  screeningsTable,
  sessionsTable,
  userPatientAccessTable,
} from "@workspace/db";
import {
  CreateProgramBody,
  CreateProgramResponse,
  CreatePatientBody,
  CreatePatientResponse,
  CreateAccessInvitationBody,
  CreateAccessInvitationParams,
  CreateAccessInvitationResponse,
  CreateScreeningBody,
  CreateScreeningResponse,
  CreateSessionBody,
  CreateSessionResponse,
  GetPatientParams,
  GetPatientResponse,
  GetPatientTrendParams,
  GetPatientTrendResponse,
  ListAlertsResponse,
  ListPatientsResponse,
  ListProgramsQueryParams,
  ListProgramsResponse,
  ListScreeningsResponse,
  ListSessionsQueryParams,
  ListSessionsResponse,
  ReviewAlertParams,
  ReviewAlertResponse,
  UpdateProgramBody,
  UpdateProgramParams,
  UpdateProgramResponse,
} from "@workspace/api-zod";
import { authorizePatient, getPatientAccess, getUserRoles, requireAuthentication } from "../lib/access";
import { getSessionId } from "../lib/auth";
import { openRecoveryEventStream, publishRecoveryEvent } from "../lib/realtime";

const router: IRouter = Router();
const CLINICALLY_APPROVED_EXERCISES = new Set<string>();
router.use(requireAuthentication);

router.get("/events", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req) ?? (req.user!.id === "recoverlens-demo" ? "recoverlens-demo-session" : undefined);
  if (!sessionId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  await openRecoveryEventStream(req, res, req.user!.id, sessionId);
});

router.get("/patients", async (req, res): Promise<void> => {
  const access = await getPatientAccess(req.user!.id);
  const patientIds = [...new Set(access.filter((item) => item.role !== "coach").map((item) => item.patientId))];
  const patients = patientIds.length
    ? await db.select().from(patientsTable).where(inArray(patientsTable.id, patientIds)).orderBy(patientsTable.name)
    : [];
  res.json(ListPatientsResponse.parse(patients.map(serializePatient)));
});

router.post("/patients", async (req, res): Promise<void> => {
  const existingAccess = await getPatientAccess(req.user!.id);
  const globalRoles = await getUserRoles(req.user!.id);
  if (!globalRoles.includes("clinician") && !existingAccess.some((item) => item.role === "clinician")) {
    res.status(403).json({ error: "Only clinicians can add patients" });
    return;
  }
  const body = CreatePatientBody.safeParse(req.body);
  if (!body.success) {
    req.log.warn({ errors: body.error.message }, "Invalid patient");
    res.status(400).json({ error: body.error.message });
    return;
  }

  const id = `patient-${randomUUID()}`;
  const initials = body.data.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const [patient] = await db
    .insert(patientsTable)
    .values({
      id,
      name: body.data.name.trim(),
      initials,
      contact: body.data.contact.trim(),
      condition: body.data.condition.trim(),
      assignedClinician: "Dr. Maya Patel",
      sport: body.data.sport ?? null,
      recoveryScore: 0,
      adherence: 0,
      hasAlert: false,
    })
    .returning();
  if (!patient) {
    throw new Error("Patient insert returned no row");
  }

  await db.insert(programsTable).values({
    id: randomUUID(),
    patientId: patient.id,
    exercise: body.data.initialExercise,
    targetReps: 10,
    targetSets: 3,
    targetAngle: defaultTargetAngle(body.data.initialExercise),
    frequency: "3 times per week",
  });
  await db.insert(userPatientAccessTable).values({
    userId: req.user!.id,
    patientId: patient.id,
    role: "clinician",
  });

  const inviteCode = await createInvitation(patient.id, "patient", req.user!.id);
  void publishRecoveryEvent({
    type: "patient.created",
    patientId: patient.id,
  });
  res.status(201).json(CreatePatientResponse.parse({
    patient: serializePatient(patient),
    inviteCode,
  }));
});

router.post("/patients/:patientId/invitations", async (req, res): Promise<void> => {
  const params = CreateAccessInvitationParams.safeParse(req.params);
  const body = CreateAccessInvitationBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: !params.success ? params.error.message : body.error?.message });
    return;
  }
  if (!await authorizePatient(req, res, params.data.patientId, ["clinician"])) return;
  const code = await createInvitation(params.data.patientId, body.data.role, req.user!.id);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  res.status(201).json(CreateAccessInvitationResponse.parse({
    code,
    patientId: params.data.patientId,
    role: body.data.role,
    expiresAt: expiresAt.toISOString(),
  }));
});

router.get("/patients/:patientId", async (req, res): Promise<void> => {
  const params = GetPatientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!await authorizePatient(req, res, params.data.patientId)) return;
  const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, params.data.patientId));
  if (!patient) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }
  res.json(GetPatientResponse.parse(serializePatient(patient)));
});

router.get("/patients/:patientId/trend", async (req, res): Promise<void> => {
  const params = GetPatientTrendParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!await authorizePatient(req, res, params.data.patientId)) return;
  const sessions = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.patientId, params.data.patientId))
    .orderBy(sessionsTable.timestamp);
  const latest = sessions.at(-1);
  const earliest = sessions[0];
  const delta = latest && earliest ? latest.movementScore - earliest.movementScore : 0;
  const summary = sessions.length
    ? `Movement quality has ${delta >= 0 ? "improved" : "softened"} by ${Math.abs(delta).toFixed(1)} points across ${sessions.length} recorded sessions. ${latest && latest.painScore <= 3 ? "Pain was within the proceed range; continue only within a pain-free range." : "Pain was above the proceed range; pause progression and review with the clinician."}`
    : "No sessions have been recorded yet.";
  res.json(
    GetPatientTrendResponse.parse({
      patientId: params.data.patientId,
      points: sessions.map((session) => ({
        date: session.timestamp.toISOString(),
        movementScore: session.movementScore,
        averageAngle: session.averageAngle,
        painScore: session.painScore,
        adherence: session.adherence,
      })),
      summary,
    }),
  );
});

router.get("/sessions", async (req, res): Promise<void> => {
  const query = ListSessionsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const access = await getPatientAccess(req.user!.id);
  const patientIds = [...new Set(access.filter((item) => item.role !== "coach").map((item) => item.patientId))];
  if (query.data.patientId && !patientIds.includes(query.data.patientId)) {
    res.status(403).json({ error: "You do not have access to this patient" });
    return;
  }
  const requestedIds = query.data.patientId ? [query.data.patientId] : patientIds;
  const sessions = requestedIds.length
    ? await db.select().from(sessionsTable).where(inArray(sessionsTable.patientId, requestedIds)).orderBy(desc(sessionsTable.timestamp))
    : [];
  res.json(ListSessionsResponse.parse(sessions.map(serializeSession)));
});

router.post("/sessions", async (req, res): Promise<void> => {
  const body = CreateSessionBody.safeParse(req.body);
  if (!body.success) {
    req.log.warn({ errors: body.error.message }, "Invalid session");
    res.status(400).json({ error: body.error.message });
    return;
  }
  if (!await authorizePatient(req, res, body.data.patientId, ["patient", "caregiver"])) return;
  if (body.data.protocolMode === "patient" && !CLINICALLY_APPROVED_EXERCISES.has(body.data.exercise)) {
    res.status(403).json({
      error: "This exercise protocol is not clinically approved for patient use. Use restricted pilot-demo mode for supervised validation only.",
    });
    return;
  }
  const painScore = Math.round(body.data.painScore);
  if (!Number.isInteger(body.data.painScore) || painScore < 0 || painScore > 10) {
    res.status(400).json({ error: "painScore must be a whole number from 0 to 10" });
    return;
  }
  const { protocolMode: _protocolMode, ...sessionInput } = body.data;
  const previous = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.patientId, body.data.patientId))
    .orderBy(desc(sessionsTable.timestamp))
    .limit(3);
  const [session] = await db
    .insert(sessionsTable)
    .values({
      ...sessionInput,
      id: randomUUID(),
      totalReps: Math.round(body.data.totalReps),
      correctReps: Math.round(body.data.correctReps),
      painScore,
      adherence: 100,
      recommendation: safetyRecommendation(painScore, body.data.recommendation),
    })
    .returning();
  if (!session) {
    throw new Error("Session insert returned no row");
  }
  const baselineScore = average(previous.map((item) => item.movementScore));
  const baselinePain = average(previous.map((item) => item.painScore));
  const regression = previous.length > 0 && baselineScore - session.movementScore > 8;
  const painIncrease = previous.length > 0 && session.painScore - baselinePain >= 2;
  const painStopRule = session.painScore >= 6;
  let alert: typeof alertsTable.$inferSelect | undefined;
  if (regression || painIncrease || painStopRule) {
    [alert] = await db.insert(alertsTable).values({
      id: randomUUID(),
      patientId: session.patientId,
      type: regression ? "ROM regression" : painStopRule ? "pain stop rule" : "pain increase",
      message: regression
        ? `Movement score dropped ${Math.round(baselineScore - session.movementScore)} points below the recent baseline.`
        : painStopRule
          ? `Session safety rule triggered at ${session.painScore}/10 pain. Pause exercise and contact the clinician.`
          : `Pain increased to ${session.painScore}/10 compared with the recent baseline.`,
    }).returning();
  }
  const [patient] = await db
    .update(patientsTable)
    .set({
      recoveryScore: session.movementScore,
      adherence: 100,
      hasAlert: regression || painIncrease || painStopRule,
      lastSession: session.timestamp,
    })
    .where(eq(patientsTable.id, session.patientId))
    .returning();
  void publishRecoveryEvent({
    type: "session.created",
    patientId: session.patientId,
  });
  if (alert) {
    void publishRecoveryEvent({
      type: "alert.created",
      patientId: alert.patientId,
    });
  }
  if (patient) {
    void publishRecoveryEvent({
      type: "patient.updated",
      patientId: patient.id,
    });
  }
  res.status(201).json(CreateSessionResponse.parse(serializeSession(session)));
});

router.get("/programs", async (req, res): Promise<void> => {
  const query = ListProgramsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  if (query.data.patientId && !await authorizePatient(req, res, query.data.patientId)) return;
  if (!query.data.patientId) {
    res.status(400).json({ error: "patientId is required" });
    return;
  }
  const programs = query.data.patientId
    ? await db.select().from(programsTable).where(eq(programsTable.patientId, query.data.patientId))
    : await db.select().from(programsTable);
  res.json(ListProgramsResponse.parse(programs));
});

router.post("/programs", async (req, res): Promise<void> => {
  const body = CreateProgramBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  if (!await authorizePatient(req, res, body.data.patientId, ["clinician"])) return;
  const [program] = await db.insert(programsTable).values({
    ...body.data,
    id: randomUUID(),
    targetReps: Math.round(body.data.targetReps),
    targetSets: Math.round(body.data.targetSets),
  }).returning();
  res.status(201).json(CreateProgramResponse.parse(program));
});

router.patch("/programs/:programId", async (req, res): Promise<void> => {
  const params = UpdateProgramParams.safeParse(req.params);
  const body = UpdateProgramBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: !params.success ? params.error.message : body.error?.message });
    return;
  }
  if (!await authorizePatient(req, res, body.data.patientId, ["clinician"])) return;
  const [existingProgram] = await db.select().from(programsTable).where(eq(programsTable.id, params.data.programId));
  if (!existingProgram || existingProgram.patientId !== body.data.patientId) {
    res.status(404).json({ error: "Program not found" });
    return;
  }
  const [program] = await db
    .update(programsTable)
    .set({
      ...body.data,
      targetReps: Math.round(body.data.targetReps),
      targetSets: Math.round(body.data.targetSets),
    })
    .where(eq(programsTable.id, params.data.programId))
    .returning();
  if (!program) {
    res.status(404).json({ error: "Program not found" });
    return;
  }
  res.json(UpdateProgramResponse.parse(program));
});

router.get("/alerts", async (req, res): Promise<void> => {
  const access = await getPatientAccess(req.user!.id);
  const reviewerIds = access.filter((item) => item.role === "clinician").map((item) => item.patientId);
  const alerts = reviewerIds.length
    ? await db.select().from(alertsTable).where(and(inArray(alertsTable.patientId, reviewerIds), eq(alertsTable.resolved, false))).orderBy(desc(alertsTable.createdAt))
    : [];
  res.json(ListAlertsResponse.parse(alerts.map(serializeAlert)));
});

router.patch("/alerts/:alertId/review", async (req, res): Promise<void> => {
  const params = ReviewAlertParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [existingAlert] = await db.select().from(alertsTable).where(eq(alertsTable.id, params.data.alertId));
  if (!existingAlert) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }
  if (!await authorizePatient(req, res, existingAlert.patientId, ["clinician"])) return;
  const [alert] = await db.update(alertsTable).set({ resolved: true }).where(eq(alertsTable.id, params.data.alertId)).returning();
  if (!alert) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }
  const remaining = await db
    .select({ id: alertsTable.id })
    .from(alertsTable)
    .where(and(eq(alertsTable.patientId, alert.patientId), eq(alertsTable.resolved, false)))
    .limit(1);
  if (remaining.length === 0) {
    await db.update(patientsTable).set({ hasAlert: false }).where(eq(patientsTable.id, alert.patientId));
  }
  const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, alert.patientId));
  void publishRecoveryEvent({
    type: "alert.reviewed",
    patientId: alert.patientId,
  });
  if (patient) {
    void publishRecoveryEvent({
      type: "patient.updated",
      patientId: patient.id,
    });
  }
  res.json(ReviewAlertResponse.parse(serializeAlert(alert)));
});

router.get("/sports/screenings", async (req, res): Promise<void> => {
  const access = await getPatientAccess(req.user!.id);
  const coachIds = access.filter((item) => item.role === "coach").map((item) => item.patientId);
  if (coachIds.length === 0) {
    res.status(403).json({ error: "Coach access required" });
    return;
  }
  if (req.user!.id === "recoverlens-demo") {
    const demoPatients = await db.select({ id: patientsTable.id }).from(patientsTable).orderBy(patientsTable.name).limit(4);
    const primaryPatientId = demoPatients[0]?.id ?? "patient-1";
    const demoScreenings = [
      {
        id: "demo-screening-football",
        patientId: demoPatients[0]?.id ?? primaryPatientId,
        athlete: "Tariro Moyo",
        sport: "football",
        score: 88,
        status: "CLEAR",
        finding: "Balanced landing with good knee-over-toe control.",
        recommendation: "Continue FIFA 11+ strength and landing preparation twice weekly.",
        timestamp: new Date("2026-08-29T10:00:00Z"),
      },
      {
        id: "demo-screening-basketball",
        patientId: demoPatients[1]?.id ?? primaryPatientId,
        athlete: "Jordan Lee",
        sport: "basketball",
        score: 76,
        status: "REVIEW",
        finding: "Mild left-right asymmetry during repeated jump landings.",
        recommendation: "Add lateral hip strength and controlled landing drills.",
        timestamp: new Date("2026-08-30T11:15:00Z"),
      },
      {
        id: "demo-screening-running",
        patientId: demoPatients[2]?.id ?? primaryPatientId,
        athlete: "Amara Ndlovu",
        sport: "running",
        score: 91,
        status: "CLEAR",
        finding: "Stable single-leg control with level hips.",
        recommendation: "Maintain single-leg balance and hip stability work.",
        timestamp: new Date("2026-08-31T09:30:00Z"),
      },
      {
        id: "demo-screening-general",
        patientId: demoPatients[3]?.id ?? primaryPatientId,
        athlete: "Noah Williams",
        sport: "general",
        score: 82,
        status: "CLEAR",
        finding: "Good squat depth with a small forward torso shift.",
        recommendation: "Continue controlled squats and ankle mobility work.",
        timestamp: new Date("2026-09-01T15:20:00Z"),
      },
    ];
    await db.insert(screeningsTable).values(demoScreenings).onConflictDoNothing();
  }
  const screenings = await db.select().from(screeningsTable).where(inArray(screeningsTable.patientId, coachIds)).orderBy(desc(screeningsTable.timestamp));
  res.json(ListScreeningsResponse.parse(screenings.map(serializeScreening)));
});

router.post("/sports/screenings", async (req, res): Promise<void> => {
  const body = CreateScreeningBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  if (!body.data.patientId || !await authorizePatient(req, res, body.data.patientId, ["coach"])) return;
  const [screening] = await db.insert(screeningsTable).values({
    ...body.data,
    patientId: body.data.patientId ?? null,
    id: randomUUID(),
  }).returning();
  if (body.data.patientId) {
    const [patient] = await db
      .update(patientsTable)
      .set({ sport: body.data.sport })
      .where(eq(patientsTable.id, body.data.patientId))
      .returning();
    if (patient) {
      void publishRecoveryEvent({
        type: "patient.updated",
        patientId: patient.id,
      });
    }
  }
  void publishRecoveryEvent({
    type: "screening.created",
    patientId: body.data.patientId,
  });
  res.status(201).json(CreateScreeningResponse.parse(serializeScreening(screening)));
});

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function serializePatient(patient: typeof patientsTable.$inferSelect) {
  return { ...patient, lastSession: patient.lastSession?.toISOString() ?? null };
}

function serializeSession(session: typeof sessionsTable.$inferSelect) {
  return { ...session, timestamp: session.timestamp.toISOString() };
}

function serializeAlert(alert: typeof alertsTable.$inferSelect) {
  return { ...alert, createdAt: alert.createdAt.toISOString() };
}

function serializeScreening(screening: typeof screeningsTable.$inferSelect) {
  return { ...screening, timestamp: screening.timestamp.toISOString() };
}

function defaultTargetAngle(exercise: string): number {
  const targets: Record<string, number> = {
    "Shoulder Abduction": 90,
    "Shoulder Flexion": 160,
    "Shoulder External Rotation": 90,
    "Shoulder Internal Rotation": 70,
    "Quadriceps Set": 0,
    "Straight Leg Raise": 45,
    "Knee Flexion (Heel Slide)": 120,
    "Mini Squat / Wall Sit": 45,
    "Standing Single-Leg Balance": 15,
    "Step-Up": 90,
    "Pendulum Swing": 30,
  };
  return targets[exercise] ?? 90;
}

function safetyRecommendation(painScore: number, recommendation: string): string {
  if (painScore >= 6) {
    return "Stop the session and contact the clinician before resuming.";
  }
  if (painScore >= 4) {
    return "Pause progression and review pain with the clinician before the next session.";
  }
  return recommendation;
}

async function createInvitation(
  patientId: string,
  role: "patient" | "caregiver" | "coach",
  createdByUserId: string,
): Promise<string> {
  const code = `RL-${randomBytes(6).toString("hex").toUpperCase()}`;
  await db.insert(accessInvitationsTable).values({
    id: randomUUID(),
    codeHash: createHash("sha256").update(code).digest("hex"),
    patientId,
    role,
    createdByUserId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  return code;
}

export default router;