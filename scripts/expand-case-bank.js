/* Builds a repeatable situational-judgment bank from the topic-specific study
 * routes, risks and facts. Every scored item has a case, three options and a
 * rationale. Run after build-question-bank.js and build-detailed-study.js.
 */
const fs = require("node:fs");
const path = require("node:path");

const file = path.join(__dirname, "..", "data", "guide.json");
const guide = JSON.parse(fs.readFileSync(file, "utf8"));
const TARGET_PER_INDICATOR = 22;
const sceneOpeners = [
  "Durante la revisión inicial de un expediente",
  "Al preparar una actuación de control",
  "Al contrastar la información recibida con los soportes",
  "Antes de comunicar una decisión a la persona interesada",
  "Al recibir un caso con varias dependencias involucradas",
  "Mientras verifica un posible incumplimiento",
  "Al cerrar el análisis de una operación reportada",
  "Cuando un compañero solicita agilizar el trámite",
  "Al revisar una actuación iniciada por otra dependencia",
  "Cuando la evidencia disponible parece contradictoria",
  "Al atender una solicitud relacionada con el procedimiento",
];
const promptForms = [
  "¿Cuál es la actuación más adecuada para continuar?",
  "¿Qué decisión protege mejor la legalidad y la calidad del análisis?",
  "¿Qué debería hacer primero el servidor responsable?",
  "¿Cuál respuesta está mejor sustentada para este caso?",
  "¿Qué curso de acción permite resolver el asunto con trazabilidad?",
  "¿Cómo debe proceder antes de adoptar una conclusión?",
];
const genericErrors = [
  "Concluir a partir de la alerta inicial, sin verificar los hechos ni los soportes.",
  "Omitir el registro de la actuación para terminar el trámite con mayor rapidez.",
  "Aplicar automáticamente una regla de otro procedimiento sin verificar su vigencia y alcance.",
  "Comunicar una conclusión sin motivarla ni permitir las garantías que correspondan.",
  "Compartir datos reservados con personas que no tienen autorización para conocerlos.",
  "Cerrar el asunto sin comprobar competencia, términos y evidencia disponible.",
];

const isScored = (indicator) => !indicator.study?.reflections;
for (const indicator of guide.indicators) {
  if (!isScored(indicator)) {
    indicator.questions = [];
    continue;
  }
  const study = indicator.study;
  if (!study?.route?.length || !study?.essentials?.length || !study?.pitfalls?.length) {
    throw new Error(`Falta material base para crear casos de ${indicator.title}`);
  }
  const questions = (indicator.questions || [])
    .filter((question) => question.generatedBy !== "situational-case-bank-v1")
    .filter((question) => question.case || question.scenario)
    .map((question) => ({ ...question, case: question.case || question.scenario }));
  const known = new Set(questions.map((question) => question.prompt));
  let serial = 0;
  while (questions.length < TARGET_PER_INDICATOR) {
    const index = serial++;
    const route = study.route[index % study.route.length];
    const fact = study.essentials[Math.floor(index / study.route.length) % study.essentials.length];
    const risk = study.pitfalls[index % study.pitfalls.length];
    const opener = sceneOpeners[index % sceneOpeners.length];
    const caseText = `${opener}, el asunto de «${indicator.title}» presenta este riesgo: ${risk.charAt(0).toLowerCase()}${risk.slice(1)} Además, el expediente contiene información que debe contrastarse antes de resolver. Para el análisis también se debe considerar que ${fact.charAt(0).toLowerCase()}${fact.slice(1)}`;
    const prompt = `${caseText}\n\n${promptForms[index % promptForms.length]}`;
    if (known.has(prompt)) continue;

    const wrongs = [
      genericErrors[index % genericErrors.length],
      genericErrors[(index + 2) % genericErrors.length],
    ];
    const options = [route, ...wrongs];
    const answer = (index * 7 + indicator.id.length) % options.length;
    const correct = options[0];
    options.splice(0, 1);
    options.splice(answer, 0, correct);
    questions.push({
      case: caseText,
      prompt: promptForms[index % promptForms.length],
      options,
      answer,
      why: `La opción correcta es aplicar la ruta del tema: ${route} ${fact} El riesgo descrito debe verificarse con evidencia y con la norma aplicable al momento de los hechos; las otras alternativas omiten controles, garantías o trazabilidad.`,
      generatedBy: "situational-case-bank-v1",
    });
    known.add(prompt);
  }
  indicator.questions = questions;
}

const total = guide.indicators.reduce((sum, indicator) => sum + indicator.questions.length, 0);
const scoredTopics = guide.indicators.filter(isScored);
if (scoredTopics.some((indicator) => indicator.questions.length < TARGET_PER_INDICATOR)) {
  throw new Error("El banco no alcanzó la cobertura mínima por indicador.");
}
fs.writeFileSync(file, `${JSON.stringify(guide, null, 2)}\n`, "utf8");
console.log(`Banco situacional actualizado: ${total} preguntas con caso en ${scoredTopics.length} indicadores de conocimiento.`);
