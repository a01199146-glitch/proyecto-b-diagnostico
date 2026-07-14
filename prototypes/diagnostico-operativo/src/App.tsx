import { useEffect, useMemo, useState, type ReactNode } from "react";
import { db, listSessions, loadDiagnosticBundle, saveDiagnosticBundle } from "./db";
import { buildExportFilename, createExportPayload, serializeExport } from "./export";
import {
  areaMap,
  areas,
  concernOptions,
  diagnosticDisclaimer,
  questionMap,
  sectorOptions
} from "./inventoryQuestions";
import {
  areaStatusLabels,
  buildAreaProgress,
  calculateGeneralDiagnostic,
  isAreaReviewed,
  priorityLabels,
  recommendationsFor
} from "./scoring";
import { PwaDebugPanel } from "./PwaDebugPanel";
import type {
  AreaId,
  AreaResponse,
  BusinessProfile,
  ConfidenceLevel,
  DiagnosticBundle,
  DiagnosticSession,
  InternalObservation,
  ResponseMode,
  SessionScreen
} from "./models";

type Screen = "home" | SessionScreen;
type SaveState = "idle" | "saving" | "saved" | "error";
type ResultView = "client" | "internal";

interface HistoryItem {
  session: DiagnosticSession;
  businessName: string;
  reviewedCount: number;
}

const statusLabels = {
  draft: "Borrador",
  in_progress: "En progreso",
  completed: "Completado"
} as const;

const confidenceLabels: Record<ConfidenceLevel, string> = {
  low: "Confianza baja",
  medium: "Confianza media",
  high: "Confianza alta"
};

const emptyProfile = (sessionId: string): BusinessProfile => ({
  sessionId,
  name: "",
  sector: "",
  interviewee: "",
  intervieweeRole: "",
  employees: null,
  branches: null,
  mainConcernCategory: "",
  currentTools: "",
  diagnosticDate: new Date().toISOString().slice(0, 10)
});

const makeId = (): string => globalThis.crypto?.randomUUID?.() ?? `diagnostico-${Date.now()}`;

const emptyObservation = (sessionId: string, questionId: string): InternalObservation => ({
  id: `${sessionId}:${questionId}`,
  sessionId,
  questionId,
  consultantNote: "",
  evidenceDescription: "",
  possibleCause: "",
  contradiction: "",
  isHypothesis: true,
  confidence: "medium",
  updatedAt: new Date().toISOString()
});

