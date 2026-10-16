const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const GUIDE_FILE = path.join(ROOT, "data", "guide.json");
const DB_DIR = path.join(ROOT, "database");
const DB_FILE = path.join(DB_DIR, "progress.json");
const PORT = Number(process.env.PORT || 3000);
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

async function readProgress() {
  try {
    return JSON.parse(await fs.readFile(DB_FILE, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const initial = { answers: {}, completedSections: [], updatedAt: null };
    await writeProgress(initial);
    return initial;
  }
}

async function writeProgress(progress) {
  await fs.mkdir(DB_DIR, { recursive: true });
  const temporary = `${DB_FILE}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(progress, null, 2)}\n`, "utf8");
  await fs.rename(temporary, DB_FILE);
}

function sendJson(response, status, value) {
  response.writeHead(status, { "Content-Type": MIME[".json"], "Cache-Control": "no-store" });
  response.end(JSON.stringify(value));
}

async function readBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 50_000) {
      const error = new Error("La solicitud supera el tamaño permitido.");
      error.status = 413;
      throw error;
    }
  }
  try {
    return JSON.parse(body || "{}");
  } catch {
    const error = new Error("El contenido enviado no es JSON válido.");
    error.status = 400;
    throw error;
  }
}

async function serveStatic(urlPath, response, headOnly = false) {
  const relativePath = urlPath === "/" ? "index.html" : decodeURIComponent(urlPath.slice(1));
  const filePath = path.resolve(PUBLIC, relativePath);
  if (!filePath.startsWith(`${PUBLIC}${path.sep}`) && filePath !== path.join(PUBLIC, "index.html")) {
    sendJson(response, 404, { error: "No se encontró el recurso." });
    return;
  }
  try {
    const content = await fs.readFile(filePath);
    response.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(headOnly ? undefined : content);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR") {
      sendJson(response, 404, { error: "No se encontró el recurso." });
      return;
    }
    throw error;
  }
}

async function handler(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (url.pathname === "/api/guide" && request.method === "GET") {
    sendJson(response, 200, JSON.parse(await fs.readFile(GUIDE_FILE, "utf8")));
    return;
  }
  if (url.pathname === "/api/progress" && request.method === "GET") {
    sendJson(response, 200, await readProgress());
    return;
  }
  if (url.pathname === "/api/progress" && request.method === "PUT") {
    const body = await readBody(request);
    if (!body || typeof body !== "object" || Array.isArray(body)
      || !body.answers || typeof body.answers !== "object" || Array.isArray(body.answers)
      || !Array.isArray(body.completedSections)
      || Object.keys(body.answers).length > 2_000
      || body.completedSections.length > 100
      || !Object.values(body.answers).every((answer) =>
        answer && typeof answer === "object"
        && typeof answer.selected === "string"
        && typeof answer.correct === "boolean"
        && typeof answer.answeredAt === "string")) {
      sendJson(response, 400, { error: "El progreso enviado no tiene un formato válido." });
      return;
    }
    const progress = {
      answers: body.answers,
      completedSections: [...new Set(body.completedSections.filter((id) => typeof id === "string"))],
      updatedAt: new Date().toISOString(),
    };
    await writeProgress(progress);
    sendJson(response, 200, progress);
    return;
  }
  if (url.pathname === "/api/progress" && request.method === "DELETE") {
    const progress = { answers: {}, completedSections: [], updatedAt: new Date().toISOString() };
    await writeProgress(progress);
    sendJson(response, 200, progress);
    return;
  }
  if (url.pathname.startsWith("/api/")) {
    sendJson(response, 404, { error: "No se encontró la ruta de API." });
    return;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    sendJson(response, 405, { error: "Método no permitido." });
    return;
  }
  await serveStatic(url.pathname, response, request.method === "HEAD");
}

const server = http.createServer((request, response) => {
  handler(request, response).catch((error) => {
    console.error("Error al atender la solicitud:", error);
    if (!response.headersSent) sendJson(response, error.status || 500, { error: error.status ? error.message : "Error interno del servidor." });
    else response.destroy();
  });
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`DIAN 2676 lista en http://localhost:${PORT}`));
}

module.exports = { handler, readProgress, writeProgress };
