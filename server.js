const express = require("express");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 3000;
const rootDir = __dirname;
const sentinelDir = path.join(rootDir, "sentinel");
const dataDir = path.join(rootDir, "data");
const dataFile = path.join(dataDir, "runtime.json");
const jwtSecret = process.env.JWT_SECRET || "sentinel-dev-secret";

app.disable("x-powered-by");
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

function uid(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowISO() {
  return new Date().toISOString();
}

function caseNumberFrom(cases) {
  const year = new Date().getFullYear();
  const max = cases.reduce((acc, item) => {
    const match = String(item.caseNumber || "").match(/-(\d+)$/);
    const seq = match ? Number(match[1]) : 0;
    return Number.isFinite(seq) ? Math.max(acc, seq) : acc;
  }, 0);
  return `SNT-${year}-${String(max + 1).padStart(4, "0")}`;
}

function createSeedState() {
  const officers = [
    {
      id: uid("officer"),
      badgeNumber: "4521",
      fullName: "Officer Mutoni",
      rankTitle: "Inspector",
      role: "admin",
      permissions: ["*"],
      passwordHash: bcrypt.hashSync("Sentinel123!", 10),
    },
    {
      id: uid("officer"),
      badgeNumber: "4187",
      fullName: "Officer Jean Claude",
      rankTitle: "Detective Sergeant",
      role: "investigator",
      permissions: ["cases:read", "cases:write", "evidence:read", "evidence:write", "suspects:read", "identity:request", "cctv:read"],
      passwordHash: bcrypt.hashSync("Investigate!", 10),
    },
    {
      id: uid("officer"),
      badgeNumber: "5304",
      fullName: "Officer Aline",
      rankTitle: "Analyst",
      role: "analyst",
      permissions: ["cases:read", "analytics:view", "suspects:read", "cctv:read"],
      passwordHash: bcrypt.hashSync("Analyse99!", 10),
    },
  ];

  const cases = [
    {
      id: uid("case"),
      caseNumber: "SNT-2026-0001",
      title: "Armed robbery near Kigali Convention Centre",
      category: "Robbery",
      status: "under_investigation",
      priority: "critical",
      location: "Nyarugenge",
      reporter: "Front desk security",
      contact: "+250788111222",
      assignedOfficerId: officers[1].id,
      suspectId: null,
      description: "Suspects fled on motorcycles after taking cash and phones.",
      createdAt: "2026-06-05T06:30:00.000Z",
      updatedAt: "2026-06-06T09:15:00.000Z",
      closedAt: null,
      history: [
        { id: uid("hist"), at: "2026-06-05T06:30:00.000Z", actor: "Officer Mutoni", action: "Case opened", note: "Initial incident report logged." },
      ],
    },
  ];

  return {
    users: officers.map((officer) => ({
      id: officer.id,
      badgeNumber: officer.badgeNumber,
      name: officer.fullName,
      role: officer.role,
      permissions: officer.permissions,
      passwordHash: officer.passwordHash,
    })),
    officers: officers.map(({ passwordHash, ...officer }) => officer),
    cases,
    evidence: [],
    suspects: [],
    cameras: [],
    verifications: [],
    auditLogs: [],
  };
}

function loadState() {
  ensureDataDir();
  if (!fs.existsSync(dataFile)) {
    const state = createSeedState();
    fs.writeFileSync(dataFile, JSON.stringify(state, null, 2));
    return state;
  }

  try {
    return JSON.parse(fs.readFileSync(dataFile, "utf8"));
  } catch {
    const state = createSeedState();
    fs.writeFileSync(dataFile, JSON.stringify(state, null, 2));
    return state;
  }
}

let state = loadState();

function persistState() {
  ensureDataDir();
  fs.writeFileSync(dataFile, JSON.stringify(state, null, 2));
}

function addAudit(actor, action, entityType, entityId, metadata = {}) {
  state.auditLogs.unshift({
    id: uid("audit"),
    actor,
    action,
    entityType,
    entityId,
    metadata,
    createdAt: nowISO(),
  });
  persistState();
}

function permissionMatches(permission, scope) {
  if (permission === "*") return true;
  if (permission === scope) return true;
  if (permission.endsWith(":*")) return scope.startsWith(permission.slice(0, -1));
  return false;
}

function canAccess(user, scope) {
  if (!user) return false;
  return (user.permissions || []).some((permission) => permissionMatches(permission, scope));
}

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing bearer token" });

  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

function authorize(...scopes) {
  return (req, res, next) => {
    if (req.user?.permissions?.includes("*")) return next();
    if (scopes.some((scope) => canAccess(req.user, scope))) return next();
    return res.status(403).json({ error: "Insufficient permissions" });
  };
}

function baseRecord(item) {
  return {
    ...item,
    id: uid("record"),
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
}

app.get("/healthz", (_req, res) => {
  res.json({
    ok: true,
    service: "sentinel-crime-report-system",
    timestamp: nowISO(),
  });
});

app.get("/api", (_req, res) => {
  res.json({
    name: "Sentinel API",
    version: "1.0.0",
    endpoints: [
      "POST /api/auth/login",
      "GET /api/me",
      "GET /api/cases",
      "POST /api/cases",
      "PUT /api/cases/:id",
      "DELETE /api/cases/:id",
      "GET /api/evidence",
      "POST /api/evidence",
      "GET /api/officers",
      "GET /api/suspects",
      "GET /api/cameras",
      "GET /api/verifications",
      "GET /api/audit-logs",
    ],
  });
});

app.post("/api/auth/login", (req, res) => {
  const { badgeNumber, password } = req.body || {};
  const user = state.users.find((entry) => entry.badgeNumber === badgeNumber);
  if (!user || !bcrypt.compareSync(String(password || ""), user.passwordHash)) {
    addAudit("auth", "Failed login", "auth", badgeNumber || "unknown", { badgeNumber });
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    {
      sub: user.id,
      badgeNumber: user.badgeNumber,
      name: user.name,
      role: user.role,
      permissions: user.permissions,
    },
    jwtSecret,
    { expiresIn: "12h" }
  );

  addAudit(user.name, "Signed in", "auth", user.id, { role: user.role });
  res.json({
    token,
    user: {
      id: user.id,
      badgeNumber: user.badgeNumber,
      name: user.name,
      role: user.role,
      permissions: user.permissions,
    },
  });
});

app.get("/api/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.get("/api/cases", authenticate, authorize("cases:read", "cases:*"), (_req, res) => {
  res.json(state.cases);
});

app.post("/api/cases", authenticate, authorize("cases:write", "cases:*"), (req, res) => {
  const { title, category, status = "open", priority = "medium", location, reporter = "", contact = "", assignedOfficerId = null, suspectId = null, description = "" } = req.body || {};
  if (!title || !location) return res.status(400).json({ error: "title and location are required" });

  const record = {
    id: uid("case"),
    caseNumber: caseNumberFrom(state.cases),
    title,
    category,
    status,
    priority,
    location,
    reporter,
    contact,
    assignedOfficerId,
    suspectId,
    description,
    createdAt: nowISO(),
    updatedAt: nowISO(),
    closedAt: status === "closed" ? nowISO() : null,
    history: [
      { id: uid("hist"), at: nowISO(), actor: req.user.name, action: "Case opened", note: "Case created through the API." },
    ],
  };
  state.cases.unshift(record);
  addAudit(req.user.name, "Created case", "case", record.id, { caseNumber: record.caseNumber });
  res.status(201).json(record);
});

app.put("/api/cases/:id", authenticate, authorize("cases:write", "cases:*"), (req, res) => {
  const record = state.cases.find((entry) => entry.id === req.params.id);
  if (!record) return res.status(404).json({ error: "Case not found" });

  const {
    title = record.title,
    category = record.category,
    status = record.status,
    priority = record.priority,
    location = record.location,
    reporter = record.reporter,
    contact = record.contact,
    assignedOfficerId = record.assignedOfficerId,
    suspectId = record.suspectId,
    description = record.description,
  } = req.body || {};

  Object.assign(record, {
    title,
    category,
    status,
    priority,
    location,
    reporter,
    contact,
    assignedOfficerId,
    suspectId,
    description,
    updatedAt: nowISO(),
    closedAt: status === "closed" ? record.closedAt || nowISO() : null,
  });
  record.history = [
    ...(record.history || []),
    { id: uid("hist"), at: nowISO(), actor: req.user.name, action: "Case updated", note: `Status set to ${status}.` },
  ];
  addAudit(req.user.name, "Updated case", "case", record.id, { status });
  persistState();
  res.json(record);
});

app.delete("/api/cases/:id", authenticate, authorize("cases:write", "cases:*"), (req, res) => {
  const index = state.cases.findIndex((entry) => entry.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Case not found" });
  const [removed] = state.cases.splice(index, 1);
  addAudit(req.user.name, "Deleted case", "case", removed.id, { caseNumber: removed.caseNumber });
  res.json({ ok: true });
});

function listEntity(entity) {
  return (_req, res) => res.json(state[entity]);
}

function addEntity(entity, scope, transform) {
  return (req, res) => {
    const body = transform ? transform(req.body || {}, req.user) : req.body || {};
    const record = baseRecord(body);
    state[entity].unshift(record);
    addAudit(req.user.name, `Created ${entity.slice(0, -1)}`, entity.slice(0, -1), record.id, record);
    res.status(201).json(record);
  };
}

app.get("/api/officers", authenticate, authorize("officers:read", "officers:*"), listEntity("officers"));
app.get("/api/suspects", authenticate, authorize("suspects:read", "suspects:*"), listEntity("suspects"));
app.get("/api/evidence", authenticate, authorize("evidence:read", "evidence:*"), listEntity("evidence"));
app.get("/api/cameras", authenticate, authorize("cctv:read", "cctv:*"), listEntity("cameras"));
app.get("/api/verifications", authenticate, authorize("identity:read", "identity:*"), listEntity("verifications"));
app.get("/api/audit-logs", authenticate, authorize("security:view", "*"), listEntity("auditLogs"));

app.post("/api/evidence", authenticate, authorize("evidence:write", "evidence:*"), addEntity("evidence"));
app.post("/api/suspects", authenticate, authorize("suspects:write", "suspects:*"), addEntity("suspects"));
app.post("/api/cameras", authenticate, authorize("cctv:write", "cctv:*"), addEntity("cameras"));
app.post("/api/verifications", authenticate, authorize("identity:request", "identity:*"), addEntity("verifications"));

app.get("/api/analytics/summary", authenticate, authorize("analytics:view", "*"), (_req, res) => {
  const closedCases = state.cases.filter((entry) => entry.status === "closed").length;
  res.json({
    totalCases: state.cases.length,
    closedCases,
    openCases: state.cases.length - closedCases,
    evidenceCount: state.evidence.length,
    officers: state.officers.length,
    closureRate: state.cases.length ? Math.round((closedCases / state.cases.length) * 100) : 0,
  });
});

app.use("/sentinel", express.static(sentinelDir, { extensions: ["html"] }));
app.use("/database", express.static(path.join(rootDir, "database")));
app.use("/docs", express.static(path.join(rootDir, "docs")));
app.use("/static", express.static(path.join(rootDir, "static")));

app.get("/", (_req, res) => {
  res.redirect("/sentinel/sentinel-react.html");
});

app.get("*", (req, res) => {
  const candidate = path.join(rootDir, req.path);
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return res.sendFile(candidate);
  }
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Not found" });
  }
  return res.redirect("/sentinel/sentinel-react.html");
});

app.listen(port, () => {
  console.log(`Sentinel server listening on http://localhost:${port}`);
});
