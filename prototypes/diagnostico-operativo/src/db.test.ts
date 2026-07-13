import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { DiagnosticDatabase, loadDiagnosticBundle, saveDiagnosticBundle } from "./db";
import type { DiagnosticBundle } from "./models";

const databases: DiagnosticDatabase[] = [];

afterEach(async () => {
  const openDatabases = databases.splice(0);
  openDatabases.forEach((database) => database.close());
  for (const name of new Set(openDatabases.map((database) => database.name))) {
    const cleanup = new DiagnosticDatabase(name);
    await cleanup.delete();
  }
});

describe("persistencia local Dexie", () => {
  it("recupera exactamente la ficha, respuesta y observación después de cerrar y reabrir", async () => {
    const name = `diagnostico-test-${Date.now()}`;
    const first = new DiagnosticDatabase(name);
    databases.push(first);
    const bundle: DiagnosticBundle = {
      session: { id: "session-1", schemaVersion: 1, areaId: "inventario", status: "in_progress", consultant: "Consultor ficticio", createdAt: "2026-07-12T00:00:00.000Z", updatedAt: "2026-07-12T00:00:00.000Z", completedAt: null },
      profile: { sessionId: "session-1", name: "Comercial Horizonte", sector: "comercio", interviewee: "Persona ficticia", intervieweeRole: "Encargado", employees: 8, branches: 1, mainConcernCategory: "inventario", currentTools: "Hoja de cálculo ficticia", diagnosticDate: "2026-07-12" },
      responses: [{ id: "session-1:q6_inventoryAccuracy", sessionId: "session-1", areaId: "inventario", questionId: "q6_inventoryAccuracy", mode: "normal", value: "diferencias_frecuentes", updatedAt: "2026-07-12T00:00:00.000Z" }],
      observations: [{ id: "session-1:q6_inventoryAccuracy", sessionId: "session-1", questionId: "q6_inventoryAccuracy", consultantNote: "Nota ficticia", evidenceDescription: "Conteo piloto ficticio", possibleCause: "Entradas sin registrar", isHypothesis: true, confidence: "medium", updatedAt: "2026-07-12T00:00:00.000Z" }]
    };

    await saveDiagnosticBundle(first, bundle);
    first.close();

    const reopened = new DiagnosticDatabase(name);
    databases.push(reopened);
    const recovered = await loadDiagnosticBundle(reopened, "session-1");

    expect(recovered).toEqual(bundle);
  });
});
