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
  "En una mesa de trabajo con varias dependencias involucradas",
  "Al contrastar la información recibida con los soportes",
  "Antes de cerrar una decisión o un acto de trámite",
  "Cuando un funcionario propone resolver con rapidez",
  "Mientras se verifica un posible incumplimiento",
  "Al revisar una operación o solicitud reportada",
  "En una atención al ciudadano con solicitud y documentos",
  "Cuando el expediente contiene evidencia contradictoria",
  "Al evaluar un riesgo funcional o de integridad",
  "En una revisión de competencia o de procedimiento",
];
const actorProfiles = [
  "un contribuyente",
  "una empresa con operación internacional",
  "un usuario de la DIAN",
  "un equipo territorial",
  "una dirección de apoyo",
  "un servidor público responsable del trámite",
  "un funcionario que recibe la solicitud",
  "un analista asignado al caso",
];
const eventTriggers = [
  "presenta documentos que no coinciden con la información del sistema",
  "solicita una respuesta urgente sobre un trámite aún no resuelto",
  "aporta soportes que cambian el análisis de la operación",
  "pide orientación sobre un requisito formal que no entiende",
  "solicita un acto de trámite que exige verificar competencia",
  "reporta una diferencia que podría afectar la liquidación",
  "adjunta evidencia que se contrapone con el archivo del expediente",
  "requiere claridad sobre un requerimiento, una sanción o una notificación",
];
const riskClues = [
  "la rapidez puede sustituir la competencia",
  "el caso exige separar la urgencia del análisis técnico",
  "la evidencia debe contrastarse antes de concluir",
  "las decisiones de fondo requieren motivación y trazabilidad",
  "un traslado sin base y sin comunicación puede generar indefensión",
  "el riesgo se agrava si se toma la decisión sin verificar el procedimiento",
  "la solución no puede depender solo de la intuición del equipo",
  "una respuesta prematura puede afectar derechos y legalidad",
];
const promptForms = [
  "¿Qué debe hacer primero el responsable antes de decidir o remitir?",
  "¿Cuál actuación protege mejor la legalidad y la trazabilidad del caso?",
  "¿Qué decisión es más sólida para resolver este asunto sin vulnerar garantías?",
  "¿Qué debe verificar antes de adoptar una conclusión?",
  "¿Cuál opción mantiene el procedimiento correcto y la calidad del análisis?",
  "¿Qué acción es más adecuada para evitar un error funcional o administrativo?",
];
const genericErrors = [
  "Cerrar el asunto sin comprobar competencia, soportes, términos y evidencia disponible.",
  "Omitir el registro y la trazabilidad para terminar con rapidez.",
  "Aplicar una regla de otro procedimiento sin revisar la norma, el contexto y la vigencia.",
  "Comunicar una conclusión sin motivarla ni permitir la defensa o la contradicción.",
  "Compartir información reservada con personas que no tienen autorización.",
  "Resolver por intuición o por la presión del momento, sin contrastar la información.",
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
  const seenPairs = new Set();
  let serial = 0;
  while (questions.length < TARGET_PER_INDICATOR) {
    const index = serial++;
    const route = study.route[(index + indicator.id.length) % study.route.length];
    const fact = study.essentials[(index + 2) % study.essentials.length];
    const risk = study.pitfalls[(index + 1) % study.pitfalls.length];
    const opener = sceneOpeners[(index + indicator.id.length) % sceneOpeners.length];
    const actor = actorProfiles[(index + 3) % actorProfiles.length];
    const trigger = eventTriggers[(index + 5) % eventTriggers.length];
    const riskClue = riskClues[(index + 4) % riskClues.length];
    const promptTemplate = promptForms[(index + indicator.id.length) % promptForms.length];
    const caseText = `${opener}, ${actor} ${trigger}. El caso presenta este riesgo: ${riskClue}; además, hay un problema de ${risk.toLowerCase()} y se requiere apoyar la decisión con evidencia y con la norma aplicable. Para el análisis también debe considerarse que ${fact.charAt(0).toLowerCase()}${fact.slice(1)}`;
    const prompt = `${promptTemplate} En este caso, ${actor} ${trigger.toLowerCase()}.`;
    const pairKey = `${indicator.id}:${caseText}|${prompt}`;
    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);

    const wrongs = [
      genericErrors[(index + 1) % genericErrors.length],
      genericErrors[(index + 3) % genericErrors.length],
      genericErrors[(index + 5) % genericErrors.length],
    ];
    const options = [route, ...wrongs].slice(0, 3);
    const answerIndex = (index + indicator.id.length + 1) % options.length;
    const correctOption = options[0];
    options.splice(0, 1);
    options.splice(answerIndex, 0, correctOption);
    questions.push({
      case: caseText,
      prompt,
      options,
      answer: answerIndex,
      why: `La opción correcta es aplicar la ruta del tema: ${route}. ${fact} El riesgo descrito exige verificar competencia, evidencia y procedimiento, mientras las otras alternativas omiten controles, garantías o trazabilidad.`,
      generatedBy: "situational-case-bank-v1",
    });
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
