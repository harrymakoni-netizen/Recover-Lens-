import { boolean, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { patientsTable } from "./recoverlens";
import { usersTable } from "./auth";

export const userPatientAccessTable = pgTable(
  "recoverlens_user_patient_access",
  {
    userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    patientId: text("patient_id").notNull().references(() => patientsTable.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.patientId, table.role] }),
  ],
);

export const userRolesTable = pgTable(
  "recoverlens_user_roles",
  {
    userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.role] })],
);

export const accessInvitationsTable = pgTable("recoverlens_access_invitations", {
  id: text("id").primaryKey(),
  codeHash: text("code_hash").notNull().unique(),
  patientId: text("patient_id").notNull().references(() => patientsTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  createdByUserId: text("created_by_user_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedByUserId: text("used_by_user_id").references(() => usersTable.id),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

export type UserPatientAccess = typeof userPatientAccessTable.$inferSelect;