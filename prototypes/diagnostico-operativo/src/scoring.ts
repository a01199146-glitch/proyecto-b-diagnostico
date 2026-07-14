import { areaMap, areas, tieBreakOrder } from "./inventoryQuestions";
import type {
  AreaId,
  AreaProgress,
  AreaResponse,
  AreaStatus,
  BusinessProfile,
  PriorityLevel,
  PriorityScore
} from "./models";

const terminalStatuses: AreaStatus[] = ["completed", "completed_with_pending_information", "not_applicable"];

export interface GeneralDiagnosticResult {
  kind: "partial" | "complete";
  isComplete: boolean;
  reviewedAreas: AreaId[];
  missingAreas: AreaId[];
  scores: Record<AreaId, PriorityScore>;
  mainAreaId: AreaId | null;
  mainScore: number | null;
  mainPriority: PriorityLevel | null;
  initiallyTiedAreas: AreaId[];
  secondaryProblems: AreaId[];
  tieBreakRule: "none" | "main_concern" | "severity_three" | "fixed_precedence" | "not_available";
  pendingInformation: Array<{ areaId: AreaId; questionId: string }>;
}

export interface AreaRecommendation {
  areaId: AreaId;
  possibleCauses: string[];
  kpis: Array<{ name: string; purpose: string }>;
  quickActions: string[];
  mediumActions: string[];
  nextStep: string;
}

export const isAreaReviewed = (status: AreaStatus): boolean => terminalStatuses.includes(status);

export function deriveAreaStatus(areaId: AreaId, responses: AreaResponse[]): AreaStatus {
  const config = areaMap[areaId];
  const areaResponses = config.questions.map((question) => responses.find((item) => item.questionId === question.id));
  const answered = areaResponses.filter((response, index) => {
    if (!response) return false;
    if (response.mode !== "normal") return true;
    return config.questions[index].options.some((option) => option.value === response.value);
  });

  if (answered.length === 0) return "not_started";
  if (answered.length < config.questions.length) return "in_progress";
  if (areaResponses.every((response) => response?.mode === "not_applicable")) return "not_applicable";
  if (areaResponses.some((response) => response?.mode === "unknown")) return "completed_with_pending_information";
  return "completed";
}

export function buildAreaProgress(sessionId: string, areaId: AreaId, responses: AreaResponse[], updatedAt = new Date().toISOString()): AreaProgress {
  const questionIds = areaMap[areaId].questions.map((question) => question.id);
  const areaResponses = responses.filter((item) => questionIds.includes(item.questionId));
  const answeredCount = areaResponses.filter((response) => response.mode !== "normal" || response.value !== null).length;
  return {
    id: `${sessionId}:${areaId}`,
    sessionId,
    areaId,
    status: deriveAreaStatus(areaId, responses),
    answeredCount,
    unknownCount: areaResponses.filter((response) => response.mode === "unknown").length,
    updatedAt
  };
}

const priorityFor = (score: number): PriorityLevel => {
  if (score >= 5) return "high";
  if (score >= 3) return "medium";
  return "low";
};

export function calculateAreaScore(
  profile: Pick<BusinessProfile, "mainConcernCategory">,
  responses: AreaResponse[],
  areaId: AreaId
): PriorityScore {
  const config = areaMap[areaId];
  const status = deriveAreaStatus(areaId, responses);
  let score = profile.mainConcernCategory === areaId ? 1 : 0;
  let answeredCount = 0;
  let unknownCount = 0;
  let notApplicableCount = 0;
  let severeCount = 0;
  const explanation: string[] = [];

  if (profile.mainConcernCategory === areaId) {
    explanation.push(`+1 porque ${config.label} fue declarada como preocupación principal.`);
  }

  for (const question of config.questions) {
    const response = responses.find((item) => item.questionId === question.id);
    if (!response) {
      explanation.push(`P${question.number}: sin respuesta; el área permanece incompleta.`);
      continue;
    }
    if (response.mode === "not_applicable") {
      answeredCount += 1;
      notApplicableCount += 1;
      explanation.push(`P${question.number}: no aplica; se excluye y no suma ni resta.`);
      continue;
    }
    if (response.mode === "unknown") {
      answeredCount += 1;
      unknownCount += 1;
      explanation.push(`P${question.number}: no se conoce; aporta cero y queda como información pendiente.`);
      continue;
    }
    const selected = question.options.find((option) => option.value === response.value);
    if (!selected) {
      explanation.push(`P${question.number}: respuesta ausente o inválida; el área permanece incompleta.`);
      continue;
    }
    answeredCount += 1;
    score += selected.score;
    if (selected.score === 3) severeCount += 1;
    explanation.push(`P${question.number}: ${selected.label} (+${selected.score}).`);
  }

  const excluded = status === "not_applicable";
  return {
    areaId,
    score: excluded ? null : score,
    maxScore: 7,
    priority: excluded ? null : priorityFor(score),
    status,
    answeredCount,
    unknownCount,
    notApplicableCount,
    severeCount,
    explanation
  };
}