const isProfileComplete = (profile: BusinessProfile | null, consultant: string): boolean => Boolean(
  profile && consultant.trim() && profile.name.trim() && profile.sector && profile.interviewee.trim()
  && profile.intervieweeRole.trim() && profile.employees !== null && profile.branches !== null
  && profile.mainConcernCategory && profile.currentTools.trim() && profile.diagnosticDate
);

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [selectedAreaId, setSelectedAreaId] = useState<AreaId>("inventario");
  const [resultView, setResultView] = useState<ResultView>("client");
  const [session, setSession] = useState<DiagnosticSession | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [responses, setResponses] = useState<AreaResponse[]>([]);
  const [observations, setObservations] = useState<InternalObservation[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [readyToSave, setReadyToSave] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [online, setOnline] = useState(navigator.onLine);

  const progress = useMemo(() => session
    ? areas.map((area) => buildAreaProgress(session.id, area.id, responses, session.updatedAt))
    : [], [session, responses]);
  const generalResult = useMemo(() => profile ? calculateGeneralDiagnostic(profile, responses) : null, [profile, responses]);
  const profileComplete = isProfileComplete(profile, session?.consultant ?? "");
  const reviewedCount = progress.filter((item) => isAreaReviewed(item.status)).length;
  const progressPercent = Math.round((reviewedCount / areas.length) * 100);

  const loadHistory = async () => {
    const sessions = await listSessions(db);
    const items = await Promise.all(sessions.map(async (item) => {
      const [storedProfile, storedProgress] = await Promise.all([
        db.businessProfiles.get(item.id),
        db.areaProgress.where("sessionId").equals(item.id).toArray()
      ]);
      return {
        session: item,
        businessName: storedProfile?.name || "Diagnóstico sin nombre",
        reviewedCount: storedProgress.filter((area) => isAreaReviewed(area.status)).length
      };
    }));
    setHistory(items);
  };

  useEffect(() => {
    void loadHistory();
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    if (!readyToSave || !session || !profile) return;
    setSaveState("saving");
    const timeout = window.setTimeout(() => {
      const updatedAt = new Date().toISOString();
      void saveDiagnosticBundle(db, {
        session: { ...session, schemaVersion: 2, updatedAt },
        profile,
        responses,
        observations,
        areaProgress: progress.map((item) => ({ ...item, updatedAt }))
      }).then(() => setSaveState("saved")).catch(() => setSaveState("error"));
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [session, profile, responses, observations, progress, readyToSave]);

  const currentBundle = (sessionOverride?: DiagnosticSession): DiagnosticBundle | null => {
    const activeSession = sessionOverride ?? session;
    if (!activeSession || !profile) return null;
    const updatedAt = new Date().toISOString();
    return {
      session: { ...activeSession, schemaVersion: 2, updatedAt },
      profile,
      responses,
      observations,
      areaProgress: areas.map((area) => buildAreaProgress(activeSession.id, area.id, responses, updatedAt))
    };
  };

  const persistNow = async (bundle?: DiagnosticBundle | null) => {
    const payload = bundle ?? currentBundle();
    if (!payload) return;
    setSaveState("saving");
    await saveDiagnosticBundle(db, payload);
    setSaveState("saved");
  };

  const createDiagnostic = async () => {
    const id = makeId();
    const now = new Date().toISOString();
    const newSession: DiagnosticSession = {
      id,
      schemaVersion: 2,
      status: "draft",
      consultant: "",
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      lastScreen: "profile",
      lastAreaId: null
    };
    const newProfile = emptyProfile(id);
    const bundle: DiagnosticBundle = {
      session: newSession,
      profile: newProfile,
      responses: [],
      observations: [],
      areaProgress: areas.map((area) => buildAreaProgress(id, area.id, [], now))
    };
    await persistNow(bundle);
    setSession(newSession);
    setProfile(newProfile);
    setResponses([]);
    setObservations([]);
    setReadyToSave(true);
    setScreen("profile");
  };

  const openDiagnostic = async (id: string) => {
    setReadyToSave(false);
    const bundle = await loadDiagnosticBundle(db, id);
    if (!bundle) return;
    setSession(bundle.session);
    setProfile(bundle.profile);
    setResponses(bundle.responses);
    setObservations(bundle.observations);
    const areaId = bundle.session.lastAreaId ?? "inventario";
    setSelectedAreaId(areaId);
    setReadyToSave(true);
    const storedScreen = bundle.session.lastScreen ?? "areas";
    setScreen(isProfileComplete(bundle.profile, bundle.session.consultant) ? storedScreen : "profile");
  };

  const returnHome = async () => {
    await persistNow();
    await loadHistory();
    setReadyToSave(false);
    setSession(null);
    setProfile(null);
    setResponses([]);
    setObservations([]);
    setScreen("home");
  };

  const navigate = (next: SessionScreen, areaId?: AreaId) => {
    if (areaId) setSelectedAreaId(areaId);
    setSession((current) => current ? {
      ...current,
      lastScreen: next,
      lastAreaId: areaId ?? current.lastAreaId ?? null,
      status: current.status === "draft" && next !== "profile" ? "in_progress" : current.status
    } : current);
    setScreen(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const markInProgress = () => {
    setSession((current) => current && current.status === "draft" ? { ...current, status: "in_progress" } : current);
  };

  const updateProfile = <K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K]) => {
    setProfile((current) => current ? { ...current, [key]: value } : current);
    markInProgress();
  };

  const upsertResponse = (questionId: string, mode: ResponseMode, value: string | null) => {
    const question = questionMap[questionId];
    if (!session || !question) return;
    const previous = responses.find((item) => item.questionId === questionId);
    const next: AreaResponse = {
      id: `${session.id}:${questionId}`,
      sessionId: session.id,
      areaId: question.areaId,
      questionId,
      mode,
      value: mode === "normal" ? value ?? previous?.value ?? null : null,
      updatedAt: new Date().toISOString()
    };
    setResponses([...responses.filter((item) => item.questionId !== questionId), next]);
    markInProgress();
  };

  const updateObservation = (
    questionId: string,
    field: keyof Pick<InternalObservation, "consultantNote" | "evidenceDescription" | "possibleCause" | "contradiction" | "isHypothesis" | "confidence">,
    value: string | boolean
  ) => {
    if (!session) return;
    const previous = observations.find((item) => item.questionId === questionId) ?? emptyObservation(session.id, questionId);
    const next = { ...previous, [field]: value, updatedAt: new Date().toISOString() };
    setObservations([...observations.filter((item) => item.questionId !== questionId), next]);
    markInProgress();
  };

  const showResults = () => {
    if (!session || !generalResult || reviewedCount === 0) return;
    const completed = generalResult.isComplete;
    setSession({
      ...session,
      status: completed ? "completed" : "in_progress",
      completedAt: completed ? session.completedAt ?? new Date().toISOString() : null,
      lastScreen: "results"
    });
    setResultView("client");
    setScreen("results");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const downloadExport = () => {
    if (!session || !profile || !generalResult) return;
    const generatedAt = new Date();
    const bundle = currentBundle();
    if (!bundle) return;
    const blob = new Blob([serializeExport(createExportPayload(bundle, generalResult, generatedAt))], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildExportFilename(profile.name, generatedAt);
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const header = (
    <header className="app-header">
      <button className="brand-button" type="button" onClick={() => void returnHome()} aria-label="Volver al historial">
        <span className="brand-mark">B</span>
        <span><strong>Proyecto B</strong><small>Diagnóstico de Campo · seis áreas</small></span>
      </button>
      <div className="header-status">
        <span className={`network-pill ${online ? "online" : "offline"}`}>{online ? "En línea" : "Sin internet"}</span>
        {session && <span className="status-pill">{statusLabels[session.status]}</span>}
        {session && <span className={`save-state ${saveState}`}>{saveState === "saving" ? "Guardando…" : saveState === "error" ? "Error al guardar" : "Guardado local"}</span>}
      </div>
    </header>
  );

  if (screen === "home") {
    return <div className="app-shell">
      {header}
      <main className="home-page">
        <section className="home-hero">
          <div><p className="eyebrow">Herramienta offline-first</p><h1>Seis áreas, una sola sesión de campo.</h1><p>Registra la ficha, revisa cada área y genera un resultado parcial o completo sin depender de internet.</p></div>
          <button className="primary-button large" type="button" onClick={() => void createDiagnostic()}>Nuevo diagnóstico</button>
        </section>
        <aside className="privacy-notice"><strong>Respaldo manual</strong><span>Usa datos ficticios durante validación. Todo se guarda en este dispositivo y puede exportarse como JSON.</span></aside>
        <section className="history-section" aria-labelledby="history-title">
          <div className="section-title-row"><div><p className="eyebrow">Continuidad local</p><h2 id="history-title">Historial de diagnósticos</h2></div><span>{history.length} registros</span></div>
          {history.length === 0 ? <div className="empty-state"><strong>Aún no hay diagnósticos guardados.</strong><span>Crea el primero para comprobar el guardado automático.</span></div> :
            <div className="history-list">{history.map(({ session: item, businessName, reviewedCount: count }) =>
              <button type="button" className="history-card" key={item.id} onClick={() => void openDiagnostic(item.id)}>
                <span><strong>{businessName}</strong><small>{count}/6 áreas revisadas · {new Date(item.updatedAt).toLocaleString("es-MX")}</small></span>
                <span className={`history-status ${item.status}`}>{statusLabels[item.status]}</span>
              </button>)}</div>}
        </section>
        <PwaDebugPanel />
      </main>
      <AppFooter />
    </div>;
  }

  if (!session || !profile || !generalResult) return null;

  const selectedArea = areaMap[selectedAreaId];
  const selectedScore = generalResult.scores[selectedAreaId];
  const canCloseSelectedArea = isAreaReviewed(selectedScore.status);
  const mainRecommendation = generalResult.mainAreaId ? recommendationsFor(generalResult.mainAreaId, responses) : null;
  const strengths = generalResult.reviewedAreas.filter((areaId) => {
    const score = generalResult.scores[areaId].score;
    return score !== null && score <= 2;
  });
  const mainEvidence = generalResult.mainAreaId ? areaMap[generalResult.mainAreaId].questions.flatMap((question) => {
    const response = responses.find((item) => item.questionId === question.id);
    const selected = response?.mode === "normal" ? question.options.find((option) => option.value === response.value) : null;
    return selected && selected.score > 0 ? [{ question, selected }] : [];
  }) : [];
  const filledObservations = observations.filter((item) => item.consultantNote || item.evidenceDescription || item.possibleCause || item.contradiction);

  return <div className="app-shell">
    {header}
    <main className="work-page">
      <PwaDebugPanel />
      <nav className="stepper stepper-four" aria-label="Progreso del diagnóstico">
        <button className={screen === "profile" ? "active" : "done"} type="button" onClick={() => navigate("profile")}><span>1</span> Ficha</button>
        <button className={screen === "areas" ? "active" : screen === "area" || screen === "results" ? "done" : ""} type="button" disabled={!profileComplete} onClick={() => navigate("areas")}><span>2</span> Áreas</button>
        <button className={screen === "area" ? "active" : screen === "results" ? "done" : ""} type="button" disabled={!profileComplete} onClick={() => navigate("area", selectedAreaId)}><span>3</span> Evaluación</button>
        <button className={screen === "results" ? "active" : ""} type="button" disabled={reviewedCount === 0} onClick={showResults}><span>4</span> Resultado</button>
      </nav>

      {screen === "profile" && <section className="form-section" aria-labelledby="profile-title">
        <div className="page-heading"><p className="eyebrow">Ficha del negocio</p><h1 id="profile-title">Contexto para una sola sesión general</h1><p>Completa los campos necesarios. Para esta validación utiliza únicamente datos ficticios.</p></div>
        <div className="form-grid">
          <Field label="Nombre del negocio" required><input value={profile.name} onChange={(event) => updateProfile("name", event.target.value)} /></Field>
          <Field label="Giro" required><select value={profile.sector} onChange={(event) => updateProfile("sector", event.target.value)}><option value="">Seleccionar</option>{sectorOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          <Field label="Persona entrevistada" required><input value={profile.interviewee} onChange={(event) => updateProfile("interviewee", event.target.value)} /></Field>
          <Field label="Puesto" required><input value={profile.intervieweeRole} onChange={(event) => updateProfile("intervieweeRole", event.target.value)} /></Field>
          <Field label="Número de empleados" required><input type="number" min="1" inputMode="numeric" value={profile.employees ?? ""} onChange={(event) => updateProfile("employees", event.target.value ? Number(event.target.value) : null)} /></Field>
          <Field label="Número de sucursales" required><input type="number" min="1" inputMode="numeric" value={profile.branches ?? ""} onChange={(event) => updateProfile("branches", event.target.value ? Number(event.target.value) : null)} /></Field>
          <Field label="Principal preocupación" hint="Equivale a P3 y aporta un punto a esa área." required><select value={profile.mainConcernCategory} onChange={(event) => updateProfile("mainConcernCategory", event.target.value as BusinessProfile["mainConcernCategory"])}><option value="">Seleccionar</option>{concernOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          <Field label="Herramientas actuales" hint="Ejemplo ficticio: libreta, Excel, sistema de punto de venta." required><textarea rows={3} value={profile.currentTools} onChange={(event) => updateProfile("currentTools", event.target.value)} /></Field>
          <Field label="Fecha" required><input type="date" value={profile.diagnosticDate} onChange={(event) => updateProfile("diagnosticDate", event.target.value)} /></Field>
          <Field label="Consultor" hint="Dato interno guardado localmente." required><input value={session.consultant} onChange={(event) => setSession({ ...session, consultant: event.target.value, status: "in_progress" })} /></Field>
        </div>
        <div className="sticky-actions"><button className="secondary-button" type="button" onClick={() => void returnHome()}>Guardar y salir</button><button className="primary-button" type="button" disabled={!profileComplete} onClick={() => navigate("areas")}>Continuar al resumen</button></div>
      </section>}

      {screen === "areas" && <section className="form-section" aria-labelledby="areas-title">
        <div className="page-heading"><p className="eyebrow">Resumen de áreas</p><h1 id="areas-title">{reviewedCount} de 6 áreas revisadas</h1><p>Selecciona cualquier área para iniciar o continuar. Las áreas faltantes no se convierten en puntaje cero.</p></div>
        <div className="progress-overview">
          <div><span>Progreso</span><strong>{progressPercent}%</strong></div>
          <div><span>Área actual</span><strong>{session.lastAreaId ? areaMap[session.lastAreaId].label : "Sin seleccionar"}</strong></div>
          <div><span>Información pendiente</span><strong>{generalResult.pendingInformation.length}</strong></div>
          <div><span>Guardado</span><strong>{saveState === "error" ? "Revisar" : "Automático"}</strong></div>
        </div>
        <div className="area-grid">{areas.map((area) => {
          const areaProgress = progress.find((item) => item.areaId === area.id)!;
          const areaScore = generalResult.scores[area.id];
          return <article className={`area-card status-${areaProgress.status}`} key={area.id}>
            <header><div><span>Área {areas.indexOf(area) + 1}</span><h2>{area.label}</h2></div><span className="area-status">{areaStatusLabels[areaProgress.status]}</span></header>
            <p>{area.description}</p>
            <dl><div><dt>Respondidas</dt><dd>{areaProgress.answeredCount}/2</dd></div><div><dt>Pendientes</dt><dd>{areaProgress.unknownCount}</dd></div><div><dt>Puntaje</dt><dd>{isAreaReviewed(areaProgress.status) ? areaScore.score === null ? "N/A" : `${areaScore.score}/7` : "—"}</dd></div></dl>
            <button className="secondary-button" type="button" onClick={() => navigate("area", area.id)}>{areaProgress.status === "not_started" ? "Iniciar área" : "Continuar área"}</button>
          </article>;
        })}</div>
        {reviewedCount > 0 && <aside className="partial-notice"><strong>Resultado disponible</strong><span>{reviewedCount === 6 ? "Las seis áreas están revisadas; puedes generar el resultado completo." : "Puedes generar un resultado parcial claramente identificado."}</span></aside>}
        <div className="sticky-actions"><button className="secondary-button" type="button" onClick={() => navigate("profile")}>Volver a ficha</button><button className="primary-button" type="button" disabled={reviewedCount === 0} onClick={showResults}>{reviewedCount === 6 ? "Generar resultado completo" : "Generar resultado parcial"}</button></div>
      </section>}

      {screen === "area" && <section className="form-section" aria-labelledby="area-title">
        <div className="page-heading"><p className="eyebrow">Área {areas.findIndex((area) => area.id === selectedAreaId) + 1} de 6</p><h1 id="area-title">{selectedArea.label}</h1><p>{selectedArea.description} Cada pregunta conserva respuesta, no aplica, no se conoce y contexto de campo.</p></div>
        <div className="score-strip"><span>Estado</span><strong>{selectedScore.score === null ? "N/A" : `${selectedScore.score}/7`}</strong><span>{areaStatusLabels[selectedScore.status]}</span><small>{selectedScore.unknownCount ? `${selectedScore.unknownCount} dato(s) pendiente(s)` : "Sin información pendiente"}</small></div>
        <div className="question-stack">{selectedArea.questions.map((question) => {
          const response = responses.find((item) => item.questionId === question.id);
          const observation = observations.find((item) => item.questionId === question.id) ?? emptyObservation(session.id, question.id);
          return <article className="field-question" key={question.id}>
            <header><span>Pregunta {question.number}</span><h2>{question.text}</h2></header>
            <div className="mode-selector" role="group" aria-label={`Tipo de respuesta para pregunta ${question.number}`}>
              <button type="button" className={response?.mode === "normal" ? "selected" : ""} onClick={() => upsertResponse(question.id, "normal", response?.value ?? null)}>Respuesta</button>
              <button type="button" className={response?.mode === "not_applicable" ? "selected" : ""} onClick={() => upsertResponse(question.id, "not_applicable", null)}>No aplica</button>
              <button type="button" className={response?.mode === "unknown" ? "selected" : ""} onClick={() => upsertResponse(question.id, "unknown", null)}>No se conoce</button>
            </div>
            {response?.mode === "normal" && <div className="option-list">{question.options.map((option) => <label key={option.value} className={response.value === option.value ? "checked" : ""}><input type="radio" name={question.id} value={option.value} checked={response.value === option.value} onChange={() => upsertResponse(question.id, "normal", option.value)} /><span>{option.label}</span><small>{option.score} pts</small></label>)}</div>}
            {response?.mode === "not_applicable" && <p className="mode-explanation">Esta pregunta se excluye: no suma ni resta puntos.</p>}
            {response?.mode === "unknown" && <p className="mode-explanation warning">Aporta cero y queda registrada como información pendiente.</p>}
            {!response && <p className="mode-explanation">Selecciona Respuesta, No aplica o No se conoce. Una pregunta vacía mantiene el área incompleta.</p>}
            <details className="field-notes">
              <summary>Observaciones internas del consultor</summary>
              <div className="notes-grid">
                <Field label="Evidencia" hint="Descripción textual; no se adjuntan archivos."><textarea rows={2} value={observation.evidenceDescription} onChange={(event) => updateObservation(question.id, "evidenceDescription", event.target.value)} /></Field>
                <Field label="Nota del consultor"><textarea rows={2} value={observation.consultantNote} onChange={(event) => updateObservation(question.id, "consultantNote", event.target.value)} /></Field>
                <Field label="Posible causa"><textarea rows={2} value={observation.possibleCause} onChange={(event) => updateObservation(question.id, "possibleCause", event.target.value)} /></Field>
                <Field label="Contradicción registrada"><textarea rows={2} value={observation.contradiction ?? ""} onChange={(event) => updateObservation(question.id, "contradiction", event.target.value)} /></Field>
                <Field label="Nivel de confianza"><select value={observation.confidence} onChange={(event) => updateObservation(question.id, "confidence", event.target.value as ConfidenceLevel)}><option value="low">Bajo</option><option value="medium">Medio</option><option value="high">Alto</option></select></Field>
              </div>
              <label className="hypothesis-check"><input type="checkbox" checked={observation.isHypothesis} onChange={(event) => updateObservation(question.id, "isHypothesis", event.target.checked)} /> La posible causa es una hipótesis por validar</label>
            </details>
          </article>;
        })}</div>
        {!canCloseSelectedArea && <p className="completion-hint">Responde las dos preguntas antes de cerrar el área. Una respuesta normal requiere seleccionar una opción.</p>}
        <div className="sticky-actions"><button className="secondary-button" type="button" onClick={() => navigate("areas")}>Guardar y volver</button><button className="primary-button" type="button" disabled={!canCloseSelectedArea} onClick={() => navigate("areas")}>Cerrar área</button></div>
      </section>}

      {screen === "results" && <section className="summary-section" aria-labelledby="summary-title">
        <div className="page-heading"><p className="eyebrow">{generalResult.kind === "complete" ? "Resultado completo" : "Resultado parcial"}</p><h1 id="summary-title">{generalResult.mainAreaId ? `${areaMap[generalResult.mainAreaId].label} · prioridad ${priorityLabels[generalResult.mainPriority!]}` : "Áreas revisadas sin puntaje aplicable"}</h1><p>{generalResult.kind === "partial" ? "Este resultado incluye solo las áreas revisadas y no debe presentarse como diagnóstico completo." : "Las seis áreas tienen un estado de cierre válido."}</p></div>
        <div className="result-tabs" role="tablist" aria-label="Vista del resultado"><button type="button" className={resultView === "client" ? "active" : ""} onClick={() => setResultView("client")}>Vista cliente</button><button type="button" className={resultView === "internal" ? "active" : ""} onClick={() => setResultView("internal")}>Vista interna</button></div>
        {resultView === "client" ? <div className="report-layout">
          <div className="result-card"><div><span>Tipo</span><strong>{generalResult.kind === "complete" ? "Completo" : "Parcial"}</strong></div><div><span>Áreas revisadas</span><strong>{reviewedCount}/6</strong></div><div><span>Información pendiente</span><strong>{generalResult.pendingInformation.length}</strong></div></div>
          <article><h2>Contexto del negocio</h2><p>{profile.name}, giro {sectorOptions.find(([value]) => value === profile.sector)?.[1] ?? profile.sector}, con {profile.employees} persona(s) y {profile.branches} sucursal(es). Principal preocupación declarada: {profile.mainConcernCategory ? areaMap[profile.mainConcernCategory].label : "sin indicar"}.</p></article>
          <article><h2>Alcance del resultado</h2><p><strong>Áreas evaluadas:</strong> {generalResult.reviewedAreas.map((areaId) => areaMap[areaId].label).join(", ") || "Ninguna"}.</p><p><strong>Áreas faltantes:</strong> {generalResult.missingAreas.map((areaId) => areaMap[areaId].label).join(", ") || "Ninguna"}.</p></article>
          <article><h2>Fortalezas observadas</h2>{strengths.length ? <ul>{strengths.map((areaId) => <li key={areaId}>{areaMap[areaId].label}: {generalResult.scores[areaId].score}/7, prioridad {priorityLabels[generalResult.scores[areaId].priority!]}.</li>)}</ul> : <p>No hay áreas revisadas con puntaje de prioridad baja.</p>}</article>
          {generalResult.mainAreaId && mainRecommendation && <>
            <article><h2>Prioridad principal</h2><p><strong>{areaMap[generalResult.mainAreaId].label}: {generalResult.mainScore}/7, prioridad {priorityLabels[generalResult.mainPriority!]}.</strong></p><ul>{generalResult.scores[generalResult.mainAreaId].explanation.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></article>
            <article><h2>Problemas secundarios</h2>{generalResult.secondaryProblems.length ? <ul>{generalResult.secondaryProblems.map((areaId) => <li key={areaId}>{areaMap[areaId].label}: {generalResult.scores[areaId].score}/7; estaba empatada inicialmente.</li>)}</ul> : <p>No hubo otras áreas empatadas con el puntaje principal.</p>}</article>
            <article><h2>Evidencia declarada</h2>{mainEvidence.length ? <ul>{mainEvidence.map(({ question, selected }) => <li key={question.id}><strong>P{question.number}:</strong> {selected.label} ({selected.score} punto{selected.score === 1 ? "" : "s"}).</li>)}</ul> : <p>La prioridad proviene de la preocupación principal declarada; no hay respuestas operativas con severidad mayor que cero.</p>}</article>
            <article><h2>Posibles causas</h2>{mainRecommendation.possibleCauses.length ? <ul>{mainRecommendation.possibleCauses.map((cause) => <li key={cause}>{cause} <strong>Hipótesis por validar.</strong></li>)}</ul> : <p>No se activaron causas del contrato aprobado.</p>}</article>
            <article><h2>KPIs aprobados</h2><ul>{mainRecommendation.kpis.map((kpi) => <li key={kpi.name}><strong>{kpi.name}:</strong> {kpi.purpose}</li>)}</ul></article>
            <article><h2>Acciones rápidas</h2><ul>{mainRecommendation.quickActions.map((action) => <li key={action}>{action}</li>)}</ul></article>
            <article><h2>Acciones de mediano plazo</h2><ul>{mainRecommendation.mediumActions.map((action) => <li key={action}>{action}</li>)}</ul></article>
            <article className="full"><h2>Siguiente paso</h2><p>{mainRecommendation.nextStep}</p></article>
          </>}
          <aside className="disclaimer full"><strong>Aviso de resultado preliminar</strong><p>{diagnosticDisclaimer}</p></aside>
        </div> : <div className="report-layout internal-report">
          <article><h2>Información pendiente</h2>{generalResult.pendingInformation.length ? <ul>{generalResult.pendingInformation.map((item) => <li key={item.questionId}>{areaMap[item.areaId].label} · P{questionMap[item.questionId]?.number}: {questionMap[item.questionId]?.text}</li>)}</ul> : <p>Sin respuestas “no se conoce”.</p>}</article>
          <article><h2>Estados y puntajes calculados</h2><ul>{areas.map((area) => <li key={area.id}><strong>{area.label}:</strong> {areaStatusLabels[generalResult.scores[area.id].status]}; {generalResult.scores[area.id].score === null ? "sin puntaje aplicable" : `${generalResult.scores[area.id].score}/7`}.</li>)}</ul></article>
          <article className="full"><h2>Notas, evidencias, contradicciones y causas por validar</h2>{filledObservations.length ? filledObservations.map((item) => <div className="finding" key={item.id}><strong>P{questionMap[item.questionId]?.number} · {areaMap[questionMap[item.questionId].areaId].label} · {confidenceLabels[item.confidence]}</strong>{item.evidenceDescription && <p><b>Evidencia:</b> {item.evidenceDescription}</p>}{item.consultantNote && <p><b>Nota:</b> {item.consultantNote}</p>}{item.contradiction && <p><b>Contradicción:</b> {item.contradiction}</p>}{item.possibleCause && <p><b>Posible causa{item.isHypothesis ? " (hipótesis)" : ""}:</b> {item.possibleCause}</p>}</div>) : <p>No se registraron observaciones internas.</p>}</article>
          <article className="full"><h2>Desempate reproducible</h2><p>Regla aplicada: <strong>{generalResult.tieBreakRule}</strong>. Áreas empatadas inicialmente: {generalResult.initiallyTiedAreas.map((areaId) => areaMap[areaId].label).join(", ") || "ninguna"}.</p></article>
        </div>}
        <div className="sticky-actions"><button className="secondary-button" type="button" onClick={() => navigate("areas")}>Editar áreas</button><button className="secondary-button" type="button" onClick={downloadExport}>Exportar respaldo JSON</button><button className="primary-button" type="button" onClick={() => void returnHome()}>Guardar y volver al historial</button></div>
      </section>}
    </main>
    <AppFooter />
  </div>;
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: ReactNode }) {
  return <label className="field"><span>{label}{required && <i>Obligatorio</i>}</span>{hint && <small>{hint}</small>}{children}</label>;
}

function AppFooter() {
  return <footer><span>Proyecto B · datos guardados localmente · esquema v2</span><a href="./legacy.html">Abrir prototipo anterior</a></footer>;
}
