import { describe, expect, it } from "vitest";
import { areas, operationalQuestions } from "./inventoryQuestions";

describe("configuración tipada del diagnóstico", () => {
  it("contiene exactamente seis áreas y doce preguntas, dos por área", () => {
    expect(areas.map((area) => area.id)).toEqual(["ventas", "inventario", "procesos", "costos", "tiempos", "clientes"]);
    expect(operationalQuestions).toHaveLength(12);
    areas.forEach((area) => expect(area.questions).toHaveLength(2));
  });

  it("conserva identificadores, valores y puntos P4-P15", () => {
    expect(operationalQuestions.map((question) => [question.id, ...question.options.map((option) => `${option.value}:${option.score}`)])).toEqual([
      ["q4_salesRecord", "centralizado:0", "incompleto:1", "disperso:2", "sin_registro:3"],
      ["q5_salesVisibility", "claro:0", "manual:1", "aproximado:2", "desconocido:3"],
      ["q6_inventoryAccuracy", "confiable:0", "diferencias_menores:1", "diferencias_frecuentes:2", "sin_control:3"],
      ["q7_inventoryIncidents", "casi_nunca:0", "mensual:1", "semanal:2", "muy_frecuente:3"],
      ["q8_processDocumentation", "documentadas:0", "parciales:1", "verbales:2", "sin_estandar:3"],
      ["q9_reworkFrequency", "casi_nunca:0", "mensual:1", "semanal:2", "muy_frecuente:3"],
      ["q10_costUpdate", "actualizados:0", "irregulares:1", "estimados:2", "desconocidos:3"],
      ["q11_marginKnowledge", "conocido:0", "parcial:1", "estimado:2", "desconocido:3"],
      ["q12_delayFrequency", "casi_nunca:0", "mensual:1", "semanal:2", "muy_frecuente:3"],
      ["q13_cycleTimeMeasurement", "medido:0", "parcial:1", "estimado:2", "desconocido:3"],
      ["q14_customerFollowUp", "estructurado:0", "lista_simple:1", "disperso:2", "sin_seguimiento:3"],
      ["q15_lostOpportunities", "casi_nunca:0", "mensual:1", "semanal:2", "muy_frecuente:3"]
    ]);
  });

  it("mantiene opciones entre cero y tres", () => {
    operationalQuestions.forEach((question) => expect(question.options.map((option) => option.score)).toEqual([0, 1, 2, 3]));
  });
});
