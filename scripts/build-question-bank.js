/*
 * Expands the hand-authored study points and practice advice into review
 * questions. Run with: node scripts/build-question-bank.js
 * The source of truth remains data/guide.json; generated questions are saved
 * there so the app stays fully offline and does not generate content at runtime.
 */
const fs = require("node:fs");
const path = require("node:path");

const file = path.join(__dirname, "..", "data", "guide.json");
const guide = JSON.parse(fs.readFileSync(file, "utf8"));
const officialModules = [
  {
    id: "constitucion-estado", section: "dian", title: "Constitución Política, derechos y estructura del Estado", type: "Conocimientos básicos",
    summary: "La actuación administrativa se desarrolla dentro del Estado social de derecho. Los derechos fundamentales, la separación de funciones, los principios constitucionales y las garantías de las personas limitan y orientan el ejercicio de la función pública.",
    points: ["La Constitución es norma superior y las autoridades deben actuar dentro de sus competencias.", "Los derechos fundamentales y el debido proceso deben respetarse también en actuaciones administrativas.", "La función administrativa sirve al interés general y se rige, entre otros, por igualdad, moralidad, eficacia, economía, celeridad, imparcialidad y publicidad.", "Las ramas y órganos del Estado tienen funciones diferenciadas; la DIAN ejerce competencias administrativas y no reemplaza a jueces ni al legislador."],
    practice: ["Identifique el derecho o principio comprometido antes de escoger una actuación.", "Verifique competencia y fundamento legal; una instrucción informal no habilita a desconocer la Constitución.", "Cuando haya tensión entre rapidez y garantías, tramite con oportunidad sin suprimir el debido proceso."],
  },
  {
    id: "sistema-tributario-aduanero-cambiario", section: "tributario", title: "Generalidades de los sistemas tributario, aduanero y cambiario", type: "Conocimientos funcionales básicos",
    summary: "Los sistemas tributario, aduanero y cambiario tienen objetos, sujetos, obligaciones y procedimientos distintos. En cada caso se debe identificar la operación y la competencia institucional antes de aplicar una regla.",
    points: ["El sistema tributario comprende tributos y deberes asociados definidos por la ley, con elementos como sujeto, hecho generador, base y tarifa.", "El sistema aduanero regula el ingreso, permanencia, circulación y salida de mercancías y las obligaciones de los usuarios aduaneros.", "El régimen cambiario establece reglas para operaciones de cambio y asigna funciones diferenciadas al Banco de la República y a autoridades de control.", "Una operación puede involucrar más de un sistema, pero cada obligación debe analizarse con su norma, periodo, sujeto y autoridad competente."],
    practice: ["Clasifique primero los hechos: tributo, operación aduanera, operación de cambio o combinación de ellos.", "No traslade automáticamente definiciones, plazos o sanciones de un régimen a otro.", "Consulte la regulación vigente para la fecha de los hechos y documente por qué aplica al caso."],
  },
  {
    id: "introduccion-fiscalizacion", section: "control", title: "Introducción al proceso de fiscalización y liquidación", type: "Conocimientos funcionales básicos",
    summary: "La fiscalización verifica el cumplimiento de obligaciones dentro de las competencias de la DIAN. Las actuaciones deben tener propósito, competencia, soporte probatorio, secuencia procedimental y una conclusión motivada.",
    points: ["La selección y planeación de una acción de control deben responder a competencias, riesgos y lineamientos institucionales.", "La evidencia se obtiene y valora de manera pertinente, verificable y respetuosa de las garantías aplicables.", "Los actos de trámite, preparatorios y de fondo cumplen funciones diferentes y se profieren según la etapa y el procedimiento.", "Una liquidación o decisión debe explicar hechos probados, normas aplicables, análisis y efectos para el interesado."],
    practice: ["Construya una línea de tiempo con hechos, términos, comunicaciones, pruebas y responsables.", "Separe el hallazgo inicial de la conclusión: contraste la evidencia y permita contradicción según el procedimiento.", "Revise competencia, notificación, términos y recursos antes de cerrar o proyectar una actuación."],
  },
  {
    id: "determinacion-control-tributario", section: "tributario", title: "Determinación y control tributario", type: "Conocimientos funcionales",
    summary: "La determinación tributaria conecta los hechos económicos acreditados con los elementos legales del tributo. El control contrasta declaraciones, información y soportes, sin sustituir la prueba por una diferencia estadística aislada.",
    points: ["Identifique impuesto, periodo, sujeto, hecho generador y elementos de la obligación conforme a la norma aplicable.", "Reconstruya ingresos, costos, deducciones, descuentos, retenciones y saldos con sus soportes y requisitos legales.", "Contraste declaraciones y reportes con fuentes de información, evaluando consistencia, integridad y explicación de diferencias.", "Distinga verificación, determinación oficial, discusión, cobro y sanción como actuaciones relacionadas pero jurídicamente distintas."],
    practice: ["Use una matriz que relacione cada hallazgo con el dato, el soporte, la norma y la consecuencia propuesta.", "Investigue explicaciones alternativas antes de atribuir una diferencia a incumplimiento.", "Verifique reglas temporales y procedimentales antes de cuantificar un mayor valor o una sanción."],
  },
  {
    id: "fiscalizacion-internacional", section: "control", title: "Fiscalización internacional", type: "Conocimientos funcionales",
    summary: "La fiscalización con elementos internacionales puede exigir analizar operaciones transfronterizas, obligaciones informativas y mecanismos de cooperación. La actuación depende de normas internas, acuerdos aplicables y canales autorizados de intercambio.",
    points: ["Identifique el componente transfronterizo y la obligación tributaria o informativa que se busca verificar.", "El intercambio de información debe tener base jurídica, finalidad, autoridad competente y controles de confidencialidad.", "Las operaciones entre vinculados y los asuntos de tributación internacional requieren aplicar las reglas específicas vigentes, no inferencias por el solo vínculo.", "La evidencia obtenida en otra jurisdicción debe incorporarse y valorarse de acuerdo con las reglas aplicables al procedimiento."],
    practice: ["Delimite jurisdicciones, periodos, partes relacionadas, operación y norma antes de formular un requerimiento.", "Use los instrumentos de cooperación institucional autorizados y registre solicitudes, respuestas y restricciones de uso.", "Consulte acuerdos y lineamientos vigentes; no presuma que toda información extranjera puede divulgarse o utilizarse sin condiciones."],
  },
  {
    id: "fiscalizacion-aduanera", section: "aduanero", title: "Fiscalización aduanera", type: "Conocimientos funcionales",
    summary: "La fiscalización aduanera verifica el cumplimiento de obligaciones relativas a mercancías, declaraciones, regímenes, usuarios y operaciones de comercio exterior. El análisis debe reconstruir la operación y su documentación bajo la norma vigente.",
    points: ["Reconstruya la operación: mercancía, participantes, documentos, régimen, fechas y lugar de control.", "Verifique clasificación, origen, valor, cantidad, descripción y demás elementos pertinentes con evidencia técnica y documental.", "Diferencie control documental, inspección física y otras diligencias previstas, respetando competencia y procedimiento.", "La aprehensión, decomiso, abandono, destrucción o disposición de mercancías requiere causal, autoridad, soporte y trámite aplicables."],
    practice: ["Asegure identificación, cadena de custodia cuando corresponda, registro de hallazgos y conservación de soportes.", "Solicite apoyo técnico cuando la naturaleza de la mercancía o la valoración exceda su conocimiento.", "Documente diferencias entre lo declarado y lo verificado y permita que se analicen explicaciones y pruebas pertinentes."],
  },
  {
    id: "elusion-evasion-abuso-contrabando", section: "control", title: "Evasión, elusión, abuso y contrabando", type: "Conocimientos funcionales básicos",
    summary: "Estos conceptos orientan el análisis de riesgos, pero no son intercambiables ni prueban por sí solos una infracción o delito. La calificación depende de los hechos, la norma aplicable, la evidencia y la autoridad competente.",
    points: ["La evasión supone incumplir ilícitamente obligaciones tributarias; deben probarse conducta y elementos exigidos por la norma.", "La elusión describe el uso de formas u operaciones para reducir cargas; su tratamiento jurídico depende de reglas antiabuso y del caso concreto.", "El abuso tributario requiere analizar los presupuestos legales y los hechos; una operación inusual no basta para concluirlo.", "El contrabando se relaciona con introducir, extraer o disponer de mercancías en contravención del régimen aplicable, según la conducta tipificada."],
    practice: ["Describa primero hechos verificables y evite etiquetar a personas antes de completar el análisis.", "Separe indicio, hallazgo administrativo y posible conducta penal; remita información por el canal competente cuando proceda.", "No confunda optimización legítima, error, incumplimiento formal e infracción: identifique los elementos jurídicos de cada hipótesis."],
  },
  {
    id: "transparencia-acceso", section: "dian", title: "Transparencia, acceso a información y reserva", type: "Conocimientos básicos",
    summary: "La transparencia facilita el control ciudadano y el acceso a información pública, sujeto a excepciones legales, protección de datos personales y reservas. La respuesta debe ser motivada y tramitarse por los canales y términos aplicables.",
    points: ["La información pública se divulga y entrega conforme a las reglas de transparencia y acceso a información.", "La clasificación o reserva requiere fundamento legal y análisis de la información concreta; no se presume por comodidad.", "Los datos personales y tributarios se consultan, usan y divulgan con base legítima, finalidad y controles de acceso.", "Cuando una solicitud mezcla información pública y protegida, debe analizarse la posibilidad de entregar la parte accesible conforme a la ley."],
    practice: ["Identifique qué información se pide, quién la solicita, la finalidad y si existe una excepción legal aplicable.", "Motive la respuesta y oriente sobre recursos o canales disponibles cuando corresponda.", "Evite remitir expedientes completos si basta una respuesta parcial o una versión que proteja datos legalmente protegidos."],
  },
  {
    id: "herramientas-informaticas", section: "control", title: "Herramientas informáticas y manejo de información", type: "Conocimientos básicos",
    summary: "Las herramientas informáticas apoyan la consulta, análisis, documentación y seguimiento del trabajo. Su uso exige calidad de datos, seguridad, trazabilidad y respeto por los perfiles y finalidades autorizados.",
    points: ["Use sistemas institucionales y credenciales propias conforme a los perfiles y funciones asignados.", "Valide origen, periodo, integridad y consistencia de los datos antes de usarlos como soporte de una conclusión.", "Mantenga trazabilidad de consultas, transformaciones, versiones y productos analíticos cuando el procedimiento lo requiera.", "Proteja información y dispositivos; reporte incidentes y no extraiga bases institucionales a canales personales no autorizados."],
    practice: ["Guarde el vínculo entre cada resultado analítico y la fuente que lo produjo.", "Verifique filtros, fórmulas, duplicados y valores faltantes antes de interpretar un reporte.", "Comparta solo lo necesario por canales autorizados y aplique controles de acceso y reserva."],
  },
  {
    id: "mipg-funcion-publica", section: "dian", title: "MIPG, función pública y códigos institucionales", type: "Conocimientos básicos",
    summary: "El Modelo Integrado de Planeación y Gestión orienta la gestión pública hacia resultados, integridad, servicio y control. Los principios de la función pública y los códigos institucionales guían la conducta y la mejora de procesos.",
    points: ["MIPG articula políticas de gestión y desempeño para orientar planeación, ejecución, seguimiento, evaluación y mejora.", "Los principios de la función administrativa exigen servicio al interés general, responsabilidad, coordinación y uso adecuado de recursos.", "El Código de Integridad expresa valores y conductas esperadas; orienta la actuación cotidiana y no sustituye normas ni procedimientos.", "El buen gobierno promueve transparencia, rendición de cuentas, participación, eficacia y prevención de riesgos."],
    practice: ["Conecte su actividad con objetivos, controles, indicadores y evidencia de resultados del proceso.", "Ante una tensión ética, consulte reglas, declare conflictos y use los canales institucionales de orientación o reporte.", "Proponga mejoras con evidencia y seguimiento, sin alterar controles obligatorios ni atribuciones."],
  },
  {
    id: "procedimiento-administrativo", section: "dian", title: "Procedimiento administrativo general (CPACA)", type: "Conocimientos básicos",
    summary: "El CPACA contiene reglas de actuación administrativa, derechos de las personas, formación y notificación de decisiones y recursos. Para el empleo, estudia los títulos y capítulos indicados en la ficha y verifica siempre las normas especiales tributarias y aduaneras.",
    points: ["Los principios y derechos de las personas orientan toda actuación y el uso de medios electrónicos cuando corresponda.", "La autoridad debe identificar competencia, iniciar y tramitar la actuación conforme al procedimiento general o especial aplicable.", "Los actos administrativos requieren contenido y motivación adecuados, comunicación o notificación conforme a la ley y respeto por la defensa.", "Los recursos administrativos, impedimentos, recusaciones y reglas de conclusión se aplican según los supuestos y términos legales."],
    practice: ["Identifique si existe procedimiento especial y use el CPACA de manera compatible y supletoria cuando la norma lo disponga.", "Controle fechas de comunicación, notificación, ejecutoria y vencimientos con soportes verificables.", "No aconseje un término de memoria: consulte el artículo vigente y la regla especial del trámite."],
  },
  {
    id: "pqrsf-servicio-ciudadano", section: "competencias", title: "Sistema PQRSF y servicio al ciudadano", type: "Conocimientos básicos",
    summary: "El sistema de peticiones, quejas, reclamos, sugerencias y felicitaciones organiza la recepción, asignación, respuesta y seguimiento de las solicitudes ciudadanas. La atención debe ser accesible, oportuna, clara y respetuosa de la competencia y la reserva.",
    points: ["Clasifique la solicitud por su contenido y no solo por el nombre que le asigne la persona.", "Registre recepción, anexos, fecha, canal, responsable y traslado para conservar trazabilidad.", "Responda de fondo, con claridad y dentro del término aplicable; si falta competencia, gestione la ruta prevista e informe al ciudadano.", "La atención diferencial y accesible debe facilitar el ejercicio de derechos sin alterar requisitos legales ni divulgar información protegida."],
    practice: ["Lea integralmente la solicitud, identifique lo pedido y confirme si se requieren datos o anexos adicionales.", "Use lenguaje sencillo, explique la decisión y sus canales de seguimiento o impugnación cuando correspondan.", "Controle vencimientos y escale oportunamente una carga o dependencia que amenace la respuesta."],
  },
];

