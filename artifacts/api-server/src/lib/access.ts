import { and, eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { db, patientsTable, userPatientAccessTable, userRolesTable } from "@workspace/db";
import { DEMO_USER_ID } from "../middlewares/authMiddleware";

export type RecoverLensRole = "patient" | "caregiver" | "clinician" | "coach";

export interface PatientAccess {
  patientId: string;
  role: RecoverLensRole;
}

export async function getPatientAccess(userId: string): Promise<PatientAccess[]> {
  if (userId === DEMO_USER_ID) {
    const patients = await db.select({ patientId: patientsTable.id }).from(patientsTable);
    const roles: RecoverLensRole[] = ["patient", "caregiver", "clinician", "coach"];
    return patients.flatMap(({ patientId }) => roles.map((role) => ({ patientId, role })));
  }
  const rows = await db
    .select({
      patientId: userPatientAccessTable.patientId,
      role: userPatientAccessTable.role,
    })
    .from(userPatientAccessTable)
    .where(and(eq(userPatientAccessTable.userId, userId), eq(userPatientAccessTable.active, true)));

  return rows.filter(
    (row): row is PatientAccess =>
      row.role === "patient" ||
      row.role === "caregiver" ||
      row.role === "clinician" ||
      row.role === "coach",
  );
}

export async function getUserRoles(userId: string): Promise<RecoverLensRole[]> {
  if (userId === DEMO_USER_ID) return ["patient", "caregiver", "clinician", "coach"];
  const rows = await db.select({ role: userRolesTable.role }).from(userRolesTable).where(eq(userRolesTable.userId, userId));
  return rows.map((row) => row.role).filter(
    (role): role is RecoverLensRole =>
      role === "patient" || role === "caregiver" || role === "clinician" || role === "coach",
  );
}

export function requireAuthentication(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

export async function authorizePatient(
  req: Request,
  res: Response,
  patientId: string,
  allowedRoles?: RecoverLensRole[],
): Promise<PatientAccess | null> {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  if (req.user.id === DEMO_USER_ID) {
    return { patientId, role: allowedRoles?.[0] ?? "patient" };
  }
  const permittedRoles = allowedRoles ?? ["patient", "caregiver", "clinician"];
  const access = (await getPatientAccess(req.user.id)).find(
    (item) => item.patientId === patientId && permittedRoles.includes(item.role),
  );
  if (!access) {
    res.status(403).json({ error: "You do not have access to this patient" });
    return null;
  }
  return access;
}