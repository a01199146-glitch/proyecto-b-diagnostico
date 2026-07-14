import { describe, expect, it } from "vitest";
import { areaMap, areas, operationalQuestions } from "./inventoryQuestions";
import { calculateAreaScore, calculateGeneralDiagnostic, calculateInventoryScore, deriveAreaStatus } from "./scoring";
import type { AreaId, AreaResponse, BusinessProfile } from "./models";

const at = "2026-07-13T00:00:00.000Z";
const profile = (mainConcernCategory: AreaId | "" = ""): Pick<BusinessProfile, "mainConcernCategory"> => ({ mainConcernCategory });
const response = (areaId: AreaId, questionId: string, mode: AreaResponse["mode"], value: string | null): AreaResponse => ({
  id: `test:${questionId}`,
  sessionId: "test",
  areaId,
  questionId,
  mode,
  value,
  updatedAt: at
});
const normal = (areaId: AreaId, questionId: string, value: string) => response(areaId, questionId, "normal", value);

const cases = {
  A: {
    concern: "inventario" as AreaId,
    expected: { main: "inventario", priority: "high", scores: [1, 6, 2, 2, 2, 1] },
    values: ["centralizado", "manual", "diferencias_frecuentes", "muy_frecuente", "parciales", "mensual", "irregulares", "parcial", "mensual", "parcial", "lista_simple", "casi_nunca"]
  },
  B: {
    concern: "costos" as AreaId,
    expected: { main: "costos", priority: "medium", scores: [2, 0, 4, 4, 2, 4] },
    values: ["incompleto", "manual", "confiable", "casi_nunca", "verbales", "semanal", "estimados", "parcial", "mensual", "parcial", "disperso", "semanal"]
  },
  C: {
    concern: "clientes" as AreaId,
    expected: { main: "clientes", priority: "high", scores: [3, 2, 2, 2, 4, 7] },
    values: ["incompleto", "aproximado", "diferencias_menores", "mensual", "parciales", "mensual", "irregulares", "parcial", "semanal", "estimado", "sin_seguimiento", "muy_frecuente"]
  }
};

const responsesFor = (values: string[]) => operationalQuestions.map((question, index) => normal(question.areaId, question.id, values[index]));

