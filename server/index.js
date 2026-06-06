import crypto from "crypto";
import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");

const PORT = Number(process.env.PORT) || 8080;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "poolesville";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "esports";
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

/** @type {Map<string, number>} */
const sessions = new Map();

const app = express();
app.use(express.json({ limit: "4mb" }));

function secureEqual(a, b) {
  const sa = String(a);
  const sb = String(b);
  if (sa.length !== sb.length) return false;
  let diff = 0;
  for (let i = 0; i < sa.length; i += 1) {
    diff |= sa.charCodeAt(i) ^ sb.charCodeAt(i);
  }
  return diff === 0;
}

function createSessionToken() {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, Date.now() + TOKEN_TTL_MS);
  return token;
}

function isValidSession(token) {
  const expires = sessions.get(token);
  if (!expires) return false;
  if (Date.now() > expires) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (isValidSession(token)) return next();
  res.status(401).json({ error: "Unauthorized" });
}

async function readJsonFile(filename) {
  const filePath = path.join(DATA_DIR, filename);
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function writeJsonFile(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  const body = `${JSON.stringify(data, null, 2)}\n`;
  await fs.writeFile(filePath, body, "utf8");
}

app.post("/api/login", (req, res) => {
  const username = String(req.body?.username ?? "").trim();
  const password = String(req.body?.password ?? "");

  if (secureEqual(username, ADMIN_USERNAME) && secureEqual(password, ADMIN_PASSWORD)) {
    return res.json({ ok: true, token: createSessionToken() });
  }

  res.status(401).json({ ok: false, error: "Invalid credentials" });
});

app.get("/api/schedule", async (_req, res) => {
  try {
    const data = await readJsonFile("schedule.json");
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not read schedule" });
  }
});

app.post("/api/schedule", requireAdmin, async (req, res) => {
  try {
    const data = req.body?.data ?? req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: "Schedule must be an array" });
    }
    await writeJsonFile("schedule.json", data);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not save schedule" });
  }
});

app.get("/api/highlights", async (_req, res) => {
  try {
    const data = await readJsonFile("highlights.json");
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not read highlights" });
  }
});

app.post("/api/highlights", requireAdmin, async (req, res) => {
  try {
    const data = req.body?.data ?? req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: "Highlights must be an array" });
    }
    await writeJsonFile("highlights.json", data);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not save highlights" });
  }
});

app.get("/health", (_req, res) => {
  res.type("text/plain").send("ok");
});

app.use(express.static(ROOT));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Poolesville Esports site: http://localhost:${PORT}`);
  console.log("Admin saves update data/schedule.json and data/highlights.json for all visitors.");
});
