const { useEffect, useMemo, useRef, useState } = React;

const DRAFT_KEY = "sentinel-report-draft";
const AUTH_USER_KEY = "sentinel-auth-user";
const SESSION_KEY = "sentinel-auth-session";

const DEFAULT_AUTH_USER = {
  name: "Officer Mutoni",
  badge: "4521",
  password: "Sentinel123!",
};

const CRIME_TYPES = [
  { value: "assault", label: "Assault / Violence" },
  { value: "robbery", label: "Robbery / Theft" },
  { value: "vehicle", label: "Vehicle Crime" },
  { value: "cyber", label: "Cybercrime / Fraud" },
  { value: "vandalism", label: "Arson / Vandalism" },
  { value: "disorder", label: "Public Disorder" },
  { value: "drug", label: "Drug Offence" },
  { value: "smuggling", label: "Smuggling" },
  { value: "other", label: "Other" },
];

const NAV_ITEMS = [
  { section: "Overview" },
  { icon: "DB", label: "Dashboard" },
  { icon: "NR", label: "New Report", badge: 3 },
  { icon: "CR", label: "Case Records" },
  { icon: "CM", label: "Crime Map" },
  { icon: "AN", label: "Analytics" },
  { section: "Team" },
  { icon: "OF", label: "Officers" },
  { icon: "DP", label: "Departments" },
  { icon: "EV", label: "Evidence Vault" },
  { section: "System" },
  { icon: "SL", label: "Security Log" },
  { icon: "ST", label: "Settings" },
  { icon: "SO", label: "Sign Out" },
];

const INITIAL_FEED = [
  {
    id: 1,
    tone: "critical",
    title: (
      <>
        New <strong>critical</strong> report filed for case <strong>KGL-2026-0247</strong> in Nyarugenge
      </>
    ),
    time: "2 min ago",
    tag: "Report",
  },
  {
    id: 2,
    tone: "closed",
    title: (
      <>
        Case <strong>KGL-2026-0231</strong> closed after review and charge approval
      </>
    ),
    time: "14 min ago",
    tag: "Closed",
  },
  {
    id: 3,
    tone: "evidence",
    title: (
      <>
        Evidence uploaded for <strong>KGL-2026-0228</strong> with 3 photos and 1 video
      </>
    ),
    time: "31 min ago",
    tag: "Evidence",
  },
  {
    id: 4,
    tone: "dispatch",
    title: (
      <>
        Unit 7 dispatched to an assault in progress near Kimironko
      </>
    ),
    time: "45 min ago",
    tag: "Dispatch",
  },
  {
    id: 5,
    tone: "alert",
    title: (
      <>
        Failed login attempt flagged for badge number 3302
      </>
    ),
    time: "1 hr ago",
    tag: "Alert",
  },
];

const INITIAL_CASES = [
  {
    id: "KGL-2026-0247",
    type: "Assault / Violence",
    location: "Nyarugenge",
    sev: "crit",
    status: "open",
    filed: "Today, 09:14",
  },
  {
    id: "KGL-2026-0246",
    type: "Robbery / Theft",
    location: "Kicukiro",
    sev: "high",
    status: "review",
    filed: "Today, 07:52",
  },
  {
    id: "KGL-2026-0245",
    type: "Vehicle Crime",
    location: "Gasabo",
    sev: "med",
    status: "closed",
    filed: "Yesterday",
  },
  {
    id: "KGL-2026-0244",
    type: "Cybercrime / Fraud",
    location: "Remera",
    sev: "high",
    status: "open",
    filed: "Yesterday",
  },
  {
    id: "KGL-2026-0243",
    type: "Public Disorder",
    location: "Kimironko",
    sev: "low",
    status: "closed",
    filed: "22 May",
  },
];

const DEFAULT_FORM = {
  dt: "2026-05-23T09:30",
  location: "",
  crimeType: "assault",
  description: "",
  suspects: "",
  severity: "low",
};

