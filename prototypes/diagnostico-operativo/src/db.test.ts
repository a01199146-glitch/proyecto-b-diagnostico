import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { DiagnosticDatabase, loadDiagnosticBundle, saveDiagnosticBundle, versionOneStores } from "./db";
import { areaIds } from "./models";
import { buildAreaProgress } from "./scoring";
import type { DiagnosticBundle } from "./models";

const databaseNames: string[] = [];
const at = "2026-07-12T00:00:00.000Z";

afterEach(async () => {
  for (const name of databaseNames.splice(0)) await Dexie.delete(name);
});

const v2Bundle = (): DiagnosticBundle => {
  const session = { id: "session-1", schemaVersion: 2 as const, status: "in_progress" as const, consultant: "Consultor ficticio", createdAt: at, updatedAt: at, completedAt: null, lastScreen: "area" as const, lastAreaId: "inventario" as const };
  const profile = { sessionId: "session-1", name: "Comercial Horizonte", sector: "comercio", interviewee: "Persona ficticia", intervieweeRole: "Encargado", employees: 8, branches: 1, mainConcernCategory: "inventario" as const, currentTools: "Hoja de cálculo ficticia", diagnosticDate: "2026-07-12" };
  const responses = [{ id: "session-1:q6_inventoryAccuracy", sessionId: "session-1", areaId: "inventario" as const, questionId: "q6_inventoryAccuracy", mode: "normal" as const, value: "diferencias_frecuentes", updatedAt: at }];
  const observations = [{ id: "session-1:q6_inventoryAccuracy", sessionId: "session-1", questionId: "q6_inventoryAccuracy", consultantNote: "Nota ficticia", evidenceDescription: "Conteo piloto ficticio", possibleCause: "Entradas sin registrar", contradiction: "", isHypothesis: true, confidence: "medium" as const, updatedAt: at }];
  return { session, profile, responses, observations, areaProgress: areaIds.map((areaId) => buildAreaProgress(session.id, areaId, responses, at)) };
};

describe("persistencia local Dexie", () => {
  it("recupera la sesión de seis áreas exactamente después de cerrar y reabrir", async () => {
    const name = `diagnostico-v2-${Date.now()}`;
    databaseNames.push(name);
    const first = new DiagnosticDatabase(name);
    const bundle = v2Bundle();
    await saveDiagnosticBundle(first, bundle);
    first.close();

    const reopened = new DiagnosticDatabase(name);
    const recovered = await loadDiagnosticBundle(reopened, "session-1");
    reopened.close();
    expect(recovered).toEqual(bundle);
  });

  it("migra una base versión 1 sin perder ficha, respuestas ni observaciones", async () => {
    const name = `diagnostico-migration-${Date.now()}`;
    databaseNames.push(name);
    const legacy = new Dexie(name);
    legacy.version(1).stores(versionOneStores);
    await legacy.open();
    const bundle = v2Bundle();
    const legacySession = { ...bundle.session, schemaVersion: 1, areaId: "inventario", lastScreen: undefined, lastAreaId: undefined };
    await legacy.table("sessions").put(legacySession);
    await legacy.table("businessProfiles").put(bundle.profile);
    await legacy.table("areaResponses").bulkPut(bundle.responses);
    await legacy.table("internalObservations").bulkPut(bundle.observations);
    legacy.close();

    const migrated = new DiagnosticDatabase(name);
    const recovered = await loadDiagnosticBundle(migrated, "session-1");
    migrated.close();

    expect(recovered?.profile).toEqual(bundle.profile);
    expect(recovered?.responses).toEqual(bundle.responses);
    expect(recovered?.observations).toEqual(bundle.observations);
    expect(recovered?.session.schemaVersion).toBe(2);
    expect(recovered?.session.areaId).toBe("inventario");
    expect(recovered?.areaProgress).toHaveLength(6);
    expect(recovered?.areaProgress.find((item) => item.areaId === "inventario")?.status).toBe("in_progress");
    expect(recovered?.areaProgress.filter((item) => item.areaId !== "inventario").every((item) => item.status === "not_started")).toBe(true);
  });
});