describe("scoring de seis áreas", () => {
  it("conserva el caso validado de Inventario en 6/7", () => {
    const result = calculateInventoryScore(profile("inventario"), [
      normal("inventario", "q6_inventoryAccuracy", "diferencias_frecuentes"),
      normal("inventario", "q7_inventoryIncidents", "muy_frecuente")
    ]);
    expect(result.score).toBe(6);
    expect(result.priority).toBe("high");
  });

  it("respeta los límites 2/3 y 4/5", () => {
    const area = areaMap.ventas;
    const score2 = calculateAreaScore(profile(), [normal("ventas", area.questions[0].id, "disperso"), normal("ventas", area.questions[1].id, "claro")], "ventas");
    const score3 = calculateAreaScore(profile(), [normal("ventas", area.questions[0].id, "sin_registro"), normal("ventas", area.questions[1].id, "claro")], "ventas");
    const score4 = calculateAreaScore(profile(), [normal("ventas", area.questions[0].id, "disperso"), normal("ventas", area.questions[1].id, "aproximado")], "ventas");
    const score5 = calculateAreaScore(profile(), [normal("ventas", area.questions[0].id, "sin_registro"), normal("ventas", area.questions[1].id, "aproximado")], "ventas");
    expect([score2.priority, score3.priority, score4.priority, score5.priority]).toEqual(["low", "medium", "medium", "high"]);
  });

  it("distingue no aplica, no se conoce y pregunta ausente", () => {
    const notApplicable = [response("ventas", "q4_salesRecord", "not_applicable", null), response("ventas", "q5_salesVisibility", "not_applicable", null)];
    const unknown = [response("ventas", "q4_salesRecord", "unknown", null), normal("ventas", "q5_salesVisibility", "manual")];
    const missing = [normal("ventas", "q4_salesRecord", "centralizado")];
    expect(deriveAreaStatus("ventas", notApplicable)).toBe("not_applicable");
    expect(calculateAreaScore(profile("ventas"), notApplicable, "ventas").score).toBeNull();
    expect(deriveAreaStatus("ventas", unknown)).toBe("completed_with_pending_information");
    expect(calculateAreaScore(profile(), unknown, "ventas").unknownCount).toBe(1);
    expect(deriveAreaStatus("ventas", missing)).toBe("in_progress");
  });

  it("genera resultado parcial sin convertir áreas faltantes en cero", () => {
    const responses = [normal("inventario", "q6_inventoryAccuracy", "diferencias_frecuentes"), normal("inventario", "q7_inventoryIncidents", "muy_frecuente")];
    const result = calculateGeneralDiagnostic(profile("inventario"), responses);
    expect(result.kind).toBe("partial");
    expect(result.reviewedAreas).toEqual(["inventario"]);
    expect(result.missingAreas).toHaveLength(5);
    expect(result.mainScore).toBe(6);
    expect(result.scores.ventas.status).toBe("not_started");
  });

  it("genera resultado completo cuando las seis áreas están revisadas", () => {
    const result = calculateGeneralDiagnostic(profile(cases.A.concern), responsesFor(cases.A.values));
    expect(result.kind).toBe("complete");
    expect(result.reviewedAreas).toHaveLength(6);
    expect(result.missingAreas).toEqual([]);
  });

  it("aplica P3 como primera regla de desempate y conserva secundarios", () => {
    const result = calculateGeneralDiagnostic(profile(cases.B.concern), responsesFor(cases.B.values));
    expect(result.mainAreaId).toBe("costos");
    expect(result.tieBreakRule).toBe("main_concern");
    expect(result.secondaryProblems).toEqual(["procesos", "clientes"]);
  });

  it("aplica severidad 3 como segunda regla de desempate", () => {
    const responses = [
      normal("ventas", "q4_salesRecord", "sin_registro"), normal("ventas", "q5_salesVisibility", "claro"),
      normal("procesos", "q8_processDocumentation", "verbales"), normal("procesos", "q9_reworkFrequency", "mensual")
    ];
    const result = calculateGeneralDiagnostic(profile("clientes"), responses);
    expect(result.initiallyTiedAreas).toEqual(["ventas", "procesos"]);
    expect(result.mainAreaId).toBe("ventas");
    expect(result.tieBreakRule).toBe("severity_three");
  });

  it("aplica precedencia fija como tercera regla de desempate", () => {
    const responses = [
      normal("inventario", "q6_inventoryAccuracy", "diferencias_menores"), normal("inventario", "q7_inventoryIncidents", "mensual"),
      normal("costos", "q10_costUpdate", "irregulares"), normal("costos", "q11_marginKnowledge", "parcial")
    ];
    const result = calculateGeneralDiagnostic(profile("ventas"), responses);
    expect(result.initiallyTiedAreas).toEqual(["inventario", "costos"]);
    expect(result.mainAreaId).toBe("costos");
    expect(result.tieBreakRule).toBe("fixed_precedence");
  });

  it.each(Object.entries(cases))("reproduce el caso histórico %s", (_name, fixture) => {
    const result = calculateGeneralDiagnostic(profile(fixture.concern), responsesFor(fixture.values));
    expect(result.mainAreaId).toBe(fixture.expected.main);
    expect(result.mainPriority).toBe(fixture.expected.priority);
    expect(areas.map((area) => result.scores[area.id].score)).toEqual(fixture.expected.scores);
  });

  it("es determinista", () => {
    const responses = responsesFor(cases.C.values);
    expect(calculateGeneralDiagnostic(profile("clientes"), responses)).toEqual(calculateGeneralDiagnostic(profile("clientes"), responses));
  });
});
