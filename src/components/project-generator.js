/*
  src/components/project-generator.js
  Minimal, safe generator: copies a source MIDI into projectDir, creates easy_auto.mid and hard_auto.mid as copies,
  creates simple easy.json / hard.json metadata, and writes/merges project.json.
  This is intentionally conservative (no heavy musical algorithm) and makes Generate Variants produce files.
*/
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");

async function generateDifficultyVariants(opts) {
  if (!opts || !opts.projectDir || !opts.inputMidiPath) throw new Error("projectDir and inputMidiPath required");
  const projectDir = opts.projectDir;
  const midiSrc = opts.inputMidiPath;
  await fs.mkdir(projectDir, { recursive: true });

  const copyBase = path.join(projectDir, path.basename(midiSrc));
  await fs.copyFile(midiSrc, copyBase);

  // produce easy and hard copies (identical for now)
  const easyMid = path.join(projectDir, "easy_auto.mid");
  const hardMid = path.join(projectDir, "hard_auto.mid");
  await fs.copyFile(copyBase, easyMid);
  await fs.copyFile(copyBase, hardMid);

  // create simple arrangement JSON placeholders
  const easyJson = {
    name: "easy",
    source: path.basename(easyMid),
    difficulty: "easy",
    notes: [] // empty scaffold - real extraction can be added later
  };
  const hardJson = {
    name: "hard",
    source: path.basename(hardMid),
    difficulty: "hard",
    notes: []
  };

  await fs.writeFile(path.join(projectDir, "easy.json"), JSON.stringify(easyJson, null, 2), "utf8");
  await fs.writeFile(path.join(projectDir, "hard.json"), JSON.stringify(hardJson, null, 2), "utf8");

  // create project.json if missing or merge
  const pjPath = path.join(projectDir, "project.json");
  let project = {
    title: path.basename(projectDir),
    tempo: 120,
    arrangements: {
      easy: "easy.json",
      hard: "hard.json"
    }
  };
  if (fsSync.existsSync(pjPath)) {
    try {
      const existing = JSON.parse(await fs.readFile(pjPath, "utf8"));
      project = Object.assign(existing, project);
    } catch (e) { /* ignore parse errors, overwrite */ }
  }
  await fs.writeFile(pjPath, JSON.stringify(project, null, 2), "utf8");

  return {
    message: "Variants generated",
    files: {
      copied: path.basename(copyBase),
      easy: path.basename(easyMid),
      hard: path.basename(hardMid),
      easyJson: "easy.json",
      hardJson: "hard.json",
      projectJson: "project.json"
    },
    projectDir
  };
}

module.exports = { generateDifficultyVariants };