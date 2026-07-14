import { areaMap, diagnosticDisclaimer, questionMap } from "./inventoryQuestions";
import { recommendationsFor, type GeneralDiagnosticResult } from "./scoring";
import type { DiagnosticBundle } from "./models";

export function createExportPayload(
  bundle: DiagnosticBundle,
  result: GeneralDiagnosticResult,
  generatedAt: Date | string = new Date()
) {
  const timestamp = generatedAt instanceof Date ? generatedAt : new Date(generatedAt);
  if (Number.isNaN(timestamp.getTime())) throw new Error("La fecha de exportación no es válida.");
  const recommendation = result.mainAreaId ? recommendationsFor(result.mainAreaId, bundle.responses) : null;

  return {
    schemaVersion: 2,
    generatedAt: timestamp.toISOString(),
    backupPurpose: "Respaldo manual local del Diagnóstico Operativo de Campo V1",
    profile: { ...bundle.profile },
    session: { ...bundle.session, schemaVersion: 2 },
    areaStatuses: bundle.areaProgress.map((item) => ({ ...item })),
    responses: bundle.responses.map((response) => ({
      ...response,
      questionNumber: questionMap[response.questionId]?.number ?? null,
      question: questionMap[response.questionId]?.text ?? response.questionId,
      selectedOption: response.mode === "normal"
        ? questionMap[response.questionId]?.options.find((option) => option.value === response.value) ?? null
        : null
    })),
    observations: bundle.observations.map((observation) => ({ ...observation })),
    evidence: bundle.observations
      .filter((observation) => observation.evidenceDescription.trim())
      .map((observation) => ({ questionId: observation.questionId, description: observation.evidenceDescription })),
    possibleCauses: bundle.observations
      .filter((observation) => observation.possibleCause.trim())
      .map((observation) => ({
        questionId: observation.questionId,
        cause: observation.possibleCause,
        isHypothesis: observation.isHypothesis,
        confidence: observation.confidence
      })),
    calculatedScores: Object.fromEntries(Object.entries(result.scores).map(([areaId, score]) => [areaId, {
      score: score.score,
      maxScore: score.maxScore,
      priority: score.priority,
      status: score.status,
      explanation: [...score.explanation]
    }])),
    tieBreak: {
      ruleApplied: result.tieBreakRule,
      initiallyTiedAreas: [...result.initiallyTiedAreas],
      mainAreaId: result.mainAreaId,
      secondaryProblems: [...result.secondaryProblems]
    },
    result: {
      kind: result.kind,
      label: result.kind === "complete" ? "Resultado completo" : "Resultado parcial",
      reviewedAreas: [...result.reviewedAreas],
      missingAreas: [...result.missingAreas],
      mainArea: result.mainAreaId ? areaMap[result.mainAreaId].label : null,
      mainScore: result.mainScore,
      priority: result.mainPriority
    },
    pendingInformation: result.pendingInformation.map((item) => ({ ...item })),
    recommendations: recommendation,
    timestamps: {
      createdAt: bundle.session.createdAt,
      updatedAt: bundle.session.updatedAt,
      completedAt: bundle.session.completedAt,
      exportedAt: timestamp.toISOString()
    },
    disclaimer: diagnosticDisclaimer
  };
}

export function serializeExport(payload: ReturnType<typeof createExportPayload>): string {
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function buildExportFilename(businessName: string, generatedAt: Date | string = new Date()): string {
  const timestamp = generatedAt instanceof Date ? generatedAt : new Date(generatedAt);
  const date = timestamp.toISOString().slice(0, 10);
  const slug = businessName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "diagnostico";
  return `diagnostico-campo-${slug}-${date}.json`;
}
