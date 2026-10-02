import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { useLocation } from "wouter";

type AppRole = "patient" | "caregiver" | "clinician" | "coach";
type DemoUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role?: AppRole | null;
  roles?: AppRole[];
  patientIds?: string[];
  patientAccess?: Array<{ patientId: string; role: AppRole }>;
};

interface AuthContextValue {
  user: DemoUser;
  roles: AppRole[];
  patientIds: string[];
  selectedPatientId: string | null;
  setSelectedPatientId: (patientId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const DEMO_USER: DemoUser = {
  id: "recoverlens-demo",
  email: "demo@recoverlens.local",
  firstName: "Demo",
  lastName: "User",
  profileImageUrl: null,
  role: "patient",
  roles: ["patient", "caregiver", "clinician", "coach"],
  patientIds: ["patient-1"],
  patientAccess: [
    { patientId: "patient-1", role: "patient" },
    { patientId: "patient-1", role: "caregiver" },
    { patientId: "patient-1", role: "clinician" },
    { patientId: "patient-1", role: "coach" },
  ],
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const availablePatientIds = DEMO_USER.patientIds ?? [];
  const [selectedPatientId, setSelectedPatientIdState] = useState<string | null>(() => localStorage.getItem("recoverlens-patient") ?? "patient-1");

  const setSelectedPatientId = (patientId: string) => {
    if (!availablePatientIds.includes(patientId)) return;
    localStorage.setItem("recoverlens-patient", patientId);
    setSelectedPatientIdState(patientId);
  };

  return (
    <AuthContext.Provider value={{
      user: DEMO_USER,
      roles: (DEMO_USER.roles ?? []).filter((role): role is AppRole => role !== null),
      patientIds: availablePatientIds,
      selectedPatientId,
      setSelectedPatientId,
      logout: () => {},
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useRecoverLensAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useRecoverLensAuth must be used within AuthProvider");
  return value;
}

export function RoleRoute({ roles, children }: { roles: AppRole[]; children: ReactNode }) {
  const { roles: userRoles } = useRecoverLensAuth();
  const [, setLocation] = useLocation();
  const allowed = roles.some((role) => userRoles.includes(role));

  useEffect(() => {
    if (!allowed) setLocation("/");
  }, [allowed, setLocation]);

  return allowed ? <>{children}</> : null;
}