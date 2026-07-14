import Dexie, { type EntityTable } from "dexie";
import { areaIds } from "./models";
import { buildAreaProgress } from "./scoring";
import type {
  AreaProgress,
  AreaResponse,
  BusinessProfile,
  DiagnosticBundle,
  DiagnosticSession,
  InternalObservation
} from "./models";

const versionOneStores = {
  sessions: "&id,status,updatedAt,createdAt",
  businessProfiles: "&sessionId,sector,mainConcernCategory",
  areaResponses: "&id,sessionId,questionId,[sessionId+questionId],updatedAt",
  internalObservations: "&id,sessionId,questionId,[sessionId+questionId],updatedAt"
};

export class DiagnosticDatabase extends Dexie {
  sessions!: EntityTable<DiagnosticSession, "id">;
  businessProfiles!: EntityTable<BusinessProfile, "sessionId">;
  areaResponses!: EntityTable<AreaResponse, "id">;
  internalObservations!: EntityTable<InternalObservation, "id">;
  areaProgress!: EntityTable<AreaProgress, "id">;

  constructor(name = "proyecto-b-diagnostico-campo-v1") {
    super(name);
    this.version(1).stores(versionOneStores);
    this.version(2).stores({
      ...versionOneStores,
      areaProgress: "&id,sessionId,areaId,[sessionId+areaId],status,updatedAt"
    }).upgrade(async (transaction) => {
      const sessions = await transaction.table<DiagnosticSession>("sessions").toArray();
      const responses = await transaction.table<AreaResponse>("areaResponses").toArray();
      const progressTable = transaction.table<AreaProgress>("areaProgress");
      const sessionTable = transaction.table<DiagnosticSession>("sessions");

      for (const session of sessions) {
        const sessionResponses = responses.filter((response) => response.sessionId === session.id);
        const progress = areaIds.map((areaId) => buildAreaProgress(session.id, areaId, sessionResponses, session.updatedAt));
        await progressTable.bulkPut(progress);
        await sessionTable.update(session.id, {
          schemaVersion: 2,
          status: "in_progress",
          lastScreen: "areas",
          lastAreaId: "inventario"
        });
      }
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
    database.areaProgress,
    async () => {
      await database.sessions.put(bundle.session);
      await database.businessProfiles.put(bundle.profile);
      if (bundle.responses.length) await database.areaResponses.bulkPut(bundle.responses);
      if (bundle.observations.length) await database.internalObservations.bulkPut(bundle.observations);
      if (bundle.areaProgress.length) await database.areaProgress.bulkPut(bundle.areaProgress);
    }
  );
}

export async function loadDiagnosticBundle(database: DiagnosticDatabase, sessionId: string): Promise<DiagnosticBundle | null> {
  const [session, profile, responses, observations, areaProgress] = await Promise.all([
    database.sessions.get(sessionId),
    database.businessProfiles.get(sessionId),
    database.areaResponses.where("sessionId").equals(sessionId).toArray(),
    database.internalObservations.where("sessionId").equals(sessionId).toArray(),
    database.areaProgress.where("sessionId").equals(sessionId).toArray()
  ]);
  if (!session || !profile) return null;
  areaProgress.sort((left, right) => areaIds.indexOf(left.areaId) - areaIds.indexOf(right.areaId));
  return { session, profile, responses, observations, areaProgress };
}

export async function listSessions(database: DiagnosticDatabase): Promise<DiagnosticSession[]> {
  return database.sessions.orderBy("updatedAt").reverse().toArray();
}

export { versionOneStores };