const SYSTEM_CARDS = [
  {
    title: "Encryption",
    value: "Enabled",
    tone: "ok",
    description: "Reports and attachments are protected in transit and at rest.",
  },
  {
    title: "Authentication",
    value: "MFA Active",
    tone: "ok",
    description: "Staff sign-in expects a badge number, password, and verification code.",
  },
  {
    title: "Audit Trail",
    value: "Logging On",
    tone: "ok",
    description: "Actions are tracked so teams can review changes and activity later.",
  },
  {
    title: "Access Control",
    value: "Role Based",
    tone: "ok",
    description: "Access can be separated by officer, detective, supervisor, and admin.",
  },
  {
    title: "Network",
    value: "VPN Locked",
    tone: "ok",
    description: "Connections are limited to trusted police-network endpoints.",
  },
  {
    title: "Session Timeout",
    value: "14 min",
    tone: "warn",
    description: "Inactive sessions are signed out automatically for safety.",
  },
];

function useToasts() {
  const [toasts, setToasts] = useState([]);

  const add = (message, error = false) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, error }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3800);
  };

  return { toasts, add };
}

function readJson(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function getCrimeLabel(value) {
  return CRIME_TYPES.find((item) => item.value === value)?.label || "Other";
}

function getSeverityLabel(value) {
  return {
    low: "Low",
    med: "Medium",
    high: "High",
    crit: "Critical",
  }[value];
}

function getStatusLabel(value) {
  return {
    open: "Open",
    review: "Review",
    closed: "Closed",
  }[value];
}

function formatCaseId(nextNumber) {
  return `KGL-2026-${String(nextNumber).padStart(4, "0")}`;
}

function StatCard({ mark, label, value, note }) {
  return (
    <article className="stat-card" data-mark={mark}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
    </article>
  );
}

function SystemStatusGrid() {
  return (
    <section className="status-grid" aria-label="System status">
      {SYSTEM_CARDS.map((card) => (
        <article className="status-card" key={card.title}>
          <div className="status-title">{card.title}</div>
          <div className={`status-value tone-${card.tone}`}>{card.value}</div>
          <div className="status-desc">{card.description}</div>
        </article>
      ))}
    </section>
  );
}

function SeverityPicker({ value, onChange }) {
  const levels = [
    { key: "low", label: "Low", mark: "L" },
    { key: "med", label: "Medium", mark: "M" },
    { key: "high", label: "High", mark: "H" },
    { key: "crit", label: "Critical", mark: "C" },
  ];

  return (
    <div className="toggle-grid" role="group" aria-label="Severity level">
      {levels.map((level) => (
        <button
          key={level.key}
          type="button"
          className={`severity-btn ${value === level.key ? `active-${level.key}` : ""}`.trim()}
          aria-pressed={value === level.key}
          onClick={() => onChange(level.key)}
        >
          <span className="severity-ico">{level.mark}</span>
          <span className="severity-label">{level.label}</span>
        </button>
      ))}
    </div>
  );
}

function ReportForm({ onSubmit, onDraftSaved }) {
  const [form, setForm] = useState(() => {
    if (typeof window === "undefined") {
      return DEFAULT_FORM;
    }

    try {
      const saved = window.localStorage.getItem(DRAFT_KEY);
      return saved ? { ...DEFAULT_FORM, ...JSON.parse(saved) } : DEFAULT_FORM;
    } catch {
      return DEFAULT_FORM;
    }
  });

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSaveDraft = () => {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    onDraftSaved("Draft saved locally in this browser.");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.location.trim()) {
      onSubmit(null, "Please enter a location before submitting.");
      return;
    }

    if (!form.description.trim()) {
      onSubmit(null, "Please add an incident description.");
      return;
    }

    onSubmit(form);
    window.localStorage.removeItem(DRAFT_KEY);
    setForm(DEFAULT_FORM);
  };

  return (
    <form className="form-body" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="report-dt">Date and time</label>
          <input
            id="report-dt"
            className="input"
            type="datetime-local"
            value={form.dt}
            onChange={(event) => updateField("dt", event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="report-location">Location</label>
          <input
            id="report-location"
            className="input"
            type="text"
            value={form.location}
            onChange={(event) => updateField("location", event.target.value)}
            placeholder="Sector, district, or landmark"
          />
        </div>

        <div className="field">
          <label htmlFor="report-type">Crime type</label>
          <select
            id="report-type"
            className="select"
            value={form.crimeType}
            onChange={(event) => updateField("crimeType", event.target.value)}
          >
            {CRIME_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Reporting officer</label>
          <input className="input" type="text" value="Officer J. Mutoni | Badge #4521" readOnly />
        </div>

        <div className="field field-full">
          <label>Severity</label>
          <SeverityPicker value={form.severity} onChange={(value) => updateField("severity", value)} />
        </div>

        <div className="field field-full">
          <label htmlFor="report-description">Incident description</label>
          <textarea
            id="report-description"
            className="textarea"
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="Describe what happened, who was involved, and any important details."
          />
        </div>

        <div className="field">
          <label htmlFor="report-suspects">Suspects</label>
          <input
            id="report-suspects"
            className="input"
            type="text"
            value={form.suspects}
            onChange={(event) => updateField("suspects", event.target.value)}
            placeholder="Names, descriptions, or notes"
          />
        </div>

        <div className="field">
          <label>Case reference</label>
          <input className="input" type="text" value="Assigned after submission" readOnly />
        </div>

        <div className="field field-full">
          <div className="helper-note">
            <span aria-hidden="true">i</span>
            <div>
              Drafts stay in this browser until you submit or clear them. You can save work now and finish the report later.
            </div>
          </div>
        </div>
      </div>

      <div className="form-footer">
        <button type="button" className="btn btn-secondary" onClick={handleSaveDraft}>
          Save draft
        </button>
        <button type="submit" className="btn btn-primary">
          Submit report
        </button>
      </div>
    </form>
  );
}

function ActivityFeed({ items }) {
  return (
    <div className="feed-list">
      {items.map((item) => (
        <article className="feed-item" key={item.id}>
          <span className={`feed-dot ${item.tone}`} aria-hidden="true" />
          <div className="feed-body">
            <div className="feed-title">{item.title}</div>
            <div className="feed-meta">
              <span className="feed-time">{item.time}</span>
              <span className="feed-tag">{item.tag}</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function CasesTable({ cases, filter, query, onSelect }) {
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();

    return cases.filter((entry) => {
      const statusMatches = filter === "all" || entry.status === filter;
      const textMatches =
        !term ||
        [entry.id, entry.type, entry.location, entry.filed, getStatusLabel(entry.status), getSeverityLabel(entry.sev)]
          .join(" ")
          .toLowerCase()
          .includes(term);

      return statusMatches && textMatches;
    });
  }, [cases, filter, query]);

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Case ID</th>
            <th>Type</th>
            <th>Location</th>
            <th>Severity</th>
            <th>Status</th>
            <th>Filed</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((entry) => (
            <tr
              key={entry.id}
              className="is-clickable"
              onClick={() => onSelect(entry)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(entry);
                }
              }}
            >
              <td>
                <span className="case-id">{entry.id}</span>
              </td>
              <td>
                <div className="type-cell">
                  <span>{entry.type}</span>
                </div>
              </td>
              <td className="case-subtle">{entry.location}</td>
              <td>
                <span className="severity-pill">
                  <span className={`severity-dot ${entry.sev}`} aria-hidden="true" />
                  {getSeverityLabel(entry.sev)}
                </span>
              </td>
              <td>
                <span className={`badge ${entry.status}`}>{getStatusLabel(entry.status)}</span>
              </td>
              <td className="case-subtle">{entry.filed}</td>
            </tr>
          ))}

          {filtered.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <div className="empty-state">No cases match your search or filter.</div>
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function AuthModal({ open, onClose, onLogin, onRegister }) {
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ badge: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    badge: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!open) return;
    setMode("login");
    setLoading(false);
    setLoginForm({ badge: "", password: "" });
    setRegisterForm({ name: "", badge: "", password: "", confirmPassword: "" });
  }, [open]);

  const submitLogin = (event) => {
    event.preventDefault();
    const badge = loginForm.badge.trim();
    const password = loginForm.password.trim();

    if (!badge) {
      onLogin(null, "Please enter your badge number.");
      return;
    }

    if (!password) {
      onLogin(null, "Please enter your password.");
      return;
    }

    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      onLogin({ badge, password });
    }, 900);
  };

  const submitRegister = (event) => {
    event.preventDefault();
    const name = registerForm.name.trim();
    const badge = registerForm.badge.trim();
    const password = registerForm.password.trim();
    const confirmPassword = registerForm.confirmPassword.trim();

    if (!name) {
      onRegister(null, "Please enter your full name.");
      return;
    }

    if (!badge) {
      onRegister(null, "Registration needs a badge number.");
      return;
    }

    if (!/^\d+$/.test(badge)) {
      onRegister(null, "Badge number must contain digits only.");
      return;
    }

    if (!password) {
      onRegister(null, "Please create a password.");
      return;
    }

    if (password.length < 6) {
      onRegister(null, "Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      onRegister(null, "Passwords do not match.");
      return;
    }

    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      onRegister({ name, badge, password });
    }, 900);
  };

  return (
    <div className={`modal-overlay ${open ? "open" : ""}`} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <div className="modal-head">
          <div>
            <div className="modal-title" id="auth-title">
              Staff access
            </div>
            <div className="modal-subtitle">Log in or register a staff account for the demo.</div>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close sign-in dialog">
            Close
          </button>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button type="button" className={`auth-tab ${mode === "login" ? "active" : ""}`} onClick={() => setMode("login")}>
            Login
          </button>
          <button type="button" className={`auth-tab ${mode === "register" ? "active" : ""}`} onClick={() => setMode("register")}>
            Register
          </button>
        </div>

        <div className="modal-body">
          <div className="helper-note lock-note">
            <span aria-hidden="true">i</span>
            <div>
              {mode === "login"
                ? "Use your badge number and password to open a secure session."
                : "Create a staff account first. A badge number is required to register."}
            </div>
          </div>

          {mode === "login" ? (
            <form onSubmit={submitLogin}>
              <div className="field">
                <label htmlFor="login-badge">Badge number</label>
                <input
                  id="login-badge"
                  className="input"
                  type="text"
                  value={loginForm.badge}
                  onChange={(event) => setLoginForm((current) => ({ ...current, badge: event.target.value }))}
                  placeholder="e.g. 4521"
                />
              </div>

              <div className="field">
                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  className="input"
                  type="password"
                  value={loginForm.password}
                  onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Your password"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Signing in..." : "Login"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={submitRegister}>
              <div className="field">
                <label htmlFor="register-name">Full name</label>
                <input
                  id="register-name"
                  className="input"
                  type="text"
                  value={registerForm.name}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Officer full name"
                />
              </div>

              <div className="field">
                <label htmlFor="register-badge">Badge number</label>
                <input
                  id="register-badge"
                  className="input"
                  type="text"
                  value={registerForm.badge}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, badge: event.target.value }))}
                  placeholder="Required"
                />
              </div>

              <div className="field">
                <label htmlFor="register-password">Password</label>
                <input
                  id="register-password"
                  className="input"
                  type="password"
                  value={registerForm.password}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Create a password"
                />
              </div>

              <div className="field">
                <label htmlFor="register-confirm">Confirm password</label>
                <input
                  id="register-confirm"
                  className="input"
                  type="password"
                  value={registerForm.confirmPassword}
                  onChange={(event) =>
                    setRegisterForm((current) => ({ ...current, confirmPassword: event.target.value }))
                  }
                  placeholder="Repeat your password"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Creating..." : "Register"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Toasts({ toasts }) {
  return (
    <div className="toasts" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.error ? "error" : ""}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState("dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [loginOpen, setLoginOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window === "undefined") {
      return DEFAULT_AUTH_USER;
    }

    return readJson(SESSION_KEY, DEFAULT_AUTH_USER);
  });
  const [registeredUser, setRegisteredUser] = useState(() => {
    if (typeof window === "undefined") {
      return DEFAULT_AUTH_USER;
    }

    return readJson(AUTH_USER_KEY, DEFAULT_AUTH_USER);
  });
  const [caseCounter, setCaseCounter] = useState(247);
  const [feed, setFeed] = useState(INITIAL_FEED);
  const [cases, setCases] = useState(INITIAL_CASES);
  const [caseFilter, setCaseFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { toasts, add: addToast } = useToasts();
  const reportRef = useRef(null);
  const casesRef = useRef(null);

  useEffect(() => {
    document.body.className = `theme-${theme}`;
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(registeredUser));
  }, [registeredUser]);

  useEffect(() => {
    if (currentUser) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
      return;
    }

    window.localStorage.removeItem(SESSION_KEY);
  }, [currentUser]);

  const scrollToReport = () => {
    reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToCases = () => {
    casesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleNavClick = (label) => {
    setActiveNav(label);

    if (label === "Dashboard") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setSidebarOpen(false);
      return;
    }

    if (label === "New Report") {
      scrollToReport();
      setSidebarOpen(false);
      return;
    }

    if (label === "Case Records") {
      scrollToCases();
      setSidebarOpen(false);
      return;
    }

    if (label === "Sign Out") {
      setCurrentUser(null);
      window.localStorage.removeItem(SESSION_KEY);
      addToast("You have been signed out of the demo session.");
      setSidebarOpen(false);
      return;
    }

    addToast(`${label} will open here in a future update.`);
    setSidebarOpen(false);
  };

  const handleReportSubmit = (form, errorMessage) => {
    if (errorMessage) {
      addToast(errorMessage, true);
      return;
    }

    const nextNumber = caseCounter + 1;
    const caseId = formatCaseId(nextNumber);
    const crimeLabel = getCrimeLabel(form.crimeType);
    const location = form.location.trim();

    setCaseCounter(nextNumber);
    setFeed((current) => [
      {
        id: Date.now(),
        tone: "new",
        title: (
          <>
            Case <strong>{caseId}</strong> created for {crimeLabel} in {location}
          </>
        ),
        time: "Just now",
        tag: "New report",
      },
      ...current.slice(0, 6),
    ]);
    setCases((current) => [
      {
        id: caseId,
        type: crimeLabel,
        location,
        sev: form.severity,
        status: "open",
        filed: "Just now",
      },
      ...current,
    ]);
    setCaseFilter("all");
    setSearchQuery("");
    addToast(`Report ${caseId} submitted successfully.`);
  };

  const handleLogin = (credentials, errorMessage) => {
    if (errorMessage) {
      addToast(errorMessage, true);
      return;
    }

    if (!credentials?.badge || !credentials?.password) {
      addToast("Please enter both badge number and password.", true);
      return;
    }

    if (credentials.badge !== registeredUser.badge || credentials.password !== registeredUser.password) {
      addToast("The badge number or password is incorrect.", true);
      return;
    }

    const user = {
      name: registeredUser.name,
      badge: registeredUser.badge,
    };

    setCurrentUser(user);
    addToast(`Welcome back, ${user.name}. Badge ${user.badge} is now connected.`);
  };

  const handleRegister = (details, errorMessage) => {
    if (errorMessage) {
      addToast(errorMessage, true);
      return;
    }

    if (!details?.badge) {
      addToast("Registration needs a badge number.", true);
      return;
    }

    const user = {
      name: details.name,
      badge: details.badge,
      password: details.password,
    };

    setRegisteredUser(user);
    setCurrentUser({ name: user.name, badge: user.badge });
    addToast(`Account created for ${user.name}. You are now signed in.`);
    setLoginOpen(false);
  };

  const filteredCount = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();

    return cases.filter((entry) => {
      const statusMatches = caseFilter === "all" || entry.status === caseFilter;
      const textMatches =
        !term ||
        [entry.id, entry.type, entry.location, entry.filed, getStatusLabel(entry.status), getSeverityLabel(entry.sev)]
          .join(" ")
          .toLowerCase()
          .includes(term);
      return statusMatches && textMatches;
    }).length;
  }, [cases, caseFilter, searchQuery]);

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
          <button className="menu-btn" type="button" onClick={() => setSidebarOpen((current) => !current)} aria-label="Toggle navigation menu">
            Menu
          </button>

          <button
            type="button"
            className={`theme-toggle ${theme === "dark" ? "is-dark" : ""}`}
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            aria-label="Toggle light and dark mode"
          />

          <div className="status-pill">
            <span className="status-dot" aria-hidden="true" />
            Live connection
          </div>

          <button type="button" className="profile-btn" onClick={() => setLoginOpen(true)}>
            <span className="avatar" aria-hidden="true">
              {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : "SI"}
            </span>
            <span>{currentUser?.name || "Sign in"}</span>
          </button>
        </div>
      </header>

      <div
        className={`drawer-backdrop ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <div className="shell">
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          {NAV_ITEMS.map((item, index) =>
            item.section ? (
              <div className="sidebar-section" key={`${item.section}-${index}`}>
                {item.section}
              </div>
            ) : (
              <button
                key={item.label}
                type="button"
                className={`nav-item ${activeNav === item.label ? "active" : ""}`}
                onClick={() => handleNavClick(item.label)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
              </button>
            )
          )}
        </aside>

        <main className="main">
          <section className="hero">
            <div className="hero-copy">
              <div className="hero-kicker">Good morning, Officer Mutoni</div>
              <h1 className="hero-title">Operations center for reports, cases, and response activity.</h1>
              <p className="hero-subtitle">
                File a report, check what is happening right now, and keep active cases organized in one calm, easy-to-scan workspace.
              </p>
              <div className="hero-meta">
                <span className="meta-chip">Sat 23 May 2026</span>
                <span className="meta-chip">Kigali Metropolitan Police</span>
                <span className="meta-chip">Shift A</span>
              </div>
            </div>

            <div className="hero-actions">
              <button type="button" className="btn btn-primary" onClick={scrollToReport}>
                New report
              </button>
              <button type="button" className="btn btn-secondary" onClick={scrollToCases}>
                Review cases
              </button>
            </div>
          </section>

          <section className="stats-grid" aria-label="Dashboard summary">
            <StatCard
              mark="01"
              label="Reports filed"
              value={caseCounter}
              note="Up 12% compared with last month."
            />
            <StatCard
              mark="02"
              label="Open critical cases"
              value="18"
              note="Three fewer than yesterday."
            />
            <StatCard
              mark="03"
              label="Cases resolved"
              value="189"
              note="Closure rate is currently 76.5%."
            />
            <StatCard
              mark="04"
              label="Officers on duty"
              value="34"
              note="Three units are actively deployed."
            />
          </section>

          <SystemStatusGrid />

          <section className="content-grid">
            <section className="panel" ref={reportRef}>
              <div className="panel-head">
                <div className="panel-copy">
                  <h2 className="panel-title">New incident report</h2>
                  <div className="panel-subtitle">Capture the essentials first, then save or submit when you are ready.</div>
                </div>
              </div>
              <ReportForm onSubmit={handleReportSubmit} onDraftSaved={addToast} />
            </section>

            <div className="stack">
              <section className="panel">
                <div className="panel-head">
                  <div className="panel-copy">
                    <h2 className="panel-title">Live activity feed</h2>
                    <div className="panel-subtitle">Recent updates from the field and system.</div>
                  </div>
                  <button type="button" className="panel-action" onClick={() => addToast("A full activity view will be added soon.")}>
                    View all
                  </button>
                </div>
                <ActivityFeed items={feed} />
              </section>

              <section className="panel" ref={casesRef}>
                <div className="panel-head">
                  <div className="panel-copy">
                    <h2 className="panel-title">Recent cases</h2>
                    <div className="panel-subtitle">
                      {filteredCount} case{filteredCount === 1 ? "" : "s"} match the current filter.
                    </div>
                  </div>
                  <button type="button" className="panel-action" onClick={() => addToast("Case details will be expanded in a future update.")}>
                    View all
                  </button>
                </div>

                <div className="filter-bar">
                  {["all", "open", "review", "closed"].map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`chip ${caseFilter === status ? "active" : ""}`}
                      onClick={() => setCaseFilter(status)}
                    >
                      {status === "all" ? "All cases" : getStatusLabel(status)}
                    </button>
                  ))}

                  <div className="search-box">
                    <span aria-hidden="true">Search</span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search by ID, type, status, or location"
                      aria-label="Search cases"
                    />
                  </div>
                </div>

                <CasesTable
                  cases={cases}
                  filter={caseFilter}
                  query={searchQuery}
                  onSelect={(entry) => addToast(`Case ${entry.id} details are ready for the next screen.`)}
                />
              </section>
            </div>
          </section>
        </main>
      </div>

      <AuthModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
      <Toasts toasts={toasts} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
