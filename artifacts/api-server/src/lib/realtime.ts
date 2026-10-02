import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { getPatientAccess, type RecoverLensRole } from "./access";
import { isRealtimeSessionActive } from "./auth";

export type RecoveryEventType =
  | "patient.created"
  | "patient.updated"
  | "session.created"
  | "screening.created"
  | "alert.created"
  | "alert.reviewed";

export interface RecoveryEvent {
  id: string;
  type: RecoveryEventType;
  patientId: string;
  occurredAt: string;
}

interface Subscriber {
  userId: string;
  sessionId: string;
  response: Response;
  heartbeat: NodeJS.Timeout | null;
  closed: boolean;
}

const subscribers = new Set<Subscriber>();
const HEARTBEAT_INTERVAL_MS = 20_000;

export async function openRecoveryEventStream(
  req: Request,
  res: Response,
  userId: string,
  sessionId: string,
): Promise<void> {
  res.status(200).set({
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Content-Type": "text/event-stream",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  const subscriber: Subscriber = {
    userId,
    sessionId,
    response: res,
    heartbeat: null,
    closed: false,
  };

  const cleanup = () => {
    if (subscriber.closed) return;
    subscriber.closed = true;
    if (subscriber.heartbeat) clearInterval(subscriber.heartbeat);
    subscribers.delete(subscriber);
  };
  req.once("close", cleanup);

  subscriber.heartbeat = setInterval(() => {
    void (async () => {
      try {
        const active = await isRealtimeSessionActive(sessionId, userId);
        if (!active) {
          cleanup();
          res.end();
          return;
        }
        if (!subscriber.closed && !res.writableEnded) {
          res.write(": keep-alive\n\n");
        }
      } catch {
        cleanup();
        res.end();
      }
    })();
  }, HEARTBEAT_INTERVAL_MS);
  subscribers.add(subscriber);

  res.write("event: ready\ndata: {}\n\n");
}

export async function publishRecoveryEvent(
  input: Omit<RecoveryEvent, "id" | "occurredAt">,
): Promise<void> {
  const event: RecoveryEvent = {
    ...input,
    id: randomUUID(),
    occurredAt: new Date().toISOString(),
  };

  await Promise.all(
    [...subscribers].map(async (subscriber) => {
      if (subscriber.closed || subscriber.response.writableEnded) return;

      try {
        const active = await isRealtimeSessionActive(
          subscriber.sessionId,
          subscriber.userId,
        );
        if (!active) {
          subscriber.response.end();
          return;
        }
        const access = await getPatientAccess(subscriber.userId);
        const authorized = access.some(
          (item) =>
            item.patientId === event.patientId &&
            canReceiveEvent(item.role, event.type),
        );
        if (!authorized) return;

        subscriber.response.write(
          `id: ${event.id}\nevent: recovery\ndata: ${JSON.stringify(event)}\n\n`,
        );
      } catch {
        // A failed access lookup must not broadcast an event to an unknown audience.
      }
    }),
  );
}

function canReceiveEvent(
  role: RecoverLensRole,
  eventType: RecoveryEventType,
): boolean {
  if (eventType === "screening.created") return role === "coach";
  if (eventType === "alert.created" || eventType === "alert.reviewed") {
    return role === "clinician";
  }
  return role === "patient" || role === "caregiver" || role === "clinician";
}