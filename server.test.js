const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const test = require("node:test");
const { handler } = require("./server");

const guide = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "guide.json"), "utf8"));
const requiredIndicators = [
  "Estructura organizacional de la DIAN",
  "Misionalidad de la DIAN",
  "Gestión documental y trazabilidad de expedientes",
  "Obligaciones formales y sustanciales en materia tributaria",
  "Liquidación de impuestos nacionales",
  "Imposición de sanciones",
  "Procedimiento de fiscalización y liquidación tributaria y aduanera",
  "Normas y técnicas de auditoría",
  "Lavado de activos, financiación del terrorismo, ROS y denuncias",
  "Normativa cambiaria",
  "Razonamiento analítico",
  "Adaptabilidad — nivel 1",
  "Adaptabilidad — nivel 2",
  "Comportamiento ético — nivel 1",
  "Comportamiento ético — nivel 4",
  "Comunicación efectiva — nivel 1",
  "Comunicación efectiva — nivel 2",
  "Orientación al logro — nivel 1",
  "Orientación al usuario y al ciudadano — nivel 1",
  "Trabajo en equipo — nivel 1",
  "Trabajo en equipo — nivel 3",
  "Compromiso",
  "Diligencia",
  "Honestidad",
  "Justicia",
  "Respeto",
];

test("la guía cubre los 38 indicadores y todas las preguntas son cerradas", () => {
  assert.equal(guide.indicators.length, 38);
  for (const title of requiredIndicators) {
    assert.ok(guide.indicators.some((indicator) => indicator.title.toLocaleLowerCase("es") === title.toLocaleLowerCase("es")), `Falta el indicador: ${title}`);
  }
  for (const indicator of guide.indicators) {
    assert.ok(indicator.summary && indicator.points.length >= 4 && indicator.practice.length >= 3);
    assert.ok(indicator.study && indicator.study.objective && indicator.study.essentials.length >= 3);
    assert.ok(indicator.study.route.length >= 3 && indicator.study.pitfalls.length >= 3);
    if (indicator.study.reflections) {
      assert.ok(indicator.study.reflections.length >= 2);
      assert.equal(indicator.questions.length, 0, `${indicator.title}: el autorreporte no debe tener clave correcta`);
      continue;
    }
    assert.ok(indicator.questions.length >= 22, `${indicator.title}: debe tener al menos 22 preguntas de práctica`);
    for (const question of indicator.questions) {
      assert.ok([3, 4].includes(question.options.length), `${indicator.title}: se esperan tres opciones PJS o cuatro para repaso`);
      assert.ok(question.case, `${indicator.title}: el ejercicio debe partir de un caso situacional`);
      assert.ok(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < question.options.length);
      assert.ok(question.why);
    }
  }
});

test("el banco evita repeticiones de caso, formato y respuesta dentro de cada indicador", () => {
  for (const indicator of guide.indicators) {
    if (indicator.study?.reflections) continue;
    const prompts = new Set();
    const cases = new Set();
    for (const question of indicator.questions) {
      const prompt = (question.prompt || question.question || "").trim();
      const caseKey = (question.case || question.scenario || "").trim();
      assert.ok(prompt.length > 20, `${indicator.title}: el prompt debe ser específico`);
      assert.ok(caseKey.length > 30, `${indicator.title}: el caso debe contener contexto suficiente`);
      assert.ok(!prompts.has(prompt), `${indicator.title}: prompt repetido`);
      prompts.add(prompt);
      assert.ok(!cases.has(caseKey), `${indicator.title}: caso repetido`);
      cases.add(caseKey);
      const optionTexts = question.options.map((option) => String(option).trim().toLowerCase());
      assert.ok(new Set(optionTexts).size === optionTexts.length, `${indicator.title}: hay opciones duplicadas`);
    }
  }
});

test("las preguntas aduaneras aplican la transición de la Ley 2586 según la fecha de operación y del proceso", () => {
  const expectedRule = "Conforme a los artículos 1, 112 y 114 de la Ley 2586 de 2026, para las obligaciones, infracciones y sanciones se parte de la norma vigente al inicio de la operación, sin perjuicio de que, tras comparar el caso concreto, se aplique de oficio la norma posterior si resulta más favorable antes de la firmeza del acto. Como el procedimiento se inició después de la promulgación, verifique también el régimen procedimental vigente; no aplique toda la ley automáticamente.";
  const questions = guide.indicators
    .filter((indicator) => ["sanciones", "fiscalizacion", "fiscalizacion-aduanera"].includes(indicator.id))
    .flatMap((indicator) => indicator.questions)
    .filter((question) => question.case?.includes("se inició el 18 de junio de 2026"));

  assert.equal(questions.length, 8);
  for (const question of questions) {
    assert.equal(question.options[question.answer], expectedRule);
    assert.equal(question.why, `Correcta: ${expectedRule}`);
    assert.match(question.sourceCheck.reference, /Ley 2586 de 2026, arts\. 1, 112 y 114/);
  }

  for (const id of ["sanciones", "fiscalizacion-aduanera"]) {
    const study = guide.indicators.find((indicator) => indicator.id === id).study;
    const caseStudy = study.caseStudy;
    const answer = caseStudy.options[caseStudy.answer];
    assert.match(caseStudy.scenario, /18 de junio de 2026.*22 de junio/);
    assert.ok(answer.includes("al inicio de la operación"));
    assert.ok(answer.includes("solo si resulta más favorable"));
    assert.ok(answer.includes("régimen procedimental vigente"));
    assert.ok(study.essentials.some((point) => point.includes("artículos 1, 112 y 114")));
  }
});

test("la guía prioriza los ejes reales de la prueba DIAN 2676", () => {
  const coverageText = JSON.stringify(guide).toLowerCase();
  const requiredTopics = [
    "derecho de petición",
    "tutela",
    "mipg",
    "servicio al ciudadano",
    "ofimática",
    "power point",
    "excel",
    "incoterms",
    "nomenclatura arancelaria",
    "contratación",
    "devoluciones y cobranzas",
    "control de ingresos",
    "fiscalización cambiaria",
    "redacción de documentos"
  ];

  for (const topic of requiredTopics) {
    assert.ok(coverageText.includes(topic), `Falta cubrir el tema: ${topic}`);
  }
});

test("la API entrega la guía, publica la página y rechaza progreso inválido", async (context) => {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const base = `http://127.0.0.1:${server.address().port}`;

  const guideResponse = await fetch(`${base}/api/guide`);
  assert.equal(guideResponse.status, 200);
  assert.equal((await guideResponse.json()).indicators.length, 38);

  const staticGuideResponse = await fetch(`${base}/data/guide.json`);
  assert.equal(staticGuideResponse.status, 200);
  assert.equal((await staticGuideResponse.json()).indicators.length, 38);

  const pageResponse = await fetch(base);
  assert.equal(pageResponse.status, 200);
  assert.match(await pageResponse.text(), /Ruta de preparación/);

  const invalidResponse = await fetch(`${base}/api/progress`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers: [], completedSections: [] }),
  });
  assert.equal(invalidResponse.status, 400);
  assert.match((await invalidResponse.json()).error, /formato válido/);
});
