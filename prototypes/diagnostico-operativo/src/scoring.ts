import { inventoryQuestions } from "./inventoryQuestions";
import type { AreaResponse, BusinessProfile, PriorityScore } from "./models";

const priorityFor = (score: number): PriorityScore["priority"] => {
  if (score >= 5) return "high";
  if (score >= 3) return "medium";
  return "low";
};

export function calculateInventoryScore(
  profile: Pick<BusinessProfile, "mainConcernCategory">,
  responses: AreaResponse[]
): PriorityScore {
  let score = profile.mainConcernCategory === "inventario" ? 1 : 0;
  let unknownCount = 0;
  let notApplicableCount = 0;
  const explanation: string[] = [];

  if (profile.mainConcernCategory === "inventario") {
    explanation.push("+1 porque Inventario fue declarado como preocupación principal.");
  }

  for (const question of inventoryQuestions) {
    const response = responses.find((item) => item.questionId === question.id);
    if (!response) {
      explanation.push(`${question.number}: sin respuesta; no aporta puntos todavía.`);
      continue;
    }
    if (response.mode === "not_applicable") {
      notApplicableCount += 1;
      explanation.push(`${question.number}: no aplica; se excluye y no suma ni resta.`);
      continue;
    }
    if (response.mode === "unknown") {
      unknownCount += 1;
      explanation.push(`${question.number}: no se conoce; no aporta puntos y queda como información pendiente.`);
      continue;
    }
    const selected = question.options.find((option) => option.value === response.value);
    if (!selected) {
      explanation.push(`${question.number}: respuesta inválida; no aporta puntos.`);
      continue;
    }
    score += selected.score;
    explanation.push(`${question.number}: ${selected.label} (+${selected.score}).`);
  }

  return {
    areaId: "inventario",
    score,
    maxScore: 7,
    priority: priorityFor(score),
    unknownCount,
    notApplicableCount,
    explanation
  };
}

export const priorityLabels: Record<PriorityScore["priority"], string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta"
};
