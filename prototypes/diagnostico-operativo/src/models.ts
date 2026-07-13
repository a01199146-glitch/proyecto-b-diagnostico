export type DiagnosticStatus = "draft" | "in_progress" | "completed";
export type ResponseMode = "normal" | "not_applicable" | "unknown";
export type ConfidenceLevel = "low" | "medium" | "high";
export type PriorityLevel = "low" | "medium" | "high";

export interface BusinessProfile {
  sessionId: string;
  name: string;
  sector: string;
  interviewee: string;
  intervieweeRole: string;
  employees: number | null;
  branches: number | null;
  mainConcernCategory: "" | "ventas" | "inventario" | "procesos" | "costos" | "tiempos" | "clientes";
  currentTools: string;
  diagnosticDate: string;
}

export interface DiagnosticSession {
  id: string;
  schemaVersion: 1;
  areaId: "inventario";
  status: DiagnosticStatus;
  consultant: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface AreaResponse {
  id: string;
  sessionId: string;
  areaId: "inventario";
  questionId: string;
  mode: ResponseMode;
  value: string | null;
  updatedAt: string;
}

export interface EvidenceItem {
  id: string;
  sessionId: string;
  questionId: string;
  kind: "text";
  description: string;
}

export interface Finding {
  id: string;
  sessionId: string;
  questionId: string;
  consultantNote: string;
  evidence: EvidenceItem[];
  possibleCause: string;
  isHypothesis: boolean;
  confidence: ConfidenceLevel;
}

export interface PriorityScore {
  areaId: "inventario";
  score: number;
  maxScore: 7;
  priority: PriorityLevel;
  unknownCount: number;
  notApplicableCount: number;
  explanation: string[];
}

export interface Recommendation {
  id: string;
  areaId: "inventario";
  priority: PriorityLevel;
  title: string;
  description: string;
  requiresValidation: true;
}

export interface InternalObservation {
  id: string;
  sessionId: string;
  questionId: string;
  consultantNote: string;
  evidenceDescription: string;
  possibleCause: string;
  isHypothesis: boolean;
  confidence: ConfidenceLevel;
  updatedAt: string;
}

export interface DiagnosticBundle {
  session: DiagnosticSession;
  profile: BusinessProfile;
  responses: AreaResponse[];
  observations: InternalObservation[];
}
