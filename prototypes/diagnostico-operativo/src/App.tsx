import { useEffect, useMemo, useState, type ReactNode } from "react";
import { db, listSessions, loadDiagnosticBundle, saveDiagnosticBundle } from "./db";
import { concernOptions, inventoryQuestions, sectorOptions } from "./inventoryQuestions";
import { calculateInventoryScore, priorityLabels } from "./scoring";
import { PwaDebugPanel } from "./PwaDebugPanel";
import type {
  AreaResponse,
  BusinessProfile,
  ConfidenceLevel,
  DiagnosticBundle,
  DiagnosticSession,
  InternalObservation,
  ResponseMode
} from "./models";

type Screen = "home" | "profile" | "area" | "summary";
type SaveState = "idle" | "saving" | "saved" | "error";

interface HistoryItem {
  session: DiagnosticSession;
  businessName: string;
}

const statusLabels = {
  draft: "Borrador",
  in_progress: "En progreso",
  completed: "Completado"
} as const;

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
  isHypothesis: true,
  confidence: "medium",
  updatedAt: new Date().toISOString()
});

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [session, setSession] = useState<DiagnosticSession | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [responses, setResponses] = useState<AreaResponse[]>([]);
  const [observations, setObservations] = useState<InternalObservation[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [readyToSave, setReadyToSave] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [online, setOnline] = useState(navigator.onLine);

  const score = useMemo(
    () => profile ? calculateInventoryScore(profile, responses) : null,
    [profile, responses]
  );

  const loadHistory = async () => {
    const sessions = await listSessions(db);
    const items = await Promise.all(sessions.map(async (item) => ({
      session: item,
      businessName: (await db.businessProfiles.get(item.id))?.name || "Diagnóstico sin nombre"
    })));
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
        session: { ...session, updatedAt },
        profile,
        responses,
        observations
      }).then(() => setSaveState("saved")).catch(() => setSaveState("error"));
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [session, profile, responses, observations, readyToSave]);

  const persistNow = async (bundle?: DiagnosticBundle) => {
    const payload = bundle ?? (session && profile ? { session, profile, responses, observations } : null);
    if (!payload) return;
    setSaveState("saving");
    await saveDiagnosticBundle(db, {
      ...payload,
      session: { ...payload.session, updatedAt: new Date().toISOString() }
    });
    setSaveState("saved");
  };

  const createDiagnostic = async () => {
    const id = makeId();
    const now = new Date().toISOString();
    const newSession: DiagnosticSession = {
      id,
      schemaVersion: 1,
      areaId: "inventario",
      status: "draft",
      consultant: "",
      createdAt: now,
      updatedAt: now,
      completedAt: null
    };
    const newProfile = emptyProfile(id);
    const bundle = { session: newSession, profile: newProfile, responses: [], observations: [] };
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
    setReadyToSave(true);
    setScreen(bundle.session.status === "completed" ? "summary" : "profile");
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

  const markInProgress = () => {
    setSession((current) => current && current.status === "draft"
      ? { ...current, status: "in_progress" }
      : current);
  };

  const updateProfile = <K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K]) => {
    setProfile((current) => current ? { ...current, [key]: value } : current);
    markInProgress();
  };

  const profileComplete = Boolean(profile && session?.consultant.trim() &&
    profile.name.trim() && profile.sector && profile.interviewee.trim() &&
    profile.intervieweeRole.trim() && profile.employees !== null &&
    profile.branches !== null && profile.mainConcernCategory &&
    profile.currentTools.trim() && profile.diagnosticDate);

  const continueToArea = async () => {
    if (!profileComplete) return;
    await persistNow();
    setScreen("area");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const setResponseMode = (questionId: string, mode: ResponseMode) => {
    setResponses((current) => {
      const previous = current.find((item) => item.questionId === questionId);
      const next: AreaResponse = {
        id: `${session!.id}:${questionId}`,
        sessionId: session!.id,
        areaId: "inventario",
        questionId,
        mode,
        value: mode === "normal" ? previous?.value ?? null : null,
        updatedAt: new Date().toISOString()
      };
      return [...current.filter((item) => item.questionId !== questionId), next];
    });
    markInProgress();
  };

  const setResponseValue = (questionId: string, value: string) => {
    setResponses((current) => {
      const next: AreaResponse = {
        id: `${session!.id}:${questionId}`,
        sessionId: session!.id,
        areaId: "inventario",
        questionId,
        mode: "normal",
        value,
        updatedAt: new Date().toISOString()
      };
      return [...current.filter((item) => item.questionId !== questionId), next];
    });
    markInProgress();
  };

  const updateObservation = (
    questionId: string,
    field: keyof Pick<InternalObservation, "consultantNote" | "evidenceDescription" | "possibleCause" | "isHypothesis" | "confidence">,
    value: string | boolean
  ) => {
    setObservations((current) => {
      const previous = current.find((item) => item.questionId === questionId)
        ?? emptyObservation(session!.id, questionId);
      const next = { ...previous, [field]: value, updatedAt: new Date().toISOString() };
      return [...current.filter((item) => item.questionId !== questionId), next];
    });
    markInProgress();
  };

  const canComplete = inventoryQuestions.every((question) => {
    const response = responses.find((item) => item.questionId === question.id);
    return Boolean(response && (response.mode !== "normal" || response.value));
  });

  const completeDiagnostic = async () => {
    if (!canComplete || !session) return;
    const completed: DiagnosticSession = {
      ...session,
      status: "completed",
      completedAt: new Date().toISOString()
    };
    setSession(completed);
    await persistNow({ session: completed, profile: profile!, responses, observations });
    setScreen("summary");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const header = (
    <header className="app-header">
      <button className="brand-button" type="button" onClick={() => void returnHome()} aria-label="Volver al historial">
        <span className="brand-mark">B</span>
        <span><strong>Proyecto B</strong><small>Diagnóstico de Campo V1</small></span>
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
          <div>
            <p className="eyebrow">Herramienta offline-first</p>
            <h1>Diagnóstico operativo para usar en campo.</h1>
            <p>Registra una ficha, evalúa Inventario y continúa el trabajo aunque se pierda la conexión.</p>
          </div>
          <button className="primary-button large" type="button" onClick={() => void createDiagnostic()}>Nuevo diagnóstico</button>
        </section>
        <aside className="privacy-notice"><strong>Prueba vertical</strong><span>Usa datos ficticios durante validación. Todo se guarda únicamente en este dispositivo.</span></aside>
        <section className="history-section" aria-labelledby="history-title">
          <div className="section-title-row"><div><p className="eyebrow">Continuidad local</p><h2 id="history-title">Historial de diagnósticos</h2></div><span>{history.length} registros</span></div>
          {history.length === 0 ? <div className="empty-state"><strong>Aún no hay diagnósticos guardados.</strong><span>Crea el primero para comprobar el guardado automático.</span></div> :
            <div className="history-list">{history.map(({ session: item, businessName }) =>
              <button type="button" className="history-card" key={item.id} onClick={() => void openDiagnostic(item.id)}>
                <span><strong>{businessName}</strong><small>Inventario · {new Date(item.updatedAt).toLocaleString("es-MX")}</small></span>
                <span className={`history-status ${item.status}`}>{statusLabels[item.status]}</span>
              </button>)}</div>}
        </section>
        <PwaDebugPanel />
      </main>
      <AppFooter />
    </div>;
  }

  if (!session || !profile || !score) return null;

  return <div className="app-shell">
    {header}
    <main className="work-page">
      <PwaDebugPanel />
      <nav className="stepper" aria-label="Progreso del diagnóstico">
        <button className={screen === "profile" ? "active" : "done"} type="button" onClick={() => setScreen("profile")}><span>1</span> Ficha</button>
        <button className={screen === "area" ? "active" : screen === "summary" ? "done" : ""} type="button" disabled={!profileComplete} onClick={() => setScreen("area")}><span>2</span> Inventario</button>
        <button className={screen === "summary" ? "active" : ""} type="button" disabled={!canComplete} onClick={() => setScreen("summary")}><span>3</span> Resultado</button>
      </nav>

      {screen === "profile" && <section className="form-section" aria-labelledby="profile-title">
        <div className="page-heading"><p className="eyebrow">Paso 1 de 3</p><h1 id="profile-title">Ficha básica del negocio</h1><p>Completa los campos necesarios para contextualizar el diagnóstico. Para esta prueba usa información ficticia.</p></div>
        <div className="form-grid">
          <Field label="Nombre del negocio" required><input value={profile.name} onChange={(event) => updateProfile("name", event.target.value)} /></Field>
          <Field label="Giro" required><select value={profile.sector} onChange={(event) => updateProfile("sector", event.target.value)}><option value="">Seleccionar</option>{sectorOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          <Field label="Persona entrevistada" required><input value={profile.interviewee} onChange={(event) => updateProfile("interviewee", event.target.value)} /></Field>
          <Field label="Puesto" required><input value={profile.intervieweeRole} onChange={(event) => updateProfile("intervieweeRole", event.target.value)} /></Field>
          <Field label="Número de empleados" required><input type="number" min="1" inputMode="numeric" value={profile.employees ?? ""} onChange={(event) => updateProfile("employees", event.target.value ? Number(event.target.value) : null)} /></Field>
          <Field label="Número de sucursales" required><input type="number" min="1" inputMode="numeric" value={profile.branches ?? ""} onChange={(event) => updateProfile("branches", event.target.value ? Number(event.target.value) : null)} /></Field>
          <Field label="Principal preocupación" required><select value={profile.mainConcernCategory} onChange={(event) => updateProfile("mainConcernCategory", event.target.value as BusinessProfile["mainConcernCategory"])}><option value="">Seleccionar</option>{concernOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          <Field label="Herramientas actuales" hint="Ejemplo ficticio: libreta, Excel, sistema de punto de venta." required><textarea rows={3} value={profile.currentTools} onChange={(event) => updateProfile("currentTools", event.target.value)} /></Field>
          <Field label="Fecha" required><input type="date" value={profile.diagnosticDate} onChange={(event) => updateProfile("diagnosticDate", event.target.value)} /></Field>
          <Field label="Consultor" hint="Dato interno, almacenado por separado de la ficha del negocio." required><input value={session.consultant} onChange={(event) => { setSession({ ...session, consultant: event.target.value, status: "in_progress" }); }} /></Field>
        </div>
        <div className="sticky-actions"><button className="secondary-button" type="button" onClick={() => void returnHome()}>Guardar y salir</button><button className="primary-button" type="button" disabled={!profileComplete} onClick={() => void continueToArea()}>Continuar a Inventario</button></div>
      </section>}

      {screen === "area" && <section className="form-section" aria-labelledby="area-title">
        <div className="page-heading"><p className="eyebrow">Paso 2 de 3 · Área única</p><h1 id="area-title">Inventario</h1><p>Se conservan exactamente las preguntas 6 y 7 y su puntuación original. Cada respuesta admite contexto de campo.</p></div>
        <div className="score-strip"><span>Puntaje preliminar</span><strong>{score.score}/7</strong><span>Prioridad {priorityLabels[score.priority]}</span><small>{score.unknownCount ? `${score.unknownCount} dato(s) pendiente(s)` : "Sin información pendiente"}</small></div>
        <div className="question-stack">{inventoryQuestions.map((question) => {
          const response = responses.find((item) => item.questionId === question.id);
          const observation = observations.find((item) => item.questionId === question.id) ?? emptyObservation(session.id, question.id);
          return <article className="field-question" key={question.id}>
            <header><span>Pregunta {question.number}</span><h2>{question.text}</h2></header>
            <div className="mode-selector" role="group" aria-label={`Tipo de respuesta para pregunta ${question.number}`}>
              <button type="button" className={response?.mode === "normal" ? "selected" : ""} onClick={() => setResponseMode(question.id, "normal")}>Respuesta</button>
              <button type="button" className={response?.mode === "not_applicable" ? "selected" : ""} onClick={() => setResponseMode(question.id, "not_applicable")}>No aplica</button>
              <button type="button" className={response?.mode === "unknown" ? "selected" : ""} onClick={() => setResponseMode(question.id, "unknown")}>No se conoce</button>
            </div>
            {response?.mode === "normal" && <div className="option-list">{question.options.map((option) => <label key={option.value} className={response.value === option.value ? "checked" : ""}><input type="radio" name={question.id} value={option.value} checked={response.value === option.value} onChange={() => setResponseValue(question.id, option.value)} /><span>{option.label}</span><small>{option.score} pts</small></label>)}</div>}
            {response?.mode === "not_applicable" && <p className="mode-explanation">Esta pregunta se excluye: no suma ni resta puntos.</p>}
            {response?.mode === "unknown" && <p className="mode-explanation warning">Se registra como información pendiente y no aporta puntos.</p>}
            {!response && <p className="mode-explanation">Selecciona Respuesta, No aplica o No se conoce.</p>}
            <details className="field-notes" open>
              <summary>Observaciones del consultor</summary>
              <div className="notes-grid">
                <Field label="Evidencia" hint="Solo descripción textual; no se adjuntan archivos en V1."><textarea rows={2} value={observation.evidenceDescription} onChange={(event) => updateObservation(question.id, "evidenceDescription", event.target.value)} /></Field>
                <Field label="Nota del consultor"><textarea rows={2} value={observation.consultantNote} onChange={(event) => updateObservation(question.id, "consultantNote", event.target.value)} /></Field>
                <Field label="Posible causa"><textarea rows={2} value={observation.possibleCause} onChange={(event) => updateObservation(question.id, "possibleCause", event.target.value)} /></Field>
                <Field label="Nivel de confianza"><select value={observation.confidence} onChange={(event) => updateObservation(question.id, "confidence", event.target.value as ConfidenceLevel)}><option value="low">Bajo</option><option value="medium">Medio</option><option value="high">Alto</option></select></Field>
              </div>
              <label className="hypothesis-check"><input type="checkbox" checked={observation.isHypothesis} onChange={(event) => updateObservation(question.id, "isHypothesis", event.target.checked)} /> La posible causa es una hipótesis por validar</label>
            </details>
          </article>;
        })}</div>
        {!canComplete && <p className="completion-hint">Responde las dos preguntas antes de finalizar el área.</p>}
        <div className="sticky-actions"><button className="secondary-button" type="button" onClick={() => setScreen("profile")}>Volver a ficha</button><button className="primary-button" type="button" disabled={!canComplete} onClick={() => void completeDiagnostic()}>Finalizar área</button></div>
      </section>}

      {screen === "summary" && <section className="summary-section" aria-labelledby="summary-title">
        <div className="page-heading"><p className="eyebrow">Resultado preliminar</p><h1 id="summary-title">Inventario · prioridad {priorityLabels[score.priority]}</h1><p>Resultado explicable basado únicamente en las respuestas registradas. No calcula ni inventa impacto económico.</p></div>
        <div className={`result-card priority-${score.priority}`}><div><span>Puntaje</span><strong>{score.score}<small>/7</small></strong></div><div><span>Prioridad</span><strong>{priorityLabels[score.priority]}</strong></div><div><span>Información pendiente</span><strong>{score.unknownCount}</strong></div></div>
        <div className="summary-grid">
          <article><h2>Cómo se calculó</h2><ul>{score.explanation.map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article><h2>Hallazgos de campo</h2>{observations.some((item) => item.consultantNote || item.evidenceDescription || item.possibleCause) ? observations.map((item) => <div className="finding" key={item.id}><strong>{inventoryQuestions.find((question) => question.id === item.questionId)?.number}. {item.confidence === "high" ? "Confianza alta" : item.confidence === "low" ? "Confianza baja" : "Confianza media"}</strong>{item.evidenceDescription && <p><b>Evidencia:</b> {item.evidenceDescription}</p>}{item.consultantNote && <p><b>Nota:</b> {item.consultantNote}</p>}{item.possibleCause && <p><b>Posible causa{item.isHypothesis ? " (hipótesis)" : ""}:</b> {item.possibleCause}</p>}</div>) : <p>No se registraron observaciones adicionales.</p>}</article>
          <article className="full"><h2>Límites del resultado</h2><p>“No aplica” queda fuera del scoring. “No se conoce” queda como información pendiente. Las causas son observaciones o hipótesis y deben validarse. Este resultado no sustituye una evaluación operativa profesional.</p></article>
        </div>
        <div className="sticky-actions"><button className="secondary-button" type="button" onClick={() => setScreen("area")}>Editar respuestas</button><button className="primary-button" type="button" onClick={() => void returnHome()}>Guardar y volver al historial</button></div>
      </section>}
    </main>
    <AppFooter />
  </div>;
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: ReactNode }) {
  return <label className="field"><span>{label}{required && <i>Obligatorio</i>}</span>{hint && <small>{hint}</small>}{children}</label>;
}

function AppFooter() {
  return <footer><span>Proyecto B · datos guardados localmente</span><a href="./legacy.html">Abrir prototipo anterior</a></footer>;
}
