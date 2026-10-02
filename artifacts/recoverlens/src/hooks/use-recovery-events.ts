import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetPatientQueryKey,
  getGetPatientTrendQueryKey,
  getListAlertsQueryKey,
  getListPatientsQueryKey,
  getListScreeningsQueryKey,
  getListSessionsQueryKey,
} from "@workspace/api-client-react";

export type RecoveryConnectionStatus = "connecting" | "connected" | "polling";

interface RecoveryEvent {
  type: string;
  patientId: string;
}

const RECOVERY_EVENT_TYPES = new Set([
  "patient.created",
  "patient.updated",
  "session.created",
  "screening.created",
  "alert.created",
  "alert.reviewed",
]);

function invalidateRecoveryQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  event?: RecoveryEvent,
) {
  void queryClient.invalidateQueries({ queryKey: getListPatientsQueryKey() });
  void queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
  void queryClient.invalidateQueries({ queryKey: getListScreeningsQueryKey() });
  void queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });

  if (event?.patientId) {
    void queryClient.invalidateQueries({ queryKey: getGetPatientQueryKey(event.patientId) });
    void queryClient.invalidateQueries({ queryKey: getGetPatientTrendQueryKey(event.patientId) });
    void queryClient.invalidateQueries({
      queryKey: getListSessionsQueryKey({ patientId: event.patientId }),
    });
  }
}

export function useRecoveryEvents(): { status: RecoveryConnectionStatus } {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<RecoveryConnectionStatus>("connecting");

  useEffect(() => {
    const eventSource = new EventSource("/api/events");
    let active = true;

    eventSource.onopen = () => {
      if (!active) return;
      setStatus("connected");
      // Rehydrate after any events missed while reconnecting.
      invalidateRecoveryQueries(queryClient);
    };

    eventSource.onerror = () => {
      if (!active) return;
      setStatus("polling");
      // EventSource retries automatically; query invalidation is the safe fallback.
      invalidateRecoveryQueries(queryClient);
    };

    const handleRecoveryEvent = (message: MessageEvent<string>) => {
      if (!active) return;
      try {
        const event = JSON.parse(message.data) as RecoveryEvent;
        if (RECOVERY_EVENT_TYPES.has(event.type)) {
          invalidateRecoveryQueries(queryClient, event);
        }
      } catch {
        // Ignore malformed events; the next reconnect/error will rehydrate by query.
      }
    };

    eventSource.addEventListener("recovery", handleRecoveryEvent);

    return () => {
      active = false;
      eventSource.removeEventListener("recovery", handleRecoveryEvent);
      eventSource.close();
    };
  }, [queryClient]);

  return { status };
}