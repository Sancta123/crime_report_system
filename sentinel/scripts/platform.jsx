const { useEffect, useMemo, useState } = React;

const STORAGE_KEY = "sentinel-platform-state-v2";
const SESSION_KEY = "sentinel-platform-session-v2";
const THEME_KEY = "sentinel-platform-theme-v2";

const CASE_STATUSES = [
  { value: "open", label: "Open", tone: "open" },
  { value: "under_investigation", label: "Under Investigation", tone: "review" },
  { value: "evidence_collected", label: "Evidence Collected", tone: "evidence" },
  { value: "awaiting_review", label: "Awaiting Review", tone: "review" },
  { value: "closed", label: "Closed", tone: "closed" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const OFFICER_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "commander", label: "Commander" },
  { value: "investigator", label: "Investigator" },
  { value: "analyst", label: "Analyst" },
  { value: "officer", label: "Officer" },
];

const PERMISSIONS = {
  admin: ["*"],
  commander: ["cases:*", "evidence:*", "officers:read", "suspects:*", "analytics:view", "identity:request", "cctv:*"],
  investigator: ["cases:read", "cases:write", "evidence:read", "evidence:write", "suspects:read", "identity:request", "cctv:read"],
  analyst: ["cases:read", "analytics:view", "suspects:read", "cctv:read"],
  officer: ["cases:read", "evidence:read", "suspects:read", "identity:request", "cctv:read"],
};

const NAV = [
  { id: "dashboard", label: "Dashboard" },
  { id: "cases", label: "Cases" },
  { id: "evidence", label: "Evidence" },
  { id: "officers", label: "Officers" },
  { id: "cctv", label: "CCTV" },
  { id: "identity", label: "Identity" },
  { id: "suspects", label: "Suspects" },
  { id: "analytics", label: "Analytics" },
  { id: "security", label: "Security" },
  { id: "sync", label: "Sync" },
];

const EVIDENCE_TYPES = [
  "Photo",
  "Video",
  "Document",
  "CCTV Footage",
  "Audio",
  "Forensic Sample",
];

const VERIFICATION_TYPES = ["Fingerprint Verification", "Facial Recognition Verification", "National ID Verification"];