export function calculateInventoryScore(
  profile: Pick<BusinessProfile, "mainConcernCategory">,
  responses: AreaResponse[]
): PriorityScore {
  return calculateAreaScore(profile, responses, "inventario");
}

export function calculateGeneralDiagnostic(
  profile: Pick<BusinessProfile, "mainConcernCategory">,
  responses: AreaResponse[]
): GeneralDiagnosticResult {
  const scoreEntries = areas.map((area) => [area.id, calculateAreaScore(profile, responses, area.id)] as const);
  const scores = Object.fromEntries(scoreEntries) as Record<AreaId, PriorityScore>;
  const reviewedAreas = areas.filter((area) => isAreaReviewed(scores[area.id].status)).map((area) => area.id);
  const missingAreas = areas.filter((area) => !reviewedAreas.includes(area.id)).map((area) => area.id);
  const scorable = reviewedAreas.filter((areaId) => scores[areaId].score !== null);
  const pendingInformation = responses
    .filter((response) => response.mode === "unknown")
    .map((response) => ({ areaId: response.areaId, questionId: response.questionId }));

  if (scorable.length === 0) {
    return {
      kind: reviewedAreas.length === areas.length ? "complete" : "partial",
      isComplete: reviewedAreas.length === areas.length,
      reviewedAreas,
      missingAreas,
      scores,
      mainAreaId: null,
      mainScore: null,
      mainPriority: null,
      initiallyTiedAreas: [],
      secondaryProblems: [],
      tieBreakRule: "not_available",
      pendingInformation
    };
  }

  const maxScore = Math.max(...scorable.map((areaId) => scores[areaId].score ?? 0));
  const initiallyTiedAreas = scorable.filter((areaId) => scores[areaId].score === maxScore);
  let candidates = [...initiallyTiedAreas];
  let tieBreakRule: GeneralDiagnosticResult["tieBreakRule"] = "none";

  if (candidates.length > 1 && profile.mainConcernCategory && candidates.includes(profile.mainConcernCategory)) {
    candidates = [profile.mainConcernCategory];
    tieBreakRule = "main_concern";
  }

  if (candidates.length > 1) {
    const maxSevere = Math.max(...candidates.map((areaId) => scores[areaId].severeCount));
    const severeCandidates = candidates.filter((areaId) => scores[areaId].severeCount === maxSevere);
    if (severeCandidates.length < candidates.length) tieBreakRule = "severity_three";
    candidates = severeCandidates;
  }

  let mainAreaId: AreaId;
  if (candidates.length === 1) {
    mainAreaId = candidates[0];
  } else {
    mainAreaId = tieBreakOrder.find((areaId) => candidates.includes(areaId))!;
    tieBreakRule = "fixed_precedence";
  }

  return {
    kind: reviewedAreas.length === areas.length ? "complete" : "partial",
    isComplete: reviewedAreas.length === areas.length,
    reviewedAreas,
    missingAreas,
    scores,
    mainAreaId,
    mainScore: scores[mainAreaId].score,
    mainPriority: scores[mainAreaId].priority,
    initiallyTiedAreas,
    secondaryProblems: initiallyTiedAreas.filter((areaId) => areaId !== mainAreaId),
    tieBreakRule,
    pendingInformation
  };
}

export function recommendationsFor(areaId: AreaId, responses: AreaResponse[]): AreaRecommendation {
  const config = areaMap[areaId];
  const possibleCauses = config.questions.flatMap((question) => {
    const response = responses.find((item) => item.questionId === question.id);
    const selected = response?.mode === "normal"
      ? question.options.find((option) => option.value === response.value)
      : undefined;
    return selected && selected.score > 0 ? config.causeRules[question.id] ?? [] : [];
  });
  return {
    areaId,
    possibleCauses,
    kpis: config.kpis.map((item) => ({ ...item })),
    quickActions: [...config.quickActions],
    mediumActions: [...config.mediumActions],
    nextStep: config.nextStep
  };
}

export const priorityLabels: Record<PriorityLevel, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta"
};

export const areaStatusLabels: Record<AreaStatus, string> = {
  not_started: "No iniciada",
  in_progress: "En progreso",
  completed: "Completada",
  completed_with_pending_information: "Completada con información pendiente",
  not_applicable: "No aplica"
};
