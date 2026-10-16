/* Copy the latest study data into Render's static publish directory. */
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const source = path.join(root, "data", "guide.json");
const destinationDirectory = path.join(root, "public", "data");
const destination = path.join(destinationDirectory, "guide.json");

fs.mkdirSync(destinationDirectory, { recursive: true });
fs.copyFileSync(source, destination);
console.log("Guía copiada a public/data/guide.json para el sitio estático.");
