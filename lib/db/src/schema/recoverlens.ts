import {
  boolean,
  integer,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const patientsTable = pgTable("recoverlens_patients", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  contact: text("contact").notNull().default("Not provided"),
  condition: text("condition").notNull(),
  assignedClinician: text("assigned_clinician").notNull(),
  sport: text("sport"),
  recoveryScore: real("recovery_score").notNull().default(0),
  adherence: real("adherence").notNull().default(0),
  hasAlert: boolean("has_alert").notNull().default(false),
  lastSession: timestamp("last_session", { withTimezone: true }),
});

export const sessionsTable = pgTable("recoverlens_sessions", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull(),
  exercise: text("exercise").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  totalReps: integer("total_reps").notNull(),
  correctReps: integer("correct_reps").notNull(),
  averageAngle: real("average_angle").notNull(),
  movementScore: real("movement_score").notNull(),
  torsoAlignment: real("torso_alignment").notNull(),
  symmetry: real("symmetry").notNull(),
  painScore: integer("pain_score").notNull(),
  adherence: real("adherence").notNull().default(100),
  mode: text("mode").notNull(),
  recommendation: text("recommendation").notNull(),
});

export const programsTable = pgTable("recoverlens_programs", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull(),
  exercise: text("exercise").notNull(),
  targetReps: integer("target_reps").notNull(),
  targetSets: integer("target_sets").notNull(),
  targetAngle: real("target_angle").notNull(),
  frequency: text("frequency").notNull(),
});

export const alertsTable = pgTable("recoverlens_alerts", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolved: boolean("resolved").notNull().default(false),
});

export const screeningsTable = pgTable("recoverlens_screenings", {
  id: text("id").primaryKey(),
  patientId: text("patient_id"),
  athlete: text("athlete").notNull(),
  sport: text("sport").notNull().default("general"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  score: real("score").notNull(),
  status: text("status").notNull(),
  finding: text("finding").notNull(),
  recommendation: text("recommendation").notNull(),
});