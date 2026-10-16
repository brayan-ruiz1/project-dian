# Ruta de preparación DIAN 2676 — Gestor I

Aplicación local de estudio para el empleo **Gestor I, OPEC 236767**, asociado a la ficha DIAN **AT-FL-3008** del subproceso de Fiscalización y liquidación. Reúne una ruta por indicadores, material de repaso y un banco de preguntas de práctica. Funciona con Node.js 18 o superior, sin paquetes externos ni conexión a internet.

## Iniciar

1. Instala Node.js 18 o superior.
2. Abre una terminal en esta carpeta y ejecuta `npm start`.
3. Visita [http://localhost:3000](http://localhost:3000).

El avance se guarda en el almacenamiento local del navegador y dispositivo que estés usando; no se comparte con otras personas ni se sincroniza automáticamente entre dispositivos.

## Publicar en Render

El proyecto ya incluye `render.yaml`. Sube la carpeta del proyecto a un repositorio de GitHub, entra a Render, selecciona **New > Blueprint**, conecta ese repositorio y confirma la creación del sitio. Render ejecutará `node scripts/prepare-static.js` para copiar la guía y publicará la carpeta `public` como sitio estático. No hay compilación de frontend ni instalación de dependencias.

El progreso queda en el navegador de cada persona. Si se borra el almacenamiento del navegador o se usa otro dispositivo, el avance no estará allí.

## Contenido

- 38 indicadores organizados en siete áreas, cada uno con objetivo, conocimientos esenciales, ruta de análisis, errores frecuentes y fuentes para profundizar.
- 506 preguntas situacionales originales con tres alternativas y explicación, distribuidas en los 23 indicadores puntuables (22 por indicador), además de 30 afirmaciones de autorreflexión para competencias y valores. El banco se puede repetir y filtrar por tema; son ejercicios formativos, no preguntas oficiales.
- Repasos aleatorios de hasta 50 preguntas y prácticas por sección. No se presentan como una simulación oficial: la prueba funcional DIAN 2676 usa PJS con un caso, enunciado y tres alternativas.
- Referencia del formato oficial de comportamentales e integridad: autoinforme con escala Likert de cuatro niveles, sin respuestas correctas o incorrectas.
- Seguimiento local del avance y enlaces a la ficha del empleo y a la convocatoria.
- Material alineado con la ficha oficial AT-FL-3008: conocimientos tributarios, aduaneros, cambiarios, de fiscalización y liquidación, además de las competencias básicas y comportamentales allí descritas. Los módulos de sanciones y fiscalización aduanera incluyen la Ley 2586 de 2026 y sus reglas de transición.

Para regenerar el material después de editar los indicadores, ejecuta `node scripts/build-question-bank.js`, `node scripts/build-detailed-study.js` y `node scripts/expand-case-bank.js`, en ese orden. Los scripts son idempotentes y reconstruyen los casos de práctica desde las rutas y conocimientos de cada tema.

## Fuentes y alcance

La ficha de funciones se consulta en [DIAN — ficha oficial Gestor I AT-FL-3008](https://www.dian.gov.co/dian/entidad/ManualdeFunciones2024/FT_TAH_1824_Gestor_I_AT_FL_3008.pdf), y los avisos y la [Guía de Orientación al Aspirante de DIAN 2676](https://www.cnsc.gov.co/node/69406) en la CNSC. La guía oficial contiene ejemplos ilustrativos y aclara que no pertenecen al banco reservado. También se enlaza un [ejemplo público de preparación de Grupo Geard](https://grupogeard.com/co/blog/convocatorias/dian2024/ejemplo-preguntas-pruebas-escritas-concurso-dian-2676/), usado solo para reconocer el formato. Las preguntas y casos de esta aplicación son material independiente. Las fuentes normativas están enlazadas en cada unidad; estudia el texto vigente y revisa sus reglas temporales y de transición, con corte de referencia de la convocatoria al 19 de junio de 2026. Ningún material puede garantizar un resultado, así que usa el banco para dominar conceptos, practicar decisiones y detectar vacíos, no para memorizar respuestas.

## Reiniciar el avance

Elimina los datos del sitio desde la configuración del navegador para reiniciar el avance de ese dispositivo.
