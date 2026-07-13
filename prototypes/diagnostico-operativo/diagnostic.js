(function initializeDiagnostic(global) {
  "use strict";

  const config = global.DIAGNOSTIC_CONFIG;
  if (!config) throw new Error("No se encontró la configuración del diagnóstico.");
  const questions = config.sections.flatMap((section) => section.questions);
  const questionMap = Object.fromEntries(questions.map((question) => [question.id, question]));

  function findOption(questionId, value) {
    const question = questionMap[questionId];
    return question && question.options.find((item) => item.value === value);
  }

  function validateAnswers(answers) {
    const missing = [];
    const invalid = [];

    questions.forEach((question) => {
      if (!Object.prototype.hasOwnProperty.call(answers, question.id) || answers[question.id] === "") {
        missing.push(question.id);
      } else if (!findOption(question.id, answers[question.id])) {
        invalid.push(question.id);
      }
    });

    return { valid: missing.length === 0 && invalid.length === 0, missing, invalid };
  }

  function priorityFor(score) {
    if (score >= 5) return "alta";
    if (score >= 3) return "media";
    return "baja";
  }

  function calculateDiagnostic(answers) {
    const validation = validateAnswers(answers);
    if (!validation.valid) {
      const error = new Error("Las respuestas están incompletas o contienen valores inválidos.");
      error.validation = validation;
      throw error;
    }

    const scores = Object.fromEntries(Object.keys(config.categories).map((category) => [category, 0]));
    const severeCounts = Object.fromEntries(Object.keys(config.categories).map((category) => [category, 0]));
    const evidence = Object.fromEntries(Object.keys(config.categories).map((category) => [category, []]));
    const concern = answers.q3_mainConcern;
    scores[concern] += 1;

    questions.filter((question) => question.category).forEach((question) => {
      const selected = findOption(question.id, answers[question.id]);
      scores[question.category] += selected.score;
      if (selected.score === 3) severeCounts[question.category] += 1;
      if (selected.score > 0) {
        evidence[question.category].push({ questionId: question.id, question: question.text, answer: selected.label, score: selected.score });
      }
    });

    const maxScore = Math.max(...Object.values(scores));
    const initialTies = Object.keys(scores).filter((category) => scores[category] === maxScore);
    let candidates = [...initialTies];

    if (candidates.length > 1 && candidates.includes(concern)) candidates = [concern];

    if (candidates.length > 1) {
      const maxSevere = Math.max(...candidates.map((category) => severeCounts[category]));
      candidates = candidates.filter((category) => severeCounts[category] === maxSevere);
    }

    const mainCategory = candidates.length === 1
      ? candidates[0]
      : config.tieBreakOrder.find((category) => candidates.includes(category));

    return {
      scores,
      severeCounts,
      evidence,
      concern,
      mainCategory,
      mainScore: scores[mainCategory],
      priority: priorityFor(scores[mainCategory]),
      tiedCategories: initialTies.filter((category) => category !== mainCategory)
    };
  }

  function createReport(answers, result) {
    const category = config.categories[result.mainCategory];
    const businessType = findOption("q1_businessType", answers.q1_businessType).label.toLowerCase();
    const teamSize = findOption("q2_teamSize", answers.q2_teamSize).label;
    const concernLabel = config.categories[answers.q3_mainConcern].label.toLowerCase();
    const categoryEvidence = result.evidence[result.mainCategory];
    const causes = [];

    categoryEvidence.forEach((item) => {
      (category.causeRules[item.questionId] || []).forEach((cause) => causes.push(cause));
    });

    if (causes.length === 0) {
      causes.push("La categoría fue seleccionada como preocupación principal, aunque las respuestas operativas muestran una severidad baja.");
    }

    const evidenceText = categoryEvidence.length
      ? categoryEvidence.map((item) => `${item.answer.toLowerCase()} (${item.score} punto${item.score === 1 ? "" : "s"})`).join(" y ")
      : "la preocupación principal declarada";

    return {
      summary: `Negocio ficticio de ${businessType} con un equipo de ${teamSize} personas. La persona responsable identifica ${concernLabel} como su principal preocupación operativa.`,
      mainProblem: {
        category: category.label,
        score: result.mainScore,
        description: `La categoría obtuvo ${result.mainScore} de 7 puntos a partir de las respuestas declaradas.`
      },
      possibleCauses: causes,
      recommendedKpis: category.kpis.map(([name, purpose]) => ({ name, purpose })),
      quickActions: category.quickActions,
      mediumTermActions: category.mediumActions,
      priority: {
        level: result.priority,
        reason: `El puntaje de ${result.mainScore} se sustenta en ${evidenceText}${result.concern === result.mainCategory ? " y coincide con la preocupación principal declarada" : ""}.`
      },
      recommendedNextStep: category.nextStep,
      secondaryProblems: result.tiedCategories.map((categoryId) => ({ category: config.categories[categoryId].label, score: result.scores[categoryId] })),
      disclaimer: config.disclaimer
    };
  }

  function normalizeFilenamePart(value) {
    const normalized = String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/g, "");

    return normalized || "negocio-ficticio";
  }

  function createExportPayload(businessName, answers, result, report, generatedAt = new Date()) {
    const timestamp = generatedAt instanceof Date ? generatedAt : new Date(generatedAt);
    if (Number.isNaN(timestamp.getTime())) throw new Error("La fecha de generación no es válida.");

    return {
      schemaVersion: 1,
      fechaHoraGeneracion: timestamp.toISOString(),
      negocio: {
        nombre: String(businessName).trim(),
        tipo: findOption("q1_businessType", answers.q1_businessType).label,
        tamanoEquipo: findOption("q2_teamSize", answers.q2_teamSize).label
      },
      respuestas: questions.map((question) => {
        const selected = findOption(question.id, answers[question.id]);
        return {
          id: question.id,
          numero: question.number,
          pregunta: question.text,
          valor: selected.value,
          respuesta: selected.label
        };
      }),
      puntajesPorCategoria: { ...result.scores },
      categoriaPrincipal: {
        codigo: result.mainCategory,
        nombre: config.categories[result.mainCategory].label,
        puntaje: result.mainScore
      },
      problemasSecundarios: result.tiedCategories.map((categoryId) => ({
        codigo: categoryId,
        nombre: config.categories[categoryId].label,
        puntaje: result.scores[categoryId]
      })),
      prioridad: {
        nivel: report.priority.level,
        justificacion: report.priority.reason
      },
      posiblesCausas: [...report.possibleCauses],
      kpisRecomendados: report.recommendedKpis.map((item) => ({ ...item })),
      accionesRapidas: [...report.quickActions],
      accionesMedianoPlazo: [...report.mediumTermActions],
      siguientePasoRecomendado: report.recommendedNextStep,
      aviso: report.disclaimer
    };
  }

  function serializeExport(payload) {
    return `${JSON.stringify(payload, null, 2)}\n`;
  }

  function buildExportFilename(businessName, generatedAt) {
    const date = (generatedAt instanceof Date ? generatedAt : new Date(generatedAt)).toISOString().slice(0, 10);
    return `diagnostico-operativo-${normalizeFilenamePart(businessName)}-${date}.json`;
  }

  function runBuiltInTests() {
    return Object.values(config.testCases).map((testCase) => {
      try {
        const result = calculateDiagnostic(testCase.answers);
        const scoresMatch = Object.keys(testCase.expected.scores).every((category) => result.scores[category] === testCase.expected.scores[category]);
        const passed = result.mainCategory === testCase.expected.category && result.priority === testCase.expected.priority && scoresMatch;
        return { name: testCase.name, passed, result, expected: testCase.expected };
      } catch (error) {
        return { name: testCase.name, passed: false, error: error.message, expected: testCase.expected };
      }
    });
  }

  global.DiagnosticEngine = {
    validateAnswers,
    calculateDiagnostic,
    createReport,
    normalizeFilenamePart,
    createExportPayload,
    serializeExport,
    buildExportFilename,
    runBuiltInTests
  };

  if (typeof document === "undefined") return;

  const form = document.querySelector("#diagnostic-form");
  const questionnaire = document.querySelector("#questionnaire");
  const formError = document.querySelector("#form-error");
  const reportSection = document.querySelector("#report");
  const reportContent = document.querySelector("#report-content");
  const answeredCount = document.querySelector("#answered-count");
  const progressBar = document.querySelector("#progress-bar");
  const progressTrack = document.querySelector(".progress-track");
  const testResults = document.querySelector("#test-results");
  const businessNamePanel = document.querySelector(".business-name-panel");
  const businessNameInput = document.querySelector("#business-name");
  const businessNameError = document.querySelector("#business-name-error");
  const downloadJsonButton = document.querySelector("#download-json-button");
  const reportBusinessName = document.querySelector("#report-business-name");
  const reportDate = document.querySelector("#report-date");
  const modeButtons = [...document.querySelectorAll("[data-app-mode-button]")];
  let generatedExport = null;

  function setAppMode(mode) {
    const nextMode = mode === "internal" ? "internal" : "client";
    document.body.dataset.appMode = nextMode;
    modeButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.appModeButton === nextMode));
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderQuestionnaire() {
    questionnaire.innerHTML = config.sections.map((section) => `
      <section class="question-section" aria-labelledby="section-${section.id}">
        <header class="section-heading">
          <span class="section-index" aria-hidden="true">${String(config.sections.indexOf(section) + 1).padStart(2, "0")}</span>
          <div>
            <h2 id="section-${section.id}">${escapeHtml(section.title)}</h2>
            <p>${escapeHtml(section.description)}</p>
          </div>
        </header>
        <div class="question-grid">
          ${section.questions.map((question) => `
            <fieldset class="question-card" id="card-${question.id}">
              <legend><span>Pregunta ${question.number}</span>${escapeHtml(question.text)}</legend>
              <div class="options">
                ${question.options.map((item) => `
                  <label class="option-label">
                    <input type="radio" name="${question.id}" value="${item.value}">
                    <span class="radio-mark" aria-hidden="true"></span>
                    <span>${escapeHtml(item.label)}</span>
                  </label>
                `).join("")}
              </div>
              <p class="question-error" hidden>Selecciona una respuesta.</p>
            </fieldset>
          `).join("")}
        </div>
      </section>
    `).join("");
  }

  function collectAnswers() {
    const data = new FormData(form);
    return Object.fromEntries(questions.map((question) => [question.id, data.get(question.id) || ""]));
  }

  function updateProgress() {
    const answers = collectAnswers();
    const completed = Object.values(answers).filter(Boolean).length;
    answeredCount.textContent = String(completed);
    progressBar.style.width = `${(completed / questions.length) * 100}%`;
    progressTrack.setAttribute("aria-valuenow", String(completed));
  }

  function clearValidation() {
    formError.hidden = true;
    businessNamePanel.classList.remove("has-error");
    businessNameError.hidden = true;
    businessNameInput.removeAttribute("aria-invalid");
    questions.forEach((question) => {
      const card = document.querySelector(`#card-${question.id}`);
      card.classList.remove("has-error");
      card.querySelector(".question-error").hidden = true;
    });
  }

  function showBusinessNameError() {
    businessNamePanel.classList.add("has-error");
    businessNameError.hidden = false;
    businessNameInput.setAttribute("aria-invalid", "true");
  }

  function showValidation(validation) {
    clearValidation();
    const problemIds = [...validation.missing, ...validation.invalid];
    problemIds.forEach((id) => {
      const card = document.querySelector(`#card-${id}`);
      card.classList.add("has-error");
      card.querySelector(".question-error").hidden = false;
    });
    formError.textContent = `Faltan ${problemIds.length} ${problemIds.length === 1 ? "respuesta" : "respuestas"}. Revisa las preguntas marcadas.`;
    formError.hidden = false;
    formError.focus();
    document.querySelector(`#card-${problemIds[0]}`).scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const listItems = (items) => `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;

  function formatReportDate(value) {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "long",
      timeStyle: "short"
    }).format(value);
  }

  function renderReport(report, result, businessName, generatedAt) {
    const priorityClass = `priority-${report.priority.level}`;
    const secondary = report.secondaryProblems.length
      ? `<div class="secondary-note"><strong>Problemas secundarios empatados:</strong> ${report.secondaryProblems.map((item) => `${escapeHtml(item.category)} (${item.score})`).join(", ")}.</div>`
      : "";

    reportBusinessName.textContent = businessName;
    reportDate.textContent = formatReportDate(generatedAt);
    reportContent.innerHTML = `
      <div class="report-overview">
        <div class="problem-highlight">
          <span>Problema principal</span>
          <strong>${escapeHtml(report.mainProblem.category)}</strong>
          <small>${report.mainProblem.score} / 7 puntos</small>
        </div>
        <div class="priority-highlight ${priorityClass}">
          <span>Prioridad</span>
          <strong>${escapeHtml(report.priority.level)}</strong>
        </div>
      </div>
      <div class="score-grid" aria-label="Puntajes por categoría">
        ${Object.entries(result.scores).map(([category, score]) => `<div><span>${escapeHtml(config.categories[category].label)}</span><strong>${score}/7</strong></div>`).join("")}
      </div>
      <article class="report-card report-card-wide"><span class="report-number">01</span><div><h3>Resumen del negocio</h3><p>${escapeHtml(report.summary)}</p></div></article>
      <article class="report-card"><span class="report-number">02</span><div><h3>Problema principal</h3><p><strong>${escapeHtml(report.mainProblem.category)}.</strong> ${escapeHtml(report.mainProblem.description)}</p>${secondary}</div></article>
      <article class="report-card"><span class="report-number">03</span><div><h3>Posibles causas</h3>${listItems(report.possibleCauses)}<p class="hypothesis-note">Son hipótesis derivadas de las respuestas y deben validarse en la operación.</p></div></article>
      <article class="report-card"><span class="report-number">04</span><div><h3>KPIs recomendados</h3><ul>${report.recommendedKpis.map((item) => `<li><strong>${escapeHtml(item.name)}:</strong> ${escapeHtml(item.purpose)}</li>`).join("")}</ul></div></article>
      <article class="report-card"><span class="report-number">05</span><div><h3>Acciones rápidas</h3>${listItems(report.quickActions)}</div></article>
      <article class="report-card"><span class="report-number">06</span><div><h3>Acciones de mediano plazo</h3>${listItems(report.mediumTermActions)}</div></article>
      <article class="report-card"><span class="report-number">07</span><div><h3>Prioridad del problema</h3><p><strong class="priority-word ${priorityClass}">${escapeHtml(report.priority.level)}</strong> ${escapeHtml(report.priority.reason)}</p></div></article>
      <article class="report-card report-card-wide next-step"><span class="report-number">08</span><div><h3>Siguiente paso recomendado</h3><p>${escapeHtml(report.recommendedNextStep)}</p></div></article>
      <aside class="disclaimer"><strong>Alcance del resultado</strong><p>${escapeHtml(report.disclaimer)}</p></aside>
    `;
    reportSection.hidden = false;
    reportSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function clearGeneratedReport() {
    generatedExport = null;
    downloadJsonButton.disabled = true;
    reportBusinessName.textContent = "—";
    reportDate.textContent = "—";
    reportSection.hidden = true;
  }

  function downloadJson(payload, filename) {
    const blob = new Blob([serializeExport(payload)], { type: "application/json;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    global.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }

  function fillForm(answers, businessName) {
    form.reset();
    businessNameInput.value = businessName;
    Object.entries(answers).forEach(([id, value]) => {
      const input = form.querySelector(`input[name="${id}"][value="${value}"]`);
      if (input) input.checked = true;
    });
    clearValidation();
    clearGeneratedReport();
    updateProgress();
  }

  function showTestResults(results) {
    const passedCount = results.filter((item) => item.passed).length;
    testResults.className = `test-results ${passedCount === results.length ? "tests-passed" : "tests-failed"}`;
    testResults.innerHTML = `<strong>${passedCount}/${results.length} pruebas correctas</strong><ul>${results.map((item) => `<li>${item.passed ? "✓" : "✕"} ${escapeHtml(item.name)}${item.passed ? `: ${escapeHtml(config.categories[item.result.mainCategory].label)}, prioridad ${item.result.priority}.` : `: resultado distinto al esperado${item.error ? ` (${escapeHtml(item.error)})` : ""}.`}</li>`).join("")}</ul>`;
    testResults.hidden = false;
  }

  renderQuestionnaire();
  updateProgress();
  setAppMode("client");

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => setAppMode(button.dataset.appModeButton));
  });

  form.addEventListener("change", (event) => {
    clearGeneratedReport();
    updateProgress();
    if (event.target.matches("input[type='radio']")) {
      const card = event.target.closest(".question-card");
      card.classList.remove("has-error");
      card.querySelector(".question-error").hidden = true;
    }
  });

  businessNameInput.addEventListener("input", () => {
    businessNamePanel.classList.remove("has-error");
    businessNameError.hidden = true;
    businessNameInput.removeAttribute("aria-invalid");
    clearGeneratedReport();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const answers = collectAnswers();
    const validation = validateAnswers(answers);
    const businessName = businessNameInput.value.trim();
    clearValidation();
    if (!validation.valid) showValidation(validation);
    if (!businessName) showBusinessNameError();
    if (!validation.valid || !businessName) {
      if (!businessName) businessNameInput.focus();
      return;
    }
    clearValidation();
    const result = calculateDiagnostic(answers);
    const report = createReport(answers, result);
    const generatedAt = new Date();
    generatedExport = {
      payload: createExportPayload(businessName, answers, result, report, generatedAt),
      filename: buildExportFilename(businessName, generatedAt)
    };
    downloadJsonButton.disabled = false;
    renderReport(report, result, businessName, generatedAt);
  });

  document.querySelector("#reset-button").addEventListener("click", () => {
    const hasAnswers = Object.values(collectAnswers()).some(Boolean);
    if (hasAnswers && !global.confirm("¿Quieres borrar las respuestas actuales y reiniciar el diagnóstico?")) return;
    form.reset();
    clearValidation();
    clearGeneratedReport();
    testResults.hidden = true;
    updateProgress();
    document.querySelector("#inicio").scrollIntoView({ behavior: "smooth" });
  });

  document.querySelectorAll("[data-test-case]").forEach((button) => {
    button.addEventListener("click", () => {
      const fictitiousNames = {
        inventario: "Comercial Horizonte",
        costos: "Servicios Brújula",
        clientes: "Cocina Punto Norte"
      };
      fillForm(config.testCases[button.dataset.testCase].answers, fictitiousNames[button.dataset.testCase]);
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  document.querySelector("#run-tests-button").addEventListener("click", () => showTestResults(runBuiltInTests()));
  downloadJsonButton.addEventListener("click", () => {
    if (!generatedExport) return;
    downloadJson(generatedExport.payload, generatedExport.filename);
  });

})(globalThis);
