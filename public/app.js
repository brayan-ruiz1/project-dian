const app = document.querySelector("#app");
const sectionNav = document.querySelector("#section-nav");
const breadcrumb = document.querySelector("#breadcrumb-current");
const saveStatus = document.querySelector("#save-status");
const toast = document.querySelector("#toast");
const menu = document.querySelector("#sidebar");
const menuToggle = document.querySelector("#menu-toggle");
const menuClose = document.querySelector("#sidebar-close");
const menuBackdrop = document.querySelector("#sidebar-backdrop");
const themeToggle = document.querySelector("#theme-toggle");

let guide;
let progress;
let view = { name: "home" };
let quiz = null;
let toastTimer;
let examTimer;

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));
const uniquePracticeKey = (question = {}) => {
  const normalize = (value) => String(value || "").trim().toLocaleLowerCase("es").replace(/\s+/g, " ");
  return JSON.stringify({
    case: normalize(question.case || question.scenario),
    prompt: normalize(question.prompt || question.question),
    options: (question.options || []).map(normalize).sort(),
    correctOption: normalize(question.options?.[question.answer]),
  });
};
const uniqueQuestionsForIndicator = (indicator) => {
  if (!indicator || indicator.study?.reflections) return [];
  const seen = new Set();
  return [...indicator.questions, ...(indicator.study?.checks || [])].filter((question) => {
    const key = uniquePracticeKey(question);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
const allQuestions = () => guide.indicators.flatMap((indicator) =>
  (indicator.study?.reflections ? [] : uniqueQuestionsForIndicator(indicator))
    .map((question, index) => ({ ...question, indicatorId: indicator.id, index, indicatorTitle: indicator.title })),
);
const getIndicator = (id) => guide.indicators.find((indicator) => indicator.id === id);
const getSection = (id) => guide.sections.find((section) => section.id === id);
const questionKey = (indicatorId, index) => `${indicatorId}:${index}`;
const PROGRESS_STORAGE_KEY = "dian2676-progress-v1";
const THEME_STORAGE_KEY = "dian2676-theme-v1";
const emptyProgress = () => ({ answers: {}, completedSections: [], updatedAt: null });
const answeredCount = () => Object.keys(progress.answers).length;
const correctCount = () => Object.values(progress.answers).filter((answer) => answer.correct).length;
const practiceCount = (indicator) => indicator.study?.reflections?.length
  ?? uniqueQuestionsForIndicator(indicator).length;

function indicatorPracticeKeys(indicator) {
  if (!indicator || indicator.study?.reflections) return [];
  return uniqueQuestionsForIndicator(indicator).map((_, index) => questionKey(indicator.id, index));
}

function autoCompleteIndicator(indicatorId, force = false) {
  if (!indicatorId) return false;
  const indicator = getIndicator(indicatorId);
  if (!indicator) return false;
  const practiceKeys = indicatorPracticeKeys(indicator);
  const isDone = force || (practiceKeys.length
    ? practiceKeys.every((key) => Object.prototype.hasOwnProperty.call(progress.answers, key))
    : progress.completedSections.includes(indicatorId));
  if (isDone && !progress.completedSections.includes(indicatorId)) {
    progress.completedSections.push(indicatorId);
  }
  return isDone;
}

function scrollToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
}

function applyTheme(themeName) {
  const theme = themeName === "dark" ? "dark" : "light";
  document.body.classList.toggle("theme-dark", theme === "dark");
  document.body.dataset.theme = theme;
  if (themeToggle) {
    themeToggle.textContent = theme === "dark" ? "🌙" : "☀️";
    themeToggle.setAttribute("aria-label", theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
  }
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function toggleTheme() {
  const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
}

function closeMobileMenu() {
  menu.classList.remove("open");
  menuBackdrop.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Abrir menú");
  document.body.classList.remove("menu-open");
}

function toggleMobileMenu() {
  const isOpen = menu.classList.toggle("open");
  menuBackdrop.classList.toggle("open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
  document.body.classList.toggle("menu-open", isOpen);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "No se pudo completar la solicitud.");
  return payload;
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
}

async function saveProgress() {
  saveStatus.textContent = "Guardando...";
  try {
    progress.updatedAt = new Date().toISOString();
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    saveStatus.textContent = "Progreso guardado en este dispositivo";
  } catch (error) {
    saveStatus.textContent = "Error al guardar";
    notify(`No se pudo guardar el avance: ${error.message}`);
  }
}

function setActiveNav(name, sectionId) {
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.view === name || (name === "section" && link.dataset.section === sectionId));
  });
}

function goHome() {
  clearInterval(examTimer);
  view = { name: "home" };
  quiz = null;
  breadcrumb.textContent = "Mi ruta";
  setActiveNav("home");
  closeMobileMenu();
  renderHome();
}

function renderNavigation() {
  sectionNav.innerHTML = guide.sections.map((section) => {
    const total = guide.indicators.filter((item) => item.section === section.id).length;
    const done = guide.indicators.filter((item) => item.section === section.id && progress.completedSections.includes(item.id)).length;
    return `<button class="nav-link" data-section="${esc(section.id)}"><span class="nav-icon">${esc(section.icon)}</span>${esc(section.title)}<span class="nav-arrow">${done ? `${done}/${total}` : ""}</span></button>`;
  }).join("");
}

function sectionCard(section) {
  const indicators = guide.indicators.filter((item) => item.section === section.id);
  const done = indicators.filter((item) => progress.completedSections.includes(item.id)).length;
  const percent = indicators.length ? Math.round(done / indicators.length * 100) : 0;
  return `<button class="section-card" data-section="${esc(section.id)}">
    <div class="section-card-top"><span class="section-icon tone-${esc(section.color)}">${esc(section.icon)}</span><span class="section-count">${indicators.length} temas</span></div>
    <h3>${esc(section.title)}</h3>
    <div class="mini-progress"><span>${done} de ${indicators.length} estudiados</span><span class="progress-track"><span class="progress-fill" style="width:${percent}%"></span></span><span>${percent}%</span></div>
  </button>`;
}

function renderHome() {
  const completed = progress.completedSections.length;
  const totalQuestions = allQuestions().length + guide.indicators.reduce((sum, indicator) => sum + (indicator.study?.reflections?.length || 0), 0);
  const next = guide.indicators.find((indicator) => !progress.completedSections.includes(indicator.id)) || guide.indicators[0];
  const lastSection = getSection(next.section);
  const finalSimulation = guide.exam?.finalSimulation || { title: "Simulacro final tipo PJS", questionCount: 30, timeMinutes: 45 };
  app.innerHTML = `
    <section class="hero">
      <div class="hero-copy">
        <div class="eyebrow">TU PREPARACIÓN · DIAN 2676</div>
        <div class="hero-title"><h1>Prepárate con propósito.</h1><span class="hero-pill">GESTOR I</span></div>
        <p>Una ruta de estudio por indicadores, con material de repaso y ejercicios para detectar vacíos y llevar tu avance a tu ritmo.</p>
      </div>
      <div class="hero-actions" style="display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end">
        <button class="hero-action" data-action="exam">Practicar preguntas <span aria-hidden="true">→</span></button>
        <button class="hero-action" data-action="final-simulation" style="background:linear-gradient(135deg,#1f7bd0,#5e42c4)">Simulacro final PJS <span aria-hidden="true">→</span></button>
      </div>
    </section>
    <section class="panel" style="margin:16px 0;border-left:4px solid #5856a6">
      <div class="eyebrow">FORMATO OFICIAL DE LA PRUEBA · SEGÚN LA GUÍA CNSC</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-top:10px">
        <div><strong>Competencias funcionales</strong><p class="subtle" style="margin:5px 0 0">PJS: un caso, un enunciado y tres opciones; una respuesta efectiva.</p></div>
        <div><strong>Comportamentales e integridad</strong><p class="subtle" style="margin:5px 0 0">Afirmaciones con escala Likert de cuatro niveles; no hay respuestas correctas o incorrectas.</p></div>
        <div><strong>Aplicación</strong><p class="subtle" style="margin:5px 0 0">${esc(new Date(`${guide.exam.examDate}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }))} · ${esc(guide.exam.examDuration)}. Verifica la citación en SIMO.</p></div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:14px">${(guide.exam.focusAreas || []).map((area) => `<span class="section-count">${esc(area)}</span>`).join("")}</div>
      <div class="section-heading" style="margin-top:12px"><div><strong>Simulacro final recomendado</strong><p class="subtle" style="margin:5px 0 0">${esc(finalSimulation.description || "Práctica orientada a los temas más probables de la prueba.")}</p></div><button class="primary-button" data-action="final-simulation">Iniciar ${esc(finalSimulation.title || "simulacro")}</button></div>
      <p class="subtle" style="font-size:11px;margin:12px 0 0">Este banco es material independiente de práctica: no es el banco oficial ni reproduce preguntas reservadas. El modo aleatorio de esta aplicación ayuda a repasar contenidos, pero no equivale a una PJS oficial.</p>
    </section>
    <section class="stats-grid" aria-label="Resumen del progreso">
      <article class="stat-card"><span class="stat-icon">▦</span><div><div class="stat-value">${completed}<span style="color:#9ba2b2;font-size:13px"> / ${guide.indicators.length}</span></div><div class="stat-label">TEMAS ESTUDIADOS</div></div></article>
      <article class="stat-card"><span class="stat-icon green">✓</span><div><div class="stat-value">${correctCount()}</div><div class="stat-label">RESPUESTAS CORRECTAS</div></div></article>
      <article class="stat-card"><span class="stat-icon orange">◷</span><div><div class="stat-value">${answeredCount()}</div><div class="stat-label">PREGUNTAS PRACTICADAS</div></div></article>
      <article class="stat-card"><span class="stat-icon blue">◎</span><div><div class="stat-value">${totalQuestions}</div><div class="stat-label">EJERCICIOS Y AFIRMACIONES</div></div></article>
    </section>
    <section>
      <div class="section-heading"><div><h2>Tu ruta de estudio</h2><p class="subtle">Explora cada sección y avanza tema por tema.</p></div><button class="text-button" data-action="all-indicators">Ver todos los indicadores →</button></div>
      <div class="section-grid">${guide.sections.map(sectionCard).join("")}</div>
    </section>
    <section class="dashboard-bottom">
      <article class="panel">
        <div class="eyebrow">SIGUIENTE PASO</div>
        <div class="continue-row"><span class="continue-mark">${esc(lastSection.icon)}</span><div><strong>${esc(next.title)}</strong><small>${esc(lastSection.title)} · ${practiceCount(next)} ${next.study?.reflections ? "afirmaciones" : "ejercicios"}</small></div><button class="small-button" data-indicator="${esc(next.id)}">Continuar →</button></div>
      </article>
      <article class="panel">
        <div class="eyebrow">DATOS DEL PROCESO</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:13px">
          <div><small class="stat-label">OPEC</small><strong style="display:block;margin-top:4px;font-size:11px">${esc(guide.exam.opec)}</strong></div>
          <div><small class="stat-label">INSCRIPCIÓN</small><strong style="display:block;margin-top:4px;font-size:11px">${esc(guide.exam.registration)}</strong></div>
          <div><small class="stat-label">FICHA DIAN</small><strong style="display:block;margin-top:4px;font-size:11px">${esc(guide.exam.manualSheet)}</strong></div>
          <div><small class="stat-label">NIVEL</small><strong style="display:block;margin-top:4px;font-size:11px">${esc(guide.exam.level)}</strong></div>
          <div><small class="stat-label">SUBPROCESO</small><strong style="display:block;margin-top:4px;font-size:11px">${esc(guide.exam.processArea)}</strong></div>
          <div><small class="stat-label">DENOMINACIÓN</small><strong style="display:block;margin-top:4px;font-size:11px">${esc(guide.exam.position)}</strong></div>
        </div>
      </article>
    </section>
    <section style="margin-top:22px"><div class="section-heading"><div><h2>Fuentes para profundizar</h2><p class="subtle">Confirma siempre la vigencia de normas y procedimientos.</p></div></div>
      <div class="panel" style="display:flex;flex-wrap:wrap;gap:9px">${guide.sources.map((source) => `<a class="small-button" href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.name)} ↗</a>`).join("")}</div>
    </section>`;
  renderNavigation();
}

function openSection(sectionId, search = "") {
  const section = getSection(sectionId);
  if (!section) return;
  view = { name: "section", sectionId };
  breadcrumb.textContent = section.title;
  setActiveNav("section", sectionId);
  closeMobileMenu();
  renderSection(sectionId, search);
}

function renderSection(sectionId, search = "") {
  const section = getSection(sectionId);
  if (!section) return;
  const indicators = guide.indicators.filter((item) => item.section === sectionId
    && (!search || item.title.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es"))));
  scrollToTop();
  const total = guide.indicators.filter((item) => item.section === sectionId).length;
  const done = guide.indicators.filter((item) => item.section === sectionId && progress.completedSections.includes(item.id)).length;
  app.innerHTML = `
    <div class="eyebrow">${esc(section.title)} · ${total} INDICADORES</div>
    <div class="section-heading" style="margin:8px 0 14px"><div><h1 style="font-size:27px">${esc(section.title)}</h1><p class="subtle">Estudia los conceptos y comprueba lo aprendido con preguntas de opción múltiple.</p></div><button class="primary-button" data-action="section-exam" data-section="${esc(section.id)}">Practicar sección →</button></div>
    <div class="panel" style="margin-bottom:14px;padding:14px 17px"><div class="mini-progress"><strong style="color:#48546c">${done} de ${total} temas estudiados</strong><span class="progress-track"><span class="progress-fill" style="width:${total ? done / total * 100 : 0}%"></span></span><span>${total ? Math.round(done / total * 100) : 0}%</span></div></div>
    <div class="search-row"><div class="eyebrow">CONTENIDO DE LA SECCIÓN</div><input class="search-input" id="indicator-search" type="search" placeholder="Buscar indicador..." value="${esc(search)}" aria-label="Buscar indicador"></div>
    <div class="indicator-list">${indicators.length ? indicators.map((indicator) => `<button class="indicator-row" data-indicator="${esc(indicator.id)}"><span class="row-icon">${progress.completedSections.includes(indicator.id) ? "✓" : "▤"}</span><span><strong>${esc(indicator.title)}</strong><small>${esc(indicator.type)} · ${practiceCount(indicator)} ${indicator.study?.reflections ? "afirmaciones" : "ejercicios"} · ${progress.completedSections.includes(indicator.id) ? "Estudiado" : "Por estudiar"}</small></span><span class="row-arrow">→</span></button>`).join("") : `<div class="empty-state">No se encontraron indicadores con esa búsqueda.</div>`}</div>`;
  const searchInput = document.querySelector("#indicator-search");
  searchInput.addEventListener("input", (event) => renderSection(sectionId, event.target.value));
  searchInput.focus();
  searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
}

function renderAllIndicators(search = "") {
  const matches = guide.indicators.filter((indicator) => !search
    || indicator.title.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es")));
  scrollToTop();
  view = { name: "all-indicators" };
  breadcrumb.textContent = "Todos los indicadores";
  setActiveNav("home");
  app.innerHTML = `
    <div class="eyebrow">MAPA DE CONTENIDOS · ${guide.indicators.length} INDICADORES</div>
    <div class="section-heading" style="margin:8px 0 12px"><div><h1 style="font-size:27px">Todos los indicadores</h1><p class="subtle">Cada tema incluye una guía breve, claves prácticas y ejercicios independientes de repaso.</p></div><button class="primary-button" data-action="exam">Repaso funcional →</button></div>
    <div class="search-row"><div class="eyebrow">BUSCAR POR TEMA</div><input class="search-input" id="indicator-search" type="search" placeholder="Buscar indicador..." value="${esc(search)}" aria-label="Buscar indicador"></div>
    ${guide.sections.map((section) => {
      const items = matches.filter((indicator) => indicator.section === section.id);
      if (!items.length) return "";
      return `<section style="margin:16px 0"><div class="eyebrow" style="margin:0 0 8px">${esc(section.title)}</div><div class="indicator-list">${items.map((indicator) => `<button class="indicator-row" data-indicator="${esc(indicator.id)}"><span class="row-icon">${progress.completedSections.includes(indicator.id) ? "✓" : esc(section.icon)}</span><span><strong>${esc(indicator.title)}</strong><small>${esc(indicator.type)} · ${practiceCount(indicator)} ${indicator.study?.reflections ? "afirmaciones" : "ejercicios"}</small></span><span class="row-arrow">→</span></button>`).join("")}</div></section>`;
    }).join("")}
    ${matches.length ? "" : `<div class="empty-state">No se encontraron indicadores con esa búsqueda.</div>`}`;
  const input = document.querySelector("#indicator-search");
  input.addEventListener("input", (event) => renderAllIndicators(event.target.value));
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
}

function renderLesson(indicatorId) {
  const indicator = getIndicator(indicatorId);
  if (!indicator) return;
  const completed = autoCompleteIndicator(indicatorId);
  const section = getSection(indicator.section);
  const ordered = guide.indicators.filter((item) => item.section === indicator.section);
  const index = ordered.findIndex((item) => item.id === indicatorId);
  const previous = ordered[index - 1];
  const next = ordered[index + 1];
  const practiceQuestions = indicator.study?.reflections ? [] : uniqueQuestionsForIndicator(indicator);
  const answeredHere = Object.keys(progress.answers).filter((key) => key.startsWith(`${indicator.id}:`)).length;
  view = { name: "lesson", indicatorId };
  breadcrumb.textContent = indicator.title;
  setActiveNav("section", indicator.section);
  closeMobileMenu();
  app.innerHTML = `
    <div class="lesson-header"><span class="section-icon tone-${esc(section.color)}">${esc(section.icon)}</span><div><div class="eyebrow">${esc(section.title)} · ${esc(indicator.type)}</div><h1>${esc(indicator.title)}</h1></div></div>
    <div class="lesson-layout">
      <div>
        <article class="lesson-card">
          <h2>La idea clave</h2><p class="lead">${esc(indicator.summary)}</p>
          <h2>Lo que debes dominar</h2><ul class="point-list">${indicator.points.map((point) => `<li>${esc(point)}</li>`).join("")}</ul>
          <div class="tip-box"><strong>Cómo llevarlo a la prueba</strong><ul class="check-list">${indicator.practice.map((tip) => `<li>• ${esc(tip)}</li>`).join("")}</ul></div>
          ${indicator.workedExample ? `<article class="worked-example"><h2>${esc(indicator.workedExample.title)}</h2><p>${esc(indicator.workedExample.case)}</p><ol>${indicator.workedExample.steps.map((step) => `<li>${esc(step)}</li>`).join("")}</ol><p class="example-caveat">${esc(indicator.workedExample.caveat)}</p><a href="${esc(indicator.workedExample.source)}" target="_blank" rel="noopener noreferrer">Consultar fuente normativa: Estatuto Tributario, art. 26 ↗</a></article>` : ""}
          ${indicator.study ? `<section class="deep-study"><div class="eyebrow">ESTUDIO EN PROFUNDIDAD</div><h2>${esc(indicator.study.objective)}</h2><div class="study-columns"><article><h3>Conocimientos que debes dominar</h3><ul>${indicator.study.essentials.map((text) => `<li>${esc(text)}</li>`).join("")}</ul></article><article><h3>Ruta de análisis</h3><ol>${indicator.study.route.map((text) => `<li>${esc(text)}</li>`).join("")}</ol></article></div><article class="study-pitfalls"><h3>Errores y confusiones frecuentes</h3><ul>${indicator.study.pitfalls.map((text) => `<li>${esc(text)}</li>`).join("")}</ul></article>${indicator.study.caseStudy ? `<details class="study-case"><summary>Ver caso analizado</summary><p><strong>Situación:</strong> ${esc(indicator.study.caseStudy.scenario)}</p><p><strong>Análisis:</strong> ${esc(indicator.study.caseStudy.why)}</p></details>` : ""}<div class="study-references"><h3>Fuentes para profundizar</h3>${indicator.study.references.map((source) => `<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.name)} ↗</a>`).join("")}</div></section>` : ""}
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:18px"><span class="subtle" style="font-size:10px">¿Terminaste de estudiar este tema?</span><button class="${completed || progress.completedSections.includes(indicator.id) ? "secondary-button" : "small-button"}" data-action="toggle-complete" data-indicator="${esc(indicator.id)}">${completed || progress.completedSections.includes(indicator.id) ? "✓ Tema estudiado" : "Marcar como estudiado"}</button></div>
        </article>
        ${indicator.study?.reflections ? `<section class="reflection-practice"><div class="section-heading"><div><h2>Autorreporte de práctica</h2><p class="subtle">La prueba oficial usa afirmaciones tipo Likert. No hay respuestas correctas: responde pensando en tu conducta habitual.</p></div></div>${indicator.study.reflections.map((statement, statementIndex) => `<article class="reflection-item" data-reflection="${statementIndex}"><p>${esc(statement)}</p><div class="likert-options">${["Totalmente en desacuerdo", "En desacuerdo", "De acuerdo", "Totalmente de acuerdo"].map((label) => `<button type="button" data-likert="${esc(label)}">${esc(label)}</button>`).join("")}</div></article>`).join("")}</section>` : `<section class="practice-list"><div class="section-heading"><div><h2>Comprueba lo aprendido</h2><p class="subtle">Preguntas de práctica con explicación. Los casos de este banco son originales y no oficiales.</p></div></div>
          ${practiceQuestions.map((question, questionIndex) => {
            const saved = progress.answers[questionKey(indicator.id, questionIndex)];
            const selected = saved ? question.options.indexOf(saved.selected) : -1;
            return `<article class="question-card" data-practice="${esc(indicator.id)}" data-index="${questionIndex}">
              <div class="question-top"><span class="question-number">PREGUNTA ${String(questionIndex + 1).padStart(2, "0")}</span><span class="section-count">Ejercicio de repaso</span></div>
              ${question.case ? `<p class="question-case">${esc(question.case)}</p>` : ""}
              <p class="question-prompt">${esc(question.prompt)}</p>
              <div class="options">${question.options.map((option, optionIndex) => `<button class="option ${selected === optionIndex ? (optionIndex === question.answer ? "correct" : "incorrect") : ""} ${saved && optionIndex === question.answer ? "correct" : ""}" data-practice-option="${optionIndex}" ${saved ? "disabled" : ""}><span class="option-letter">${"ABCD"[optionIndex]}</span><span>${esc(option)}</span></button>`).join("")}</div>
              ${saved ? `<div class="feedback ${saved.correct ? "good" : "bad"}"><span>${saved.correct ? "✓" : "↗"}</span><span><strong>${saved.correct ? "¡Correcto!" : "Repasa este punto"}</strong>${esc(question.why)}</span></div>` : ""}
            </article>`;
          }).join("")}
        </section>`}
        <div class="lesson-nav"><button class="secondary-button" data-section="${esc(section.id)}">← Volver a ${esc(section.title)}</button><div style="display:flex;gap:8px">${previous ? `<button class="secondary-button" data-indicator="${esc(previous.id)}">← Anterior</button>` : ""}${next ? `<button class="primary-button" data-action="advance-indicator" data-current-indicator="${esc(indicator.id)}" data-indicator="${esc(next.id)}">Siguiente tema →</button>` : ""}</div></div>
      </div>
      <aside class="lesson-aside">
        <article class="aside-card"><div class="eyebrow">INDICADOR</div><h3 style="margin-top:8px">${esc(indicator.type)}</h3><p>Evalúa comprensión y aplicación práctica de este contenido.</p></article>
        <article class="aside-card"><div class="eyebrow">${indicator.study?.reflections ? "AFIRMACIONES DE PRÁCTICA" : "PREGUNTAS DE PRÁCTICA"}</div><h3 style="margin-top:8px">${indicator.study?.reflections ? `${indicator.study.reflections.length} afirmaciones` : `${practiceQuestions.length} ejercicios`}</h3><p>${indicator.study?.reflections ? "Ejercicio de autorreflexión sin puntaje ni clave de respuestas." : "Material didáctico independiente; no son ítems oficiales."}</p>${!indicator.study?.reflections ? `<button class="secondary-button" data-action="reset-indicator-practice" data-indicator="${esc(indicator.id)}">Repetir las preguntas</button>` : ""}</article>
        <article class="aside-card"><div class="eyebrow">RECUERDA</div><p>En los casos normativos, identifica la fecha de los hechos y verifica el texto vigente antes de aplicar una regla.</p></article>
      </aside>
    </div>`;
}

function shuffled(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const PRIORITY_INDICATORS = new Set([
  "obligaciones-tributarias",
  "liquidacion-impuestos",
  "sanciones",
  "fiscalizacion",
  "determinacion-control-tributario",
  "fiscalizacion-aduanera",
  "cambiaria",
  "estructura-dian",
  "mision-dian",
  "procedimiento-administrativo",
  "transparencia-acceso",
  "razonamiento",
  "lavado-activos",
  "auditoria",
  "constitucion-estado",
]);

function buildWeightedPool() {
  return allQuestions().flatMap((question) => {
    const weight = PRIORITY_INDICATORS.has(question.indicatorId) ? 3 : 1;
    return Array.from({ length: weight }, () => question);
  });
}

function startExam(sectionId = null) {
  clearInterval(examTimer);
  const source = allQuestions().filter((question) => {
    const type = getIndicator(question.indicatorId).type;
    const functional = type !== "Competencia conductual" && type !== "Integridad";
    return functional && (!sectionId || getIndicator(question.indicatorId).section === sectionId);
  });
  const practiceItems = shuffled(source).slice(0, sectionId ? source.length : Math.min(50, source.length));
  const questions = practiceItems.map((question) => {
    const distractors = question.options.map((_, index) => index).filter((index) => index !== question.answer);
    const optionIndexes = shuffled([question.answer, ...shuffled(distractors).slice(0, 2)]);
    return { ...question, options: optionIndexes.map((index) => question.options[index]), answer: optionIndexes.indexOf(question.answer) };
  });
  if (!questions.length) {
    notify("Este eje se prepara con afirmaciones de auto-reporte, no con preguntas de respuesta correcta. Consulta los ejercicios en la ficha del indicador.");
    return;
  }
  quiz = {
    sectionId,
    title: sectionId ? `Repaso: ${getSection(sectionId).title}` : "Repaso funcional aleatorio",
    questions,
    answers: {},
    current: 0,
    secondsLeft: Math.max(10 * 60, questions.length * 75),
    isOfficialSimulation: false,
  };
  view = { name: "quiz" };
  breadcrumb.textContent = "Repaso funcional";
  setActiveNav("exam");
  closeMobileMenu();
  renderQuiz();
  examTimer = setInterval(() => {
    if (!quiz) return;
    quiz.secondsLeft -= 1;
    const timer = document.querySelector("#quiz-timer");
    if (timer) timer.textContent = formatTime(quiz.secondsLeft);
    if (quiz.secondsLeft <= 0) finishExam();
  }, 1000);
}

function startFinalSimulation() {
  clearInterval(examTimer);
  const pool = shuffled(buildWeightedPool()).filter((question) => {
    const type = getIndicator(question.indicatorId).type;
    return type !== "Competencia conductual" && type !== "Integridad";
  });
  const target = Math.min(guide.exam?.finalSimulation?.questionCount || 30, pool.length);
  const questions = shuffled(pool).slice(0, target).map((question) => {
    const distractors = question.options.map((_, index) => index).filter((index) => index !== question.answer);
    const optionIndexes = shuffled([question.answer, ...shuffled(distractors).slice(0, 2)]);
    return { ...question, options: optionIndexes.map((index) => question.options[index]), answer: optionIndexes.indexOf(question.answer) };
  });
  if (!questions.length) {
    notify("No hay suficientes preguntas funcionales para construir el simulacro final. Revisa los indicadores de estudio.");
    return;
  }
  quiz = {
    sectionId: null,
    title: guide.exam?.finalSimulation?.title || "Simulacro final tipo PJS",
    questions,
    answers: {},
    current: 0,
    secondsLeft: Math.max(18 * 60, (guide.exam?.finalSimulation?.timeMinutes || 45) * 60),
    isOfficialSimulation: true,
  };
  view = { name: "quiz" };
  breadcrumb.textContent = "Simulacro final";
  setActiveNav("exam");
  closeMobileMenu();
  renderQuiz();
  examTimer = setInterval(() => {
    if (!quiz) return;
    quiz.secondsLeft -= 1;
    const timer = document.querySelector("#quiz-timer");
    if (timer) timer.textContent = formatTime(quiz.secondsLeft);
    if (quiz.secondsLeft <= 0) finishExam();
  }, 1000);
}

function formatTime(seconds) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function renderQuiz() {
  if (!quiz) return;
  const item = quiz.questions[quiz.current];
  const answered = Object.keys(quiz.answers).length;
  const progressPercent = answered / quiz.questions.length * 100;
  const examMode = quiz.isOfficialSimulation ? "MODO SIMULACRO FINAL · TIPO PJS" : "MODO DE REPASO · NO OFICIAL";
  const examText = quiz.isOfficialSimulation
    ? "Ejercicio orientado al formato de la prueba: caso, enunciado y tres opciones. Está diseñado para reforzar los temas más probables de DIAN 2676, pero no sustituye el banco oficial ni la citación del SIMO."
    : "Repasa conceptos funcionales con tres alternativas por ejercicio. Estos ítems son preguntas didácticas de conocimiento, no casos PJS oficiales. Puedes volver a preguntas anteriores; al finalizar verás tu resultado de práctica y las explicaciones.";
  app.innerHTML = `
    <section class="exam-intro"><div class="eyebrow" style="color:#c3c7ff">${examMode}</div><h1>${esc(quiz.title)}</h1><p>${examText}</p></section>
    <div class="exam-controls"><span class="section-count">${quiz.questions.length} preguntas</span><span class="section-count">·</span><span class="section-count">Opción múltiple</span><span style="margin-left:auto" class="section-count">Tiempo disponible</span><strong id="quiz-timer" style="font-size:12px;color:#49536b">${formatTime(quiz.secondsLeft)}</strong><button class="text-button" data-action="exit-quiz">Salir</button></div>
    <div class="exam-progress"><span>Pregunta ${quiz.current + 1} de ${quiz.questions.length}</span><span class="progress-track"><span class="progress-fill" style="width:${(quiz.current + 1) / quiz.questions.length * 100}%"></span></span><span>${answered} respondidas</span></div>
    <article class="question-card exam-card">
      <div class="question-top"><span class="question-number">${esc(item.indicatorTitle.toLocaleUpperCase("es"))}</span><span class="section-count">${quiz.answers[quiz.current] === undefined ? "Pendiente" : "Respondida"}</span></div>
      ${item.case ? `<p class="question-case">${esc(item.case)}</p>` : ""}
      <p class="question-prompt">${esc(item.prompt)}</p>
      <div class="options">${item.options.map((option, index) => `<button class="option ${quiz.answers[quiz.current] === index ? "selected" : ""}" data-quiz-option="${index}"><span class="option-letter">${"ABCD"[index]}</span><span>${esc(option)}</span></button>`).join("")}</div>
    </article>
    <div class="exam-actions"><button class="secondary-button" data-action="previous-question" ${quiz.current === 0 ? "disabled" : ""}>← Anterior</button><div class="right-actions">${quiz.current < quiz.questions.length - 1 ? `<button class="primary-button" data-action="next-question">Siguiente →</button>` : `<button class="primary-button" data-action="finish-quiz">${answered === quiz.questions.length ? "Finalizar repaso" : "Finalizar con pendientes"}</button>`}</div></div>`;
}

async function finishExam() {
  if (!quiz) return;
  clearInterval(examTimer);
  const finished = quiz;
  const correct = finished.questions.reduce((total, question, index) =>
    total + (finished.answers[index] === question.answer ? 1 : 0), 0);
  finished.questions.forEach((question, index) => {
    const selectedIndex = finished.answers[index];
    if (selectedIndex !== undefined) {
      progress.answers[questionKey(question.indicatorId, question.index)] = {
        selected: question.options[selectedIndex],
        correct: selectedIndex === question.answer,
        answeredAt: new Date().toISOString(),
      };
    }
    autoCompleteIndicator(question.indicatorId);
  });
  await saveProgress();
  quiz = null;
  view = { name: "result" };
  breadcrumb.textContent = "Resultado";
  const percentage = Math.round(correct / finished.questions.length * 100);
  const resultBadge = finished.isOfficialSimulation ? "SIMULACRO FINAL CERRADO · NO ES PUNTAJE OFICIAL" : "REPASO TERMINADO · NO ES PUNTAJE OFICIAL";
  app.innerHTML = `
    <section class="result-hero"><div class="eyebrow" style="color:#c6c8f6">${resultBadge}</div><h1>${esc(finished.title)}</h1><div class="result-score"><div class="score-ring">${percentage}%</div><p><strong style="color:white">${correct} de ${finished.questions.length} respuestas correctas</strong><br>${finished.questions.length - Object.keys(finished.answers).length} preguntas sin responder.<br>Este resultado es una referencia de práctica, no un puntaje oficial ni una garantía de selección.</p></div></section>
    <div class="section-heading" style="margin-top:22px"><div><h2>Revisa tus respuestas</h2><p class="subtle">Comprende el criterio de cada pregunta antes de volver a intentarlo.</p></div><button class="primary-button" data-action="${finished.sectionId ? "retry-section" : "exam"}" ${finished.sectionId ? `data-section="${esc(finished.sectionId)}"` : ""}>Intentar de nuevo →</button></div>
    <div class="result-list">${finished.questions.map((question, index) => {
      const selected = finished.answers[index];
      const isCorrect = selected === question.answer;
      return `<article class="result-item"><strong><span style="color:${isCorrect ? "#27815c" : "#bd6660"}">${isCorrect ? "✓ Correcta" : selected === undefined ? "— Sin responder" : "↗ Para repasar"}</span> · ${esc(question.indicatorTitle)}</strong><p>${esc(question.prompt)}</p><p><strong>Respuesta:</strong> ${esc(question.options[question.answer])}<br>${esc(question.why)}</p></article>`;
    }).join("")}</div>`;
  renderNavigation();
}

async function toggleComplete(indicatorId) {
  if (progress.completedSections.includes(indicatorId)) {
    progress.completedSections = progress.completedSections.filter((id) => id !== indicatorId);
  } else {
    progress.completedSections.push(indicatorId);
  }
  await saveProgress();
  renderNavigation();
  renderLesson(indicatorId);
}

async function answerPractice(card, selectedIndex) {
  const indicator = getIndicator(card.dataset.practice);
  const questionIndex = Number(card.dataset.index);
  const question = uniqueQuestionsForIndicator(indicator)[questionIndex];
  const isCorrect = selectedIndex === question.answer;
  progress.answers[questionKey(indicator.id, questionIndex)] = {
    selected: question.options[selectedIndex],
    correct: isCorrect,
    answeredAt: new Date().toISOString(),
  };
  autoCompleteIndicator(indicator.id);
  await saveProgress();
  renderLesson(indicator.id);
  notify(isCorrect ? "¡Muy bien! Respuesta correcta." : "Respuesta registrada. Revisa la explicación.");
}

async function resetIndicatorPractice(indicatorId) {
  const prefix = `${indicatorId}:`;
  for (const key of Object.keys(progress.answers)) {
    if (key.startsWith(prefix)) delete progress.answers[key];
  }
  progress.completedSections = progress.completedSections.filter((id) => id !== indicatorId);
  await saveProgress();
  renderLesson(indicatorId);
  notify("Preguntas listas para repetir.");
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.likert !== undefined) {
    const item = button.closest(".reflection-item");
    item?.querySelectorAll("[data-likert]").forEach((option) => option.classList.toggle("selected", option === button));
    return;
  }
  if (button.dataset.action === "reset-indicator-practice") {
    await resetIndicatorPractice(button.dataset.indicator);
    return;
  }
  if (button.dataset.action === "toggle-complete") { await toggleComplete(button.dataset.indicator); return; }
  if (button.dataset.action === "advance-indicator") {
    const currentIndicatorId = button.dataset.currentIndicator;
    if (currentIndicatorId) {
      autoCompleteIndicator(currentIndicatorId, true);
      await saveProgress();
      renderNavigation();
    }
    if (button.dataset.indicator) { renderLesson(button.dataset.indicator); return; }
    return;
  }
  if (button.dataset.view === "home") { goHome(); return; }
  if (button.dataset.action === "final-simulation") { startFinalSimulation(); return; }
  if (button.dataset.view === "exam" || button.dataset.action === "exam") { startExam(); return; }
  if (button.dataset.action === "section-exam" || button.dataset.action === "retry-section") {
    startExam(button.dataset.section);
    return;
  }
  if (button.dataset.section) {
    openSection(button.dataset.section);
    return;
  }
  if (button.dataset.indicator) { renderLesson(button.dataset.indicator); return; }
  if (button.dataset.action === "all-indicators") {
    renderAllIndicators();
    return;
  }
  if (button.dataset.practiceOption !== undefined) {
    const card = button.closest("[data-practice]");
    if (card) await answerPractice(card, Number(button.dataset.practiceOption));
    return;
  }
  if (button.dataset.quizOption !== undefined && quiz) {
    quiz.answers[quiz.current] = Number(button.dataset.quizOption);
    renderQuiz();
    return;
  }
  if (button.dataset.action === "previous-question" && quiz && quiz.current > 0) {
    quiz.current -= 1;
    renderQuiz();
    return;
  }
  if (button.dataset.action === "next-question" && quiz && quiz.current < quiz.questions.length - 1) {
    quiz.current += 1;
    renderQuiz();
    return;
  }
  if (button.dataset.action === "finish-quiz") { await finishExam(); return; }
  if (button.dataset.action === "retry-section") { startExam(button.dataset.section); return; }
  if (button.dataset.action === "exit-quiz") {
    if (window.confirm("¿Salir del repaso? Las respuestas sin finalizar no se guardarán.")) goHome();
    return;
  }
});

menuToggle.addEventListener("click", toggleMobileMenu);
menuClose.addEventListener("click", closeMobileMenu);
menuBackdrop.addEventListener("click", closeMobileMenu);
themeToggle?.addEventListener("click", toggleTheme);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMobileMenu();
});

async function initialize() {
  try {
    guide = await api("/data/guide.json");
    try {
      progress = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) || "null") || emptyProgress();
    } catch {
      progress = emptyProgress();
    }
    if (!progress || !progress.answers || !Array.isArray(progress.completedSections)) {
      throw new Error("La base de datos local de progreso tiene un formato inesperado.");
    }
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "light";
    applyTheme(savedTheme);
    renderNavigation();
    renderHome();
  } catch (error) {
    app.innerHTML = `<div class="error-card"><strong>No se pudo cargar el material de estudio.</strong><br>${esc(error.message)}<br>Comprueba que el servidor esté activo y vuelve a cargar la página.<br><button class="primary-button" onclick="location.reload()">Volver a intentar</button></div>`;
    saveStatus.textContent = "Sin conexión";
  }
}

initialize();
