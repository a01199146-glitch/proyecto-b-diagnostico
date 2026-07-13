import Dexie, { type EntityTable } from "dexie";
import type {
  AreaResponse,
  BusinessProfile,
  DiagnosticBundle,
  DiagnosticSession,
  InternalObservation
} from "./models";

export class DiagnosticDatabase extends Dexie {
  sessions!: EntityTable<DiagnosticSession, "id">;
  businessProfiles!: EntityTable<BusinessProfile, "sessionId">;
  areaResponses!: EntityTable<AreaResponse, "id">;
  internalObservations!: EntityTable<InternalObservation, "id">;

  constructor(name = "proyecto-b-diagnostico-campo-v1") {
    super(name);
    this.version(1).stores({
      sessions: "&id,status,updatedAt,createdAt",
      businessProfiles: "&sessionId,sector,mainConcernCategory",
      areaResponses: "&id,sessionId,questionId,[sessionId+questionId],updatedAt",
      internalObservations: "&id,sessionId,questionId,[sessionId+questionId],updatedAt"
    });
  }
}

export const db = new DiagnosticDatabase();

export async function saveDiagnosticBundle(database: DiagnosticDatabase, bundle: DiagnosticBundle): Promise<void> {
  await database.transaction(
    "rw",
    database.sessions,
    database.businessProfiles,
    database.areaResponses,
    database.internalObservations,
    async () => {
      await database.sessions.put(bundle.session);
      await database.businessProfiles.put(bundle.profile);
      if (bundle.responses.length) await database.areaResponses.bulkPut(bundle.responses);
      if (bundle.observations.length) await database.internalObservations.bulkPut(bundle.observations);
    }
  );
}

export async function loadDiagnosticBundle(database: DiagnosticDatabase, sessionId: string): Promise<DiagnosticBundle | null> {
  const [session, profile, responses, observations] = await Promise.all([
    database.sessions.get(sessionId),
    database.businessProfiles.get(sessionId),
    database.areaResponses.where("sessionId").equals(sessionId).toArray(),
    database.internalObservations.where("sessionId").equals(sessionId).toArray()
  ]);
  if (!session || !profile) return null;
  return { session, profile, responses, observations };
}

export async function listSessions(database: DiagnosticDatabase): Promise<DiagnosticSession[]> {
  return database.sessions.orderBy("updatedAt").reverse().toArray();
}
