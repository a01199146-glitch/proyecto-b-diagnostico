import { describe, expect, it } from "vitest";
import { calculateInventoryScore } from "./scoring";
import type { AreaResponse, BusinessProfile } from "./models";

const profile = { mainConcernCategory: "inventario" } as BusinessProfile;
const response = (questionId: string, mode: AreaResponse["mode"], value: string | null): AreaResponse => ({
  id: `test:${questionId}`,
  sessionId: "test",
  areaId: "inventario",
  questionId,
  mode,
  value,
  updatedAt: "2026-07-12T00:00:00.000Z"
});

describe("scoring de Inventario", () => {
  it("conserva el caso validado de Inventario en 6/7", () => {
    const result = calculateInventoryScore(profile, [
      response("q6_inventoryAccuracy", "normal", "diferencias_frecuentes"),
      response("q7_inventoryIncidents", "normal", "muy_frecuente")
    ]);
    expect(result.score).toBe(6);
    expect(result.priority).toBe("high");
  });

  it("no aplica no suma ni resta puntos", () => {
    const baseline = calculateInventoryScore(profile, []);
    const withNotApplicable = calculateInventoryScore(profile, [
      response("q6_inventoryAccuracy", "not_applicable", null)
    ]);
    expect(withNotApplicable.score).toBe(baseline.score);
    expect(withNotApplicable.notApplicableCount).toBe(1);
  });

  it("no se conoce queda como información pendiente", () => {
    const result = calculateInventoryScore(profile, [
      response("q6_inventoryAccuracy", "unknown", null),
      response("q7_inventoryIncidents", "normal", "semanal")
    ]);
    expect(result.unknownCount).toBe(1);
    expect(result.explanation.join(" ")).toContain("información pendiente");
  });

  it("produce exactamente el mismo resultado con las mismas entradas", () => {
    const inputs = [
      response("q6_inventoryAccuracy", "normal", "sin_control"),
      response("q7_inventoryIncidents", "normal", "mensual")
    ];
    expect(calculateInventoryScore(profile, inputs)).toEqual(calculateInventoryScore(profile, inputs));
  });
});
