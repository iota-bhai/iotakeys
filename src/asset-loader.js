/**
 * asset-loader.js - simple manifest-based loader
 */
const fs = require("fs");
const path = require("path");

function loadManifest(root) {
    const manifestPath = path.join(root, "assets", "manifest.json");
    if (!fs.existsSync(manifestPath)) return null;
    const raw = fs.readFileSync(manifestPath, "utf8").replace(/^\uFEFF/, "");
    return JSON.parse(raw);
}

module.exports = { loadManifest };