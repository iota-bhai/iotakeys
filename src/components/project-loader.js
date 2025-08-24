/**
 * project-loader.js
 * - loadProject(slug)
 * - repairProject(slug)
 * - validateProjectSchema(projectJson)
 *
 * Runs in main process (Node).
 */
const fs = require("fs");
const path = require("path");
const { generateDifficultyVariants } = require("./project-generator");

function slugify(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function readJsonNoBom(p) {
    const raw = fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "");
    return JSON.parse(raw);
}

async function loadProject(projectPath) {
    // projectPath can be file or folder
    let dir = projectPath;
    if (fs.lstatSync(projectPath).isFile()) dir = path.dirname(projectPath);
    const pj = path.join(dir, "project.json");
    if (!fs.existsSync(pj)) throw new Error("project.json not found in " + dir);
    const project = readJsonNoBom(pj);
    // validate basic fields
    if (!project.title) project.title = path.basename(dir);
    if (!project.variants) project.variants = {};
    // Ensure variants exist, else generate
    const required = ["easy", "medium", "hard", "practice"];
    for (let v of required) {
        const filename = (project.variants[v] && project.variants[v].file) ? project.variants[v].file : `${v}_auto.mid`;
        const fpath = path.join(dir, filename);
        if (!fs.existsSync(fpath)) {
            // Attempt generation
            console.log(`Variant ${v} missing; attempting generation...`);
            const midiCandidate = (project.original && project.original.mid) ? path.join(dir, project.original.mid) : null;
            if (!midiCandidate || !fs.existsSync(midiCandidate)) {
                // look for any .mid in dir
                const mids = fs.readdirSync(dir).filter(x => x.toLowerCase().endsWith(".mid"));
                if (mids.length > 0) { midiCandidate = path.join(dir, mids[0]); }
            }
            if (midiCandidate && fs.existsSync(midiCandidate)) {
                await generateDifficultyVariants({ projectDir: dir, inputMidiPath: midiCandidate, meta: project.meta || {}, options: project.generatorOptions || {} });
            } else {
                console.warn("No MIDI available to generate variants; user must supply original.mid or original_audio.");
            }
        }
    }
    return { projectDir: dir, project };
}

function repairProject(projectPath) {
    // Repair tasks: slugify filenames, backup
    let dir = projectPath;
    if (fs.lstatSync(projectPath).isFile()) dir = path.dirname(projectPath);
    const pj = path.join(dir, "project.json");
    if (!fs.existsSync(pj)) throw new Error("project.json not found.");
    const project = readJsonNoBom(pj);
    // rename files with spaces
    const allFiles = fs.readdirSync(dir);
    for (let f of allFiles) {
        if (f.match(/\s/)) {
            const safe = slugify(f);
            const oldp = path.join(dir, f);
            const newp = path.join(dir, safe);
            if (!fs.existsSync(newp)) {
                fs.copyFileSync(oldp, newp);
                console.log(`Created slugified copy: ${safe}`);
                // update references in project.json if present
                for (let k in project) {
                    if (typeof project[k] === "string" && project[k] === f) project[k] = safe;
                }
            }
        }
    }
    fs.writeFileSync(pj + ".repairbak", JSON.stringify(project, null, 2), "utf8");
    fs.writeFileSync(pj, JSON.stringify(project, null, 2), "utf8");
    return { status: "repaired", project };
}

module.exports = { loadProject, repairProject };