function uid(prefix = "id") {
  if (window.crypto?.randomUUID) return `${prefix}-${window.crypto.randomUUID()}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowISO() {
  return new Date().toISOString();
}

function safeParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function clone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return safeParse(JSON.stringify(value), value);
}

function formatDateTime(value) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDate(value) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

function formatDurationHours(hours) {
  if (Number.isNaN(hours) || hours == null) return "n/a";
  return `${hours.toFixed(1)}h`;
}

function caseStatusLabel(value) {
  return CASE_STATUSES.find((status) => status.value === value)?.label || value;
}

function caseStatusTone(value) {
  return CASE_STATUSES.find((status) => status.value === value)?.tone || "open";
}

function priorityTone(value) {
  if (value === "critical") return "critical";
  if (value === "high") return "review";
  if (value === "medium") return "open";
  return "closed";
}

function roleTone(role) {
  if (role === "admin" || role === "commander") return "critical";
  if (role === "investigator") return "review";
  if (role === "analyst") return "open";
  return "closed";
}

function generateCaseNumber(cases) {
  const year = new Date().getFullYear();
  const maxSequence = cases.reduce((max, current) => {
    const match = String(current.caseNumber || "").match(/-(\d+)$/);
    const sequence = match ? Number(match[1]) : 0;
    return Number.isFinite(sequence) ? Math.max(max, sequence) : max;
  }, 0);
  return `SNT-${year}-${String(maxSequence + 1).padStart(4, "0")}`;
}

function makeAudit(actor, action, entityType, entityId, details) {
  return {
    id: uid("audit"),
    actor,
    action,
    entityType,
    entityId,
    details,
    createdAt: nowISO(),
  };
}

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const pushToast = (message, kind = "info") => {
    const id = uid("toast");
    setToasts((current) => [...current, { id, message, kind }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);
  };
  return [toasts, pushToast];
}

function loadTheme() {
  const saved = window.localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: light)")?.matches ? "light" : "dark";
}

function loadSession() {
  return safeParse(window.localStorage.getItem(SESSION_KEY), null);
}

function initialData() {
  const officers = [
    {
      id: uid("officer"),
      badgeNumber: "4521",
      fullName: "Officer Mutoni",
      rankTitle: "Inspector",
      role: "admin",
      accessCode: "Sentinel123!",
      email: "mutoni@sentinel.local",
      phone: "+250780000001",
      assignedUnit: "Central Operations",
      status: "Active",
      permissions: PERMISSIONS.admin,
      activity: "System owner and case supervisor",
      workload: 4,
    },
    {
      id: uid("officer"),
      badgeNumber: "4187",
      fullName: "Officer Jean Claude",
      rankTitle: "Detective Sergeant",
      role: "investigator",
      accessCode: "Investigate!",
      email: "jean.claude@sentinel.local",
      phone: "+250780000002",
      assignedUnit: "Investigations Unit",
      status: "Active",
      permissions: PERMISSIONS.investigator,
      activity: "Assigned to major crime investigations",
      workload: 7,
    },
    {
      id: uid("officer"),
      badgeNumber: "5304",
      fullName: "Officer Aline",
      rankTitle: "Analyst",
      role: "analyst",
      accessCode: "Analyse99!",
      email: "aline@sentinel.local",
      phone: "+250780000003",
      assignedUnit: "Intelligence Desk",
      status: "Active",
      permissions: PERMISSIONS.analyst,
      activity: "Crime trends and intelligence reporting",
      workload: 3,
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
        { id: uid("hist"), at: "2026-06-05T09:15:00.000Z", actor: "Officer Jean Claude", action: "Assigned", note: "Case assigned to investigations unit." },
      ],
    },
    {
      id: uid("case"),
      caseNumber: "SNT-2026-0002",
      title: "Vehicle theft at Kimironko market",
      category: "Vehicle Crime",
      status: "evidence_collected",
      priority: "high",
      location: "Kimironko",
      reporter: "Market manager",
      contact: "+250788222333",
      assignedOfficerId: officers[1].id,
      suspectId: null,
      description: "CCTV clips and witness statements captured overnight.",
      createdAt: "2026-06-04T11:10:00.000Z",
      updatedAt: "2026-06-05T16:20:00.000Z",
      closedAt: null,
      history: [
        { id: uid("hist"), at: "2026-06-04T11:10:00.000Z", actor: "Officer Aline", action: "Case opened", note: "Vehicle reported missing from lot." },
        { id: uid("hist"), at: "2026-06-05T16:20:00.000Z", actor: "Officer Jean Claude", action: "Evidence added", note: "CCTV clips attached to case file." },
      ],
    },
    {
      id: uid("case"),
      caseNumber: "SNT-2026-0003",
      title: "Cyber fraud complaint from telecom customer",
      category: "Cybercrime",
      status: "awaiting_review",
      priority: "medium",
      location: "Gasabo",
      reporter: "Call center referral",
      contact: "+250788444555",
      assignedOfficerId: officers[2].id,
      suspectId: null,
      description: "Fraudulent SIM swap request and banking transfer attempt.",
      createdAt: "2026-06-03T14:00:00.000Z",
      updatedAt: "2026-06-05T08:45:00.000Z",
      closedAt: null,
      history: [
        { id: uid("hist"), at: "2026-06-03T14:00:00.000Z", actor: "Officer Aline", action: "Case opened", note: "Fraud pattern flagged for review." },
      ],
    },
    {
      id: uid("case"),
      caseNumber: "SNT-2026-0004",
      title: "Street assault outside bus station",
      category: "Assault",
      status: "closed",
      priority: "high",
      location: "Nyamirambo",
      reporter: "Patrol unit",
      contact: "+250788666777",
      assignedOfficerId: officers[0].id,
      suspectId: null,
      description: "Suspect apprehended, statements filed, and charge approval received.",
      createdAt: "2026-06-01T18:25:00.000Z",
      updatedAt: "2026-06-02T10:10:00.000Z",
      closedAt: "2026-06-02T10:10:00.000Z",
      history: [
        { id: uid("hist"), at: "2026-06-01T18:25:00.000Z", actor: "Officer Mutoni", action: "Case opened", note: "Patrol response recorded." },
        { id: uid("hist"), at: "2026-06-02T10:10:00.000Z", actor: "Officer Mutoni", action: "Case closed", note: "Case sent to prosecution." },
      ],
    },
  ];

  const suspects = [
    {
      id: uid("suspect"),
      fullName: "Mugisha Eric",
      nationalId: "1199887711223344",
      address: "Kicukiro District, Kigali",
      contactInformation: "+250788900111",
      knownAliases: "Eric K.",
      riskLevel: "High",
      verificationStatus: "Verified by National ID API",
      linkedCaseIds: [cases[0].id],
    },
    {
      id: uid("suspect"),
      fullName: "Ntirenganya Felix",
      nationalId: "1177443322119988",
      address: "Gasabo District, Kigali",
      contactInformation: "+250788900222",
      knownAliases: "F. Ntirenganya",
      riskLevel: "Medium",
      verificationStatus: "Pending facial verification",
      linkedCaseIds: [cases[1].id, cases[2].id],
    },
  ];

  const evidence = [
    {
      id: uid("evidence"),
      evidenceNumber: "EVD-2026-0001",
      caseId: cases[0].id,
      caseNumber: cases[0].caseNumber,
      type: "Photo",
      fileName: "station-entry-cam-1.jpg",
      fileSize: "3.8 MB",
      source: "Officer upload",
      captureAt: "2026-06-05T06:36:00.000Z",
      storageRef: "object-store://sentinel/case-0001/photo-1",
      description: "Entrance camera frame showing suspect motorcycle.",
      custody: [
        { id: uid("custody"), at: "2026-06-05T06:40:00.000Z", actor: "Officer Mutoni", action: "Logged", note: "Initial receipt in operations room." },
      ],
    },
    {
      id: uid("evidence"),
      evidenceNumber: "EVD-2026-0002",
      caseId: cases[1].id,
      caseNumber: cases[1].caseNumber,
      type: "CCTV Footage",
      fileName: "kimironko-lot-cam.mp4",
      fileSize: "148 MB",
      source: "CCTV camera KRN-02",
      captureAt: "2026-06-04T23:40:00.000Z",
      storageRef: "object-store://sentinel/case-0002/clip-01",
      description: "Two-minute clip of a white hatchback leaving the market lot.",
      custody: [
        { id: uid("custody"), at: "2026-06-05T16:22:00.000Z", actor: "Officer Jean Claude", action: "Logged", note: "Clip transferred to evidence vault." },
      ],
    },
  ];

  const cameras = [
    { id: uid("camera"), cameraCode: "KRN-02", locationName: "Kimironko Market Lot", district: "Gasabo", latitude: "-1.943800", longitude: "30.114700", retentionDays: 30, status: "Active" },
    { id: uid("camera"), cameraCode: "NRY-04", locationName: "Nyarugenge Bus Station", district: "Nyarugenge", latitude: "-1.956200", longitude: "30.057300", retentionDays: 21, status: "Active" },
    { id: uid("camera"), cameraCode: "GSA-11", locationName: "Gasabo Checkpoint", district: "Gasabo", latitude: "-1.909500", longitude: "30.082400", retentionDays: 45, status: "Maintenance" },
  ];

  const verifications = [
    {
      id: uid("verify"),
      timestamp: "2026-06-05T12:22:00.000Z",
      officerName: "Officer Jean Claude",
      verificationType: "National ID Verification",
      providerName: "Authorized National Registry",
      suspectName: "Mugisha Eric",
      authorizationReference: "AUTH-2026-1198",
      status: "Verified",
      details: "Identity match approved. Raw biometric templates were not stored in Sentinel.",
    },
  ];

  const auditLogs = [
    makeAudit("Officer Mutoni", "Case opened", "case", cases[0].id, "Initial armed robbery report was created."),
    makeAudit("Officer Jean Claude", "Evidence linked", "evidence", evidence[0].id, "Photo linked to case SNT-2026-0001."),
    makeAudit("Officer Aline", "Identity verification logged", "verification", verifications[0].id, "National ID verification completed through approved provider."),
  ];

  return {
    cases,
    evidence,
    officers,
    suspects,
    cameras,
    verifications,
    auditLogs,
    queue: [],
    lastSyncAt: nowISO(),
  };
}

function normalizeOfficerCredentials(officer) {
  const defaults = {
    "4521": "Sentinel123!",
    "4187": "Investigate!",
    "5304": "Analyse99!",
  };

  return {
    ...officer,
    accessCode: officer.accessCode || defaults[officer.badgeNumber] || "",
  };
}

function loadData() {
  const saved = safeParse(window.localStorage.getItem(STORAGE_KEY), null);
  if (!saved) return initialData();
  const seed = initialData();
  return {
    ...seed,
    ...saved,
    officers: Array.isArray(saved.officers) ? saved.officers.map(normalizeOfficerCredentials) : seed.officers.map(normalizeOfficerCredentials),
    queue: Array.isArray(saved.queue) ? saved.queue : [],
  };
}

function StatsCard({ mark, label, value, note }) {
  return (
    <article className="stat-card" data-mark={mark}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
    </article>
  );
}

function Pill({ tone = "open", children }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

function Card({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-head">
        <div className="panel-copy">
          <h2 className="panel-title">{title}</h2>
          {subtitle ? <div className="panel-subtitle">{subtitle}</div> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function MiniTable({ columns, rows, emptyMessage }) {
  if (!rows.length) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {row.cells.map((cell, index) => (
                <td key={`${row.id}-${index}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LoginModal({ open, officers, onClose, onLogin, currentBadge }) {
  const [badgeNumber, setBadgeNumber] = useState(currentBadge || officers[0]?.badgeNumber || "");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (open) {
      setBadgeNumber(currentBadge || officers[0]?.badgeNumber || "");
      setPassword("");
    }
  }, [open, currentBadge, officers]);

  if (!open) return null;

  const selectedOfficer = officers.find((officer) => officer.badgeNumber === badgeNumber);

  return (
    <div className="modal-overlay open" role="presentation" onClick={onClose}>
      <div className="modal auth-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-title">Staff Sign In</div>
            <div className="modal-subtitle">Authenticate with your badge number and access code.</div>
          </div>
          <button className="close-btn" type="button" onClick={onClose} aria-label="Close sign in dialog">
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="auth-preview">
            <Pill tone={selectedOfficer ? roleTone(selectedOfficer.role) : "open"}>
              {selectedOfficer ? `${selectedOfficer.fullName} · ${selectedOfficer.role}` : "No officer selected"}
            </Pill>
          </div>
          <Field label="Badge Number">
            <input className="input" value={badgeNumber} onChange={(event) => setBadgeNumber(event.target.value)} placeholder="4521" />
          </Field>
          <Field label="Access Code">
            <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter access code" />
          </Field>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onLogin({ badgeNumber, password })}
              disabled={!badgeNumber || !password}
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthModal({ open, officers, onClose, onLogin, onRegister, currentBadge }) {
  const [mode, setMode] = useState("signin");
  const [badgeNumber, setBadgeNumber] = useState(currentBadge || officers[0]?.badgeNumber || "");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [rankTitle, setRankTitle] = useState("Officer");
  const [role, setRole] = useState("investigator");

  useEffect(() => {
    if (open) {
      setMode("signin");
      setBadgeNumber(currentBadge || officers[0]?.badgeNumber || "");
      setPassword("");
      setFullName("");
      setRankTitle("Officer");
      setRole("investigator");
    }
  }, [open, currentBadge, officers]);

  if (!open) return null;

  const selectedOfficer = officers.find((officer) => officer.badgeNumber === badgeNumber);

  return (
    <div className="modal-overlay open" role="presentation" onClick={onClose}>
      <div className="modal auth-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-title">{mode === "register" ? "Register Officer" : "Staff Sign In"}</div>
            <div className="modal-subtitle">
              {mode === "register"
                ? "Create a staff account with a badge number and password."
                : "Authenticate with your officer badge and password."}
            </div>
          </div>
          <button className="close-btn" type="button" onClick={onClose} aria-label="Close auth dialog">
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="auth-tabs">
            <button type="button" className={`auth-tab ${mode === "signin" ? "active" : ""}`} onClick={() => setMode("signin")}>
              Sign in
            </button>
            <button type="button" className={`auth-tab ${mode === "register" ? "active" : ""}`} onClick={() => setMode("register")}>
              Register
            </button>
          </div>
          <div className="auth-preview">
            <Pill tone={selectedOfficer ? roleTone(selectedOfficer.role) : "open"}>
              {selectedOfficer ? `${selectedOfficer.fullName} · ${selectedOfficer.role}` : "No officer selected"}
            </Pill>
          </div>
          {mode === "register" ? (
            <>
              <Field label="Full name">
                <input className="input" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Officer full name" />
              </Field>
              <Field label="Badge number">
                <input className="input" value={badgeNumber} onChange={(event) => setBadgeNumber(event.target.value)} placeholder="4521" />
              </Field>
              <Field label="Password">
                <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Create a password" />
              </Field>
              <div className="form-grid">
                <Field label="Rank title">
                  <input className="input" value={rankTitle} onChange={(event) => setRankTitle(event.target.value)} placeholder="Officer" />
                </Field>
                <Field label="Role">
                  <select className="input" value={role} onChange={(event) => setRole(event.target.value)}>
                    {OFFICER_ROLES.map((entry) => (
                      <option key={entry.value} value={entry.value}>
                        {entry.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onRegister({ fullName, badgeNumber, password, rankTitle, role })}
                  disabled={!fullName || !badgeNumber || !password}
                >
                  Create account
                </button>
              </div>
            </>
          ) : (
            <>
              <Field label="Badge number">
                <input className="input" value={badgeNumber} onChange={(event) => setBadgeNumber(event.target.value)} placeholder="4521" />
              </Field>
              <Field label="Password">
                <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" />
              </Field>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onLogin({ badgeNumber, password })}
                  disabled={!badgeNumber || !password}
                >
                  Sign in
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState(loadTheme);
  const [data, setData] = useState(loadData);
  const [session, setSession] = useState(loadSession);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loginOpen, setLoginOpen] = useState(false);
  const [toasts, pushToast] = useToasts();
  const [search, setSearch] = useState("");
  const [online, setOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [caseForm, setCaseForm] = useState({
    title: "",
    category: "Robbery",
    status: "open",
    priority: "medium",
    location: "",
    reporter: "",
    contact: "",
    assignedOfficerId: "",
    suspectId: "",
    description: "",
  });
  const [selectedCaseId, setSelectedCaseId] = useState(data.cases[0]?.id || null);
  const [editingCaseId, setEditingCaseId] = useState(null);
  const [evidenceForm, setEvidenceForm] = useState({
    caseId: data.cases[0]?.id || "",
    type: "Photo",
    fileName: "",
    fileSize: "",
    source: "",
    captureAt: "",
    storageRef: "",
    description: "",
  });
  const [cameraForm, setCameraForm] = useState({
    cameraCode: "",
    locationName: "",
    district: "",
    latitude: "",
    longitude: "",
    retentionDays: 30,
    status: "Active",
  });
  const [suspectForm, setSuspectForm] = useState({
    fullName: "",
    nationalId: "",
    address: "",
    contactInformation: "",
    knownAliases: "",
    riskLevel: "Medium",
  });
  const [verificationForm, setVerificationForm] = useState({
    suspectId: data.suspects[0]?.id || "",
    verificationType: VERIFICATION_TYPES[0],
    providerName: "Authorized Identity Agency",
    authorizationReference: "",
    officerAuthorization: false,
    notes: "",
  });
  const [evidenceSelection, setEvidenceSelection] = useState(data.evidence[0]?.id || null);

  const currentUser = session?.currentUser || null;
  const currentOfficer = useMemo(
    () => data.officers.find((officer) => officer.badgeNumber === currentUser?.badgeNumber) || null,
    [data.officers, currentUser]
  );
  useEffect(() => {
    window.localStorage.setItem(THEME_KEY, theme);
    document.body.classList.remove("theme-dark", "theme-light");
    document.body.classList.add(theme === "light" ? "theme-light" : "theme-dark");
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  }, [session]);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      pushToast("Connection restored. Sentinel will synchronize the pending queue.");
    };
    const handleOffline = () => {
      setOnline(false);
      pushToast("Offline mode active. Reports will be stored locally until connectivity returns.", "error");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!online || !data.queue.length) return;
    const timer = window.setTimeout(() => {
      setData((current) => ({
        ...current,
        queue: [],
        lastSyncAt: nowISO(),
        auditLogs: [makeAudit(currentUser?.name || "System", "Queue synchronized", "sync", "queue", `Synced ${current.queue.length} pending operations.`), ...current.auditLogs],
      }));
      pushToast(`Synced ${data.queue.length} pending operation${data.queue.length === 1 ? "" : "s"}.`);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [online, data.queue.length]);

  useEffect(() => {
    if (editingCaseId) {
      const record = data.cases.find((entry) => entry.id === editingCaseId);
      if (record) {
        setCaseForm({
          title: record.title,
          category: record.category,
          status: record.status,
          priority: record.priority,
          location: record.location,
          reporter: record.reporter,
          contact: record.contact,
          assignedOfficerId: record.assignedOfficerId || "",
          suspectId: record.suspectId || "",
          description: record.description,
        });
      }
    } else {
      setCaseForm({
        title: "",
        category: "Robbery",
        status: "open",
        priority: "medium",
        location: "",
        reporter: "",
        contact: "",
        assignedOfficerId: currentOfficer?.id || data.officers[0]?.id || "",
        suspectId: "",
        description: "",
      });
    }
  }, [editingCaseId, data.cases, data.officers, currentOfficer]);

  useEffect(() => {
    if (!evidenceForm.caseId) {
      setEvidenceForm((current) => ({ ...current, caseId: data.cases[0]?.id || "" }));
    }
  }, [data.cases, evidenceForm.caseId]);

  useEffect(() => {
    if (!verificationForm.suspectId) {
      setVerificationForm((current) => ({ ...current, suspectId: data.suspects[0]?.id || "" }));
    }
  }, [data.suspects, verificationForm.suspectId]);

  const can = (scope) => {
    if (!currentOfficer) return false;
    const permissions = currentOfficer.permissions || PERMISSIONS[currentOfficer.role] || [];
    if (permissions.includes("*")) return true;
    return permissions.some((permission) => {
      if (permission === scope) return true;
      if (permission.endsWith(":*")) return scope.startsWith(permission.slice(0, -1));
      return false;
    });
  };

  const queueMutation = (nextData, description, entityType, entityId) => {
    const queueItem = {
      id: uid("queue"),
      description,
      entityType,
      entityId,
      createdAt: nowISO(),
    };
    setData((current) => ({
      ...nextData,
      queue: online ? current.queue : [...current.queue, queueItem],
      lastSyncAt: online ? nowISO() : current.lastSyncAt,
      auditLogs: [makeAudit(currentUser?.name || "System", description, entityType, entityId, description), ...nextData.auditLogs],
    }));
  };

  const applyCaseCreate = () => {
    if (!caseForm.title.trim() || !caseForm.location.trim()) {
      pushToast("Case title and location are required.", "error");
      return;
    }

    const caseId = uid("case");
    const caseNumber = generateCaseNumber(data.cases);
    const timestamp = nowISO();
    const assignedOfficer = data.officers.find((officer) => officer.id === caseForm.assignedOfficerId) || currentOfficer;
    const suspect = data.suspects.find((entry) => entry.id === caseForm.suspectId);

    const newCase = {
      id: caseId,
      caseNumber,
      title: caseForm.title.trim(),
      category: caseForm.category,
      status: caseForm.status,
      priority: caseForm.priority,
      location: caseForm.location.trim(),
      reporter: caseForm.reporter.trim(),
      contact: caseForm.contact.trim(),
      assignedOfficerId: assignedOfficer?.id || null,
      suspectId: suspect?.id || null,
      description: caseForm.description.trim(),
      createdAt: timestamp,
      updatedAt: timestamp,
      closedAt: caseForm.status === "closed" ? timestamp : null,
      history: [
        { id: uid("hist"), at: timestamp, actor: currentUser?.name || "System", action: "Case opened", note: "Case created through the Sentinel case desk." },
      ],
    };

    queueMutation(
      { ...data, cases: [newCase, ...data.cases] },
      `Created case ${caseNumber}`,
      "case",
      caseId
    );
    pushToast(`Case ${caseNumber} created.`);
    setSelectedCaseId(caseId);
    setEditingCaseId(null);
    setCaseForm((current) => ({
      ...current,
      title: "",
      location: "",
      reporter: "",
      contact: "",
      description: "",
    }));
  };

  const applyCaseUpdate = () => {
    if (!editingCaseId) return;
    const updatedAt = nowISO();
    const updatedCases = data.cases.map((entry) => {
      if (entry.id !== editingCaseId) return entry;
      const closedAt = caseForm.status === "closed" ? entry.closedAt || updatedAt : null;
      return {
        ...entry,
        title: caseForm.title.trim(),
        category: caseForm.category,
        status: caseForm.status,
        priority: caseForm.priority,
        location: caseForm.location.trim(),
        reporter: caseForm.reporter.trim(),
        contact: caseForm.contact.trim(),
        assignedOfficerId: caseForm.assignedOfficerId || null,
        suspectId: caseForm.suspectId || null,
        description: caseForm.description.trim(),
        updatedAt,
        closedAt,
        history: [
          ...entry.history,
          { id: uid("hist"), at: updatedAt, actor: currentUser?.name || "System", action: "Case updated", note: `Status set to ${caseStatusLabel(caseForm.status)}.` },
        ],
      };
    });

    queueMutation(
      { ...data, cases: updatedCases },
      `Updated case ${editingCaseId}`,
      "case",
      editingCaseId
    );
    pushToast("Case updated.");
    setEditingCaseId(null);
  };

  const applyCaseDelete = (caseId) => {
    const record = data.cases.find((entry) => entry.id === caseId);
    if (!record) return;
    if (!window.confirm(`Delete case ${record.caseNumber}? This keeps audit logs but removes the case record.`)) return;
    const nextCases = data.cases.filter((entry) => entry.id !== caseId);
    queueMutation({ ...data, cases: nextCases }, `Deleted case ${record.caseNumber}`, "case", caseId);
    if (selectedCaseId === caseId) setSelectedCaseId(nextCases[0]?.id || null);
    pushToast(`Case ${record.caseNumber} deleted.`);
  };

  const applyEvidenceCreate = () => {
    if (!evidenceForm.caseId || !evidenceForm.fileName.trim()) {
      pushToast("Evidence needs a linked case and file name.", "error");
      return;
    }
    const caseRecord = data.cases.find((entry) => entry.id === evidenceForm.caseId);
    if (!caseRecord) {
      pushToast("Select a valid case for the evidence item.", "error");
      return;
    }
    const evidenceId = uid("evidence");
    const evidenceNumber = `EVD-${new Date().getFullYear()}-${String(data.evidence.length + 1).padStart(4, "0")}`;
    const newEvidence = {
      id: evidenceId,
      evidenceNumber,
      caseId: caseRecord.id,
      caseNumber: caseRecord.caseNumber,
      type: evidenceForm.type,
      fileName: evidenceForm.fileName.trim(),
      fileSize: evidenceForm.fileSize.trim(),
      source: evidenceForm.source.trim(),
      captureAt: evidenceForm.captureAt || nowISO(),
      storageRef: evidenceForm.storageRef.trim(),
      description: evidenceForm.description.trim(),
      custody: [
        { id: uid("custody"), at: nowISO(), actor: currentUser?.name || "System", action: "Logged", note: "Initial evidence intake recorded." },
      ],
    };
    queueMutation(
      { ...data, evidence: [newEvidence, ...data.evidence] },
      `Added evidence ${evidenceNumber}`,
      "evidence",
      evidenceId
    );
    pushToast(`Evidence ${evidenceNumber} added.`);
    setEvidenceSelection(evidenceId);
    setEvidenceForm({
      ...evidenceForm,
      fileName: "",
      fileSize: "",
      source: "",
      storageRef: "",
      description: "",
    });
  };

  const addCustodyStep = (evidenceId) => {
    const stepNote = window.prompt("Describe the chain-of-custody step:");
    if (!stepNote) return;
    const nextEvidence = data.evidence.map((entry) => {
      if (entry.id !== evidenceId) return entry;
      const custody = [
        ...entry.custody,
        {
          id: uid("custody"),
          at: nowISO(),
          actor: currentUser?.name || "System",
          action: "Custody updated",
          note: stepNote,
        },
      ];
      return { ...entry, custody };
    });
    queueMutation({ ...data, evidence: nextEvidence }, "Updated evidence custody", "evidence", evidenceId);
    pushToast("Chain-of-custody entry recorded.");
  };

  const deleteEvidence = (evidenceId) => {
    const entry = data.evidence.find((item) => item.id === evidenceId);
    if (!entry) return;
    if (!window.confirm(`Delete evidence ${entry.evidenceNumber}?`)) return;
    queueMutation(
      { ...data, evidence: data.evidence.filter((item) => item.id !== evidenceId) },
      `Deleted evidence ${entry.evidenceNumber}`,
      "evidence",
      evidenceId
    );
    if (evidenceSelection === evidenceId) setEvidenceSelection(data.evidence.find((item) => item.id !== evidenceId)?.id || null);
    pushToast(`Evidence ${entry.evidenceNumber} deleted.`);
  };

  const saveOfficer = () => {
    if (!can("officers:*") && !can("officers:write")) {
      pushToast("You do not have permission to manage officers.", "error");
      return;
    }
    const badgeNumber = window.prompt("Badge number for the officer:");
    const fullName = window.prompt("Officer full name:");
    if (!badgeNumber || !fullName) return;
    const role = window.prompt("Role (admin, commander, investigator, analyst, officer):", "investigator") || "investigator";
    const nextOfficer = {
      id: uid("officer"),
      badgeNumber,
      fullName,
      rankTitle: window.prompt("Rank title:", "Sergeant") || "Sergeant",
      role,
      email: window.prompt("Email address:", `${fullName.toLowerCase().replace(/\s+/g, ".")}@sentinel.local`) || "",
      phone: window.prompt("Phone number:", "") || "",
      assignedUnit: window.prompt("Assigned unit:", "Investigations Unit") || "Investigations Unit",
      status: window.prompt("Status (Active / Leave / Suspended):", "Active") || "Active",
      permissions: PERMISSIONS[role] || PERMISSIONS.officer,
      activity: "Officer profile created through Sentinel officer portal",
      workload: 0,
    };
    queueMutation(
      { ...data, officers: [nextOfficer, ...data.officers] },
      `Created officer ${fullName}`,
      "officer",
      nextOfficer.id
    );
    pushToast("Officer profile created.");
  };

  const saveSuspect = () => {
    if (!suspectForm.fullName.trim()) {
      pushToast("Suspect name is required.", "error");
      return;
    }
    const suspectId = uid("suspect");
    const newSuspect = {
      id: suspectId,
      fullName: suspectForm.fullName.trim(),
      nationalId: suspectForm.nationalId.trim(),
      address: suspectForm.address.trim(),
      contactInformation: suspectForm.contactInformation.trim(),
      knownAliases: suspectForm.knownAliases.trim(),
      riskLevel: suspectForm.riskLevel,
      verificationStatus: "Unverified",
      linkedCaseIds: [],
    };
    queueMutation({ ...data, suspects: [newSuspect, ...data.suspects] }, `Created suspect ${newSuspect.fullName}`, "suspect", suspectId);
    pushToast("Suspect record created.");
    setSuspectForm({
      fullName: "",
      nationalId: "",
      address: "",
      contactInformation: "",
      knownAliases: "",
      riskLevel: "Medium",
    });
  };

  const registerCamera = () => {
    if (!cameraForm.cameraCode.trim() || !cameraForm.locationName.trim()) {
      pushToast("Camera code and location are required.", "error");
      return;
    }
    const cameraId = uid("camera");
    const newCamera = {
      id: cameraId,
      cameraCode: cameraForm.cameraCode.trim(),
      locationName: cameraForm.locationName.trim(),
      district: cameraForm.district.trim(),
      latitude: cameraForm.latitude.trim(),
      longitude: cameraForm.longitude.trim(),
      retentionDays: Number(cameraForm.retentionDays) || 30,
      status: cameraForm.status,
    };
    queueMutation({ ...data, cameras: [newCamera, ...data.cameras] }, `Registered camera ${newCamera.cameraCode}`, "camera", cameraId);
    pushToast("CCTV camera registered.");
    setCameraForm({
      cameraCode: "",
      locationName: "",
      district: "",
      latitude: "",
      longitude: "",
      retentionDays: 30,
      status: "Active",
    });
  };

  const logVerification = () => {
    if (!verificationForm.officerAuthorization) {
      pushToast("Officer authorization is required before any verification attempt.", "error");
      return;
    }
    if (!currentOfficer) {
      pushToast("Sign in before requesting identity verification.", "error");
      return;
    }
    const suspect = data.suspects.find((entry) => entry.id === verificationForm.suspectId);
    if (!suspect) {
      pushToast("Choose a suspect before requesting verification.", "error");
      return;
    }
    const verificationId = uid("verify");
    const entry = {
      id: verificationId,
      timestamp: nowISO(),
      officerName: currentOfficer.fullName,
      verificationType: verificationForm.verificationType,
      providerName: verificationForm.providerName,
      suspectName: suspect.fullName,
      authorizationReference: verificationForm.authorizationReference || `AUTH-${new Date().getFullYear()}-${String(data.verifications.length + 1).padStart(4, "0")}`,
      status: "Requested",
      details:
        "Verification request sent through an authorized agency integration layer. Raw biometric templates are not stored in Sentinel.",
    };
    queueMutation({ ...data, verifications: [entry, ...data.verifications] }, `Logged verification request for ${suspect.fullName}`, "verification", verificationId);
    pushToast("Verification request logged.");
    setVerificationForm((current) => ({
      ...current,
      authorizationReference: "",
      officerAuthorization: false,
      notes: "",
    }));
  };

  const handleLogin = ({ badgeNumber, password }) => {
    const officer = data.officers.find((entry) => entry.badgeNumber === badgeNumber);

    if (!officer || officer.accessCode !== password) {
      pushToast("Invalid officer badge or password.", "error");
      return;
    }

    const nextSession = {
      currentUser: {
        badgeNumber: officer.badgeNumber,
        name: officer.fullName,
        role: officer.role,
      },
    };
    setSession(nextSession);
    setLoginOpen(false);
    pushToast(`Welcome back, ${officer.fullName}.`);
  };

  const handleRegister = ({ fullName, badgeNumber, password, rankTitle, role }) => {
    if (!fullName || !badgeNumber || !password) {
      pushToast("All registration fields are required.", "error");
      return;
    }

    if (data.officers.some((officer) => officer.badgeNumber === badgeNumber)) {
      pushToast("That badge number is already registered.", "error");
      return;
    }

    const officer = {
      id: uid("officer"),
      badgeNumber,
      fullName,
      rankTitle: rankTitle || "Officer",
      role,
      accessCode: password,
      email: "",
      phone: "",
      assignedUnit: "Unassigned",
      status: "Active",
      permissions: PERMISSIONS[role] || PERMISSIONS.officer,
      activity: "Registered through Sentinel staff onboarding",
      workload: 0,
    };

    setData((current) => ({
      ...current,
      officers: [officer, ...current.officers],
      auditLogs: [makeAudit(fullName, "Registered officer account", "officer", officer.id, { badgeNumber, role }), ...current.auditLogs],
    }));

    setSession({
      currentUser: {
        badgeNumber: officer.badgeNumber,
        name: officer.fullName,
        role: officer.role,
      },
    });
    setLoginOpen(false);
    pushToast(`Account created for ${officer.fullName}. You are now signed in.`);
  };

  const handleLogout = () => {
    setSession(null);
    pushToast("Signed out.");
  };

  const selectedCase = data.cases.find((entry) => entry.id === selectedCaseId) || data.cases[0] || null;
  const selectedEvidence = data.evidence.find((entry) => entry.id === evidenceSelection) || data.evidence[0] || null;

  const visibleCases = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.cases.filter((entry) => {
      if (!term) return true;
      return [
        entry.caseNumber,
        entry.title,
        entry.category,
        entry.location,
        entry.reporter,
        caseStatusLabel(entry.status),
        entry.priority,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [data.cases, search]);

  const metrics = useMemo(() => {
    const openCases = data.cases.filter((entry) => entry.status !== "closed").length;
    const closedCases = data.cases.filter((entry) => entry.status === "closed").length;
    const closureRate = data.cases.length ? Math.round((closedCases / data.cases.length) * 100) : 0;
    const evidenceCount = data.evidence.length;
    const activeInvestigators = data.officers.filter((entry) => ["admin", "commander", "investigator"].includes(entry.role)).length;
    const avgHours =
      data.cases.filter((entry) => entry.closedAt).reduce((sum, entry) => sum + (new Date(entry.closedAt).getTime() - new Date(entry.createdAt).getTime()) / 36e5, 0) /
      Math.max(1, data.cases.filter((entry) => entry.closedAt).length);
    return {
      openCases,
      closedCases,
      closureRate,
      evidenceCount,
      activeInvestigators,
      avgHours,
    };
  }, [data.cases, data.evidence, data.officers]);

  const trendByCategory = useMemo(() => {
    const buckets = data.cases.reduce((acc, entry) => {
      acc[entry.category] = (acc[entry.category] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(buckets)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [data.cases]);

  const hotspotByLocation = useMemo(() => {
    const buckets = data.cases.reduce((acc, entry) => {
      acc[entry.location] = (acc[entry.location] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(buckets)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count);
  }, [data.cases]);

  const workloadRows = data.officers.map((officer) => ({
    id: officer.id,
    cells: [
      <div>
        <strong>{officer.fullName}</strong>
        <div className="case-subtle">{officer.rankTitle} · Badge {officer.badgeNumber}</div>
      </div>,
      <Pill tone={roleTone(officer.role)}>{officer.role}</Pill>,
      officer.assignedUnit,
      officer.workload,
      <Pill tone={officer.status === "Active" ? "closed" : "review"}>{officer.status}</Pill>,
    ],
  }));

  const caseRows = visibleCases.map((entry) => {
    const officer = data.officers.find((item) => item.id === entry.assignedOfficerId);
    return {
      id: entry.id,
      cells: [
        <button className="link-btn" type="button" onClick={() => setSelectedCaseId(entry.id)}>
          <strong>{entry.caseNumber}</strong>
          <div className="case-subtle">{entry.title}</div>
        </button>,
        entry.category,
        entry.location,
        officer ? officer.fullName : "Unassigned",
        <Pill tone={caseStatusTone(entry.status)}>{caseStatusLabel(entry.status)}</Pill>,
        <Pill tone={priorityTone(entry.priority)}>{entry.priority}</Pill>,
        <div className="row-actions">
          <button type="button" className="panel-action" onClick={() => { setEditingCaseId(entry.id); setActiveTab("cases"); }}>
            Edit
          </button>
          <button type="button" className="panel-action" onClick={() => applyCaseDelete(entry.id)}>
            Delete
          </button>
        </div>,
      ],
    };
  });

  const evidenceRows = data.evidence.map((entry) => ({
    id: entry.id,
    cells: [
      <button className="link-btn" type="button" onClick={() => setEvidenceSelection(entry.id)}>
        <strong>{entry.evidenceNumber}</strong>
        <div className="case-subtle">{entry.fileName}</div>
      </button>,
      entry.type,
      entry.caseNumber,
      entry.source,
      formatDateTime(entry.captureAt),
      entry.fileSize,
      <div className="row-actions">
        <button type="button" className="panel-action" onClick={() => addCustodyStep(entry.id)}>
          Add custody
        </button>
        <button type="button" className="panel-action" onClick={() => deleteEvidence(entry.id)}>
          Delete
        </button>
      </div>,
    ],
  }));

  const suspectRows = data.suspects.map((entry) => ({
    id: entry.id,
    cells: [
      <div>
        <strong>{entry.fullName}</strong>
        <div className="case-subtle">{entry.nationalId || "No national ID recorded"}</div>
      </div>,
      entry.riskLevel,
      entry.verificationStatus,
      entry.linkedCaseIds.length,
    ],
  }));

  const cameraRows = data.cameras.map((entry) => {
    const linkedFootage = data.evidence.filter((item) => item.source.includes(entry.cameraCode));
    return {
      id: entry.id,
      cells: [
        <div>
          <strong>{entry.cameraCode}</strong>
          <div className="case-subtle">{entry.locationName}</div>
        </div>,
        entry.district,
        <Pill tone={entry.status === "Active" ? "closed" : "review"}>{entry.status}</Pill>,
        entry.retentionDays,
        linkedFootage.length,
      ],
    };
  });

  const verificationRows = data.verifications.map((entry) => ({
    id: entry.id,
    cells: [
      <div>
        <strong>{entry.suspectName}</strong>
        <div className="case-subtle">{entry.verificationType}</div>
      </div>,
      entry.providerName,
      entry.officerName,
      entry.authorizationReference,
      entry.status,
      formatDateTime(entry.timestamp),
    ],
  }));

  const activityRows = data.auditLogs.slice(0, 10).map((entry) => ({
    id: entry.id,
    cells: [
      <div>
        <strong>{entry.action}</strong>
        <div className="case-subtle">{entry.details}</div>
      </div>,
      entry.actor,
      entry.entityType,
      formatDateTime(entry.createdAt),
    ],
  }));

  const selectedCaseEvidence = data.evidence.filter((entry) => entry.caseId === selectedCase?.id);
  const selectedCaseSuspect = data.suspects.find((entry) => entry.id === selectedCase?.suspectId) || null;

  const content = {
    dashboard: (
      <>
        <section className="hero">
          <div className="hero-copy">
            <div className="hero-kicker">Operations Center</div>
            <h1 className="hero-title">Sentinel Crime Reporting and Case Tracking System</h1>
            <p className="hero-subtitle">
              A law-enforcement workspace for cases, evidence, CCTV, officer management, offline synchronization, identity checks, and analytics.
            </p>
            <div className="hero-meta">
              <span className="meta-chip">{online ? "Online" : "Offline"} mode</span>
              <span className="meta-chip">{currentOfficer ? currentOfficer.assignedUnit : "Guest access"}</span>
              <span className="meta-chip">Queue: {data.queue.length}</span>
            </div>
          </div>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary" onClick={() => setActiveTab("cases")}>Manage cases</button>
            <button type="button" className="btn btn-secondary" onClick={() => setActiveTab("analytics")}>View analytics</button>
          </div>
        </section>

        <section className="stats-grid" aria-label="Dashboard summary">
          <StatsCard mark="01" label="Open cases" value={metrics.openCases} note="Cases not yet closed." />
          <StatsCard mark="02" label="Evidence items" value={metrics.evidenceCount} note="Files and chain-of-custody records." />
          <StatsCard mark="03" label="Closure rate" value={`${metrics.closureRate}%`} note="Closed cases as a share of total." />
          <StatsCard mark="04" label="Investigators" value={metrics.activeInvestigators} note="Staff with operational access." />
        </section>

        <section className="status-grid">
          <div className="status-card">
            <div className="status-title">Sync status</div>
            <div className="status-value">{online ? "Connected" : "Offline queue active"}</div>
            <div className="status-desc">{data.queue.length} item(s) pending sync.</div>
          </div>
          <div className="status-card">
            <div className="status-title">Average closure time</div>
            <div className="status-value">{formatDurationHours(metrics.avgHours)}</div>
            <div className="status-desc">Calculated from closed cases.</div>
          </div>
          <div className="status-card">
            <div className="status-title">Last sync</div>
            <div className="status-value">{formatDateTime(data.lastSyncAt)}</div>
            <div className="status-desc">Local queue mirror updated in browser storage.</div>
          </div>
        </section>

        <section className="content-grid">
          <Card title="Recent cases" subtitle="Selected case and latest statuses." action={<button type="button" className="panel-action" onClick={() => setActiveTab("cases")}>Open cases</button>}>
            <MiniTable
              columns={["Case", "Category", "Location", "Officer", "Status", "Priority", "Actions"]}
              rows={caseRows.slice(0, 4)}
              emptyMessage="No cases match the current filters."
            />
          </Card>

          <div className="stack">
            <Card title="Activity feed" subtitle="Audited actions and state changes." action={<button type="button" className="panel-action" onClick={() => setActiveTab("security")}>View all logs</button>}>
              <MiniTable
                columns={["Action", "Actor", "Entity", "Time"]}
                rows={activityRows.slice(0, 5)}
                emptyMessage="No activity recorded yet."
              />
            </Card>

            <Card title="Officer workload" subtitle="Live assignments by profile.">
              <MiniTable columns={["Officer", "Role", "Unit", "Workload", "Status"]} rows={workloadRows} emptyMessage="No officers configured." />
            </Card>
          </div>
        </section>
      </>
    ),
    cases: (
      <section className="content-grid single">
        <Card
          title={editingCaseId ? "Edit case" : "Create case"}
          subtitle="Automatic case numbers, status tracking, and audit logging."
          action={
            <button type="button" className="panel-action" onClick={() => setEditingCaseId(null)}>
              New case
            </button>
          }
        >
          <div className="form-grid">
            <Field label="Title">
              <input className="input" value={caseForm.title} onChange={(event) => setCaseForm({ ...caseForm, title: event.target.value })} placeholder="Case title" />
            </Field>
            <Field label="Category">
              <input className="input" value={caseForm.category} onChange={(event) => setCaseForm({ ...caseForm, category: event.target.value })} placeholder="Robbery" />
            </Field>
            <Field label="Status">
              <select className="input" value={caseForm.status} onChange={(event) => setCaseForm({ ...caseForm, status: event.target.value })}>
                {CASE_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select className="input" value={caseForm.priority} onChange={(event) => setCaseForm({ ...caseForm, priority: event.target.value })}>
                {PRIORITIES.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Location">
              <input className="input" value={caseForm.location} onChange={(event) => setCaseForm({ ...caseForm, location: event.target.value })} placeholder="District or zone" />
            </Field>
            <Field label="Reporter">
              <input className="input" value={caseForm.reporter} onChange={(event) => setCaseForm({ ...caseForm, reporter: event.target.value })} placeholder="Reporter name" />
            </Field>
            <Field label="Contact">
              <input className="input" value={caseForm.contact} onChange={(event) => setCaseForm({ ...caseForm, contact: event.target.value })} placeholder="+250..." />
            </Field>
            <Field label="Assigned officer">
              <select className="input" value={caseForm.assignedOfficerId} onChange={(event) => setCaseForm({ ...caseForm, assignedOfficerId: event.target.value })}>
                <option value="">Unassigned</option>
                {data.officers.map((officer) => (
                  <option key={officer.id} value={officer.id}>
                    {officer.fullName} · {officer.badgeNumber}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Linked suspect">
              <select className="input" value={caseForm.suspectId} onChange={(event) => setCaseForm({ ...caseForm, suspectId: event.target.value })}>
                <option value="">None</option>
                {data.suspects.map((suspect) => (
                  <option key={suspect.id} value={suspect.id}>
                    {suspect.fullName}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Description">
            <textarea className="input textarea" value={caseForm.description} onChange={(event) => setCaseForm({ ...caseForm, description: event.target.value })} rows="5" placeholder="Incident summary, witness notes, and next steps." />
          </Field>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setEditingCaseId(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={editingCaseId ? applyCaseUpdate : applyCaseCreate}>
              {editingCaseId ? "Update case" : "Create case"}
            </button>
          </div>
        </Card>

        <section className="content-grid">
          <Card title="Case register" subtitle={`${visibleCases.length} record(s) visible.`} action={<input className="input search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search cases" />}>
            <MiniTable columns={["Case", "Category", "Location", "Officer", "Status", "Priority", "Actions"]} rows={caseRows} emptyMessage="No cases found." />
          </Card>

          <div className="stack">
            <Card title="Case history" subtitle="Audit trail for the selected case.">
              {selectedCase ? (
                <div className="timeline">
                  <div className="timeline-head">
                    <div>
                      <strong>{selectedCase.caseNumber}</strong>
                      <div className="case-subtle">{selectedCase.title}</div>
                    </div>
                    <Pill tone={caseStatusTone(selectedCase.status)}>{caseStatusLabel(selectedCase.status)}</Pill>
                  </div>
                  {selectedCase.history.map((item) => (
                    <div className="timeline-item" key={item.id}>
                      <div className="timeline-time">{formatDateTime(item.at)}</div>
                      <div className="timeline-title">{item.action}</div>
                      <div className="timeline-note">{item.note}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">Select a case to see its history.</div>
              )}
            </Card>

            <Card title="Linked evidence" subtitle="Evidence and suspects tied to this case.">
              {selectedCase ? (
                <>
                  <MiniTable
                    columns={["Evidence", "Type", "Source", "Captured", "Custody"]}
                    rows={selectedCaseEvidence.map((entry) => ({
                      id: entry.id,
                      cells: [
                        <strong>{entry.evidenceNumber}</strong>,
                        entry.type,
                        entry.source,
                        formatDateTime(entry.captureAt),
                        entry.custody.length,
                      ],
                    }))}
                    emptyMessage="No evidence linked yet."
                  />
                  <div className="detail-box">
                    <strong>Suspect status</strong>
                    <div className="case-subtle">{selectedCaseSuspect ? `${selectedCaseSuspect.fullName} · ${selectedCaseSuspect.verificationStatus}` : "No suspect linked to this case."}</div>
                  </div>
                </>
              ) : (
                <div className="empty-state">Select a case to view linked evidence.</div>
              )}
            </Card>
          </div>
        </section>
      </section>
    ),
    evidence: (
      <section className="content-grid single">
        <Card title="Evidence intake" subtitle="Upload metadata, link to cases, and maintain chain-of-custody records." action={<Pill tone={online ? "closed" : "review"}>{online ? "Online" : "Offline"}</Pill>}>
          <div className="form-grid">
            <Field label="Case">
              <select className="input" value={evidenceForm.caseId} onChange={(event) => setEvidenceForm({ ...evidenceForm, caseId: event.target.value })}>
                {data.cases.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.caseNumber} · {entry.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Type">
              <select className="input" value={evidenceForm.type} onChange={(event) => setEvidenceForm({ ...evidenceForm, type: event.target.value })}>
                {EVIDENCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="File name">
              <input className="input" value={evidenceForm.fileName} onChange={(event) => setEvidenceForm({ ...evidenceForm, fileName: event.target.value })} placeholder="Evidence file name" />
            </Field>
            <Field label="File size">
              <input className="input" value={evidenceForm.fileSize} onChange={(event) => setEvidenceForm({ ...evidenceForm, fileSize: event.target.value })} placeholder="e.g. 148 MB" />
            </Field>
            <Field label="Source">
              <input className="input" value={evidenceForm.source} onChange={(event) => setEvidenceForm({ ...evidenceForm, source: event.target.value })} placeholder="Officer upload / CCTV / lab" />
            </Field>
            <Field label="Capture time">
              <input className="input" type="datetime-local" value={evidenceForm.captureAt} onChange={(event) => setEvidenceForm({ ...evidenceForm, captureAt: event.target.value })} />
            </Field>
          </div>
          <div className="form-grid">
            <Field label="Storage reference">
              <input className="input" value={evidenceForm.storageRef} onChange={(event) => setEvidenceForm({ ...evidenceForm, storageRef: event.target.value })} placeholder="Object storage URL or reference" />
            </Field>
            <Field label="Description">
              <input className="input" value={evidenceForm.description} onChange={(event) => setEvidenceForm({ ...evidenceForm, description: event.target.value })} placeholder="What the evidence shows" />
            </Field>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-primary" onClick={applyEvidenceCreate}>
              Add evidence
            </button>
          </div>
        </Card>

        <section className="content-grid">
          <Card title="Evidence vault" subtitle={`${data.evidence.length} item(s) tracked.`} action={<span className="panel-action">Chain of custody enabled</span>}>
            <MiniTable columns={["Evidence", "Type", "Case", "Source", "Captured", "Size", "Actions"]} rows={evidenceRows} emptyMessage="No evidence items recorded." />
          </Card>

          <Card title="Selected evidence" subtitle="Metadata and custody history for the current selection.">
            {selectedEvidence ? (
              <div className="detail-stack">
                <div className="detail-box">
                  <strong>{selectedEvidence.evidenceNumber}</strong>
                  <div className="case-subtle">{selectedEvidence.fileName}</div>
                  <div className="case-subtle">{selectedEvidence.description}</div>
                </div>
                <MiniTable
                  columns={["Time", "Actor", "Action", "Notes"]}
                  rows={selectedEvidence.custody.map((item) => ({
                    id: item.id,
                    cells: [formatDateTime(item.at), item.actor, item.action, item.note],
                  }))}
                  emptyMessage="No custody steps recorded."
                />
              </div>
            ) : (
              <div className="empty-state">Pick an evidence item to inspect its custody trail.</div>
            )}
          </Card>
        </section>
      </section>
    ),
    officers: (
      <section className="content-grid single">
        <Card
          title="Officer portal"
          subtitle="Profiles, roles, assignments, and workload tracking."
          action={<button type="button" className="panel-action" onClick={saveOfficer}>Add officer</button>}
        >
          <MiniTable
            columns={["Officer", "Role", "Unit", "Workload", "Status"]}
            rows={data.officers.map((entry) => ({
              id: entry.id,
              cells: [
                <div>
                  <strong>{entry.fullName}</strong>
                  <div className="case-subtle">Badge {entry.badgeNumber}</div>
                </div>,
                <Pill tone={roleTone(entry.role)}>{entry.role}</Pill>,
                entry.assignedUnit,
                entry.workload,
                <Pill tone={entry.status === "Active" ? "closed" : "review"}>{entry.status}</Pill>,
              ],
            }))}
            emptyMessage="No officers configured."
          />
        </Card>

        <section className="content-grid">
          <Card title="Role permissions" subtitle="Who can do what in Sentinel.">
            <div className="permission-grid">
              {Object.entries(PERMISSIONS).map(([role, permissions]) => (
                <div key={role} className="permission-card">
                  <strong>{role}</strong>
                  <div className="case-subtle">{permissions.join(", ")}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Officer activity" subtitle="Operational notes and recent workload changes.">
            <MiniTable
              columns={["Officer", "Role", "Activity"]}
              rows={data.officers.map((entry) => ({
                id: entry.id,
                cells: [entry.fullName, entry.role, entry.activity],
              }))}
              emptyMessage="No activity data available."
            />
          </Card>
        </section>
      </section>
    ),
    cctv: (
      <section className="content-grid single">
        <Card title="CCTV registry" subtitle="Register cameras, search footage, and attach clips to cases." action={<button type="button" className="panel-action" onClick={registerCamera}>Register camera</button>}>
          <div className="form-grid">
            <Field label="Camera code">
              <input className="input" value={cameraForm.cameraCode} onChange={(event) => setCameraForm({ ...cameraForm, cameraCode: event.target.value })} placeholder="KRN-02" />
            </Field>
            <Field label="Location">
              <input className="input" value={cameraForm.locationName} onChange={(event) => setCameraForm({ ...cameraForm, locationName: event.target.value })} placeholder="Kimironko Market Lot" />
            </Field>
            <Field label="District">
              <input className="input" value={cameraForm.district} onChange={(event) => setCameraForm({ ...cameraForm, district: event.target.value })} placeholder="Gasabo" />
            </Field>
            <Field label="Retention days">
              <input className="input" type="number" value={cameraForm.retentionDays} onChange={(event) => setCameraForm({ ...cameraForm, retentionDays: event.target.value })} />
            </Field>
            <Field label="Latitude">
              <input className="input" value={cameraForm.latitude} onChange={(event) => setCameraForm({ ...cameraForm, latitude: event.target.value })} placeholder="-1.943800" />
            </Field>
            <Field label="Longitude">
              <input className="input" value={cameraForm.longitude} onChange={(event) => setCameraForm({ ...cameraForm, longitude: event.target.value })} placeholder="30.114700" />
            </Field>
          </div>
        </Card>

        <section className="content-grid">
          <Card title="Camera locations" subtitle={`${data.cameras.length} camera(s) recorded.`}>
            <MiniTable columns={["Code", "Location", "District", "Status", "Retention", "Footage"]} rows={cameraRows} emptyMessage="No cameras registered." />
          </Card>

          <Card title="Footage search" subtitle="Filter by case, date, and source.">
            <div className="detail-stack">
              {data.evidence
                .filter((entry) => entry.type === "CCTV Footage" || /cam/i.test(entry.source))
                .map((entry) => (
                  <div key={entry.id} className="detail-box">
                    <strong>{entry.fileName}</strong>
                    <div className="case-subtle">
                      {entry.caseNumber} · {entry.source} · {formatDateTime(entry.captureAt)}
                    </div>
                    <div className="case-subtle">{entry.description}</div>
                  </div>
                ))}
            </div>
          </Card>
        </section>
      </section>
    ),
    identity: (
      <section className="content-grid single">
        <Card title="Identity verification" subtitle="Authorized integration layer only. Raw biometric templates are not stored in Sentinel.">
          <div className="notice-box">
            Every request must be approved by an officer in session and logged for audit.
          </div>
          <div className="form-grid">
            <Field label="Suspect">
              <select className="input" value={verificationForm.suspectId} onChange={(event) => setVerificationForm({ ...verificationForm, suspectId: event.target.value })}>
                {data.suspects.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.fullName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Verification type">
              <select className="input" value={verificationForm.verificationType} onChange={(event) => setVerificationForm({ ...verificationForm, verificationType: event.target.value })}>
                {VERIFICATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Provider">
              <input className="input" value={verificationForm.providerName} onChange={(event) => setVerificationForm({ ...verificationForm, providerName: event.target.value })} placeholder="Authorized agency" />
            </Field>
            <Field label="Authorization reference">
              <input className="input" value={verificationForm.authorizationReference} onChange={(event) => setVerificationForm({ ...verificationForm, authorizationReference: event.target.value })} placeholder="AUTH-2026-0001" />
            </Field>
          </div>
          <div className="toggle-grid">
            <label className="toggle-card">
              <input type="checkbox" checked={verificationForm.officerAuthorization} onChange={(event) => setVerificationForm({ ...verificationForm, officerAuthorization: event.target.checked })} />
              <span>I confirm officer authorization before verification.</span>
            </label>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-primary" onClick={logVerification}>
              Log verification request
            </button>
          </div>
        </Card>

        <section className="content-grid">
          <Card title="Verification log" subtitle="Every identity request is auditable.">
            <MiniTable columns={["Suspect", "Provider", "Officer", "Auth ref", "Status", "Time"]} rows={verificationRows} emptyMessage="No verification requests recorded." />
          </Card>
          <Card title="Privacy rules" subtitle="Security guardrails for identity integrations.">
            <div className="detail-stack">
              <div className="detail-box">Use only authorized agency APIs for fingerprint, facial, and national ID checks.</div>
              <div className="detail-box">Do not store raw biometric templates in Sentinel.</div>
              <div className="detail-box">Require officer authorization before each verification attempt.</div>
              <div className="detail-box">Log every request, response status, and authorization reference.</div>
            </div>
          </Card>
        </section>
      </section>
    ),
    suspects: (
      <section className="content-grid single">
        <Card title="Suspect management" subtitle="Identity, risk level, linked cases, and verification status." action={<button type="button" className="panel-action" onClick={saveSuspect}>Add suspect</button>}>
          <div className="form-grid">
            <Field label="Name">
              <input className="input" value={suspectForm.fullName} onChange={(event) => setSuspectForm({ ...suspectForm, fullName: event.target.value })} placeholder="Suspect full name" />
            </Field>
            <Field label="National ID">
              <input className="input" value={suspectForm.nationalId} onChange={(event) => setSuspectForm({ ...suspectForm, nationalId: event.target.value })} placeholder="National ID number" />
            </Field>
            <Field label="Risk level">
              <select className="input" value={suspectForm.riskLevel} onChange={(event) => setSuspectForm({ ...suspectForm, riskLevel: event.target.value })}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </Field>
            <Field label="Contact">
              <input className="input" value={suspectForm.contactInformation} onChange={(event) => setSuspectForm({ ...suspectForm, contactInformation: event.target.value })} placeholder="+250..." />
            </Field>
          </div>
          <div className="form-grid">
            <Field label="Address">
              <input className="input" value={suspectForm.address} onChange={(event) => setSuspectForm({ ...suspectForm, address: event.target.value })} placeholder="Address" />
            </Field>
            <Field label="Known aliases">
              <input className="input" value={suspectForm.knownAliases} onChange={(event) => setSuspectForm({ ...suspectForm, knownAliases: event.target.value })} placeholder="Alias names" />
            </Field>
          </div>
        </Card>

        <section className="content-grid">
          <Card title="Suspect register" subtitle={`${data.suspects.length} record(s).`}>
            <MiniTable
              columns={["Name", "Risk", "Verification", "Linked cases"]}
              rows={suspectRows.map((entry) => ({
                id: entry.id,
                cells: entry.cells,
              }))}
              emptyMessage="No suspect records."
            />
          </Card>

          <Card title="Linked cases" subtitle="Suspect-to-case relationships.">
            <div className="detail-stack">
              {data.suspects.map((suspect) => (
                <div className="detail-box" key={suspect.id}>
                  <strong>{suspect.fullName}</strong>
                  <div className="case-subtle">{suspect.verificationStatus}</div>
                  <div className="case-subtle">
                    {suspect.linkedCaseIds.length
                      ? suspect.linkedCaseIds
                          .map((caseId) => data.cases.find((entry) => entry.id === caseId)?.caseNumber)
                          .filter(Boolean)
                          .join(", ")
                      : "No linked cases"}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </section>
    ),
    analytics: (
      <section className="content-grid single">
        <Card title="Analytics dashboard" subtitle="Crime trends, heatmap signals, closure rates, and officer workload.">
          <section className="stats-grid compact">
            <StatsCard mark="A1" label="Closed cases" value={metrics.closedCases} note="Case records marked closed." />
            <StatsCard mark="A2" label="Closure rate" value={`${metrics.closureRate}%`} note="Trend score for case outcomes." />
            <StatsCard mark="A3" label="Average closure time" value={formatDurationHours(metrics.avgHours)} note="Measured from open to close." />
            <StatsCard mark="A4" label="Evidence items" value={metrics.evidenceCount} note="Linked documents and footage." />
          </section>
        </Card>

        <section className="content-grid">
          <Card title="Crime trends" subtitle="Cases by category.">
            <div className="bar-chart">
              {trendByCategory.map((entry) => (
                <div className="bar-row" key={entry.label}>
                  <span>{entry.label}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${Math.max(12, (entry.count / data.cases.length) * 100)}%` }} />
                  </div>
                  <strong>{entry.count}</strong>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Geographic heatmap" subtitle="High-frequency locations in the current dataset.">
            <div className="heatmap-list">
              {hotspotByLocation.map((entry) => (
                <div className="heatmap-item" key={entry.location}>
                  <div>
                    <strong>{entry.location}</strong>
                    <div className="case-subtle">Cases concentrated in this district.</div>
                  </div>
                  <Pill tone={entry.count > 1 ? "critical" : "closed"}>{entry.count}</Pill>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="content-grid">
          <Card title="Officer workload" subtitle="Distribution of active assignments.">
            <MiniTable
              columns={["Officer", "Role", "Workload"]}
              rows={data.officers.map((entry) => ({
                id: entry.id,
                cells: [entry.fullName, entry.role, entry.workload],
              }))}
              emptyMessage="No officer data."
            />
          </Card>
          <Card title="Response timing" subtitle="Operational pace and closure performance.">
            <div className="detail-stack">
              <div className="detail-box">Open cases: {metrics.openCases}</div>
              <div className="detail-box">Closed cases: {metrics.closedCases}</div>
              <div className="detail-box">Average closure time: {formatDurationHours(metrics.avgHours)}</div>
            </div>
          </Card>
        </section>
      </section>
    ),
    security: (
      <section className="content-grid single">
        <Card title="Security architecture" subtitle="Audit logging, permission checks, encryption, privacy, and data protection.">
          <div className="detail-stack">
            <div className="detail-box">JWT-based authentication is handled by the Node/Express backend scaffold. The browser session stores only the signed-in officer identity.</div>
            <div className="detail-box">Sensitive fields must be encrypted at rest in MySQL or the backing data store. Audit logs are immutable and capture all access to personal data.</div>
            <div className="detail-box">Role-based permissions are enforced by the `can()` guard in the UI and should be duplicated in the API middleware.</div>
            <div className="detail-box">Identity verification requests must use authorized agency APIs only. Sentinel stores request metadata, not raw biometric templates.</div>
          </div>
        </Card>

        <section className="content-grid">
          <Card title="Audit log" subtitle="Recent access and mutation history.">
            <MiniTable columns={["Action", "Actor", "Entity", "Time"]} rows={activityRows} emptyMessage="No audit entries." />
          </Card>
          <Card title="Offline queue" subtitle="Browser-held operations waiting for network synchronization.">
            <div className="detail-stack">
              {data.queue.length ? data.queue.map((entry) => (
                <div className="detail-box" key={entry.id}>
                  <strong>{entry.description}</strong>
                  <div className="case-subtle">{entry.entityType} · {formatDateTime(entry.createdAt)}</div>
                </div>
              )) : <div className="empty-state">No queued operations. Everything is synchronized.</div>}
            </div>
          </Card>
        </section>
      </section>
    ),
    sync: (
      <section className="content-grid single">
        <Card title="Offline-first synchronization" subtitle="Local queue, retry on reconnect, and status indicators.">
          <div className="status-grid">
            <div className="status-card">
              <div className="status-title">Network</div>
              <div className="status-value">{online ? "Online" : "Offline"}</div>
              <div className="status-desc">{online ? "Mutations can sync to the API layer." : "Changes are stored locally first."}</div>
            </div>
            <div className="status-card">
              <div className="status-title">Queued operations</div>
              <div className="status-value">{data.queue.length}</div>
              <div className="status-desc">These will replay when connectivity returns.</div>
            </div>
            <div className="status-card">
              <div className="status-title">Last sync</div>
              <div className="status-value">{formatDateTime(data.lastSyncAt)}</div>
              <div className="status-desc">Stored in local browser persistence.</div>
            </div>
          </div>
        </Card>
        <Card title="Synchronization architecture" subtitle="What the backend layer should do.">
          <div className="detail-stack">
            <div className="detail-box">Queue user actions locally when the browser is offline.</div>
            <div className="detail-box">Replay queued mutations through the REST API once the connection returns.</div>
            <div className="detail-box">Show a sync badge for pending, syncing, synced, and failed states.</div>
            <div className="detail-box">Keep audit records for every queued and replayed operation.</div>
          </div>
        </Card>
      </section>
    ),
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div className="brand-copy">
            <div className="brand-name">Sentinel</div>
            <div className="brand-tag">Crime reporting and case tracking</div>
          </div>
        </div>

        <div className="topbar-actions">
          <div className={`status-pill ${online ? "is-live" : "is-offline"}`}>
            <span className="status-dot" aria-hidden="true" />
            {online ? "Live" : "Offline"} · {data.queue.length} queued
          </div>
          <button
            type="button"
            className={`theme-toggle ${theme === "dark" ? "is-dark" : ""}`}
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            aria-label="Toggle theme"
          />
          {currentUser ? (
            <button type="button" className="profile-btn" onClick={handleLogout}>
              <span className="avatar" aria-hidden="true">{currentUser.name.slice(0, 2).toUpperCase()}</span>
              <span>{currentUser.name}</span>
            </button>
          ) : (
            <button type="button" className="profile-btn" onClick={() => setLoginOpen(true)}>
              <span className="avatar" aria-hidden="true">SI</span>
              <span>Sign in</span>
            </button>
          )}
        </div>
      </header>

      <div className="shell">
        <aside className="sidebar">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${activeTab === item.id ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-icon">{item.label.slice(0, 2).toUpperCase()}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </aside>

        <main className="main">
          {content[activeTab]}
        </main>
      </div>

      <AuthModal
        open={loginOpen}
        officers={data.officers}
        onClose={() => setLoginOpen(false)}
        onLogin={handleLogin}
        onRegister={handleRegister}
        currentBadge={currentUser?.badgeNumber}
      />

      <div className="toasts" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.kind === "error" ? "error" : ""}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