const ids = new Set(guide.indicators.map((indicator) => indicator.id));
for (const module of officialModules) {
  if (!ids.has(module.id)) guide.indicators.push({ ...module, questions: [] });
}
guide.exam = {
  title: "Proceso de selección DIAN 2676",
  opec: "236767",
  registration: "1255884123",
  manualSheet: "AT-FL-3008",
  level: "Profesional",
  position: "Gestor I",
  processArea: "Fiscalización y liquidación",
  officialManual: "https://www.dian.gov.co/dian/entidad/ManualdeFunciones2024/FT_TAH_1824_Gestor_I_AT_FL_3008.pdf",
  officialSelection: "https://www.cnsc.gov.co/convocatorias/dian-2676",
};
const extraSources = [
  { name: "DIAN — ficha oficial Gestor I AT-FL-3008", url: guide.exam.officialManual },
  { name: "CNSC — Proceso de Selección DIAN 2676", url: guide.exam.officialSelection },
];
for (const source of extraSources) {
  if (!guide.sources.some((item) => item.url === source.url)) guide.sources.push(source);
}
for (const indicator of guide.indicators) {
  indicator.questions = (indicator.questions || []).filter((question) => question.generatedBy !== "guide-builder-v1");
}
const traps = [
  "Actuar sin comprobar la competencia, los hechos ni el procedimiento aplicable.",
  "Suponer que la rapidez permite omitir controles, soportes o garantías.",
  "Tomar una decisión por intuición y completar la justificación después.",
  "Compartir o modificar información sin autorización ni registro de la actuación.",
  "Aplicar una regla de otro caso sin revisar sus diferencias y el contexto.",
  "Dar por terminado el asunto sin verificar el resultado ni dejar trazabilidad.",
];
for (const indicator of guide.indicators) {
  const questions = indicator.questions || [];
  if (["Competencia conductual", "Integridad"].includes(indicator.type)) {
    indicator.questions = [];
    continue;
  }
  const knownPrompts = new Set(questions.map((question) => question.prompt));
  const statements = [
    ...(indicator.points || []).map((text, index) => ({ text, kind: "point", index })),
    ...(indicator.practice || []).map((text, index) => ({ text, kind: "practice", index })),
  ];
  for (const statement of statements) {
    const prompt = statement.kind === "point"
      ? `En una actuación relacionada con «${indicator.title}», ¿qué criterio debe orientar la decisión del servidor?`
      : `Al desarrollar una actuación de «${indicator.title}», ¿qué práctica profesional ayuda a resolverla correctamente?`;
    if (knownPrompts.has(prompt)) continue;
    const distractors = [];
    for (let offset = 0; offset < traps.length && distractors.length < 3; offset += 1) {
      const trap = traps[(statement.index * 2 + indicator.id.length + offset) % traps.length];
      if (trap !== statement.text) distractors.push(trap);
    }
    const answerAt = (statement.index + indicator.id.length) % 4;
    const options = [...distractors];
    options.splice(answerAt, 0, statement.text);
    questions.push({
      prompt,
      options,
      answer: answerAt,
      generatedBy: "guide-builder-v1",
      why: statement.kind === "point"
        ? `Este criterio corresponde al contenido que debes dominar en «${indicator.title}». Contrástalo con la norma, ficha o procedimiento oficial cuando el caso dependa de una regla vigente.`
        : `Esta pauta aplica la recomendación práctica del indicador «${indicator.title}» y conserva la legalidad, la verificación y la trazabilidad que exige el caso.`,
    });
    knownPrompts.add(prompt);
  }
  indicator.questions = questions;
}

const count = guide.indicators.reduce((total, indicator) => total + indicator.questions.length, 0);
fs.writeFileSync(file, `${JSON.stringify(guide, null, 2)}\n`, "utf8");
console.log(`Banco actualizado: ${count} preguntas en ${guide.indicators.length} indicadores.`);
