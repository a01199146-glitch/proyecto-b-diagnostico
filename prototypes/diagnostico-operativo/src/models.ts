export const areaIds = ["ventas", "inventario", "procesos", "costos", "tiempos", "clientes"] as const;

export type AreaId = (typeof areaIds)[number];
export type DiagnosticStatus = "draft" | "in_progress" | "completed";
export type AreaStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "completed_with_pending_information"
  | "not_applicable";
export type ResponseMode = "normal" | "not_applicable" | "unknown";
export type ConfidenceLevel = "low" | "medium" | "high";
export type PriorityLevel = "low" | "medium" | "high";
export type SessionScreen = "profile" | "areas" | "area" | "results";

export interface BusinessProfile {
  sessionId: string;
  name: string;
  sector: string;
  interviewee: string;
  intervieweeRole: string;
  employees: number | null;
  branches: number | null;
  mainConcernCategory: "" | AreaId;
  currentTools: string;
  diagnosticDate: string;
}

export interface DiagnosticSession {
  id: string;
  schemaVersion: 1 | 2;
  areaId?: "inventario";
  status: DiagnosticStatus;
  consultant: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  lastScreen?: SessionScreen;
  lastAreaId?: AreaId | null;
}

export interface AreaProgress {
  id: string;
  sessionId: string;
  areaId: AreaId;
  status: AreaStatus;
  answeredCount: number;
  unknownCount: number;
  updatedAt: string;
}

export interface AreaResponse {
  id: string;
  sessionId: string;
  areaId: AreaId;
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
  areaId: AreaId;
  score: number | null;
  maxScore: 7;
  priority: PriorityLevel | null;
  status: AreaStatus;
  answeredCount: number;
  unknownCount: number;
  notApplicableCount: number;
  severeCount: number;
  explanation: string[];
}

export interface Recommendation {
  id: string;
  areaId: AreaId;
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
  contradiction?: string;
  isHypothesis: boolean;
  confidence: ConfidenceLevel;
  updatedAt: string;
}

export interface DiagnosticBundle {
  session: DiagnosticSession;
  profile: BusinessProfile;
  responses: AreaResponse[];
  observations: InternalObservation[];
  areaProgress: AreaProgress[];
}
