import { describe, expect, it } from "vitest";
import { createExportPayload, serializeExport } from "./export";
import { areaIds } from "./models";
import { buildAreaProgress, calculateGeneralDiagnostic } from "./scoring";
import type { AreaResponse, DiagnosticBundle } from "./models";

const at = "2026-07-13T12:00:00.000Z";

describe("exportación JSON", () => {
  it("incluye estructura v2, estados, scoring, desempate y respaldo manual", () => {
    const responses: AreaResponse[] = [
      { id: "s:q6", sessionId: "s", areaId: "inventario", questionId: "q6_inventoryAccuracy", mode: "normal", value: "diferencias_frecuentes", updatedAt: at },
      { id: "s:q7", sessionId: "s", areaId: "inventario", questionId: "q7_inventoryIncidents", mode: "unknown", value: null, updatedAt: at }
    ];
    const bundle: DiagnosticBundle = {
      session: { id: "s", schemaVersion: 2, status: "in_progress", consultant: "Consultor ficticio", createdAt: at, updatedAt: at, completedAt: null, lastScreen: "results", lastAreaId: "inventario" },
      profile: { sessionId: "s", name: "Negocio ficticio", sector: "comercio", interviewee: "Persona ficticia", intervieweeRole: "Encargado", employees: 4, branches: 1, mainConcernCategory: "inventario", currentTools: "Libreta ficticia", diagnosticDate: "2026-07-13" },
      responses,
      observations: [{ id: "s:q6", sessionId: "s", questionId: "q6_inventoryAccuracy", consultantNote: "Nota ficticia", evidenceDescription: "Evidencia ficticia", possibleCause: "Causa por validar", contradiction: "Dato contradictorio", isHypothesis: true, confidence: "low", updatedAt: at }],
      areaProgress: areaIds.map((areaId) => buildAreaProgress("s", areaId, responses, at))
    };
    const result = calculateGeneralDiagnostic(bundle.profile, responses);
    const payload = createExportPayload(bundle, result, at);
    expect(payload.schemaVersion).toBe(2);
    expect(payload.result.label).toBe("Resultado parcial");
    expect(payload.areaStatuses).toHaveLength(6);
    expect(payload.pendingInformation).toHaveLength(1);
    expect(payload.evidence[0].description).toBe("Evidencia ficticia");
    expect(payload.possibleCauses[0].isHypothesis).toBe(true);
    expect(payload.calculatedScores.inventario.score).toBe(3);
    expect(JSON.parse(serializeExport(payload))).toEqual(payload);
    expect(createExportPayload(bundle, result, at)).toEqual(payload);
  });
});
