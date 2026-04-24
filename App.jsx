import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, getFirestore, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import {
  Activity,
  BarChart3,
  BellRing,
  Building2,
  CheckCircle,
  Clock,
  Coins,
  DollarSign,
  Download,
  LayoutDashboard,
  Megaphone,
  Menu,
  Pencil,
  Plus,
  Search,
  Settings as SettingsIcon,
  ShoppingBag,
  Trash2,
  Wallet,
  X,
  TrendingUp,
  TrendingDown,
  Target,
  Sparkles,
  Users,
  Receipt,
  Landmark,
  HandCoins,
  PiggyBank,
  FileClock,
  ExternalLink
} from "lucide-react";

const firebaseRawConfig =
  typeof __firebase_config !== "undefined"
    ? __firebase_config
    : JSON.stringify({
        apiKey: "demo-api-key",
        authDomain: "demo.firebaseapp.com",
        projectId: "demo",
        storageBucket: "demo.appspot.com",
        messagingSenderId: "000000000000",
        appId: "1:000000000000:web:demo"
      });
const firebaseConfig = JSON.parse(firebaseRawConfig);
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const appId = typeof __app_id !== "undefined" ? __app_id : "fag-2026-prod";
const insforgeFunctionsBase =
  typeof __insforge_functions_base !== "undefined" && __insforge_functions_base
    ? __insforge_functions_base
    : "https://7sr4t2xf.functions.insforge.app";
const managementApiUrl = `${insforgeFunctionsBase}/management-api`;

const DEFAULT_CONFIG = {
  year: 2026,
  months: 6,
  launchDate: "2026-04-19",
  globalGoal: 21000000,
  financeLocked: false,
  categories: [
    { id: "cat1", label: "Platine", amount: 20000, targetPeople: 100 },
    { id: "cat2", label: "Or", amount: 15000, targetPeople: 50 },
    { id: "cat3", label: "Argent", amount: 10000, targetPeople: 50 },
    { id: "cat4", label: "Bronze", amount: 5000, targetPeople: 50 },
    { id: "cat5", label: "Hors Gabarit", amount: 0, targetPeople: 0 }
  ]
};

const money = (value) => `${new Intl.NumberFormat("fr-FR").format(Number(value || 0))} F CFA`;
const toNumber = (v) => Number.parseFloat(v) || 0;
const csvEscape = (v) => {
  const s = String(v ?? "");
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const triggerCsvDownload = (filename, linesUtf8) => {
  const bom = "\uFEFF";
  const blob = new Blob([bom + linesUtf8], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
const normalizeWhatsAppNumber = (input, defaultCountryCode = "225") => {
  const raw = String(input || "").trim();
  if (!raw) return "";
  let digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);

  // Côte d'Ivoire (+225) : depuis 2021 le N(S)N fait 10 chiffres (07/05/01/27…).
  // Le « 0 » en tête (ex. 0757228731 = 07 57 22 87 31) fait partie du numéro — ne pas l'enlever.
  if (defaultCountryCode === "225") {
    if (digits.startsWith("225")) {
      const nsn = digits.slice(3);
      if (nsn.length === 10) return digits;
      // Données déjà enregistrées avec l'ancien bug (0 supprimé) : 225757228731 → 2250757228731
      if (nsn.length === 9 && /^[157]\d{8}$/.test(nsn)) return `2250${nsn}`;
      return digits;
    }
    if (digits.length === 10) return `225${digits}`;
    if (digits.length === 9 && /^[157]\d{8}$/.test(digits)) return `2250${digits}`;
    if (digits.length === 8) return `225${digits}`;
    return digits;
  }

  if (digits.startsWith(defaultCountryCode)) return digits;
  if (digits.length === 8) return `${defaultCountryCode}${digits}`;
  if (digits.length === 10 && digits.startsWith("0")) return `${defaultCountryCode}${digits.slice(1)}`;
  return digits;
};
const LOCAL_STORAGE_KEY = `fag_local_${appId}`;
const APP_SESSION_KEY = `fag_session_${appId}`;
const SESSION_PERSIST_KEY = `fag_session_persist_${appId}`;
const LOCAL_TEAM_USERS_KEY = `fag_team_users_${appId}`;

const readSessionRaw = () => {
  if (typeof window === "undefined") return null;
  const mode = window.localStorage.getItem(SESSION_PERSIST_KEY);
  if (mode === "session") return window.sessionStorage.getItem(APP_SESSION_KEY);
  return window.localStorage.getItem(APP_SESSION_KEY) || window.sessionStorage.getItem(APP_SESSION_KEY);
};

const getSessionTokenFromStorage = () => {
  try {
    const raw = readSessionRaw();
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s.sessionToken || null;
  } catch {
    return null;
  }
};

const persistSessionObject = (obj) => {
  if (typeof window === "undefined") return;
  const mode = window.localStorage.getItem(SESSION_PERSIST_KEY) || "local";
  const json = JSON.stringify(obj);
  if (mode === "session") {
    window.sessionStorage.setItem(APP_SESSION_KEY, json);
  } else {
    window.localStorage.setItem(APP_SESSION_KEY, json);
  }
};
const LOCAL_AUDIT_LOGS_KEY = `fag_audit_logs_${appId}`;
const DEFAULT_TEAM_USERS = [
  {
    id: "u-admin",
    fullName: "Administrateur FAG",
    username: "admin@fag.local",
    phone: "2250700000000",
    password: "FAG2026@admin",
    role: "admin",
    isActive: true
  }
];
const ROLE_OPTIONS = [
  { id: "admin", label: "Super Admin", description: "Accès complet à tous les modules" },
  { id: "tresorier", label: "Trésorier", description: "Fidèles, dépenses, banque/comité, dashboard" },
  { id: "communication", label: "Communication", description: "Dashboard + communication + lecture fidèles" },
  { id: "consultation", label: "Consultation", description: "Lecture tableau de bord uniquement" }
];
const ROLE_PERMISSIONS = {
  admin: ["dashboard", "members", "expenses", "deposits", "marketing", "settings"],
  tresorier: ["dashboard", "members", "expenses", "deposits"],
  communication: ["dashboard", "members", "marketing"],
  consultation: ["dashboard"]
};
const ROLE_LABELS = ROLE_OPTIONS.reduce((acc, item) => {
  acc[item.id] = item.label;
  return acc;
}, {});
const CHURCH_FUNCTION_OPTIONS = [
  "Pasteur",
  "Pasteur assistant",
  "Ancien",
  "Diacre",
  "Diaconesse",
  "Chef de protocole",
  "Intercesseur",
  "Moniteur école du dimanche",
  "Responsable jeunesse",
  "Responsable femmes",
  "Chorale",
  "Instrumentiste",
  "Membre"
];

function CircularProgress({ value }) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clamped / 100) * circumference;
  const stroke = clamped >= 75 ? "url(#gradEmerald)" : clamped >= 40 ? "url(#gradBlue)" : "url(#gradOrange)";

  return (
    <div className="relative h-48 w-48">
      <svg className="h-48 w-48 -rotate-90" viewBox="0 0 180 180">
        <defs>
          <linearGradient id="gradEmerald" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="gradBlue" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <linearGradient id="gradOrange" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
        </defs>
        <circle cx="90" cy="90" r={radius} className="fill-none stroke-slate-100" strokeWidth="18" />
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth="18"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 900ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black leading-none text-slate-900">{clamped.toFixed(1)}%</span>
        <span className="mt-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Objectif global</span>
      </div>
    </div>
  );
}

function CountdownCard({ targetDate }) {
  const [remaining, setRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    const compute = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const diff = target - now;
      if (Number.isNaN(target) || diff <= 0) {
        setRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setRemaining({ days, hours, minutes, seconds, expired: false });
    };
    compute();
    const timer = setInterval(compute, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (remaining.expired) {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-center">
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-200">FAG lancé</p>
        <p className="mt-1 text-sm font-black text-white">Nous sommes en pleine saison de reconnaissance.</p>
      </div>
    );
  }

  const itemClass = "rounded-xl bg-slate-800/80 p-3 text-center";
  const valClass = "text-xl font-black text-white";
  const labelClass = "text-[9px] font-extrabold uppercase tracking-widest text-slate-400";

  return (
    <div className="rounded-2xl border border-emerald-400/30 bg-slate-900/60 p-4">
      <p className="mb-3 text-center text-[10px] font-extrabold uppercase tracking-widest text-emerald-300">Compte à rebours FAG</p>
      <div className="grid grid-cols-4 gap-2">
        <div className={itemClass}><p className={valClass}>{remaining.days}</p><p className={labelClass}>Jours</p></div>
        <div className={itemClass}><p className={valClass}>{remaining.hours}</p><p className={labelClass}>Heures</p></div>
        <div className={itemClass}><p className={valClass}>{remaining.minutes}</p><p className={labelClass}>Minutes</p></div>
        <div className={itemClass}><p className={valClass}>{remaining.seconds}</p><p className={labelClass}>Sec</p></div>
      </div>
    </div>
  );
}

const edenContainerVariants = {
  hidden: { opacity: 0, y: 26 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.12, delayChildren: 0.05, duration: 0.55, ease: "easeOut" }
  }
};

const edenItemVariants = {
  hidden: { opacity: 0, y: 26, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 180, damping: 20 } }
};

const App = () => {
  const reduceFromSystem = useReducedMotion();
  const forceMotion =
    typeof window !== "undefined" &&
    (window.location.search.includes("motion=on") || window.localStorage.getItem("fag_force_motion") === "1");
  const shouldReduceMotion = reduceFromSystem && !forceMotion;
  const [activeTab, setActiveTab] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
const [storageMode] = useState("online");
  const [isAppAuthenticated, setIsAppAuthenticated] = useState(false);
  const [sessionUser, setSessionUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginData, setLoginData] = useState({ identifier: "", password: "", remember: true });
  const [loginError, setLoginError] = useState("");
  const [teamUsers, setTeamUsers] = useState(DEFAULT_TEAM_USERS);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditSearchTerm, setAuditSearchTerm] = useState("");
  const [auditFilter, setAuditFilter] = useState("all");
  const [newTeamUser, setNewTeamUser] = useState({
    fullName: "",
    username: "",
    phone: "",
    password: "",
    role: "tresorier"
  });
  const [editingTeamUser, setEditingTeamUser] = useState(null);
  const [managementBackendReady, setManagementBackendReady] = useState(false);
  const [backendError, setBackendError] = useState("");
  const [flashMessage, setFlashMessage] = useState(null);

  const [members, setMembers] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  const [searchTerm, setSearchTerm] = useState("");
  const [memberFilter, setMemberFilter] = useState("all");
  const [memberCategoryFilter, setMemberCategoryFilter] = useState("all");
  const [marketingFilter, setMarketingFilter] = useState("all");
  const [expenseSearchTerm, setExpenseSearchTerm] = useState("");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("all");
  const [depositFilter, setDepositFilter] = useState("all");
  const [depositSearchTerm, setDepositSearchTerm] = useState("");
  const [marketingSearchTerm, setMarketingSearchTerm] = useState("");

  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [landingOpen, setLandingOpen] = useState(false);

  const [selectedMember, setSelectedMember] = useState(null);

  const [newMember, setNewMember] = useState({
    name: "",
    churchFunctionType: "",
    churchFunction: "",
    district: "",
    whatsapp: "",
    categoryId: "cat1",
    customAmount: "",
    commsOptIn: true
  });
  const [paymentData, setPaymentData] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    method: "Espèces"
  });
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    category: "Logistique",
    method: "Espèces"
  });
  const [editingExpense, setEditingExpense] = useState(null);
  const [newDeposit, setNewDeposit] = useState({
    recipient: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    bordereauRef: "",
    bordereauUrl: ""
  });
  const [whatsAppLogs, setWhatsAppLogs] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const [urlAttachmentModal, setUrlAttachmentModal] = useState(null);
  const [bordereauFormModal, setBordereauFormModal] = useState(null);
  const [netOnline, setNetOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine
  );

  const loadLocalState = () => {
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        members: Array.isArray(parsed.members) ? parsed.members : [],
        deposits: Array.isArray(parsed.deposits) ? parsed.deposits : [],
        expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
        config: parsed.config ? { ...DEFAULT_CONFIG, ...parsed.config } : DEFAULT_CONFIG
      };
    } catch {
      return null;
    }
  };

  const saveLocalState = (nextState) => {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextState));
  };

  const callManagementApi = async (action, payload = {}) => {
    const publicActions = ["bootstrap", "login", "migrateUsers", "getAppData", "createLog"];
    if (!publicActions.includes(action) && typeof navigator !== "undefined" && !navigator.onLine) {
      throw new Error("Hors connexion. Réessayez lorsque le réseau est disponible.");
    }
    const token = getSessionTokenFromStorage();
    const headers = { "Content-Type": "application/json" };
    if (token && !publicActions.includes(action)) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(managementApiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ action, payload })
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 && !["login", "createLog"].includes(action)) {
      try {
        window.localStorage.removeItem(SESSION_PERSIST_KEY);
        window.localStorage.removeItem(APP_SESSION_KEY);
        window.sessionStorage.removeItem(APP_SESSION_KEY);
      } catch {
        // ignore
      }
      setSessionUser(null);
      setIsAppAuthenticated(false);
      setShowLoginModal(true);
      setFlashMessage({ type: "error", message: "Session expirée. Reconnectez-vous." });
    }
    if (!response.ok || data?.ok === false) {
      throw new Error(data?.error || "Management API indisponible");
    }
    if (action === "login" && response.ok) {
      if (data?.ok !== true || !data?.user) {
        throw new Error(
          data?.error ||
            "Identifiants invalides ou compte inactif. Vérifiez l'email, le numéro (chiffres seuls) et le mot de passe."
        );
      }
    }
    return data;
  };

  const mergeBootstrapData = (apiData) => {
    if (Array.isArray(apiData.users) && apiData.users.length > 0) {
      const users = apiData.users.map((item) => ({
        id: item.id,
        fullName: item.full_name || item.fullName || "",
        username: item.email || item.username || "",
        phone: item.phone || "",
        role: item.role || "consultation",
        isActive: item.is_active !== false,
        password: ""
      }));
      setTeamUsers(users);
    }
    if (Array.isArray(apiData.logs)) {
      const logs = apiData.logs.map((item) => ({
        id: item.id,
        timestamp: item.created_at || item.timestamp,
        actorId: item.actor_user_id || item.actorId || "",
        actorName: item.actor_name || item.actorName || "Système",
        actorRole: item.actor_role || item.actorRole || "",
        action: item.action,
        scope: item.scope || "general",
        targetType: item.target_type || item.targetType || "",
        targetId: item.target_id || item.targetId || "",
        targetLabel: item.target_label || item.targetLabel || "",
        details: item.details || ""
      }));
      setAuditLogs(logs);
    }
    if (Array.isArray(apiData.members)) setMembers(apiData.members);
    if (Array.isArray(apiData.expenses)) setExpenses(apiData.expenses);
    if (Array.isArray(apiData.deposits)) setDeposits(apiData.deposits);
    if (apiData.config) setConfig((prev) => ({ ...DEFAULT_CONFIG, ...prev, ...apiData.config }));
    if (Array.isArray(apiData.whatsAppLogs)) setWhatsAppLogs(apiData.whatsAppLogs);
  };

  const notify = (type, message) => {
    setFlashMessage({ type, message });
    window.setTimeout(() => setFlashMessage(null), 2800);
  };

  useEffect(() => {
    try {
      const rawSession = readSessionRaw();
      if (!rawSession) return;
      const parsedSession = JSON.parse(rawSession);
      if (parsedSession && (parsedSession.username || parsedSession.id)) {
        setSessionUser(parsedSession);
        setIsAppAuthenticated(true);
        setLoading(false);
      }
    } catch {
      // ignore invalid session payload
    }
  }, []);

  useEffect(() => {
    const onOff = () => setNetOnline(typeof navigator !== "undefined" && navigator.onLine);
    window.addEventListener("online", onOff);
    window.addEventListener("offline", onOff);
    return () => {
      window.removeEventListener("online", onOff);
      window.removeEventListener("offline", onOff);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setLandingOpen(true), 250);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    try {
      const rawUsers = window.localStorage.getItem(LOCAL_TEAM_USERS_KEY);
      if (!rawUsers) {
        setTeamUsers(DEFAULT_TEAM_USERS);
        return;
      }
      const parsedUsers = JSON.parse(rawUsers);
      if (Array.isArray(parsedUsers) && parsedUsers.length > 0) {
        setTeamUsers(parsedUsers);
      } else {
        setTeamUsers(DEFAULT_TEAM_USERS);
      }
    } catch {
      setTeamUsers(DEFAULT_TEAM_USERS);
    }
  }, []);

  useEffect(() => {
    const syncManagementBackend = async () => {
      try {
        const localUsers = (() => {
          try {
            const raw = window.localStorage.getItem(LOCAL_TEAM_USERS_KEY);
            const parsed = JSON.parse(raw || "[]");
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })();
        const toMigrate = localUsers.filter(
          (u) => u && u.fullName && (u.username || u.phone) && u.password
        );
        if (toMigrate.length > 0) {
          try {
            await callManagementApi("migrateUsers", { users: toMigrate });
          } catch (migErr) {
            console.warn("Migration des comptes locaux ignorée (non bloquant) :", migErr?.message || migErr);
          }
        }
        const apiData = await callManagementApi("bootstrap", {});
        mergeBootstrapData(apiData);
        setLoading(false);
        setManagementBackendReady(true);
        setBackendError("");
      } catch (error) {
        console.warn("Management backend offline, using local fallback:", error?.message || error);
        setManagementBackendReady(false);
        setBackendError("Connexion au serveur indisponible. Vérifiez le réseau.");
        setLoading(false);
      }
    };
    syncManagementBackend();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LOCAL_TEAM_USERS_KEY, JSON.stringify(teamUsers));
  }, [teamUsers]);

  useEffect(() => {
    try {
      const rawLogs = window.localStorage.getItem(LOCAL_AUDIT_LOGS_KEY);
      if (!rawLogs) return;
      const parsedLogs = JSON.parse(rawLogs);
      if (Array.isArray(parsedLogs)) setAuditLogs(parsedLogs);
    } catch {
      // ignore invalid logs payload
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LOCAL_AUDIT_LOGS_KEY, JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Donnees metier gerees uniquement par le backend principal.

  useEffect(() => {
    if (storageMode !== "local") return;
    saveLocalState({ members, deposits, expenses, config });
  }, [members, deposits, expenses, config, storageMode]);

  const stats = useMemo(() => {
    const catStats = config.categories.reduce((acc, cat) => {
      acc[cat.id] = {
        id: cat.id,
        label: cat.label,
        baseAmount: cat.amount,
        target: cat.targetPeople,
        count: 0,
        promised: 0,
        collected: 0
      };
      return acc;
    }, {});

    let totalCollected = 0;
    let totalCommitted = 0;
    const monthlyGlobalProgress = Array(config.months).fill(0);
    const methodBreakdown = { "Espèces": 0, "Mobile Money": 0, Virement: 0 };
    const collectionByMonthMap = {};
    const expenseByMonthMap = {};

    members.forEach((member) => {
      const cat = config.categories.find((c) => c.id === member.categoryId);
      const monthlyAmount = member.categoryId === "cat5" ? toNumber(member.customAmount) : toNumber(cat?.amount);
      const memberCommitted = monthlyAmount * config.months;
      const memberCollected = (member.payments || []).reduce((sum, p) => {
        const amount = toNumber(p.amount);
        const normalizedMethod = p.method === "Mobile Money" ? "Mobile Money" : p.method === "Virement/Chèque" ? "Virement" : p.method || "Espèces";
        methodBreakdown[normalizedMethod] = (methodBreakdown[normalizedMethod] || 0) + amount;
        const key = (p.date || p.timestamp || "").slice(0, 7);
        if (key) collectionByMonthMap[key] = (collectionByMonthMap[key] || 0) + amount;
        return sum + amount;
      }, 0);

      totalCommitted += memberCommitted;
      totalCollected += memberCollected;

      if (catStats[member.categoryId]) {
        catStats[member.categoryId].count += 1;
        catStats[member.categoryId].promised += memberCommitted;
        catStats[member.categoryId].collected += memberCollected;
      }

      if (monthlyAmount > 0) {
        const fullMonths = Math.floor(memberCollected / monthlyAmount);
        for (let i = 0; i < Math.min(fullMonths, config.months); i += 1) monthlyGlobalProgress[i] += 1;
      }
    });

    const totalExpenses = expenses.reduce((sum, e) => {
      const amount = toNumber(e.amount);
      const key = (e.date || "").slice(0, 7);
      if (key) expenseByMonthMap[key] = (expenseByMonthMap[key] || 0) + amount;
      return sum + amount;
    }, 0);
    const totalHandedOver = deposits.reduce((sum, d) => sum + toNumber(d.amount), 0);
    const cashInHand = totalCollected - totalExpenses - totalHandedOver;
    const progression = config.globalGoal > 0 ? (totalCollected / config.globalGoal) * 100 : 0;
    const remainingGoal = Math.max(0, config.globalGoal - totalCollected);
    const recoveryRate = config.globalGoal > 0 ? (totalCollected / config.globalGoal) * 100 : 0;
    const averageContribution = members.length > 0 ? totalCollected / members.length : 0;

    const keys = new Set([...Object.keys(collectionByMonthMap), ...Object.keys(expenseByMonthMap)]);
    const monthKeys = [...keys].sort();
    const monthlyFinance = monthKeys.map((monthKey) => {
      const collected = collectionByMonthMap[monthKey] || 0;
      const spent = expenseByMonthMap[monthKey] || 0;
      return { monthKey, collected, spent, net: collected - spent };
    });
    const latestMonth = monthlyFinance[monthlyFinance.length - 1];
    const previousMonth = monthlyFinance[monthlyFinance.length - 2];
    const monthlyGrowth =
      latestMonth && previousMonth && previousMonth.collected > 0
        ? ((latestMonth.collected - previousMonth.collected) / previousMonth.collected) * 100
        : 0;

    return {
      totalCollected,
      totalCommitted,
      totalExpenses,
      totalHandedOver,
      cashInHand,
      progression,
      recoveryRate,
      remainingGoal,
      averageContribution,
      monthlyGrowth,
      methodBreakdown,
      monthlyFinance,
      monthlyGlobalProgress,
      categories: Object.values(catStats).sort((a, b) => b.baseAmount - a.baseAmount)
    };
  }, [members, deposits, expenses, config]);

  const saveConfig = async (next) => {
    if (!managementBackendReady) {
      notify("error", "Serveur de données indisponible. Modification non enregistrée.");
      return;
    }
    setConfig(next);
    await callManagementApi("saveConfig", { config: next });
  };

  const writeAuditLog = async ({
    action,
    scope = "general",
    targetType = "",
    targetId = "",
    targetLabel = "",
    details = ""
  }) => {
    const actor = sessionUser || {};
    const logEntry = {
      timestamp: new Date().toISOString(),
      actorId: actor.id || "system",
      actorName: actor.fullName || actor.username || "Système",
      actorRole: actor.role || "system",
      action,
      scope,
      targetType,
      targetId,
      targetLabel,
      details
    };
    try {
      await callManagementApi("createLog", {
        actorUserId: logEntry.actorId,
        actorName: logEntry.actorName,
        actorRole: logEntry.actorRole,
        action: logEntry.action,
        scope: logEntry.scope,
        targetType: logEntry.targetType,
        targetId: logEntry.targetId,
        targetLabel: logEntry.targetLabel,
        details: logEntry.details
      });
      setAuditLogs((prev) => [logEntry, ...prev].slice(0, 1000));
      return;
    } catch {
      setAuditLogs((prev) => [logEntry, ...prev].slice(0, 1000));
    }
  };

  const handleAppLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    const normalizedIdentifier = loginData.identifier.trim().toLowerCase();
    const normalizedDigits = loginData.identifier.replace(/[^\d]/g, "");
    const hadBackendSnapshot = managementBackendReady;
    let matchedUser = null;
    let newSessionToken = null;
    let loginApiError = "";
    try {
      const result = await callManagementApi("login", {
        identifier: loginData.identifier,
        password: loginData.password
      });
      newSessionToken = result.sessionToken || null;
      matchedUser = result.user
        ? {
            id: result.user.id,
            fullName: result.user.full_name || result.user.fullName || "",
            username: result.user.email || result.user.username || "",
            phone: result.user.phone || "",
            role: result.user.role || "consultation",
            isActive: result.user.is_active !== false
          }
        : null;
    } catch (err) {
      loginApiError = (err && err.message) || String(err);
    }
    if (!matchedUser) {
      if (loginApiError) {
        if (/Hors connexion|network|Failed to fetch|fetch/i.test(loginApiError)) {
          setLoginError("Aucune connexion au serveur. Vérifiez le réseau et réessayez.");
        } else if (
          /indisponible|503|502|500|non configur|DATABASE|timeout/i.test(loginApiError) ||
          loginApiError === "Management API indisponible"
        ) {
          setLoginError("Le service de connexion ne répond pas. Réessayez dans un instant.");
        } else {
          setLoginError(loginApiError);
        }
      } else {
        setLoginError("Réponse inattendue du serveur. Rafraîchissez la page et réessayez.");
      }
      await writeAuditLog({
        action: "ECHEC_CONNEXION",
        scope: "access",
        targetType: "management_user",
        targetLabel: normalizedIdentifier || normalizedDigits || "N/A",
        details: loginApiError
          ? `Tentative échouée (${loginApiError}).`
          : "Tentative avec identifiants invalides."
      });
      return;
    }
    const safeSession = {
      username: matchedUser.username,
      fullName: matchedUser.fullName || matchedUser.username,
      role: matchedUser.role || "consultation",
      id: matchedUser.id,
      sessionToken: newSessionToken
    };
    setSessionUser(safeSession);
    setIsAppAuthenticated(true);
    setLoading(false);
    setShowLoginModal(false);
    setLoginError("");
    if (loginData.remember) {
      window.localStorage.setItem(SESSION_PERSIST_KEY, "local");
      window.localStorage.setItem(APP_SESSION_KEY, JSON.stringify(safeSession));
      window.sessionStorage.removeItem(APP_SESSION_KEY);
    } else {
      window.localStorage.setItem(SESSION_PERSIST_KEY, "session");
      window.sessionStorage.setItem(APP_SESSION_KEY, JSON.stringify(safeSession));
      window.localStorage.removeItem(APP_SESSION_KEY);
    }
    setLoginData((prev) => ({ ...prev, password: "" }));
    if (!hadBackendSnapshot) {
      try {
        const apiData = await callManagementApi("bootstrap", {});
        mergeBootstrapData(apiData);
        setManagementBackendReady(true);
        setBackendError("");
      } catch (hydrateErr) {
        console.warn("Chargement des données après connexion :", hydrateErr?.message || hydrateErr);
        setManagementBackendReady(true);
        setBackendError("Chargement des données incomplet. Rafraîchissez la page (F5) si les listes restent vides.");
        notify("error", "Session ouverte, mais rechargement des données échoué. Rafraîchissez la page.");
      }
    }
    await writeAuditLog({
      action: "CONNEXION",
      scope: "access",
      targetType: "management_user",
      targetId: matchedUser.id,
      targetLabel: matchedUser.fullName || matchedUser.username,
      details: "Connexion réussie au logiciel."
    });
  };

  const createTeamUser = async (e) => {
    e.preventDefault();
    const normalizedUsername = newTeamUser.username.trim().toLowerCase();
    const normalizedPhone = newTeamUser.phone.replace(/[^\d]/g, "");
    if (!newTeamUser.fullName.trim() || (!normalizedUsername && !normalizedPhone) || !newTeamUser.password) return;
    if (
      (normalizedUsername && teamUsers.some((u) => u.username.toLowerCase() === normalizedUsername)) ||
      (normalizedPhone && teamUsers.some((u) => (u.phone || "").replace(/[^\d]/g, "") === normalizedPhone))
    ) {
      notify("error", "Un compte existe déjà avec cet email ou ce téléphone.");
      return;
    }
    if (!managementBackendReady) {
      notify("error", "Serveur de données indisponible. Création impossible.");
      return;
    }
    let createdUser = {
      id: `u-${Date.now()}`,
      fullName: newTeamUser.fullName.trim(),
      username: normalizedUsername || `${normalizedPhone}@fag.local`,
      phone: normalizedPhone,
      password: newTeamUser.password,
      role: newTeamUser.role,
      isActive: true
    };
    const result = await callManagementApi("createUser", {
      fullName: createdUser.fullName,
      email: normalizedUsername || null,
      phone: normalizedPhone || null,
      password: createdUser.password,
      role: createdUser.role
    });
    if (result?.user) {
      createdUser = {
        id: result.user.id,
        fullName: result.user.full_name || createdUser.fullName,
        username: result.user.email || createdUser.username,
        phone: result.user.phone || createdUser.phone,
        password: "",
        role: result.user.role || createdUser.role,
        isActive: result.user.is_active !== false
      };
    }
    setTeamUsers((prev) => [...prev, createdUser]);
    setNewTeamUser({ fullName: "", username: "", phone: "", password: "", role: "tresorier" });
    notify("success", "Compte de gestion créé avec succès.");
    await writeAuditLog({
      action: "CREATION_COMPTE_GESTION",
      scope: "users",
      targetType: "management_user",
      targetId: createdUser.id,
      targetLabel: createdUser.fullName,
      details: `Rôle ${createdUser.role}.`
    });
  };

  const toggleTeamUserStatus = async (userId) => {
    const target = teamUsers.find((u) => u.id === userId);
    const nextStatus = !(target?.isActive !== false);
    if (!managementBackendReady) {
      notify("error", "Serveur de données indisponible.");
      return;
    }
    await callManagementApi("toggleUserStatus", { userId, isActive: nextStatus });
    setTeamUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isActive: nextStatus } : u))
    );
    await writeAuditLog({
      action: nextStatus ? "ACTIVATION_COMPTE_GESTION" : "DESACTIVATION_COMPTE_GESTION",
      scope: "users",
      targetType: "management_user",
      targetId: userId,
      targetLabel: target?.fullName || target?.username || userId,
      details: nextStatus ? "Compte réactivé." : "Compte désactivé."
    });
  };

  const updateTeamUserRole = async (userId, role) => {
    const target = teamUsers.find((u) => u.id === userId);
    if (!managementBackendReady) {
      notify("error", "Serveur de données indisponible.");
      return;
    }
    await callManagementApi("updateUser", { userId, role });
    setTeamUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    if (sessionUser?.id === userId) {
      setSessionUser((prev) => ({ ...prev, role }));
      const updatedSession = { ...(sessionUser || {}), role };
      persistSessionObject(updatedSession);
    }
    await writeAuditLog({
      action: "CHANGEMENT_ROLE_COMPTE_GESTION",
      scope: "users",
      targetType: "management_user",
      targetId: userId,
      targetLabel: target?.fullName || target?.username || userId,
      details: `Nouveau rôle: ${role}.`
    });
  };

  const updateTeamUser = async (userId, patch) => {
    const normalizedUsername = (patch.username || "").trim().toLowerCase();
    const normalizedPhone = (patch.phone || "").replace(/[^\d]/g, "");
    const duplicate = teamUsers.some(
      (u) =>
        u.id !== userId &&
        ((normalizedUsername && (u.username || "").toLowerCase() === normalizedUsername) ||
          (normalizedPhone && (u.phone || "").replace(/[^\d]/g, "") === normalizedPhone))
    );
    if (duplicate) {
      notify("error", "Un autre compte utilise déjà cet email ou ce téléphone.");
      return false;
    }
    const cleanPatch = {
      ...(patch.fullName !== undefined && { fullName: patch.fullName.trim() }),
      ...(patch.username !== undefined && { username: normalizedUsername }),
      ...(patch.phone !== undefined && { phone: normalizedPhone }),
      ...(patch.password !== undefined && patch.password !== "" && { password: patch.password }),
      ...(patch.role !== undefined && { role: patch.role }),
      ...(patch.isActive !== undefined && { isActive: patch.isActive })
    };
    if (!managementBackendReady) {
      notify("error", "Serveur de données indisponible.");
      return false;
    }
    await callManagementApi("updateUser", {
      userId,
      fullName: cleanPatch.fullName,
      email: cleanPatch.username,
      phone: cleanPatch.phone,
      password: cleanPatch.password,
      role: cleanPatch.role
    });
    setTeamUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...cleanPatch } : u)));
    if (sessionUser?.id === userId) {
      const updatedSession = { ...(sessionUser || {}), ...cleanPatch };
      setSessionUser(updatedSession);
      persistSessionObject(updatedSession);
    }
    const target = teamUsers.find((u) => u.id === userId);
    writeAuditLog({
      action: "MODIFICATION_COMPTE_GESTION",
      scope: "users",
      targetType: "management_user",
      targetId: userId,
      targetLabel: target?.fullName || target?.username || userId,
      details: "Modification profil, accès ou mot de passe."
    });
    return true;
  };

  const removeTeamUser = async (userId) => {
    if (sessionUser?.id === userId) {
      notify("error", "Vous ne pouvez pas supprimer votre propre compte actif.");
      return;
    }
    const target = teamUsers.find((u) => u.id === userId);
    if (!managementBackendReady) {
      notify("error", "Serveur de données indisponible.");
      return;
    }
    await callManagementApi("deleteUser", { userId });
    setTeamUsers((prev) => prev.filter((u) => u.id !== userId));
    writeAuditLog({
      action: "SUPPRESSION_COMPTE_GESTION",
      scope: "users",
      targetType: "management_user",
      targetId: userId,
      targetLabel: target?.fullName || target?.username || userId,
      details: "Compte supprimé par administrateur."
    });
  };

  const handleAppLogout = () => {
    writeAuditLog({
      action: "DECONNEXION",
      scope: "access",
      targetType: "management_user",
      targetId: sessionUser?.id || "",
      targetLabel: sessionUser?.fullName || sessionUser?.username || "Session",
      details: "Déconnexion de la session active."
    });
    window.localStorage.removeItem(APP_SESSION_KEY);
    window.localStorage.removeItem(SESSION_PERSIST_KEY);
    window.sessionStorage.removeItem(APP_SESSION_KEY);
    setIsAppAuthenticated(false);
    setSessionUser(null);
    setShowLoginModal(false);
    setLoginData({ identifier: "", password: "", remember: true });
  };

  const askConfirm = (message) =>
    new Promise((resolve) => {
      setConfirmState({ message, resolve });
    });

  const exportDataBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      year: config.year,
      members,
      expenses,
      deposits,
      config
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fag-sauvegarde-${config.year}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify("success", "Fichier de sauvegarde téléchargé.");
  };

  const addMember = async (e) => {
    e.preventDefault();
    if (!newMember.name || !newMember.whatsapp) {
      notify("error", "Veuillez renseigner le nom et le téléphone du fidèle.");
      return;
    }
    const preparedMember = {
      ...newMember,
      churchFunction:
        newMember.churchFunctionType === "__other__"
          ? newMember.churchFunction
          : newMember.churchFunctionType || newMember.churchFunction
    };
    const normW = normalizeWhatsAppNumber(preparedMember.whatsapp);
    if (normW && members.some((m) => normalizeWhatsAppNumber(m.whatsapp) === normW)) {
      notify("error", "Un fidèle avec ce numéro WhatsApp existe déjà.");
      return;
    }
    if (managementBackendReady) {
      const cloudMember = {
        ...preparedMember,
        dateJoined: new Date().toISOString(),
        payments: [],
        commsOptIn: newMember.commsOptIn !== false
      };
      try {
        const result = await callManagementApi("addMember", { member: cloudMember });
        if (result?.id) {
          setMembers((prev) => [...prev, { ...cloudMember, id: result.id }]);
          setNewMember({
            name: "",
            churchFunctionType: "",
            churchFunction: "",
            district: "",
            whatsapp: "",
            categoryId: "cat1",
            customAmount: "",
            commsOptIn: true
          });
          setIsMemberModalOpen(false);
          notify("success", "Fidèle créé avec succès.");
        } else {
          throw new Error("Création refusée par le serveur.");
        }
      } catch (error) {
        notify("error", (error?.message || "Création impossible.").trim());
        return;
      }
      await writeAuditLog({
        action: "CREATION_FIDELE",
        scope: "finance",
        targetType: "member",
        targetLabel: preparedMember.name,
        details: "Nouveau fidèle enregistré (cloud)."
      });
      return;
    }
    if (storageMode === "local") {
      const localMember = { ...preparedMember, id: Date.now().toString(), dateJoined: new Date().toISOString(), payments: [] };
      setMembers((prev) => [...prev, localMember]);
      setNewMember({
        name: "",
        churchFunctionType: "",
        churchFunction: "",
        district: "",
        whatsapp: "",
        categoryId: "cat1",
        customAmount: "",
        commsOptIn: true
      });
      setIsMemberModalOpen(false);
      writeAuditLog({
        action: "CREATION_FIDELE",
        scope: "finance",
        targetType: "member",
        targetLabel: preparedMember.name,
        details: "Nouveau fidèle enregistré (local)."
      });
      return;
    }
    if (!user) return;
    await addDoc(collection(db, "artifacts", appId, "public", "data", "members"), {
      ...preparedMember,
      dateJoined: new Date().toISOString(),
      payments: []
    });
    setNewMember({
      name: "",
      churchFunctionType: "",
      churchFunction: "",
      district: "",
      whatsapp: "",
      categoryId: "cat1",
      customAmount: "",
      commsOptIn: true
    });
    setIsMemberModalOpen(false);
    writeAuditLog({
      action: "CREATION_FIDELE",
      scope: "finance",
      targetType: "member",
      targetLabel: preparedMember.name,
      details: "Nouveau fidèle enregistré."
    });
  };

  const openEditMemberModal = (m) => {
    const fn = (m.churchFunction || "").trim();
    const isPreset = CHURCH_FUNCTION_OPTIONS.includes(fn);
    setEditingMember({
      id: m.id,
      name: m.name || "",
      churchFunctionType: isPreset ? fn : fn ? "__other__" : "",
      churchFunction: isPreset ? "" : fn,
      district: m.district || "",
      whatsapp: m.whatsapp || "",
      categoryId: m.categoryId || "cat1",
      customAmount: m.categoryId === "cat5" ? String(m.customAmount ?? "") : "",
      commsOptIn: m.commsOptIn !== false
    });
  };

  const saveMemberUpdate = async (e) => {
    e.preventDefault();
    if (!editingMember?.name?.trim() || !editingMember?.whatsapp?.trim()) {
      notify("error", "Veuillez renseigner le nom et le téléphone du fidèle.");
      return;
    }
    const prepared = {
      ...editingMember,
      churchFunction:
        editingMember.churchFunctionType === "__other__"
          ? editingMember.churchFunction
          : editingMember.churchFunctionType || editingMember.churchFunction
    };
    const memberId = editingMember.id;
    const existing = members.find((mm) => mm.id === memberId);
    if (!existing) {
      notify("error", "Fidèle introuvable.");
      return;
    }
    const patch = {
      name: prepared.name.trim(),
      churchFunction: (prepared.churchFunction || "").trim() || "Membre",
      district: (prepared.district || "").trim(),
      whatsapp: prepared.whatsapp.trim(),
      categoryId: prepared.categoryId || "cat1",
      customAmount: prepared.categoryId === "cat5" ? toNumber(prepared.customAmount) : 0,
      commsOptIn: prepared.commsOptIn !== false
    };
    const nextMember = { ...existing, ...patch };

    if (managementBackendReady) {
      try {
        await callManagementApi("updateMember", {
          memberId,
          member: {
            name: nextMember.name,
            churchFunction: nextMember.churchFunction,
            district: nextMember.district || null,
            whatsapp: nextMember.whatsapp,
            categoryId: nextMember.categoryId,
            customAmount: nextMember.customAmount,
            commsOptIn: nextMember.commsOptIn !== false
          }
        });
      } catch (error) {
        notify("error", `Mise à jour impossible. ${error?.message || ""}`.trim());
        return;
      }
      setMembers((prev) => prev.map((mm) => (mm.id === memberId ? nextMember : mm)));
      if (selectedMember?.id === memberId) setSelectedMember(nextMember);
      setEditingMember(null);
      notify("success", "Fiche fidèle mise à jour.");
      await writeAuditLog({
        action: "MODIFICATION_FIDELE",
        scope: "finance",
        targetType: "member",
        targetId: memberId,
        targetLabel: nextMember.name,
        details: "Informations du fidèle modifiées."
      });
      return;
    }
    if (storageMode === "local") {
      setMembers((prev) => prev.map((mm) => (mm.id === memberId ? nextMember : mm)));
      if (selectedMember?.id === memberId) setSelectedMember(nextMember);
      setEditingMember(null);
      notify("success", "Fiche fidèle mise à jour.");
      writeAuditLog({
        action: "MODIFICATION_FIDELE",
        scope: "finance",
        targetType: "member",
        targetId: memberId,
        targetLabel: nextMember.name,
        details: "Informations du fidèle modifiées (local)."
      });
      return;
    }
    if (!user) return;
    await updateDoc(doc(db, "artifacts", appId, "public", "data", "members", memberId), {
      name: nextMember.name,
      churchFunction: nextMember.churchFunction,
      district: nextMember.district,
      whatsapp: nextMember.whatsapp,
      categoryId: nextMember.categoryId,
      customAmount: nextMember.customAmount
    });
    setMembers((prev) => prev.map((mm) => (mm.id === memberId ? nextMember : mm)));
    if (selectedMember?.id === memberId) setSelectedMember(nextMember);
    setEditingMember(null);
    notify("success", "Fiche fidèle mise à jour.");
    writeAuditLog({
      action: "MODIFICATION_FIDELE",
      scope: "finance",
      targetType: "member",
      targetId: memberId,
      targetLabel: nextMember.name,
      details: "Informations du fidèle modifiées."
    });
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!selectedMember || !paymentData.amount) return;
    const payment = {
      id: Date.now().toString(),
      amount: toNumber(paymentData.amount),
      method: paymentData.method,
      date: paymentData.date,
      timestamp: new Date().toISOString()
    };
    if (managementBackendReady) {
      const updatedPayments = [...(selectedMember.payments || []), payment];
      setMembers((prev) =>
        prev.map((m) => (m.id === selectedMember.id ? { ...m, payments: updatedPayments } : m))
      );
      setSelectedMember((prev) => ({ ...prev, payments: updatedPayments }));
      setPaymentData({ amount: "", date: new Date().toISOString().split("T")[0], method: "Espèces" });
      setIsPaymentModalOpen(false);
      try {
        await callManagementApi("replaceMemberPayments", { memberId: selectedMember.id, payments: updatedPayments });
      } catch {
        // optimistic fallback
      }
      await writeAuditLog({
        action: "ENREGISTREMENT_PAIEMENT",
        scope: "finance",
        targetType: "member",
        targetId: selectedMember.id,
        targetLabel: selectedMember.name,
        details: `${money(payment.amount)} via ${payment.method}.`
      });
      notify("success", "Paiement enregistré avec succès.");
      return;
    }
    if (storageMode === "local") {
      setMembers((prev) =>
        prev.map((m) => (m.id === selectedMember.id ? { ...m, payments: [...(m.payments || []), payment] } : m))
      );
      setSelectedMember((prev) => ({ ...prev, payments: [...(prev?.payments || []), payment] }));
      setPaymentData({ amount: "", date: new Date().toISOString().split("T")[0], method: "Espèces" });
      setIsPaymentModalOpen(false);
      writeAuditLog({
        action: "ENREGISTREMENT_PAIEMENT",
        scope: "finance",
        targetType: "member",
        targetId: selectedMember.id,
        targetLabel: selectedMember.name,
        details: `${money(payment.amount)} via ${payment.method}.`
      });
      return;
    }
    if (!user) return;
    await updateDoc(doc(db, "artifacts", appId, "public", "data", "members", selectedMember.id), {
      payments: [...(selectedMember.payments || []), payment]
    });
    setPaymentData({ amount: "", date: new Date().toISOString().split("T")[0], method: "Espèces" });
    setIsPaymentModalOpen(false);
    writeAuditLog({
      action: "ENREGISTREMENT_PAIEMENT",
      scope: "finance",
      targetType: "member",
      targetId: selectedMember.id,
      targetLabel: selectedMember.name,
      details: `${money(payment.amount)} via ${payment.method}.`
    });
  };

  const handleExpense = async (e) => {
    e.preventDefault();
    if (!newExpense.description?.trim() || !newExpense.amount) {
      notify("error", "Indiquez une description et un montant.");
      return;
    }
    if (managementBackendReady) {
      const optimistic = { ...newExpense, id: Date.now().toString() };
      setExpenses((prev) => [optimistic, ...prev]);
      setNewExpense({
        description: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        category: "Logistique",
        method: "Espèces"
      });
      setIsExpenseModalOpen(false);
      try {
        const result = await callManagementApi("addExpense", { expense: optimistic });
        if (result?.id) {
          setExpenses((prev) => prev.map((ex) => (ex.id === optimistic.id ? { ...ex, id: result.id } : ex)));
        }
      } catch {
        // optimistic fallback
      }
      await writeAuditLog({
        action: "AJOUT_DEPENSE",
        scope: "finance",
        targetType: "expense",
        targetLabel: optimistic.description,
        details: `${money(optimistic.amount)} — ${optimistic.category} (${optimistic.method || "Espèces"}).`
      });
      notify("success", "Dépense enregistrée avec succès.");
      return;
    }
    if (storageMode === "local") {
      setExpenses((prev) => [...prev, { ...newExpense, id: Date.now().toString() }]);
      setNewExpense({
        description: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        category: "Logistique",
        method: "Espèces"
      });
      setIsExpenseModalOpen(false);
      notify("success", "Dépense enregistrée.");
      writeAuditLog({
        action: "AJOUT_DEPENSE",
        scope: "finance",
        targetType: "expense",
        targetLabel: newExpense.description,
        details: `${money(newExpense.amount)} — ${newExpense.category} (${newExpense.method || "Espèces"}).`
      });
      return;
    }
    if (!user) return;
    await addDoc(collection(db, "artifacts", appId, "public", "data", "expenses"), { ...newExpense });
    setNewExpense({
      description: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      category: "Logistique",
      method: "Espèces"
    });
    setIsExpenseModalOpen(false);
    notify("success", "Dépense enregistrée.");
    writeAuditLog({
      action: "AJOUT_DEPENSE",
      scope: "finance",
      targetType: "expense",
      targetLabel: newExpense.description,
      details: `${money(newExpense.amount)} — ${newExpense.category} (${newExpense.method || "Espèces"}).`
    });
  };

  const openEditExpense = (ex) => {
    setEditingExpense({
      id: ex.id,
      description: ex.description || "",
      amount: String(ex.amount ?? ""),
      date: typeof ex.date === "string" ? ex.date.slice(0, 10) : ex.date,
      category: ex.category || "Logistique",
      method: ex.method || "Espèces"
    });
  };

  const saveExpenseUpdate = async (e) => {
    e.preventDefault();
    if (!editingExpense?.description?.trim() || !editingExpense?.amount) {
      notify("error", "Description et montant requis.");
      return;
    }
    const exId = editingExpense.id;
    const patch = {
      description: editingExpense.description.trim(),
      amount: toNumber(editingExpense.amount),
      date: editingExpense.date,
      category: editingExpense.category,
      method: editingExpense.method || "Espèces"
    };
    if (managementBackendReady) {
      try {
        await callManagementApi("updateExpense", {
          expenseId: exId,
          expense: {
            description: patch.description,
            amount: patch.amount,
            date: patch.date,
            category: patch.category,
            method: patch.method
          }
        });
      } catch (error) {
        notify("error", `Mise à jour impossible. ${error?.message || ""}`.trim());
        return;
      }
      setExpenses((prev) => prev.map((ex) => (ex.id === exId ? { ...ex, ...patch } : ex)));
      setEditingExpense(null);
      notify("success", "Dépense mise à jour.");
      await writeAuditLog({
        action: "MODIFICATION_DEPENSE",
        scope: "finance",
        targetType: "expense",
        targetId: exId,
        targetLabel: patch.description,
        details: `${money(patch.amount)} — ${patch.category} (${patch.method}).`
      });
      return;
    }
    if (storageMode === "local") {
      setExpenses((prev) => prev.map((ex) => (ex.id === exId ? { ...ex, ...patch } : ex)));
      setEditingExpense(null);
      notify("success", "Dépense mise à jour.");
      writeAuditLog({
        action: "MODIFICATION_DEPENSE",
        scope: "finance",
        targetType: "expense",
        targetId: exId,
        targetLabel: patch.description,
        details: `${money(patch.amount)} — ${patch.category} (local).`
      });
      return;
    }
    if (!user) return;
    await updateDoc(doc(db, "artifacts", appId, "public", "data", "expenses", exId), patch);
    setExpenses((prev) => prev.map((ex) => (ex.id === exId ? { ...ex, ...patch } : ex)));
    setEditingExpense(null);
    notify("success", "Dépense mise à jour.");
    writeAuditLog({
      action: "MODIFICATION_DEPENSE",
      scope: "finance",
      targetType: "expense",
      targetId: exId,
      targetLabel: patch.description,
      details: `${money(patch.amount)} — ${patch.category}.`
    });
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!newDeposit.recipient?.trim() || !newDeposit.amount) {
      notify("error", "Indiquez le responsable et le montant de la remise.");
      return;
    }
    const hasTrace = !!(newDeposit.bordereauRef?.trim() || newDeposit.bordereauUrl?.trim());
    if (managementBackendReady) {
      const optimistic = {
        ...newDeposit,
        id: Date.now().toString(),
        isDeposited: hasTrace
      };
      setDeposits((prev) => [optimistic, ...prev]);
      setNewDeposit({ recipient: "", amount: "", date: new Date().toISOString().split("T")[0], bordereauRef: "", bordereauUrl: "" });
      setIsDepositModalOpen(false);
      try {
        const result = await callManagementApi("addDeposit", { deposit: optimistic });
        if (result?.id) {
          setDeposits((prev) => prev.map((d) => (d.id === optimistic.id ? { ...d, id: result.id } : d)));
        }
      } catch {
        // optimistic fallback
      }
      await writeAuditLog({
        action: "AJOUT_REMISE_COMITE",
        scope: "finance",
        targetType: "deposit",
        targetLabel: optimistic.recipient,
        details: `${money(optimistic.amount)}${optimistic.bordereauRef ? `, réf. ${optimistic.bordereauRef}` : ""}${optimistic.bordereauUrl ? `, lien pièce` : ""}.`
      });
      notify("success", "Remise enregistrée avec succès.");
      return;
    }
    if (storageMode === "local") {
      setDeposits((prev) => [...prev, { ...newDeposit, id: Date.now().toString(), isDeposited: hasTrace }]);
      setNewDeposit({ recipient: "", amount: "", date: new Date().toISOString().split("T")[0], bordereauRef: "", bordereauUrl: "" });
      setIsDepositModalOpen(false);
      notify("success", "Remise enregistrée.");
      writeAuditLog({
        action: "AJOUT_REMISE_COMITE",
        scope: "finance",
        targetType: "deposit",
        targetLabel: newDeposit.recipient,
        details: `${money(newDeposit.amount)}${newDeposit.bordereauRef ? `, réf. ${newDeposit.bordereauRef}` : ""}${newDeposit.bordereauUrl ? `, lien pièce` : ""}.`
      });
      return;
    }
    if (!user) return;
    await addDoc(collection(db, "artifacts", appId, "public", "data", "deposits"), {
      ...newDeposit,
      isDeposited: hasTrace
    });
    setNewDeposit({ recipient: "", amount: "", date: new Date().toISOString().split("T")[0], bordereauRef: "", bordereauUrl: "" });
    setIsDepositModalOpen(false);
    notify("success", "Remise enregistrée.");
    writeAuditLog({
      action: "AJOUT_REMISE_COMITE",
      scope: "finance",
      targetType: "deposit",
      targetLabel: newDeposit.recipient,
      details: `${money(newDeposit.amount)}${newDeposit.bordereauRef ? `, réf. ${newDeposit.bordereauRef}` : ""}${newDeposit.bordereauUrl ? `, lien pièce` : ""}.`
    });
  };

  const sendWhatsApp = async (member, type) => {
    if (member.commsOptIn === false) {
      notify("error", "Ce contact a refusé les messages WhatsApp (paramètre fiche fidèle).");
      return;
    }
    const cat = config.categories.find((c) => c.id === member.categoryId);
    const monthly = member.categoryId === "cat5" ? toNumber(member.customAmount) : toNumber(cat?.amount);
    const total = monthly * config.months;
    const paid = (member.payments || []).reduce((sum, p) => sum + toNumber(p.amount), 0);
    const rest = total - paid;
    const fullMonths = monthly > 0 ? Math.floor(paid / monthly) : 0;
    const role = member.churchFunction ? ` (${member.churchFunction})` : "";
    const churchUnit = member.district ? ` • Cellule/Quartier: ${member.district}` : "";
    const progressLine = `Engagement: ${money(total)} • Versé: ${money(paid)} • Reste: ${money(rest)} • Mois soldés: ${fullMonths}/${config.months}.`;
    const messages = {
      welcome:
        `Shalom Bien-aimé(e) ${member.name}${role}, merci pour votre inscription au FAG ${config.year}. ` +
        `Votre présence est une bénédiction pour l'église.${churchUnit}\n\n` +
        `"Qu'il est bon pour des frères de demeurer ensemble !" (Psaume 133:1).`,
      engagement:
        `Bien-aimé(e) ${member.name}${role}, merci d'avoir pris votre engagement FAG ${config.year}. ` +
        `Nous avançons ensemble par la foi et l'amour fraternel.\n\n` +
        `${progressLine}\n` +
        `"Accomplis tes vœux envers le Très-Haut." (Psaume 50:14).`,
      thanks:
        `Paix à vous ${member.name}${role}. Merci pour votre contribution au FAG ${config.year}. ` +
        `Chaque don fortifie l'œuvre de Dieu.\n\n` +
        `${progressLine}\n` +
        `"Dieu aime celui qui donne avec joie." (2 Cor 9:7).`,
      reminder:
        `Cher(e) ${member.name}${role}, petit rappel fraternel pour votre engagement FAG ${config.year}. ` +
        `Votre fidélité nous aide à atteindre notre objectif commun.\n\n` +
        `${progressLine}\n` +
        `"Ne nous lassons pas de faire le bien." (Galates 6:9).`,
      congrats:
        `Alléluia ${member.name}${role} ! Votre engagement FAG ${config.year} est honoré. ` +
        `Merci pour ce témoignage de foi et d'obéissance.\n\n` +
        `"Offrande de bonne odeur que Dieu accepte." (Phil 4:18).`,
      encourage:
        `Bien-aimé(e) ${member.name}${role}, merci pour vos efforts déjà visibles. ` +
        `Continuez avec foi, nous prions pour vous et avec vous.\n\n` +
        `${progressLine}\n` +
        `"Fortifiez-vous dans le Seigneur." (Éphésiens 6:10).`
    };
    const finalMessage = messages[type] || messages.thanks;
    const normalizedPhone = normalizeWhatsAppNumber(member.whatsapp);
    if (!normalizedPhone) {
      notify(
        "error",
        "Numéro WhatsApp invalide. Ex. 0757228731 ou 2250757228731 (10 chiffres ivoiriens, le 0 initial compte)."
      );
      return;
    }

    try {
      const response = await fetch(`${insforgeFunctionsBase}/send-whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: normalizedPhone,
          message: finalMessage,
          messageType: type,
          memberName: member.name
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Envoi backend indisponible");
      }
      notify("success", "Message WhatsApp envoyé avec succès.");
      writeAuditLog({
        action: "ENVOI_WHATSAPP",
        scope: "communication",
        targetType: "member",
        targetId: member.id,
        targetLabel: member.name,
        details: `Message ${type} envoyé via backend.`
      });
      return;
    } catch (error) {
      console.warn("WhatsApp backend fallback:", error?.message || error);
      window.open(`https://wa.me/${normalizedPhone}?text=${encodeURIComponent(finalMessage)}`, "_blank");
      notify("success", "WhatsApp ouvert. Validez l'envoi manuellement.");
      writeAuditLog({
        action: "ENVOI_WHATSAPP",
        scope: "communication",
        targetType: "member",
        targetId: member.id,
        targetLabel: member.name,
        details: `Fallback WhatsApp Web pour message ${type}.`
      });
    }
  };

  const filteredMembers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return members.filter((m) => {
      const cat = config.categories.find((c) => c.id === m.categoryId);
      const monthly = m.categoryId === "cat5" ? toNumber(m.customAmount) : toNumber(cat?.amount);
      const paid = (m.payments || []).reduce((sum, p) => sum + toNumber(p.amount), 0);
      const total = monthly * config.months;
      const searchOk =
        !q ||
        (m.name || "").toLowerCase().includes(q) ||
        (m.whatsapp || "").toLowerCase().includes(q) ||
        (m.district || "").toLowerCase().includes(q) ||
        (m.churchFunction || "").toLowerCase().includes(q);
      const categoryOk = memberCategoryFilter === "all" || m.categoryId === memberCategoryFilter;
      const filterOk =
        memberFilter === "all" ||
        (memberFilter === "pending" && paid < total) ||
        (memberFilter === "done" && total > 0 && paid >= total);
      return searchOk && filterOk && categoryOk;
    });
  }, [members, config.categories, config.months, searchTerm, memberFilter, memberCategoryFilter]);

  const memberFilteredStats = useMemo(() => {
    let promised = 0;
    let paid = 0;
    for (const m of filteredMembers) {
      const cat = config.categories.find((c) => c.id === m.categoryId);
      const monthly = m.categoryId === "cat5" ? toNumber(m.customAmount) : toNumber(cat?.amount);
      promised += monthly * config.months;
      paid += (m.payments || []).reduce((s, p) => s + toNumber(p.amount), 0);
    }
    const progressPct = promised > 0 ? Math.min(100, (paid / promised) * 100) : 0;
    return { promised, paid, progressPct, count: filteredMembers.length };
  }, [filteredMembers, config.categories, config.months]);

  const memberInsights = useMemo(() => {
    const pending = members.filter((m) => {
      const cat = config.categories.find((c) => c.id === m.categoryId);
      const monthly = m.categoryId === "cat5" ? toNumber(m.customAmount) : toNumber(cat?.amount);
      const total = monthly * config.months;
      const paid = (m.payments || []).reduce((sum, p) => sum + toNumber(p.amount), 0);
      return paid < total;
    }).length;
    const topContributor = [...members]
      .sort(
        (a, b) =>
          (b.payments || []).reduce((sum, p) => sum + toNumber(p.amount), 0) -
          (a.payments || []).reduce((sum, p) => sum + toNumber(p.amount), 0)
      )[0];
    return {
      pending,
      completed: Math.max(0, members.length - pending),
      topContributorName: topContributor?.name || "N/A",
      topContributorAmount: (topContributor?.payments || []).reduce((sum, p) => sum + toNumber(p.amount), 0)
    };
  }, [members, config.categories, config.months]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const byText = (e.description || "").toLowerCase().includes(expenseSearchTerm.toLowerCase());
      const byCategory = expenseCategoryFilter === "all" || e.category === expenseCategoryFilter;
      return byText && byCategory;
    });
  }, [expenses, expenseSearchTerm, expenseCategoryFilter]);

  const expenseCategories = useMemo(
    () => ["all", ...Array.from(new Set(expenses.map((e) => e.category).filter(Boolean)))],
    [expenses]
  );

  const expenseBreakdown = useMemo(() => {
    const groups = filteredExpenses.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + toNumber(item.amount);
      return acc;
    }, {});
    return Object.entries(groups).sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses]);

  const expenseMethodBreakdown = useMemo(() => {
    const groups = filteredExpenses.reduce((acc, item) => {
      const mode = item.method || "Espèces";
      acc[mode] = (acc[mode] || 0) + toNumber(item.amount);
      return acc;
    }, {});
    return Object.entries(groups).sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses]);

  const sortedFilteredExpenses = useMemo(
    () => [...filteredExpenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [filteredExpenses]
  );

  const expenseFilteredSum = useMemo(
    () => filteredExpenses.reduce((s, e) => s + toNumber(e.amount), 0),
    [filteredExpenses]
  );

  const filteredDeposits = useMemo(() => {
    const q = depositSearchTerm.trim().toLowerCase();
    return deposits.filter((d) => {
      const bySearch =
        !q ||
        (d.recipient || "").toLowerCase().includes(q) ||
        (d.bordereauRef || "").toLowerCase().includes(q) ||
        (d.bordereauUrl || "").toLowerCase().includes(q);
      const hasTrace = !!(d.bordereauRef || String(d.bordereauUrl || "").trim());
      const byFilter =
        depositFilter === "all" ||
        (depositFilter === "with_ref" && hasTrace) ||
        (depositFilter === "missing_ref" && !hasTrace);
      return bySearch && byFilter;
    });
  }, [deposits, depositSearchTerm, depositFilter]);

  const depositInsights = useMemo(() => {
    const documented = deposits.filter((d) => !!(d.bordereauRef || String(d.bordereauUrl || "").trim())).length;
    const missingRef = deposits.length - documented;
    const totalFiltered = filteredDeposits.reduce((sum, d) => sum + toNumber(d.amount), 0);
    const sumAll = deposits.reduce((s, d) => s + toNumber(d.amount), 0);
    return { withRef: documented, missingRef, totalFiltered, sumAll, countAll: deposits.length };
  }, [deposits, filteredDeposits]);

  const sortedFilteredDeposits = useMemo(
    () => [...filteredDeposits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [filteredDeposits]
  );

  const depositFilteredRefSummary = useMemo(() => {
    const n = filteredDeposits.length;
    const ok = filteredDeposits.filter((d) => !!(d.bordereauRef || String(d.bordereauUrl || "").trim())).length;
    return { n, ok, missing: n - ok };
  }, [filteredDeposits]);

  const exportMembersCsv = () => {
    const header = [
      "Nom",
      "WhatsApp",
      "Quartier",
      "Fonction",
      "Categorie",
      "Mensualite_FCFA",
      "Engagement_total_FCFA",
      "Cumul_verse_FCFA",
      "Progression_pct"
    ];
    const body = filteredMembers.map((m) => {
      const cat = config.categories.find((c) => c.id === m.categoryId);
      const monthly = m.categoryId === "cat5" ? toNumber(m.customAmount) : toNumber(cat?.amount);
      const paid = (m.payments || []).reduce((s, p) => s + toNumber(p.amount), 0);
      const total = monthly * config.months;
      const pct = total > 0 ? ((paid / total) * 100).toFixed(1) : "";
      return [m.name, m.whatsapp, m.district, m.churchFunction, cat?.label || "", monthly, total, paid, pct];
    });
    const rows = [header, ...body].map((r) => r.map(csvEscape).join(";")).join("\n");
    triggerCsvDownload(`fag-${config.year}-fideles-filtre.csv`, rows);
  };

  const exportExpensesCsv = () => {
    const header = ["Date", "Description", "Categorie", "Mode", "Montant_FCFA"];
    const body = sortedFilteredExpenses.map((e) => [e.date, e.description, e.category, e.method || "Espèces", e.amount]);
    const rows = [header, ...body].map((r) => r.map(csvEscape).join(";")).join("\n");
    triggerCsvDownload(`fag-${config.year}-depenses-filtre.csv`, rows);
  };

  const exportDepositsCsv = () => {
    const header = ["Date", "Responsable", "Montant_FCFA", "Reference", "Lien_piece"];
    const body = sortedFilteredDeposits.map((d) => [
      d.date,
      d.recipient,
      d.amount,
      d.bordereauRef || "",
      d.bordereauUrl || ""
    ]);
    const rows = [header, ...body].map((r) => r.map(csvEscape).join(";")).join("\n");
    triggerCsvDownload(`fag-${config.year}-remises-comite-filtre.csv`, rows);
  };

  const marketingMembers = useMemo(() => {
    return members
      .filter((m) => {
        const cat = config.categories.find((c) => c.id === m.categoryId);
        const monthly = m.categoryId === "cat5" ? toNumber(m.customAmount) : toNumber(cat?.amount);
        const total = monthly * config.months;
        const paid = (m.payments || []).reduce((s, p) => s + toNumber(p.amount), 0);
        const searchOk =
          (m.name || "").toLowerCase().includes(marketingSearchTerm.toLowerCase()) ||
          (m.whatsapp || "").toLowerCase().includes(marketingSearchTerm.toLowerCase());
        if (!searchOk) return false;
        if (marketingFilter === "pending") return paid < total;
        if (marketingFilter === "done") return total > 0 && paid >= total;
        return true;
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [members, config.categories, config.months, marketingFilter, marketingSearchTerm]);

  const selectedCategory = useMemo(
    () => config.categories.find((cat) => cat.id === newMember.categoryId),
    [config.categories, newMember.categoryId]
  );
  const selectedMonthlyAmount =
    newMember.categoryId === "cat5" ? toNumber(newMember.customAmount) : toNumber(selectedCategory?.amount);
  const selectedTotalAmount = selectedMonthlyAmount * config.months;

  const editingCategory = useMemo(
    () => (editingMember ? config.categories.find((cat) => cat.id === editingMember.categoryId) : null),
    [config.categories, editingMember?.categoryId]
  );
  const editingMonthlyAmount =
    editingMember?.categoryId === "cat5"
      ? toNumber(editingMember.customAmount)
      : toNumber(editingCategory?.amount);
  const editingTotalAmount = editingMonthlyAmount * config.months;
  const maxMonthlyCollected = Math.max(1, ...stats.monthlyFinance.map((item) => item.collected));
  const maxMonthlySpent = Math.max(1, ...stats.monthlyFinance.map((item) => item.spent));
  const bestCategory = stats.categories[0];
  const weakCategory = [...stats.categories]
    .filter((c) => c.target > 0)
    .sort((a, b) => a.count / (a.target || 1) - b.count / (b.target || 1))[0];
  const strategyTips = [
    stats.recoveryRate < 40
      ? `Priorité recouvrement: taux actuel ${stats.recoveryRate.toFixed(1)}%. Activer relances WhatsApp ciblées sur les membres en reliquat.`
      : `Recouvrement solide (${stats.recoveryRate.toFixed(1)}%). Maintenir les relances hebdomadaires pour sécuriser la tendance.`,
    weakCategory
      ? `Renforcer le recrutement ${weakCategory.label}: ${weakCategory.count}/${weakCategory.target} inscrits. Prévoir une campagne dédiée.`
      : "Structure de recrutement équilibrée. Conserver la stratégie actuelle par catégorie.",
    stats.cashInHand < 0
      ? "Alerte trésorerie: solde négatif. Geler les dépenses non critiques et accélérer les encaissements."
      : `Trésorerie positive (${money(stats.cashInHand)}). Planifier la prochaine remise comité avec bordereau sous 48h.`
  ];
  const monthlyTarget = toNumber(config.globalGoal) / Math.max(1, toNumber(config.months));
  const categorySheetRows = stats.categories.map((cat) => {
    const recruitRate = cat.target > 0 ? (cat.count / cat.target) * 100 : 0;
    const realizationRate = cat.promised > 0 ? (cat.collected / cat.promised) * 100 : 0;
    return {
      ...cat,
      recruitRate,
      realizationRate
    };
  });
  const cumulativeMonthlyRows = (() => {
    let cumulative = 0;
    if (stats.monthlyFinance.length === 0) {
      return Array.from({ length: config.months }).map((_, i) => {
        const date = new Date(`${config.year}-${String(i + 1).padStart(2, "0")}-01`);
        return {
          monthKey: date.toISOString().slice(0, 7),
          collected: 0,
          target: monthlyTarget,
          cumulative: 0
        };
      });
    }
    return stats.monthlyFinance.map((item) => {
      cumulative += item.collected;
      return {
        monthKey: item.monthKey,
        collected: item.collected,
        target: monthlyTarget,
        cumulative
      };
    });
  })();
  const maxCategoryCollected = Math.max(1, ...categorySheetRows.map((row) => row.collected));
  const maxCumulative = Math.max(1, ...cumulativeMonthlyRows.map((row) => row.cumulative));
  const currentRole = sessionUser?.role || "consultation";
  const accessibleTabs = ROLE_PERMISSIONS[currentRole] || ROLE_PERMISSIONS.consultation;
  const canManageUsers = currentRole === "admin";
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const byScope = auditFilter === "all" || log.scope === auditFilter;
      const haystack = `${log.actorName || ""} ${log.action || ""} ${log.targetLabel || ""} ${log.details || ""}`.toLowerCase();
      const bySearch = haystack.includes((auditSearchTerm || "").toLowerCase());
      return byScope && bySearch;
    });
  }, [auditLogs, auditFilter, auditSearchTerm]);

  const exportAuditCsv = () => {
    const lines = [
      ["date", "acteur", "role", "action", "scope", "cible_type", "cible", "details"].join(","),
      ...filteredAuditLogs.map((log) =>
        [
          `"${new Date(log.timestamp || Date.now()).toISOString()}"`,
          `"${(log.actorName || "Systeme").replace(/"/g, '""')}"`,
          `"${(log.actorRole || "").replace(/"/g, '""')}"`,
          `"${(log.action || "").replace(/"/g, '""')}"`,
          `"${(log.scope || "").replace(/"/g, '""')}"`,
          `"${(log.targetType || "").replace(/"/g, '""')}"`,
          `"${(log.targetLabel || "").replace(/"/g, '""')}"`,
          `"${(log.details || "").replace(/"/g, '""')}"`
        ].join(",")
      )
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fag-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportAuditPdf = () => {
    const rows = filteredAuditLogs
      .slice(0, 300)
      .map(
        (log) => `
          <tr>
            <td>${new Date(log.timestamp || Date.now()).toLocaleString("fr-FR")}</td>
            <td>${log.actorName || "Système"}<br/><small>${log.actorRole || ""}</small></td>
            <td>${log.action || ""}</td>
            <td>${log.targetLabel || ""}<br/><small>${log.targetType || ""}</small></td>
            <td>${log.details || ""}</td>
          </tr>`
      )
      .join("");
    const win = window.open("", "_blank", "width=1280,height=800");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Historique Audit FAG</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
            h1 { margin: 0 0 12px; font-size: 18px; }
            p { margin: 0 0 16px; font-size: 12px; color: #555; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #ddd; padding: 8px; vertical-align: top; }
            th { background: #0f172a; color: #fff; text-transform: uppercase; letter-spacing: .08em; font-size: 10px; }
            small { color: #666; }
          </style>
        </head>
        <body>
          <h1>FAG - Historique des logs d'audit</h1>
          <p>Généré le ${new Date().toLocaleString("fr-FR")} • ${filteredAuditLogs.length} éléments</p>
          <table>
            <thead>
              <tr><th>Date</th><th>Acteur</th><th>Action</th><th>Cible</th><th>Détails</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  useEffect(() => {
    if (!accessibleTabs.includes(activeTab)) {
      setActiveTab(accessibleTabs[0] || "dashboard");
    }
  }, [activeTab, accessibleTabs]);

  const removeMember = async (memberId) => {
    const member = members.find((m) => m.id === memberId);
    const label = member?.name || memberId;
    if (managementBackendReady) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      try {
        await callManagementApi("deleteMember", { memberId });
      } catch {
        // optimistic fallback
      }
      await writeAuditLog({
        action: "SUPPRESSION_FIDELE",
        scope: "finance",
        targetType: "member",
        targetId: memberId,
        targetLabel: label,
        details: "Fiche fidèle supprimée."
      });
      return;
    }
    if (storageMode === "local") {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      writeAuditLog({
        action: "SUPPRESSION_FIDELE",
        scope: "finance",
        targetType: "member",
        targetId: memberId,
        targetLabel: label,
        details: "Fiche fidèle supprimée (local)."
      });
      return;
    }
    await deleteDoc(doc(db, "artifacts", appId, "public", "data", "members", memberId));
    writeAuditLog({
      action: "SUPPRESSION_FIDELE",
      scope: "finance",
      targetType: "member",
      targetId: memberId,
      targetLabel: label,
      details: "Fiche fidèle supprimée."
    });
  };

  const removeExpense = async (expenseId) => {
    const expense = expenses.find((e) => e.id === expenseId);
    const label = expense?.description || expenseId;
    if (managementBackendReady) {
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
      try {
        await callManagementApi("deleteExpense", { expenseId });
      } catch {
        // optimistic fallback
      }
      await writeAuditLog({
        action: "SUPPRESSION_DEPENSE",
        scope: "finance",
        targetType: "expense",
        targetId: expenseId,
        targetLabel: label,
        details: "Sortie supprimée."
      });
      return;
    }
    if (storageMode === "local") {
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
      writeAuditLog({
        action: "SUPPRESSION_DEPENSE",
        scope: "finance",
        targetType: "expense",
        targetId: expenseId,
        targetLabel: label,
        details: "Sortie supprimée."
      });
      return;
    }
    await deleteDoc(doc(db, "artifacts", appId, "public", "data", "expenses", expenseId));
    writeAuditLog({
      action: "SUPPRESSION_DEPENSE",
      scope: "finance",
      targetType: "expense",
      targetId: expenseId,
      targetLabel: label,
      details: "Sortie supprimée."
    });
  };

  const removeDeposit = async (depositId) => {
    const deposit = deposits.find((d) => d.id === depositId);
    const label = deposit?.recipient || depositId;
    if (managementBackendReady) {
      setDeposits((prev) => prev.filter((d) => d.id !== depositId));
      try {
        await callManagementApi("deleteDeposit", { depositId });
      } catch {
        // optimistic fallback
      }
      await writeAuditLog({
        action: "SUPPRESSION_REMISE",
        scope: "finance",
        targetType: "deposit",
        targetId: depositId,
        targetLabel: label,
        details: "Remise supprimée."
      });
      return;
    }
    if (storageMode === "local") {
      setDeposits((prev) => prev.filter((d) => d.id !== depositId));
      writeAuditLog({
        action: "SUPPRESSION_REMISE",
        scope: "finance",
        targetType: "deposit",
        targetId: depositId,
        targetLabel: label,
        details: "Remise supprimée."
      });
      return;
    }
    await deleteDoc(doc(db, "artifacts", appId, "public", "data", "deposits", depositId));
    writeAuditLog({
      action: "SUPPRESSION_REMISE",
      scope: "finance",
      targetType: "deposit",
      targetId: depositId,
      targetLabel: label,
      details: "Remise supprimée."
    });
  };

  const tryUploadDepositFile = async (file) => {
    const base =
      import.meta.env?.VITE_INSFORGE_URL ||
      import.meta.env?.VITE_INSFORGE_BASE_URL ||
      import.meta.env?.VITE_INSFORGE_OSS_HOST;
    const ak = import.meta.env?.VITE_INSFORGE_ANON_KEY;
    if (!base || !ak) {
      return { error: "Variables VITE_INSFORGE_URL et VITE_INSFORGE_ANON_KEY requises (build) pour l’upload." };
    }
    const { createClient } = await import("@insforge/sdk");
    const insforge = createClient({ baseUrl: base, anonKey: ak });
    const { data, error } = await insforge.storage.from("fag-attachments").uploadAuto(file);
    if (error) return { error: error.message || String(error) };
    return { url: data?.url || "" };
  };

  const openDepositUrlModal = (depositId) => {
    setUrlAttachmentModal({ depositId, url: "", fileHint: "" });
  };

  const applyDepositAttachmentUrl = async (depositId, trimmed) => {
    if (managementBackendReady) {
      setDeposits((prev) =>
        prev.map((d) => (d.id === depositId ? { ...d, bordereauUrl: trimmed, isDeposited: true } : d))
      );
      try {
        await callManagementApi("updateDepositAttachment", { depositId, attachmentUrl: trimmed });
      } catch {
        // optimistic fallback
      }
      await writeAuditLog({
        action: "AJOUT_LIEN_PIECE_REMISE",
        scope: "finance",
        targetType: "deposit",
        targetId: depositId,
        targetLabel: deposits.find((d) => d.id === depositId)?.recipient || depositId,
        details: trimmed ? "Lien justificatif enregistré." : "Lien effacé."
      });
      notify("success", trimmed ? "Lien enregistré." : "Lien retiré.");
      return;
    }
    if (storageMode === "local") {
      setDeposits((prev) =>
        prev.map((d) => (d.id === depositId ? { ...d, bordereauUrl: trimmed, isDeposited: true } : d))
      );
      notify("success", trimmed ? "Lien enregistré." : "Lien retiré.");
      writeAuditLog({
        action: "AJOUT_LIEN_PIECE_REMISE",
        scope: "finance",
        targetType: "deposit",
        targetId: depositId,
        targetLabel: deposits.find((d) => d.id === depositId)?.recipient || depositId,
        details: "Lien (local)."
      });
      return;
    }
    await updateDoc(doc(db, "artifacts", appId, "public", "data", "deposits", depositId), {
      bordereauUrl: trimmed,
      isDeposited: true
    });
    setDeposits((prev) =>
      prev.map((d) => (d.id === depositId ? { ...d, bordereauUrl: trimmed, isDeposited: true } : d))
    );
    writeAuditLog({
      action: "AJOUT_LIEN_PIECE_REMISE",
      scope: "finance",
      targetType: "deposit",
      targetId: depositId,
      targetLabel: deposits.find((d) => d.id === depositId)?.recipient || depositId,
      details: "Lien justificatif."
    });
  };

  const openBordereauModal = (depositId) => {
    setBordereauFormModal({ depositId, ref: "", url: "" });
  };

  const applyDepositReceiptRef = async (depositId, ref, attachmentUrl) => {
    if (managementBackendReady) {
      setDeposits((prev) =>
        prev.map((d) =>
          d.id === depositId
            ? { ...d, bordereauRef: ref, isDeposited: true, ...(attachmentUrl ? { bordereauUrl: attachmentUrl } : {}) }
            : d
        )
      );
      try {
        await callManagementApi("updateDepositRef", { depositId, ref, attachmentUrl });
      } catch {
        // optimistic fallback
      }
      await writeAuditLog({
        action: "AJOUT_BORDEREAU",
        scope: "finance",
        targetType: "deposit",
        targetId: depositId,
        targetLabel: depositId,
        details: `Référence bordereau: ${ref}.`
      });
      return;
    }
    if (storageMode === "local") {
      setDeposits((prev) =>
        prev.map((d) =>
          d.id === depositId
            ? { ...d, bordereauRef: ref, isDeposited: true, ...(attachmentUrl ? { bordereauUrl: attachmentUrl } : {}) }
            : d
        )
      );
      writeAuditLog({
        action: "AJOUT_BORDEREAU",
        scope: "finance",
        targetType: "deposit",
        targetId: depositId,
        targetLabel: depositId,
        details: `Référence bordereau: ${ref}.`
      });
      return;
    }
    await updateDoc(doc(db, "artifacts", appId, "public", "data", "deposits", depositId), {
      bordereauRef: ref,
      isDeposited: true,
      ...(attachmentUrl ? { bordereauUrl: attachmentUrl } : {})
    });
    setDeposits((prev) =>
      prev.map((d) =>
        d.id === depositId
          ? { ...d, bordereauRef: ref, isDeposited: true, ...(attachmentUrl ? { bordereauUrl: attachmentUrl } : {}) }
          : d
      )
    );
    writeAuditLog({
      action: "AJOUT_BORDEREAU",
      scope: "finance",
      targetType: "deposit",
      targetId: depositId,
      targetLabel: depositId,
      details: `Référence bordereau: ${ref}.`
    });
  };

  const removeMemberPayment = async (memberId, paymentId) => {
    if (managementBackendReady) {
      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, payments: updated } : m)));
      setSelectedMember((prev) => ({ ...prev, payments: updated }));
      try {
        await callManagementApi("replaceMemberPayments", { memberId, payments: updated });
      } catch {
        // optimistic fallback
      }
      await writeAuditLog({
        action: "SUPPRESSION_PAIEMENT",
        scope: "finance",
        targetType: "member",
        targetId: memberId,
        targetLabel: currentMember?.name || memberId,
        details: `Paiement ${paymentId} supprimé.`
      });
      return;
    }
    const currentMember = members.find((m) => m.id === memberId) || selectedMember;
    const updated = (currentMember?.payments || []).filter((pay) => pay.id !== paymentId);
    if (storageMode === "local") {
      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, payments: updated } : m)));
      setSelectedMember((prev) => ({ ...prev, payments: updated }));
      writeAuditLog({
        action: "SUPPRESSION_PAIEMENT",
        scope: "finance",
        targetType: "member",
        targetId: memberId,
        targetLabel: currentMember?.name || memberId,
        details: `Paiement ${paymentId} supprimé.`
      });
      return;
    }
    await updateDoc(doc(db, "artifacts", appId, "public", "data", "members", memberId), { payments: updated });
    setSelectedMember((prev) => ({ ...prev, payments: updated }));
    writeAuditLog({
      action: "SUPPRESSION_PAIEMENT",
      scope: "finance",
      targetType: "member",
      targetId: memberId,
      targetLabel: currentMember?.name || memberId,
      details: `Paiement ${paymentId} supprimé.`
    });
  };

  if (!isAppAuthenticated) {
    return (
      <motion.div
        className="min-h-screen bg-slate-950 text-white"
        style={{ fontFamily: "'Montserrat', sans-serif", fontStyle: "normal", willChange: "opacity, transform" }}
        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.995 }}
        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.45, ease: "easeOut" }}
      >
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&family=Cinzel:wght@600;700;800&display=swap');`}</style>
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-10 md:px-10">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logos/logo-ad-att.png" alt="Logo AD Attécoubé" className="h-14 w-14 rounded-2xl object-cover shadow-lg" />
              <div>
                <h1 className="text-xl font-black uppercase leading-none">FAG {DEFAULT_CONFIG.year}</h1>
                <p className="mt-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-300">Festival d&apos;Action de Grâce</p>
              </div>
            </div>
            <button
              onClick={() => setShowLoginModal(true)}
              className="rounded-2xl bg-emerald-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white"
            >
              Se connecter
            </button>
          </header>

          <main className="mt-14 grid flex-1 grid-cols-1 gap-8 lg:grid-cols-12">
            <section className="relative overflow-hidden rounded-[2.5rem] border border-slate-800 bg-slate-900 p-8 shadow-2xl lg:col-span-7">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.24),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.18),transparent_35%)]" />
              <div className={`pointer-events-none absolute inset-y-0 left-0 w-1/2 border-r border-slate-700/40 bg-gradient-to-r from-slate-950 to-slate-900/40 transition-transform duration-1000 ${landingOpen ? "-translate-x-[96%]" : "translate-x-0"}`} />
              <div className={`pointer-events-none absolute inset-y-0 right-0 w-1/2 border-l border-slate-700/40 bg-gradient-to-l from-slate-950 to-slate-900/40 transition-transform duration-1000 ${landingOpen ? "translate-x-[96%]" : "translate-x-0"}`} />
              <p className="inline-flex rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-300">
                Logiciel de trésorerie FAG
              </p>
              <h2 className="mt-5 text-5xl font-black uppercase leading-tight text-white md:text-6xl" style={{ fontFamily: "'Cinzel', serif" }}>
                Bienvenue
              </h2>
              <p className="mt-3 max-w-2xl text-lg font-black uppercase tracking-wider text-emerald-300">
                Entrez dans la porte de l&apos;action de grâce.
              </p>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-relaxed text-slate-300">
                « Entrez dans ses portes avec des louanges, dans ses parvis avec des cantiques ! » (Psaume 100:4).
                Cette plateforme accompagne votre équipe pour honorer Dieu avec excellence, transparence et amour fraternel.
              </p>
              <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
                {[
                  "Suivi en temps réel des engagements",
                  "Gestion fidèle et transparente de la trésorerie",
                  "Vision claire pour le comité de pilotage",
                  "Communication WhatsApp fraternelle et biblique"
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-[11px] font-extrabold uppercase tracking-widest text-slate-200">
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Modules</p>
                  <p className="mt-2 text-xl font-black text-white">6</p>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Base de données</p>
                  <p className="mt-2 text-xl font-black text-emerald-400">Sécurisée</p>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Accès multi-postes</p>
                  <p className="mt-2 text-xl font-black text-blue-400">En ligne</p>
                </div>
              </div>
              <div className="mt-6 max-w-md">
                <CountdownCard targetDate={`${DEFAULT_CONFIG.year}-10-31T23:59:59`} />
              </div>
              <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
                {[
                  "« Dieu aime celui qui donne avec joie. » - 2 Cor 9:7",
                  "« Ne nous lassons pas de faire le bien. » - Gal 6:9"
                ].map((quote) => (
                  <div key={quote} className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[11px] font-bold text-emerald-100">
                    {quote}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[2.5rem] border border-slate-800 bg-slate-900 p-8 shadow-2xl lg:col-span-5">
              <div className="mb-4 flex items-center justify-center">
                <img src="/logos/logo-att.png" alt="Logo ATT ECOUBE" className="h-28 w-28 rounded-2xl object-cover shadow-lg" />
              </div>
              <h3 className="text-lg font-black uppercase text-white" style={{ fontFamily: "'Cinzel', serif" }}>Accès au logiciel</h3>
              <p className="mt-2 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                Authentification comité
              </p>
              <div className="mt-6 space-y-3">
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white"
                >
                  Ouvrir le formulaire de connexion
                </button>
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-300">Accès sécurisé</p>
                  <p className="mt-2 text-[11px] font-semibold leading-relaxed text-emerald-50">
                    Utilisez votre numéro de téléphone ou votre email professionnel et votre mot de passe fournis par l&apos;administrateur du comité FAG.
                  </p>
                </div>
                <p className="rounded-2xl border border-blue-700/40 bg-blue-900/20 p-4 text-[11px] font-semibold leading-relaxed text-slate-200">
                  Bienvenue dans l&apos;espace de pilotage FAG. Ici, chaque contribution est suivie avec rigueur et gratitude pour la gloire de Dieu.
                </p>
              </div>
            </section>
          </main>
        </div>

        <AnimatePresence mode="wait">
          {showLoginModal && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.22 }}
            >
              <motion.div
                className="absolute inset-0 bg-slate-950/80"
                onClick={() => setShowLoginModal(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
              <motion.form
                onSubmit={handleAppLogin}
                className="relative w-full max-w-md rounded-[2.5rem] border border-slate-700 bg-slate-900 p-8 shadow-2xl"
                style={{ willChange: "transform, opacity" }}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 24, scale: 0.96 }}
                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 240, damping: 24 }}
              >
              <button type="button" className="absolute right-6 top-6 text-slate-400" onClick={() => setShowLoginModal(false)}>
                <X />
              </button>
              <h3 className="text-2xl font-black uppercase text-white">Connexion</h3>
              <p className="mt-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Membre équipe de gestion FAG</p>
              <input
                type="text"
                required
                placeholder="Numéro de téléphone ou email"
                className="mt-5 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 font-bold text-white outline-none focus:border-emerald-500"
                value={loginData.identifier}
                onChange={(e) => setLoginData((prev) => ({ ...prev, identifier: e.target.value }))}
              />
              <input
                type="password"
                required
                placeholder="Mot de passe"
                className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 font-bold text-white outline-none focus:border-emerald-500"
                value={loginData.password}
                onChange={(e) => setLoginData((prev) => ({ ...prev, password: e.target.value }))}
              />
              <label className="mt-3 flex items-center gap-2 text-[11px] font-bold text-slate-300">
                <input
                  type="checkbox"
                  checked={loginData.remember}
                  onChange={(e) => setLoginData((prev) => ({ ...prev, remember: e.target.checked }))}
                />
                Maintenir la session
              </label>
              {loginError && <p className="mt-3 rounded-xl bg-red-500/20 p-3 text-[11px] font-bold text-red-300">{loginError}</p>}
              <button type="submit" className="mt-5 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-600 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-900/20">
                Se connecter
              </button>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-800 antialiased not-italic"
      style={{ fontFamily: "'Montserrat', sans-serif", fontStyle: "normal", willChange: "opacity, transform" }}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.35, ease: "easeOut" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&family=Cinzel:wght@600;700;800&display=swap');`}</style>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <motion.div
          className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl"
          animate={shouldReduceMotion ? { opacity: 0.2 } : { x: [0, 38, 0], y: [0, -18, 0], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-blue-300/20 blur-3xl"
          animate={shouldReduceMotion ? { opacity: 0.2 } : { x: [0, -32, 0], y: [0, 22, 0], opacity: [0.18, 0.3, 0.18] }}
          transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        />
      </div>
      <div className="min-h-screen md:flex">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <img src="/logos/logo-ad-att.png" alt="Logo AD" className="h-9 w-9 rounded-xl object-cover" />
            <div>
              <p className="text-sm font-black uppercase leading-none text-slate-900">FAG {config.year}</p>
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Trésorerie</p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700"
            aria-label="Ouvrir le menu"
          >
            <Menu size={18} />
          </button>
        </header>

        {isMobileMenuOpen && <div className="fixed inset-0 z-40 bg-slate-900/50 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex h-screen w-72 transform flex-col overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-5 text-white shadow-2xl transition-transform duration-300 md:translate-x-0 md:p-6 ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="relative mb-8 flex items-center gap-3">
            <img src="/logos/logo-att.png" alt="Logo ATT" className="h-14 w-14 rounded-2xl object-cover shadow-lg ring-1 ring-emerald-400/20" />
            <div>
              <h1 className="text-lg font-black uppercase leading-none tracking-wide">FAG {config.year}</h1>
              <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-400">Action de Grâce</p>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="ml-auto rounded-xl border border-slate-700 p-2 text-slate-300 md:hidden" aria-label="Fermer le menu">
              <X size={16} />
            </button>
          </div>
          <nav className="relative flex-1 space-y-1.5 overflow-y-auto pr-1">
            {[
              ["dashboard", "Dashboard", LayoutDashboard],
              ["members", "Fidèles", Wallet],
              ["expenses", "Dépenses", ShoppingBag],
              ["deposits", "Comité/Banque", Building2],
              ["marketing", "Communication", Megaphone],
              ["settings", "Configuration", SettingsIcon]
            ]
              .filter(([id]) => accessibleTabs.includes(id))
              .map(([id, label, Icon]) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => {
                      setActiveTab(id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl px-4 py-3 text-[11px] font-extrabold uppercase tracking-wider transition ${
                      isActive
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-900/40"
                        : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                    }`}
                  >
                    {isActive && <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-white/80" />}
                    <Icon size={16} className={isActive ? "text-white" : "text-emerald-400"} />
                    <span className="flex-1 text-left">{label}</span>
                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </button>
                );
              })}
          </nav>
          <div className="relative mt-6 overflow-hidden rounded-[2rem] border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent p-5">
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-emerald-400/20 blur-2xl" />
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-200">Caisse réelle</p>
            <p className="mt-2 text-2xl font-black text-white">{money(stats.cashInHand)}</p>
            <p className="mt-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-300/80">à sécuriser</p>
          </div>
          <div className="mt-4 border-t border-slate-800 pt-4">
            {sessionUser && (
              <p className="mb-3 rounded-xl bg-slate-800 px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-300">
                {sessionUser.fullName} • {ROLE_LABELS[sessionUser.role] || sessionUser.role}
              </p>
            )}
            <button
              onClick={handleAppLogout}
              className="w-full rounded-2xl border border-red-300 bg-red-50 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-red-700"
            >
              Déconnexion
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 md:ml-72 md:h-screen md:overflow-y-auto md:p-8 lg:p-10">
          <header className="sticky top-0 z-30 mb-6 flex flex-col gap-4 bg-gradient-to-b from-slate-50 via-slate-50/95 to-slate-50/70 pb-4 pt-1 backdrop-blur md:mb-8 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 md:text-3xl">
                  {activeTab === "dashboard" && "Cockpit de Pilotage"}
                  {activeTab === "members" && "Gestion des Fidèles"}
                  {activeTab === "expenses" && "Gestion des Dépenses"}
                  {activeTab === "deposits" && "Suivi Comité et Banque"}
                  {activeTab === "marketing" && "Communication Marketing"}
                  {activeTab === "settings" && "Configuration FAG"}
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest ${managementBackendReady ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                >
                  <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${managementBackendReady ? "bg-emerald-500" : "bg-red-500"}`} />
                  {managementBackendReady ? "Service en ligne" : "Service indisponible"}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest ${netOnline ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-800"}`}
                >
                  {netOnline ? "Réseau OK" : "Hors ligne"}
                </span>
                {config.financeLocked && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-orange-800">
                    Compta verrouillée
                  </span>
                )}
              </div>
              <p className="mt-2 border-l-4 border-emerald-500 pl-3 text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-500">
                Trésorerie synchronisée • {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
              <motion.p
                className="mt-1 text-[10px] font-semibold italic text-emerald-700/90"
                animate={shouldReduceMotion ? { opacity: 1 } : { y: [0, -2, 0], opacity: [0.85, 1, 0.85] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
              >
                “L&apos;Eternel Dieu planta un jardin en Eden...” — Genèse 2:8
              </motion.p>
              {backendError && (
                <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-red-700">
                  {backendError}
                </p>
              )}
            </div>
            {activeTab === "dashboard" && (
              <div className="hidden shrink-0 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm md:flex md:items-center md:gap-4">
                <div className="text-right">
                  <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Progression</p>
                  <p className="text-xl font-black text-emerald-600">{stats.progression.toFixed(1)}%</p>
                </div>
                <div className="h-10 w-px bg-slate-200" />
                <div className="text-right">
                  <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Fidèles</p>
                  <p className="text-xl font-black text-slate-900">{members.length}</p>
                </div>
              </div>
            )}
          </header>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Activity size={40} className="animate-spin text-emerald-500" />
              <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-400">Chargement des données FAG…</p>
            </div>
          ) : (
            <motion.section
              key={activeTab}
              initial={shouldReduceMotion ? false : "hidden"}
              animate="visible"
              variants={edenContainerVariants}
            >
              {activeTab === "dashboard" && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                    <motion.div
                      variants={edenItemVariants}
                      whileHover={shouldReduceMotion ? {} : { y: -6, scale: 1.01 }}
                      animate={shouldReduceMotion ? {} : { boxShadow: ["0 6px 24px rgba(16,185,129,0.10)", "0 12px 38px rgba(16,185,129,0.22)", "0 6px 24px rgba(16,185,129,0.10)"] }}
                      transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                      className="group relative overflow-hidden rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm transition hover:shadow-xl"
                    >
                      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-400/10 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-emerald-500/15 p-2.5 text-emerald-600"><HandCoins size={20} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Total encaissé</p>
                      </div>
                      <p className="mt-4 text-[28px] font-black leading-none text-emerald-600">{money(stats.totalCollected)}</p>
                      <p className="mt-2 text-[10px] font-extrabold uppercase tracking-widest text-emerald-500/80">
                        {stats.progression.toFixed(1)}% de l&apos;objectif
                      </p>
                    </motion.div>

                    <motion.div
                      variants={edenItemVariants}
                      whileHover={shouldReduceMotion ? {} : { y: -6, scale: 1.01 }}
                      className="group relative overflow-hidden rounded-[2rem] border border-red-100 bg-gradient-to-br from-red-50 to-white p-6 shadow-sm transition hover:shadow-xl"
                    >
                      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-red-400/10 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-red-500/15 p-2.5 text-red-600"><Receipt size={20} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Dépenses validées</p>
                      </div>
                      <p className="mt-4 text-[28px] font-black leading-none text-red-600">{money(stats.totalExpenses)}</p>
                      <p className="mt-2 text-[10px] font-extrabold uppercase tracking-widest text-red-500/80">
                        {stats.totalCollected > 0 ? ((stats.totalExpenses / stats.totalCollected) * 100).toFixed(1) : "0.0"}% du collecté
                      </p>
                    </motion.div>

                    <motion.div
                      variants={edenItemVariants}
                      whileHover={shouldReduceMotion ? {} : { y: -6, scale: 1.01 }}
                      className="group relative overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm transition hover:shadow-xl"
                    >
                      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-blue-400/10 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-blue-500/15 p-2.5 text-blue-600"><Landmark size={20} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Versements comité</p>
                      </div>
                      <p className="mt-4 text-[28px] font-black leading-none text-blue-600">{money(stats.totalHandedOver)}</p>
                      <p className="mt-2 text-[10px] font-extrabold uppercase tracking-widest text-blue-500/80">Banque & comité FAG</p>
                    </motion.div>

                    <div className="group relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-6 text-white shadow-2xl transition hover:-translate-y-1 hover:shadow-emerald-900/40">
                      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-400/20 blur-3xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-emerald-400/20 p-2.5 text-emerald-300"><PiggyBank size={20} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-200">Cash en main</p>
                      </div>
                      <p className="mt-4 text-[30px] font-black leading-none text-emerald-300">{money(stats.cashInHand)}</p>
                      <p className="mt-2 text-[10px] font-extrabold uppercase tracking-widest text-emerald-200/80">À déposer / sécuriser</p>
                    </div>

                    <div className={`group relative overflow-hidden rounded-[2rem] border p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${stats.recoveryRate >= 60 ? "border-emerald-100 bg-gradient-to-br from-emerald-50 to-white" : "border-orange-100 bg-gradient-to-br from-orange-50 to-white"}`}>
                      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl ${stats.recoveryRate >= 60 ? "bg-emerald-400/10" : "bg-orange-400/10"}`} />
                      <div className="flex items-center gap-3">
                        <div className={`rounded-2xl p-2.5 ${stats.recoveryRate >= 60 ? "bg-emerald-500/15 text-emerald-600" : "bg-orange-500/15 text-orange-600"}`}>
                          <Target size={20} />
                        </div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Taux recouvrement</p>
                      </div>
                      <p className={`mt-4 text-[28px] font-black leading-none ${stats.recoveryRate >= 60 ? "text-emerald-600" : "text-orange-600"}`}>
                        {stats.recoveryRate.toFixed(1)}%
                      </p>
                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-700 ${stats.recoveryRate >= 60 ? "bg-emerald-500" : "bg-orange-500"}`}
                          style={{ width: `${Math.min(100, stats.recoveryRate)}%` }}
                        />
                      </div>
                    </div>

                    <div className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-slate-400/10 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-slate-900/90 p-2.5 text-white"><Sparkles size={20} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Reste à mobiliser</p>
                      </div>
                      <p className="mt-4 text-[28px] font-black leading-none text-slate-900">{money(stats.remainingGoal)}</p>
                      <p className="mt-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                        {stats.monthlyGrowth >= 0 ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600"><TrendingUp size={12} /> +{stats.monthlyGrowth.toFixed(1)}% vs mois -1</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600"><TrendingDown size={12} /> {stats.monthlyGrowth.toFixed(1)}% vs mois -1</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                    <div className="min-w-0 rounded-[2.5rem] bg-white p-8 shadow-sm lg:col-span-4">
                      <h3 className="mb-6 text-[11px] font-extrabold uppercase tracking-widest text-slate-800">État d&apos;avancement instantané</h3>
                      <div className="flex justify-center">
                        <CircularProgress value={stats.progression} />
                      </div>
                      <p className="mt-6 text-center text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                        Objectif: {money(config.globalGoal)}
                      </p>
                      <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Signal du mois</p>
                        <p className={`mt-2 text-lg font-black ${stats.monthlyGrowth >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {stats.monthlyGrowth >= 0 ? "+" : ""}
                          {stats.monthlyGrowth.toFixed(1)}%
                        </p>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Variation des encaissements vs mois précédent</p>
                      </div>
                    </div>

                    <div className="min-w-0 rounded-[2.5rem] bg-white p-8 shadow-sm lg:col-span-8">
                      <h3 className="mb-6 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-slate-800">
                        <BarChart3 size={16} className="text-emerald-500" />
                        Analyse prévisionnelle
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                              <th className="pb-4">Catégorie</th>
                              <th className="pb-4 text-center">Inscrits/Cible</th>
                              <th className="pb-4 text-right">Promesses</th>
                              <th className="pb-4 text-right">Réel</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {stats.categories.map((cat) => (
                              <tr key={cat.id}>
                                <td className="py-4 font-black uppercase">{cat.label}</td>
                                <td className="py-4 text-center font-extrabold text-slate-600">
                                  {cat.count} {cat.target > 0 ? `/ ${cat.target}` : ""}
                                </td>
                                <td className="py-4 text-right font-extrabold">{money(cat.promised)}</td>
                                <td className="py-4 text-right font-black text-emerald-600">{money(cat.collected)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm">
                    <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-800">Rapprochement de caisse</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Encaissements − Dépenses − Remises comité = Caisse théorique (doit coïncider avec « Cash en main »).
                    </p>
                    <p className="mt-3 text-sm font-black text-slate-900">
                      {money(stats.totalCollected)} − {money(stats.totalExpenses)} − {money(stats.totalHandedOver)} ={" "}
                      <span className="text-emerald-600">{money(stats.cashInHand)}</span>
                    </p>
                    <p className="mt-2 text-[10px] font-extrabold uppercase tracking-widest text-emerald-600">
                      Contrôle interne : écart 0 F CFA si toutes les opérations sont saisies.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                    <div className="min-w-0 rounded-[2.5rem] bg-white p-8 shadow-sm lg:col-span-8">
                      <h3 className="mb-5 text-[11px] font-extrabold uppercase tracking-widest text-slate-800">
                        Courbe de performance mensuelle (encaissements vs dépenses)
                      </h3>
                      {stats.monthlyFinance.length === 0 ? (
                        <p className="rounded-2xl border border-slate-100 bg-slate-50 p-6 text-center text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                          Pas encore de données mensuelles
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {stats.monthlyFinance.map((row) => (
                            <div key={row.monthKey} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                              <div className="mb-2 flex items-center justify-between">
                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">{row.monthKey}</span>
                                <span className={`text-[10px] font-extrabold uppercase tracking-widest ${row.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                  Net {money(row.net)}
                                </span>
                              </div>
                              <div className="space-y-2">
                                <div>
                                  <div className="mb-1 flex justify-between text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                                    <span>Encaissements</span>
                                    <span>{money(row.collected)}</span>
                                  </div>
                                  <div className="h-2 rounded-full bg-slate-200">
                                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${(row.collected / maxMonthlyCollected) * 100}%` }} />
                                  </div>
                                </div>
                                <div>
                                  <div className="mb-1 flex justify-between text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                                    <span>Dépenses</span>
                                    <span>{money(row.spent)}</span>
                                  </div>
                                  <div className="h-2 rounded-full bg-slate-200">
                                    <div className="h-2 rounded-full bg-red-500" style={{ width: `${(row.spent / maxMonthlySpent) * 100}%` }} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 rounded-[2.5rem] bg-white p-8 shadow-sm lg:col-span-4">
                      <h3 className="mb-5 text-[11px] font-extrabold uppercase tracking-widest text-slate-800">Diagramme des canaux de paiement</h3>
                      <div className="space-y-4">
                        {Object.entries(stats.methodBreakdown).map(([method, amount]) => {
                          const total = Math.max(1, stats.totalCollected);
                          const percent = (amount / total) * 100;
                          return (
                            <div key={method}>
                              <div className="mb-1 flex justify-between text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                                <span>{method}</span>
                                <span>
                                  {percent.toFixed(1)}% • {money(amount)}
                                </span>
                              </div>
                              <div className="h-2 rounded-full bg-slate-200">
                                <div
                                  className={`h-2 rounded-full ${method === "Espèces" ? "bg-slate-900" : method === "Mobile Money" ? "bg-emerald-500" : "bg-blue-500"}`}
                                  style={{ width: `${Math.max(3, percent)}%` }}
                                />
      </div>
    </div>
                          );
                        })}
                      </div>
                      <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Ticket moyen</p>
                        <p className="mt-1 text-xl font-black text-slate-900">{money(stats.averageContribution)}</p>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Montant moyen encaissé par membre</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                    <div className="min-w-0 rounded-[2.5rem] bg-white p-8 shadow-sm lg:col-span-8">
                      <h3 className="mb-5 text-[11px] font-extrabold uppercase tracking-widest text-slate-800">Santé des mensualités (M1 à M6)</h3>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                        {stats.monthlyGlobalProgress.map((count, i) => (
                          <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">M{i + 1}</p>
                            <p className="mt-2 text-2xl font-black text-slate-900">{count}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="min-w-0 rounded-[2.5rem] bg-slate-900 p-8 text-white shadow-xl lg:col-span-4">
                      <h3 className="mb-5 text-[11px] font-extrabold uppercase tracking-widest text-emerald-300">Conseils stratégiques</h3>
                      <div className="space-y-4">
                        {strategyTips.map((tip, i) => (
                          <div key={i} className="rounded-2xl bg-slate-800 p-4">
                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-300">Action {i + 1}</p>
                            <p className="mt-2 text-xs font-bold leading-relaxed text-slate-100">{tip}</p>
                          </div>
                        ))}
                      </div>
                      {bestCategory && (
                        <div className="mt-4 rounded-2xl bg-emerald-500/20 p-4">
                          <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-300">Catégorie leader</p>
                          <p className="mt-1 text-sm font-black uppercase text-white">{bestCategory.label}</p>
                          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-300">{money(bestCategory.collected)} encaissés</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6 rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                    <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between">
                      <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-900">
                        Suivi type sheet - synthèse opérationnelle
                      </h3>
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                        Collecte • Engagement • Cible mensuelle • Cumul
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                      <div className="min-w-0 overflow-x-auto rounded-3xl border border-slate-100 lg:col-span-8">
                        <table className="w-full min-w-[760px] text-left">
                          <thead className="bg-slate-900 text-[10px] font-extrabold uppercase tracking-widest text-white">
                            <tr>
                              <th className="px-4 py-3">Catégorie</th>
                              <th className="px-4 py-3 text-center">Inscrits</th>
                              <th className="px-4 py-3 text-center">Cible</th>
                              <th className="px-4 py-3 text-center">Tx recr.</th>
                              <th className="px-4 py-3 text-right">Engagement</th>
                              <th className="px-4 py-3 text-right">Collecté</th>
                              <th className="px-4 py-3 text-center">% réalisé</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-[11px] font-bold uppercase">
                            {categorySheetRows.map((row) => (
                              <tr key={row.id} className="hover:bg-slate-50/80">
                                <td className="px-4 py-3 font-black">{row.label}</td>
                                <td className="px-4 py-3 text-center">{row.count}</td>
                                <td className="px-4 py-3 text-center">{row.target > 0 ? row.target : "--"}</td>
                                <td className="px-4 py-3 text-center text-blue-600">{row.recruitRate.toFixed(1)}%</td>
                                <td className="px-4 py-3 text-right">{money(row.promised)}</td>
                                <td className="px-4 py-3 text-right text-emerald-600">{money(row.collected)}</td>
                                <td className="px-4 py-3 text-center">{row.realizationRate.toFixed(1)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="min-w-0 rounded-3xl border border-slate-100 bg-slate-50 p-4 lg:col-span-4">
                        <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                          Engagement vs collecté par catégorie
                        </h4>
                        <div className="mt-3 space-y-3">
                          {categorySheetRows.map((row) => (
                            <div key={`bar-${row.id}`}>
                              <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">{row.label}</p>
                              <div className="h-2 rounded-full bg-slate-200">
                                <div className="h-2 rounded-full bg-slate-500" style={{ width: `${(row.promised / maxCategoryCollected) * 100}%` }} />
                              </div>
                              <div className="mt-1 h-2 rounded-full bg-slate-200">
                                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${(row.collected / maxCategoryCollected) * 100}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                      <div className="min-w-0 overflow-x-auto rounded-3xl border border-slate-100 lg:col-span-6">
                        <table className="w-full min-w-[520px] text-left">
                          <thead className="bg-slate-900 text-[10px] font-extrabold uppercase tracking-widest text-white">
                            <tr>
                              <th className="px-4 py-3">Mois</th>
                              <th className="px-4 py-3 text-right">Collecté</th>
                              <th className="px-4 py-3 text-right">Cible</th>
                              <th className="px-4 py-3 text-right">Cumul</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-[11px] font-bold uppercase">
                            {cumulativeMonthlyRows.map((row) => (
                              <tr key={`month-${row.monthKey}`} className="hover:bg-slate-50/80">
                                <td className="px-4 py-3">{row.monthKey}</td>
                                <td className="px-4 py-3 text-right text-emerald-600">{money(row.collected)}</td>
                                <td className="px-4 py-3 text-right">{money(row.target)}</td>
                                <td className="px-4 py-3 text-right text-blue-600">{money(row.cumulative)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="min-w-0 rounded-3xl border border-slate-100 bg-slate-50 p-4 lg:col-span-6">
                        <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                          Courbe cumulative de collecte
                        </h4>
                        <div className="mt-4 flex h-48 items-end gap-2 rounded-2xl border border-slate-200 bg-white p-3">
                          {cumulativeMonthlyRows.map((row) => (
                            <div key={`cum-${row.monthKey}`} className="flex flex-1 flex-col items-center justify-end gap-2">
                              <div
                                className="w-full rounded-t-md bg-emerald-500/80"
                                style={{ height: `${Math.max(6, (row.cumulative / maxCumulative) * 150)}px` }}
                                title={`${row.monthKey}: ${money(row.cumulative)}`}
                              />
                              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500">
                                {row.monthKey.slice(5)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "members" && (
                <div className="space-y-6">
                  <div className="rounded-[2rem] border border-emerald-100 bg-gradient-to-r from-emerald-50/80 via-white to-slate-50 p-5 shadow-sm md:p-6">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">Module fidèles</h2>
                        <p className="mt-1 max-w-2xl text-[11px] font-bold leading-relaxed text-slate-600">
                          Gérez les inscriptions, les engagements par catégorie et les encaissements. La recherche porte sur le nom, le WhatsApp,
                          le quartier et la fonction.
                        </p>
                      </div>
                      <div className="rounded-xl bg-white/90 px-3 py-2 text-center shadow-sm md:text-left">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Vue filtrée</p>
                        <p className="mt-1 text-lg font-black text-emerald-700">
                          {memberFilteredStats.count} / {members.length}
                        </p>
                      </div>
                    </div>
                    {memberFilteredStats.count > 0 && (
                      <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4">
                        <div className="flex flex-col gap-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 md:flex-row md:items-center md:justify-between">
                          <span>
                            Engagement (filtre): <span className="text-slate-900">{money(memberFilteredStats.promised)}</span>
                          </span>
                          <span>
                            Versé (filtre): <span className="text-emerald-600">{money(memberFilteredStats.paid)}</span>
                          </span>
                          <span>
                            Taux sur la sélection: <span className="text-blue-600">{memberFilteredStats.progressPct.toFixed(1)}%</span>
                          </span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-500"
                            style={{ width: `${memberFilteredStats.progressPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                      <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-slate-900/5 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-slate-900 p-2.5 text-white"><Users size={18} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Fidèles enregistrés</p>
                      </div>
                      <p className="mt-3 text-3xl font-black text-slate-900">{members.length}</p>
                    </div>
                    <div className="group relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                      <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-emerald-400/10 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-emerald-500/15 p-2.5 text-emerald-600"><CheckCircle size={18} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Engagements soldés</p>
                      </div>
                      <p className="mt-3 text-3xl font-black text-emerald-600">{memberInsights.completed}</p>
                    </div>
                    <div className="group relative overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                      <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-orange-400/10 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-orange-500/15 p-2.5 text-orange-600"><Clock size={18} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Reliquats actifs</p>
                      </div>
                      <p className="mt-3 text-3xl font-black text-orange-600">{memberInsights.pending}</p>
                    </div>
                    <div className="group relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                      <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-blue-400/10 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-blue-500/15 p-2.5 text-blue-600"><Sparkles size={18} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Meilleur contributeur</p>
                      </div>
                      <p className="mt-3 text-base font-black uppercase text-slate-900">{memberInsights.topContributorName}</p>
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600">{money(memberInsights.topContributorAmount)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex w-full flex-col gap-3 lg:max-w-3xl lg:flex-row">
                      <div className="relative w-full">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input
                          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 font-semibold outline-none focus:border-emerald-500"
                          placeholder="Nom, WhatsApp, quartier, fonction…"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <select
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] font-extrabold uppercase tracking-widest text-slate-600 outline-none focus:border-emerald-500"
                        value={memberCategoryFilter}
                        onChange={(e) => setMemberCategoryFilter(e.target.value)}
                      >
                        <option value="all">Toutes catégories</option>
                        {config.categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ["all", "Tous"],
                        ["pending", "Reliquats"],
                        ["done", "Soldés"]
                      ].map(([id, label]) => (
                        <button
                          key={id}
                          onClick={() => setMemberFilter(id)}
                          className={`rounded-xl px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest ${
                            memberFilter === id ? "bg-slate-900 text-white" : "bg-white text-slate-600"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm("");
                          setMemberFilter("all");
                          setMemberCategoryFilter("all");
                        }}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 hover:bg-slate-50"
                      >
                        Réinitialiser filtres
                      </button>
                      <button
                        type="button"
                        onClick={exportMembersCsv}
                        className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-emerald-800 hover:bg-emerald-100"
                      >
                        <Download size={16} />
                        Export Excel (CSV)
                      </button>
                      <button
                        onClick={() => setIsMemberModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white"
                      >
                        <Plus size={16} /> Nouveau fidèle
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-[2.5rem] bg-white shadow-sm">
                    <table className="w-full min-w-[1180px]">
                      <thead className="bg-slate-900 text-[10px] font-extrabold uppercase tracking-widest text-white">
                        <tr>
                          <th className="px-6 py-4 text-left">Fidèle</th>
                          <th className="px-6 py-4 text-left">Contact & identité</th>
                          <th className="px-6 py-4 text-center">Mois soldés</th>
                          <th className="px-6 py-4 text-right">Cumul versé</th>
                          <th className="px-6 py-4 text-center">Progression</th>
                          <th className="px-6 py-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredMembers.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-6 py-16 text-center">
                              <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                                Aucun fidèle ne correspond aux filtres. Élargissez la recherche ou réinitialisez.
                              </p>
                            </td>
                          </tr>
                        )}
                        {filteredMembers.map((m) => {
                          const cat = config.categories.find((c) => c.id === m.categoryId);
                          const monthly = m.categoryId === "cat5" ? toNumber(m.customAmount) : toNumber(cat?.amount);
                          const paid = (m.payments || []).reduce((sum, p) => sum + toNumber(p.amount), 0);
                          const totalCommit = monthly * config.months;
                          const progressRow = totalCommit > 0 ? Math.min(100, (paid / totalCommit) * 100) : 0;
                          const isSettled = totalCommit > 0 && paid >= totalCommit;
                          const fullMonths = monthly > 0 ? Math.floor(paid / monthly) : 0;
                          const credit = monthly > 0 ? paid % monthly : 0;
                          return (
                            <tr
                              key={m.id}
                              className={`hover:bg-slate-50/70 ${isSettled ? "border-l-4 border-l-emerald-400 bg-emerald-50/40" : ""} ${!isSettled && totalCommit > 0 ? "border-l-4 border-l-orange-300" : ""}`}
                            >
                              <td className="px-6 py-4">
                                <p className="font-black uppercase">{m.name}</p>
                                <p className="mt-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                                  {cat?.label || "Inconnu"} {credit > 0 ? `• Crédit: ${money(credit)}` : ""}
                                </p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-700">
                                  {m.churchFunction || "Membre"}
                                </p>
                                <p className="mt-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-600">{m.whatsapp || "N/A"}</p>
                                <p className="mt-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{m.district || "Cellule non renseignée"}</p>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex justify-center gap-1">
                                  {Array.from({ length: config.months }).map((_, i) => (
                                    <div
                                      key={i}
                                      className={`flex h-8 w-8 items-center justify-center rounded-lg border text-[10px] font-black ${
                                        i < fullMonths
                                          ? "border-emerald-500 bg-emerald-500 text-white"
                                          : "border-slate-100 bg-white text-slate-300"
                                      }`}
                                    >
                                      {i < fullMonths ? <CheckCircle size={14} /> : i + 1}
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right text-sm font-black">{money(paid)}</td>
                              <td className="px-6 py-4">
                                <div className="mx-auto max-w-[140px]">
                                  <div className="flex items-center justify-between text-[9px] font-extrabold uppercase tracking-widest text-slate-500">
                                    <span>{progressRow.toFixed(0)}%</span>
                                    <span className="text-slate-400">/ {money(totalCommit)}</span>
                                  </div>
                                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                      className={`h-full rounded-full ${isSettled ? "bg-emerald-500" : "bg-orange-400"}`}
                                      style={{ width: `${progressRow}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex flex-wrap items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    title="Modifier la fiche"
                                    onClick={() => openEditMemberModal(m)}
                                    className="inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-blue-700 hover:bg-blue-100"
                                  >
                                    <Pencil size={14} />
                                    <span className="hidden sm:inline">Modifier</span>
                                  </button>
                                  <button
                                    type="button"
                                    title="Enregistrer un paiement"
                                    onClick={() => {
                                      setSelectedMember(m);
                                      setIsPaymentModalOpen(true);
                                    }}
                                    className="rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-white"
                                  >
                                    Encaisser
                                  </button>
                                  <button
                                    type="button"
                                    title="Historique des versements"
                                    onClick={() => {
                                      setSelectedMember(m);
                                      setIsHistoryModalOpen(true);
                                    }}
                                    className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50"
                                  >
                                    <Clock size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    title="Supprimer ce fidèle"
                                    onClick={async () => {
                                      if (!(await askConfirm("Supprimer définitivement ce fidèle et son historique de versements ?"))) return;
                                      await removeMember(m.id);
                                    }}
                                    className="rounded-xl border border-red-100 bg-red-50 p-2 text-red-600 hover:bg-red-100"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "expenses" && (
                <div className="space-y-6">
                  <div className="rounded-[2rem] border border-red-100 bg-gradient-to-r from-red-50/80 via-white to-slate-50 p-5 shadow-sm md:p-6">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">Module dépenses</h2>
                        <p className="mt-1 max-w-2xl text-[11px] font-bold leading-relaxed text-slate-600">
                          Sorties de caisse validées : suivi par poste budgétaire et par mode de règlement. Le tableau est trié par date (plus récent en premier).
                        </p>
                      </div>
                      <div className="rounded-xl bg-white/90 px-3 py-2 text-center shadow-sm md:text-left">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Lignes filtrées</p>
                        <p className="mt-1 text-lg font-black text-red-700">
                          {filteredExpenses.length} / {expenses.length}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-4 text-[10px] font-extrabold uppercase tracking-widest text-slate-600 md:flex-row md:items-center md:justify-between">
                      <span>
                        Part des dépenses filtrées vs collecté total :{" "}
                        <span className="text-slate-900">
                          {stats.totalCollected > 0 ? ((expenseFilteredSum / stats.totalCollected) * 100).toFixed(1) : "0.0"}%
                        </span>
                      </span>
                      <span className="text-slate-400">Collecté à ce jour : {money(stats.totalCollected)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="group relative overflow-hidden rounded-3xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                      <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-red-400/10 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-red-500/15 p-2.5 text-red-600"><Receipt size={18} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Total dépenses</p>
                      </div>
                      <p className="mt-3 text-3xl font-black text-red-600">{money(stats.totalExpenses)}</p>
                      <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">Historique complet</p>
                    </div>
                    <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                      <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-slate-900/5 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-slate-900 p-2.5 text-white"><BarChart3 size={18} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Montant filtré</p>
                      </div>
                      <p className="mt-3 text-3xl font-black text-slate-900">{money(expenseFilteredSum)}</p>
                    </div>
                    <div className="group relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                      <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-blue-400/10 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-blue-500/15 p-2.5 text-blue-600"><Activity size={18} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Opérations</p>
                      </div>
                      <p className="mt-3 text-3xl font-black text-slate-900">{filteredExpenses.length}</p>
                    </div>
                    <div className="group relative overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                      <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-orange-400/10 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-orange-500/15 p-2.5 text-orange-600"><Coins size={18} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Ticket moyen (filtre)</p>
                      </div>
                      <p className="mt-3 text-3xl font-black text-slate-900">
                        {money(filteredExpenses.length > 0 ? expenseFilteredSum / filteredExpenses.length : 0)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-[2.5rem] bg-white p-6 shadow-sm">
                    <div className="flex w-full flex-col gap-3 lg:max-w-3xl lg:flex-row">
                      <div className="relative w-full">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input
                          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 font-semibold outline-none focus:border-red-500"
                          placeholder="Rechercher dans la description…"
                          value={expenseSearchTerm}
                          onChange={(e) => setExpenseSearchTerm(e.target.value)}
                        />
                      </div>
                      <select
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] font-extrabold uppercase tracking-widest text-slate-600 outline-none focus:border-red-500"
                        value={expenseCategoryFilter}
                        onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                      >
                        {expenseCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat === "all" ? "Toutes catégories" : cat}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setExpenseSearchTerm("");
                          setExpenseCategoryFilter("all");
                        }}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 hover:bg-slate-50"
                      >
                        Réinitialiser
                      </button>
                      <button
                        type="button"
                        onClick={exportExpensesCsv}
                        className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-red-800 hover:bg-red-100"
                      >
                        <Download size={16} />
                        Export Excel (CSV)
                      </button>
                      <button
                        onClick={() => setIsExpenseModalOpen(true)}
                        className="rounded-2xl bg-red-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-md shadow-red-900/10"
                      >
                        Nouvelle sortie
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    <div className="overflow-x-auto rounded-[2.5rem] bg-white shadow-sm lg:col-span-8">
                    <table className="w-full min-w-[860px]">
                      <thead className="bg-slate-900 text-[10px] font-extrabold uppercase tracking-widest text-white">
                        <tr>
                          <th className="px-6 py-4 text-left">Date</th>
                          <th className="px-6 py-4 text-left">Description</th>
                          <th className="px-6 py-4 text-left">Catégorie</th>
                          <th className="px-6 py-4 text-left">Mode</th>
                          <th className="px-6 py-4 text-right">Montant</th>
                          <th className="px-6 py-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sortedFilteredExpenses.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-6 py-16 text-center text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                              Aucune dépense ne correspond aux critères.
                            </td>
                          </tr>
                        )}
                        {sortedFilteredExpenses.map((e) => (
                          <tr key={e.id} className="transition-colors hover:bg-red-50/40">
                            <td className="whitespace-nowrap px-6 py-4 font-bold text-slate-500">{new Date(e.date).toLocaleDateString("fr-FR")}</td>
                            <td className="px-6 py-4 font-black uppercase">{e.description}</td>
                            <td className="px-6 py-4">
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-600">
                                {e.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-slate-600">{e.method || "Espèces"}</td>
                            <td className="px-6 py-4 text-right font-black text-red-600">{money(e.amount)}</td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex flex-wrap items-center justify-center gap-2">
                                <button
                                  type="button"
                                  title="Modifier"
                                  onClick={() => openEditExpense(e)}
                                  className="rounded-xl border border-blue-200 bg-blue-50 p-2 text-blue-700 hover:bg-blue-100"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  title="Supprimer"
                                  onClick={async () => {
                                    if (!(await askConfirm("Supprimer cette dépense ?"))) return;
                                    await removeExpense(e.id);
                                  }}
                                  className="rounded-xl border border-red-100 bg-red-50/80 p-2 text-red-600 hover:bg-red-100"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                    <div className="space-y-4 lg:col-span-4">
                      <div className="rounded-[2.5rem] bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-[11px] font-extrabold uppercase tracking-widest text-slate-800">Par catégorie</h3>
                        {expenseBreakdown.length === 0 ? (
                          <p className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-center text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                            Aucune donnée filtrée
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {expenseBreakdown.map(([category, amount]) => {
                              const totalFiltered = Math.max(1, expenseFilteredSum);
                              const percent = (amount / totalFiltered) * 100;
                              return (
                                <div key={category}>
                                  <div className="mb-1 flex justify-between text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                                    <span>{category}</span>
                                    <span>
                                      {percent.toFixed(1)}% • {money(amount)}
                                    </span>
                                  </div>
                                  <div className="h-2 rounded-full bg-slate-200">
                                    <div className="h-2 rounded-full bg-red-500" style={{ width: `${Math.max(4, percent)}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="rounded-[2.5rem] bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-[11px] font-extrabold uppercase tracking-widest text-slate-800">Par mode de paiement</h3>
                        {expenseMethodBreakdown.length === 0 ? (
                          <p className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-center text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                            Aucune donnée filtrée
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {expenseMethodBreakdown.map(([mode, amount]) => {
                              const totalFiltered = Math.max(1, expenseFilteredSum);
                              const percent = (amount / totalFiltered) * 100;
                              return (
                                <div key={mode}>
                                  <div className="mb-1 flex justify-between text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                                    <span>{mode}</span>
                                    <span>
                                      {percent.toFixed(1)}% • {money(amount)}
                                    </span>
                                  </div>
                                  <div className="h-2 rounded-full bg-slate-200">
                                    <div className="h-2 rounded-full bg-blue-500" style={{ width: `${Math.max(4, percent)}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "deposits" && (
                <div className="space-y-6">
                  <div className="rounded-[2rem] border border-blue-100 bg-gradient-to-r from-blue-50/80 via-white to-slate-50 p-5 shadow-sm md:p-6">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">Module comité &amp; banque</h2>
                        <p className="mt-1 max-w-2xl text-[11px] font-bold leading-relaxed text-slate-600">
                          Historique des décharges de caisse vers le comité : traçabilité par responsable, montant et référence de bordereau. Les lignes
                          sans référence sont mises en évidence pour complétion rapide.
                        </p>
                      </div>
                      <div className="rounded-xl bg-white/90 px-3 py-2 text-center shadow-sm md:text-left">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Vue filtrée</p>
                        <p className="mt-1 text-lg font-black text-blue-700">
                          {depositFilteredRefSummary.n} / {deposits.length}
                        </p>
                        <p className="mt-1 text-[9px] font-extrabold uppercase tracking-widest text-emerald-600">
                          OK bordereau : {depositFilteredRefSummary.ok}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-[10px] font-extrabold uppercase tracking-widest text-slate-600 md:grid-cols-2">
                      <p>
                        Cumul toutes remises : <span className="text-slate-900">{money(depositInsights.sumAll)}</span>
                        <span className="ml-2 text-slate-400">({depositInsights.countAll} décharge{depositInsights.countAll !== 1 ? "s" : ""})</span>
                      </p>
                      <p>
                        Sélection affichée : <span className="text-blue-600">{money(depositInsights.totalFiltered)}</span>
                        {depositFilteredRefSummary.missing > 0 && (
                          <span className="ml-2 text-red-600">• {depositFilteredRefSummary.missing} sans réf.</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-5 text-white shadow-xl transition hover:-translate-y-1">
                      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-400/20 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-emerald-400/20 p-2.5 text-emerald-300"><PiggyBank size={18} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-200">Caisse à remettre</p>
                      </div>
                      <p className="mt-3 text-3xl font-black text-emerald-300">{money(stats.cashInHand)}</p>
                      <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-emerald-200/80">Après collectes et dépenses</p>
                    </div>
                    <div className="group relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                      <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-emerald-400/10 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-emerald-500/15 p-2.5 text-emerald-600"><CheckCircle size={18} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Décharges documentées</p>
                      </div>
                      <p className="mt-3 text-3xl font-black text-emerald-600">{depositInsights.withRef}</p>
                      <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">Réf. ou lien pièce (total)</p>
                    </div>
                    <div className="group relative overflow-hidden rounded-3xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                      <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-red-400/10 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-red-500/15 p-2.5 text-red-600"><BellRing size={18} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">À compléter</p>
                      </div>
                      <p className="mt-3 text-3xl font-black text-red-600">{depositInsights.missingRef}</p>
                      <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">Sans référence (total)</p>
                    </div>
                    <div className="group relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                      <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-blue-400/10 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-blue-500/15 p-2.5 text-blue-600"><Landmark size={18} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Montant sélection</p>
                      </div>
                      <p className="mt-3 text-3xl font-black text-blue-600">{money(depositInsights.totalFiltered)}</p>
                      <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">Selon filtres actifs</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-[2.5rem] bg-white p-6 shadow-sm">
                    <div className="flex w-full flex-col gap-3 lg:max-w-3xl lg:flex-row">
                      <div className="relative w-full">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input
                          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 font-semibold outline-none focus:border-blue-500"
                          placeholder="Responsable ou référence…"
                          value={depositSearchTerm}
                          onChange={(e) => setDepositSearchTerm(e.target.value)}
                        />
                      </div>
                      <select
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] font-extrabold uppercase tracking-widest text-slate-600 outline-none focus:border-blue-500"
                        value={depositFilter}
                        onChange={(e) => setDepositFilter(e.target.value)}
                      >
                        <option value="all">Toutes les remises</option>
                        <option value="with_ref">Avec traçabilité (réf. ou lien)</option>
                        <option value="missing_ref">Sans traçabilité</option>
                      </select>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDepositSearchTerm("");
                          setDepositFilter("all");
                        }}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 hover:bg-slate-50"
                      >
                        Réinitialiser
                      </button>
                      <button
                        type="button"
                        onClick={exportDepositsCsv}
                        className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-blue-800 hover:bg-blue-100"
                      >
                        <Download size={16} />
                        Export Excel (CSV)
                      </button>
                      <button
                        onClick={() => setIsDepositModalOpen(true)}
                        className="rounded-2xl bg-blue-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-md shadow-blue-900/10"
                      >
                        Décharge comité
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto rounded-[2.5rem] bg-white shadow-sm">
                    <table className="w-full min-w-[1180px]">
                      <thead className="bg-slate-900 text-[10px] font-extrabold uppercase tracking-widest text-white">
                        <tr>
                          <th className="px-6 py-4 text-left">Date</th>
                          <th className="px-6 py-4 text-left">Responsable</th>
                          <th className="px-6 py-4 text-right">Montant</th>
                          <th className="px-6 py-4 text-center">Statut</th>
                          <th className="px-6 py-4 text-center">Réf. bordereau</th>
                          <th className="px-6 py-4 text-center">Pièce jointe</th>
                          <th className="px-6 py-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sortedFilteredDeposits.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-6 py-16 text-center text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                              Aucune décharge ne correspond aux filtres.
                            </td>
                          </tr>
                        )}
                        {sortedFilteredDeposits.map((d) => {
                          const hasTrace = !!(d.bordereauRef || String(d.bordereauUrl || "").trim());
                          return (
                            <tr
                              key={d.id}
                              className={`transition-colors hover:bg-blue-50/50 ${hasTrace ? "" : "bg-red-50/35"}`}
                            >
                              <td className="whitespace-nowrap px-6 py-4 font-bold text-slate-500">{new Date(d.date).toLocaleDateString("fr-FR")}</td>
                              <td className="px-6 py-4 font-black uppercase">{d.recipient}</td>
                              <td className="px-6 py-4 text-right font-black text-blue-600">{money(d.amount)}</td>
                              <td className="px-6 py-4 text-center">
                                {hasTrace ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-800">
                                    <CheckCircle size={12} /> Traçable
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-amber-800">
                                    En attente
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-center">
                                {d.bordereauRef ? (
                                  <span className="rounded-full bg-blue-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-blue-700">
                                    {d.bordereauRef}
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => openBordereauModal(d.id)}
                                    className="rounded-full bg-red-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-red-700 ring-1 ring-red-200"
                                  >
                                    Saisir réf.
                                  </button>
                                )}
                              </td>
                              <td className="max-w-[200px] px-6 py-4 text-center">
                                {d.bordereauUrl ? (
                                  <a
                                    href={d.bordereauUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-blue-600 underline hover:text-blue-800"
                                  >
                                    <ExternalLink size={12} /> Ouvrir
                                  </a>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => openDepositUrlModal(d.id)}
                                    className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-600 hover:bg-slate-200"
                                  >
                                    Ajouter lien
                                  </button>
                                )}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <button
                                  type="button"
                                  title="Supprimer"
                                  onClick={async () => {
                                    if (!(await askConfirm("Supprimer cette décharge ?"))) return;
                                    await removeDeposit(d.id);
                                  }}
                                  className="rounded-xl border border-red-100 bg-red-50/80 p-2 text-red-600 hover:bg-red-100"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "marketing" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-3xl bg-white p-5 shadow-sm">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Contacts ciblés</p>
                      <p className="mt-2 text-2xl font-black text-slate-900">{marketingMembers.length}</p>
                    </div>
                    <div className="rounded-3xl bg-white p-5 shadow-sm">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Filtre actif</p>
                      <p className="mt-2 text-sm font-black uppercase text-emerald-600">
                        {marketingFilter === "all" ? "Tous les fidèles" : marketingFilter === "pending" ? "Reliquats" : "Soldés"}
                      </p>
                    </div>
                    <div className="rounded-3xl bg-white p-5 shadow-sm">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Objectif relationnel</p>
                      <p className="mt-2 text-sm font-black uppercase text-slate-800">Écoute, amour, fidélité</p>
                    </div>
                  </div>

                  <div className="rounded-[2.5rem] bg-white p-6 shadow-sm">
                    <div className="relative w-full lg:max-w-xl">
                      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input
                        className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 font-semibold outline-none focus:border-emerald-500"
                        placeholder="Rechercher un contact (nom/WhatsApp)"
                        value={marketingSearchTerm}
                        onChange={(e) => setMarketingSearchTerm(e.target.value)}
                      />
                    </div>
                    <p className="mt-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                      Conseil: alterner inscription puis engagement puis merci puis rappel pour un suivi fraternel complet.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {[
                      ["all", "Tous", Megaphone],
                      ["pending", "Reliquats", BellRing],
                      ["done", "Soldés", CheckCircle]
                    ].map(([id, label, Icon]) => (
                      <button
                        key={id}
                        onClick={() => setMarketingFilter(id)}
                        className={`rounded-[2.5rem] border p-6 text-left ${
                          marketingFilter === id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        <Icon size={24} className={marketingFilter === id ? "text-emerald-400" : "text-slate-400"} />
                        <p className="mt-4 text-lg font-black uppercase">{label}</p>
                      </button>
                    ))}
                  </div>
                  <div className="overflow-x-auto rounded-[2.5rem] bg-white shadow-sm">
                    <table className="w-full min-w-[900px]">
                      <thead className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                        <tr>
                          <th className="px-6 py-4 text-left">Contact</th>
                          <th className="px-6 py-4 text-left">Fiche fidèle</th>
                          <th className="px-6 py-4 text-right">Messages WhatsApp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {marketingMembers.map((m) => (
                            <tr key={m.id}>
                              <td className="px-6 py-5">
                                <p className="font-black uppercase">{m.name}</p>
                                <p className="mt-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-600">{m.whatsapp}</p>
                              </td>
                              <td className="px-6 py-5">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    title="Modifier"
                                    onClick={() => openEditMemberModal(m)}
                                    className="inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-blue-700"
                                  >
                                    <Pencil size={14} />
                                    Modifier
                                  </button>
                                  <button
                                    type="button"
                                    title="Supprimer"
                                    onClick={async () => {
                                      if (!(await askConfirm(`Supprimer ${m.name} ?`))) return;
                                      await removeMember(m.id);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-red-700"
                                  >
                                    <Trash2 size={14} />
                                    Supprimer
                                  </button>
                                </div>
                              </td>
                              <td className="px-6 py-5 text-right">
                                <div className="flex flex-wrap justify-end gap-2">
                                  <button
                                    onClick={() => sendWhatsApp(m, "welcome")}
                                    className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-blue-600"
                                  >
                                    Inscription
                                  </button>
                                  <button
                                    onClick={() => sendWhatsApp(m, "engagement")}
                                    className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-indigo-600"
                                  >
                                    Engagement
                                  </button>
                                  <button
                                    onClick={() => sendWhatsApp(m, "reminder")}
                                    className="rounded-xl border border-orange-200 bg-white px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-orange-600"
                                  >
                                    Rappel
                                  </button>
                                  <button
                                    onClick={() => sendWhatsApp(m, "thanks")}
                                    className="rounded-xl bg-slate-900 px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-white"
                                  >
                                    Merci
                                  </button>
                                  <button
                                    onClick={() => sendWhatsApp(m, "congrats")}
                                    className="rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-white"
                                  >
                                    Félicitations
                                  </button>
                                  <button
                                    onClick={() => sendWhatsApp(m, "encourage")}
                                    className="rounded-xl bg-purple-600 px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-white"
                                  >
                                    Encourager
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-800">Journal des envois WhatsApp</h3>
                    <p className="mt-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">200 derniers enregistrements côté API</p>
                    {whatsAppLogs.length === 0 ? (
                      <p className="mt-4 text-[10px] font-extrabold uppercase text-slate-400">Aucun envoi enregistré pour l&apos;instant.</p>
                    ) : (
                      <ul className="mt-4 max-h-64 space-y-1 overflow-y-auto text-left text-[11px]">
                        {whatsAppLogs.map((w) => (
                          <li key={w.id} className="rounded-lg border border-slate-100 bg-slate-50/90 px-3 py-2">
                            <span className="text-slate-500">{w.createdAt ? new Date(w.createdAt).toLocaleString("fr-FR") : ""}</span>{" "}
                            <span className="font-black text-slate-800">{w.messageType}</span> — {w.memberName || w.whatsapp}
                            {w.providerStatus && <span className="ml-1 text-emerald-600">· {w.providerStatus}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "settings" && (
                <div className="rounded-[2.5rem] bg-white p-8 shadow-sm">
                  <h3 className="mb-8 text-2xl font-black uppercase tracking-tight text-slate-900">Paramètres de campagne</h3>
                  <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <button
                      type="button"
                      onClick={exportDataBackup}
                      className="rounded-2xl bg-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white"
                    >
                      Télécharger sauvegarde (JSON)
                    </button>
                    {sessionUser?.role === "admin" && (
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={!!config.financeLocked}
                          onChange={(e) => {
                            const next = { ...config, financeLocked: e.target.checked };
                            setConfig(next);
                            saveConfig(next);
                          }}
                        />
                        Verrouiller les écritures comptables (dépenses, remises, versements) — trésoriers : lecture seule
                      </label>
                    )}
                    <p className="text-[10px] text-slate-500">
                      Stockage InsForge (upload) : <code className="rounded bg-white px-1">VITE_INSFORGE_URL</code>, <code className="rounded bg-white px-1">VITE_INSFORGE_ANON_KEY</code> et
                      seau <code className="rounded bg-white px-1">fag-attachments</code>
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Année</label>
                      <input
                        type="number"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-black outline-none focus:border-emerald-500"
                        value={config.year}
                        onChange={(e) => {
                          const next = { ...config, year: toNumber(e.target.value) };
                          setConfig(next);
                          saveConfig(next);
                        }}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Objectif global</label>
                      <input
                        type="number"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-black outline-none focus:border-emerald-500"
                        value={config.globalGoal}
                        onChange={(e) => {
                          const next = { ...config, globalGoal: toNumber(e.target.value) };
                          setConfig(next);
                          saveConfig(next);
                        }}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Durée (mois)</label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-black outline-none focus:border-emerald-500"
                        value={config.months}
                        onChange={(e) => {
                          const next = { ...config, months: Math.min(12, Math.max(1, Number.parseInt(e.target.value || "1", 10))) };
                          setConfig(next);
                          saveConfig(next);
                        }}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Date de lancement</label>
                      <input
                        type="date"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-black outline-none focus:border-emerald-500"
                        value={config.launchDate || ""}
                        onChange={(e) => {
                          const next = { ...config, launchDate: e.target.value };
                          setConfig(next);
                          saveConfig(next);
                        }}
                      />
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Objectif mensuel moyen</p>
                      <p className="mt-1 text-xl font-black text-slate-900">{money(config.globalGoal / Math.max(1, config.months))}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Potentiel total catégories</p>
                      <p className="mt-1 text-xl font-black text-emerald-600">
                        {money(
                          config.categories.reduce((sum, c) => sum + toNumber(c.amount) * toNumber(c.targetPeople) * Math.max(1, config.months), 0)
                        )}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Écart potentiel vs objectif</p>
                      <p className="mt-1 text-xl font-black text-blue-600">
                        {money(
                          config.categories.reduce((sum, c) => sum + toNumber(c.amount) * toNumber(c.targetPeople) * Math.max(1, config.months), 0) -
                            toNumber(config.globalGoal)
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="mt-8 space-y-4">
                    {config.categories.map((cat, idx) => (
                      <div key={cat.id} className="grid grid-cols-1 gap-4 rounded-3xl border border-slate-100 p-5 md:grid-cols-12">
                        <div className="md:col-span-4">
                          <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Label</label>
                          <input
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 font-black uppercase"
                            value={cat.label}
                            onChange={(e) => {
                              const cats = [...config.categories];
                              cats[idx] = { ...cats[idx], label: e.target.value };
                              const next = { ...config, categories: cats };
                              setConfig(next);
                              saveConfig(next);
                            }}
                          />
                        </div>
                        <div className="md:col-span-4">
                          <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Montant mensuel</label>
                          <input
                            type="number"
                            disabled={cat.id === "cat5"}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 font-black"
                            value={cat.amount}
                            onChange={(e) => {
                              const cats = [...config.categories];
                              cats[idx] = { ...cats[idx], amount: toNumber(e.target.value) };
                              const next = { ...config, categories: cats };
                              setConfig(next);
                              saveConfig(next);
                            }}
                          />
                        </div>
                        <div className="md:col-span-4">
                          <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Cible</label>
                          <input
                            type="number"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 font-black"
                            value={cat.targetPeople}
                            onChange={(e) => {
                              const cats = [...config.categories];
                              cats[idx] = { ...cats[idx], targetPeople: Number.parseInt(e.target.value, 10) || 0 };
                              const next = { ...config, categories: cats };
                              setConfig(next);
                              saveConfig(next);
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 rounded-3xl border border-red-100 bg-red-50 p-5">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-red-700">Zone de sécurité</p>
                    <p className="mt-2 text-xs font-bold text-red-800">
                      Réinitialiser remet les paramètres par défaut (ne supprime pas les membres/dépenses).
                    </p>
                    <button
                      onClick={async () => {
                        if (!(await askConfirm("Réinitialiser la configuration de campagne ?"))) return;
                        setConfig(DEFAULT_CONFIG);
                        saveConfig(DEFAULT_CONFIG);
                      }}
                      className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white"
                    >
                      Réinitialiser configuration
                    </button>
                  </div>

                  <div className="mt-8 rounded-3xl border border-slate-100 bg-slate-50 p-5">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Comptes équipe & niveaux d&apos;accès</h4>
                    {!canManageUsers ? (
                      <p className="mt-3 rounded-2xl border border-orange-100 bg-orange-50 p-4 text-[11px] font-bold text-orange-700">
                        Seul le rôle Administrateur peut créer ou modifier les comptes utilisateurs.
                      </p>
                    ) : (
                      <>
                        <form onSubmit={createTeamUser} className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-5">
                          <input
                            required
                            placeholder="Nom complet"
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-emerald-500"
                            value={newTeamUser.fullName}
                            onChange={(e) => setNewTeamUser((prev) => ({ ...prev, fullName: e.target.value }))}
                          />
                          <input
                            type="email"
                            placeholder="Email connexion (optionnel)"
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-emerald-500"
                            value={newTeamUser.username}
                            onChange={(e) => setNewTeamUser((prev) => ({ ...prev, username: e.target.value }))}
                          />
                          <input
                            placeholder="Téléphone connexion (optionnel)"
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-emerald-500"
                            value={newTeamUser.phone}
                            onChange={(e) => setNewTeamUser((prev) => ({ ...prev, phone: e.target.value }))}
                          />
                          <input
                            required
                            type="password"
                            placeholder="Mot de passe"
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-emerald-500"
                            value={newTeamUser.password}
                            onChange={(e) => setNewTeamUser((prev) => ({ ...prev, password: e.target.value }))}
                          />
                          <div className="flex gap-2">
                            <select
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] font-extrabold uppercase tracking-widest text-slate-600 outline-none focus:border-emerald-500"
                              value={newTeamUser.role}
                              onChange={(e) => setNewTeamUser((prev) => ({ ...prev, role: e.target.value }))}
                            >
                              {ROLE_OPTIONS.map((role) => (
                                <option key={role.id} value={role.id}>
                                  {role.label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              className="rounded-2xl bg-emerald-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white"
                            >
                              Créer
                            </button>
                          </div>
                        </form>

                        <div className="mt-4 overflow-x-auto rounded-2xl bg-white">
                          <table className="w-full min-w-[960px]">
                            <thead className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                              <tr>
                                <th className="px-4 py-3 text-left">Utilisateur</th>
                                <th className="px-4 py-3 text-left">Rôle</th>
                                <th className="px-4 py-3 text-left">Accès modules</th>
                                <th className="px-4 py-3 text-center">Statut</th>
                                <th className="px-4 py-3 text-center">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-[11px] font-bold">
                              {teamUsers.map((u) => (
                                <tr key={u.id}>
                                  <td className="px-4 py-3">
                                    <p className="font-black uppercase text-slate-900">{u.fullName}</p>
                                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{u.username}</p>
                                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600">{u.phone || "Téléphone non défini"}</p>
                                  </td>
                                  <td className="px-4 py-3">
                                    <select
                                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-600"
                                      value={u.role}
                                      onChange={(e) => updateTeamUserRole(u.id, e.target.value)}
                                    >
                                      {ROLE_OPTIONS.map((role) => (
                                        <option key={role.id} value={role.id}>
                                          {role.label}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                                    {(ROLE_PERMISSIONS[u.role] || []).join(" • ")}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <button
                                      onClick={() => toggleTeamUserStatus(u.id)}
                                      className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest ${
                                        u.isActive !== false ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                                      }`}
                                    >
                                      {u.isActive !== false ? "Actif" : "Inactif"}
                                    </button>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex flex-wrap justify-center gap-2">
                                      <button
                                        onClick={() =>
                                          setEditingTeamUser({
                                            id: u.id,
                                            fullName: u.fullName || "",
                                            username: u.username || "",
                                            phone: u.phone || "",
                                            password: "",
                                            role: u.role || "tresorier"
                                          })
                                        }
                                        className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-blue-700 hover:bg-blue-100"
                                      >
                                        Modifier
                                      </button>
                                      <button
                                        onClick={async () => {
                                          if (!(await askConfirm("Supprimer ce compte utilisateur ?"))) return;
                                          await removeTeamUser(u.id);
                                        }}
                                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-red-600 hover:bg-red-100"
                                      >
                                        Supprimer
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mt-8 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-800">
                          <FileClock size={15} className="text-blue-600" />
                          Historique des logs d&apos;audit
                        </h4>
                        <p className="mt-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                          Traçabilité des accès et actions sensibles du logiciel
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-600">
                          {filteredAuditLogs.length} logs affichés
                        </p>
                        <button
                          onClick={exportAuditCsv}
                          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-emerald-700"
                        >
                          Export CSV
                        </button>
                        <button
                          onClick={exportAuditPdf}
                          className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-blue-700"
                        >
                          Export PDF
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div className="md:col-span-2">
                        <input
                          value={auditSearchTerm}
                          onChange={(e) => setAuditSearchTerm(e.target.value)}
                          placeholder="Rechercher: acteur, action, cible, détail..."
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] font-semibold outline-none focus:border-blue-500"
                        />
                      </div>
                      <select
                        value={auditFilter}
                        onChange={(e) => setAuditFilter(e.target.value)}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] font-extrabold uppercase tracking-widest text-slate-600 outline-none focus:border-blue-500"
                      >
                        <option value="all">Tous les logs</option>
                        <option value="access">Accès</option>
                        <option value="users">Comptes équipe</option>
                        <option value="finance">Finance</option>
                        <option value="communication">Communication</option>
                      </select>
                    </div>

                    <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-100">
                      <table className="w-full min-w-[980px]">
                        <thead className="bg-slate-900 text-[10px] font-extrabold uppercase tracking-widest text-white">
                          <tr>
                            <th className="px-4 py-3 text-left">Date</th>
                            <th className="px-4 py-3 text-left">Acteur</th>
                            <th className="px-4 py-3 text-left">Action</th>
                            <th className="px-4 py-3 text-left">Cible</th>
                            <th className="px-4 py-3 text-left">Détails</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white text-[11px] font-semibold">
                          {filteredAuditLogs.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                                Aucun log pour ce filtre
                              </td>
                            </tr>
                          ) : (
                            filteredAuditLogs.slice(0, 400).map((log, idx) => (
                              <tr key={`${log.id || log.timestamp || "log"}-${idx}`} className="hover:bg-slate-50/70">
                                <td className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                                  {new Date(log.timestamp || Date.now()).toLocaleString("fr-FR")}
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-black uppercase text-slate-900">{log.actorName || "Système"}</p>
                                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{log.actorRole || "N/A"}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-blue-700">
                                    {log.action || "ACTION"}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-black uppercase text-slate-800">{log.targetLabel || "N/A"}</p>
                                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{log.targetType || "N/A"}</p>
                                </td>
                                <td className="px-4 py-3 text-slate-600">{log.details || "-"}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </motion.section>
          )}
        </main>
      </div>

      {flashMessage && (
        <div className="pointer-events-none fixed right-4 top-4 z-[70] max-w-[min(100vw-2rem,22rem)] max-sm:left-4 max-sm:right-4">
          <div
            role="status"
            className={`animate-fag-toast-in pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 text-[11px] font-extrabold uppercase tracking-widest shadow-xl ${
              flashMessage.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            <span className="mt-0.5 shrink-0 text-base leading-none" aria-hidden>
              {flashMessage.type === "success" ? "✅" : "⚠️"}
            </span>
            <span className="min-w-0 flex-1 leading-snug normal-case tracking-normal">{flashMessage.message}</span>
          </div>
        </div>
      )}

      {editingTeamUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70" onClick={() => setEditingTeamUser(null)} />
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await updateTeamUser(editingTeamUser.id, {
                fullName: editingTeamUser.fullName,
                username: editingTeamUser.username,
                phone: editingTeamUser.phone,
                password: editingTeamUser.password,
                role: editingTeamUser.role
              });
              if (ok) setEditingTeamUser(null);
            }}
            className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[2.5rem] bg-white p-8 shadow-2xl md:p-10"
          >
            <button type="button" className="absolute right-6 top-6 text-slate-400" onClick={() => setEditingTeamUser(null)}>
              <X />
            </button>
            <h3 className="text-2xl font-black uppercase text-slate-900">Modifier le compte</h3>
            <p className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-400">
              Mettez à jour l&apos;identité, les identifiants, le mot de passe et le niveau d&apos;accès du membre de gestion.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-3">
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Nom complet</label>
                <input
                  required
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-emerald-500"
                  value={editingTeamUser.fullName}
                  onChange={(e) => setEditingTeamUser((prev) => ({ ...prev, fullName: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Email</label>
                  <input
                    type="email"
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-emerald-500"
                    value={editingTeamUser.username}
                    onChange={(e) => setEditingTeamUser((prev) => ({ ...prev, username: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Téléphone</label>
                  <input
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-emerald-500"
                    value={editingTeamUser.phone}
                    onChange={(e) => setEditingTeamUser((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Nouveau mot de passe (optionnel)</label>
                <input
                  type="password"
                  placeholder="Laisser vide pour conserver le mot de passe actuel"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-emerald-500"
                  value={editingTeamUser.password}
                  onChange={(e) => setEditingTeamUser((prev) => ({ ...prev, password: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Rôle & accès</label>
                <select
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] font-extrabold uppercase tracking-widest text-slate-600 outline-none focus:border-emerald-500"
                  value={editingTeamUser.role}
                  onChange={(e) => setEditingTeamUser((prev) => ({ ...prev, role: e.target.value }))}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label} — {role.description}
                    </option>
                  ))}
                </select>
                <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                  Modules accessibles : {(ROLE_PERMISSIONS[editingTeamUser.role] || []).join(" • ") || "Aucun"}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingTeamUser(null)}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-900/20"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70" onClick={() => setIsMemberModalOpen(false)} />
          <form onSubmit={addMember} className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2.5rem] bg-white p-8 shadow-2xl md:p-10">
            <button type="button" className="absolute right-6 top-6 text-slate-400" onClick={() => setIsMemberModalOpen(false)}>
              <X />
            </button>
            <h3 className="text-2xl font-black uppercase text-slate-900">Inscrire un fidèle</h3>
            <p className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-400">
              Identification membre FAG
            </p>

            <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50/70 p-4 md:p-5">
              <p className="mb-4 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Informations d&apos;identité</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input
                  required
                  placeholder="Nom et prénoms"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-emerald-500"
                  value={newMember.name}
                  onChange={(e) => setNewMember((s) => ({ ...s, name: e.target.value }))}
                />
                <input
                  required
                  placeholder="WhatsApp (ex: 2250700000000)"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-emerald-500"
                  value={newMember.whatsapp}
                  onChange={(e) => setNewMember((s) => ({ ...s, whatsapp: e.target.value }))}
                />
                <input
                  placeholder="Quartier / cellule"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-emerald-500"
                  value={newMember.district}
                  onChange={(e) => setNewMember((s) => ({ ...s, district: e.target.value }))}
                />
                <select
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-black outline-none focus:border-emerald-500"
                  value={newMember.churchFunctionType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewMember((s) => ({ ...s, churchFunctionType: val, churchFunction: val === "__other__" ? s.churchFunction : val }));
                  }}
                >
                  <option value="">Fonction dans l&apos;église</option>
                  {CHURCH_FUNCTION_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                  <option value="__other__">Autre fonction (saisie manuelle)</option>
                </select>
              </div>
              {newMember.churchFunctionType === "__other__" && (
                <input
                  placeholder="Préciser la fonction"
                  className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-emerald-500"
                  value={newMember.churchFunction}
                  onChange={(e) => setNewMember((s) => ({ ...s, churchFunction: e.target.value }))}
                />
              )}
            </div>

            <select
              className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-black uppercase outline-none focus:border-emerald-500"
              value={newMember.categoryId}
              onChange={(e) => setNewMember((s) => ({ ...s, categoryId: e.target.value }))}
            >
              {config.categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.id === "cat5" ? `${cat.label} - Montant libre` : `${cat.label} - ${money(cat.amount)} / mois`}
                </option>
              ))}
            </select>
            {newMember.categoryId === "cat5" && (
              <input
                type="number"
                min="20001"
                required
                placeholder="Montant libre (> 20 000)"
                className="mt-4 w-full rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 font-black text-purple-700 outline-none focus:border-purple-400"
                value={newMember.customAmount}
                onChange={(e) => setNewMember((s) => ({ ...s, customAmount: e.target.value }))}
              />
            )}
            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700">Récapitulatif engagement</p>
              <div className="mt-2 flex flex-col gap-1 text-[11px] font-extrabold uppercase text-slate-700 md:flex-row md:items-center md:justify-between">
                <span>Mensualité: {money(selectedMonthlyAmount)}</span>
                <span>
                  Total ({config.months} mois): <span className="text-emerald-700">{money(selectedTotalAmount)}</span>
                </span>
              </div>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={newMember.commsOptIn !== false}
                onChange={(e) => setNewMember((s) => ({ ...s, commsOptIn: e.target.checked }))}
              />
              Autorise les rappels / messages WhatsApp
            </label>
            <button type="submit" className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-slate-900/20">
              Enregistrer
            </button>
          </form>
        </div>
      )}

      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70" onClick={() => setEditingMember(null)} />
          <form
            onSubmit={saveMemberUpdate}
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2.5rem] bg-white p-8 shadow-2xl md:p-10"
          >
            <button type="button" className="absolute right-6 top-6 text-slate-400" onClick={() => setEditingMember(null)}>
              <X />
            </button>
            <h3 className="text-2xl font-black uppercase text-slate-900">Modifier le fidèle</h3>
            <p className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-400">
              Mettre à jour les informations et l&apos;engagement (les versements enregistrés sont conservés).
            </p>

            <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50/70 p-4 md:p-5">
              <p className="mb-4 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Informations d&apos;identité</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input
                  required
                  placeholder="Nom et prénoms"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-emerald-500"
                  value={editingMember.name}
                  onChange={(e) => setEditingMember((s) => ({ ...s, name: e.target.value }))}
                />
                <input
                  required
                  placeholder="WhatsApp (ex: 0757228731)"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-emerald-500"
                  value={editingMember.whatsapp}
                  onChange={(e) => setEditingMember((s) => ({ ...s, whatsapp: e.target.value }))}
                />
                <input
                  placeholder="Quartier / cellule"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-emerald-500"
                  value={editingMember.district}
                  onChange={(e) => setEditingMember((s) => ({ ...s, district: e.target.value }))}
                />
                <select
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-black outline-none focus:border-emerald-500"
                  value={editingMember.churchFunctionType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditingMember((s) => ({
                      ...s,
                      churchFunctionType: val,
                      churchFunction: val === "__other__" ? s.churchFunction : val
                    }));
                  }}
                >
                  <option value="">Fonction dans l&apos;église</option>
                  {CHURCH_FUNCTION_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                  <option value="__other__">Autre fonction (saisie manuelle)</option>
                </select>
              </div>
              {editingMember.churchFunctionType === "__other__" && (
                <input
                  placeholder="Préciser la fonction"
                  className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-emerald-500"
                  value={editingMember.churchFunction}
                  onChange={(e) => setEditingMember((s) => ({ ...s, churchFunction: e.target.value }))}
                />
              )}
            </div>

            <select
              className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-black uppercase outline-none focus:border-emerald-500"
              value={editingMember.categoryId}
              onChange={(e) => setEditingMember((s) => ({ ...s, categoryId: e.target.value }))}
            >
              {config.categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.id === "cat5" ? `${cat.label} - Montant libre` : `${cat.label} - ${money(cat.amount)} / mois`}
                </option>
              ))}
            </select>
            {editingMember.categoryId === "cat5" && (
              <input
                type="number"
                min="20001"
                required
                placeholder="Montant libre (> 20 000)"
                className="mt-4 w-full rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 font-black text-purple-700 outline-none focus:border-purple-400"
                value={editingMember.customAmount}
                onChange={(e) => setEditingMember((s) => ({ ...s, customAmount: e.target.value }))}
              />
            )}
            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700">Récapitulatif engagement</p>
              <div className="mt-2 flex flex-col gap-1 text-[11px] font-extrabold uppercase text-slate-700 md:flex-row md:items-center md:justify-between">
                <span>Mensualité: {money(editingMonthlyAmount)}</span>
                <span>
                  Total ({config.months} mois): <span className="text-emerald-700">{money(editingTotalAmount)}</span>
                </span>
              </div>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={editingMember.commsOptIn !== false}
                onChange={(e) => setEditingMember((s) => ({ ...s, commsOptIn: e.target.checked }))}
              />
              Autorise les rappels / messages WhatsApp
            </label>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="rounded-2xl bg-slate-900 px-6 py-3 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-slate-900/20"
              >
                Enregistrer les modifications
              </button>
            </div>
          </form>
        </div>
      )}

      {isPaymentModalOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70" onClick={() => setIsPaymentModalOpen(false)} />
          <form onSubmit={handlePayment} className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[2.5rem] bg-white p-8 shadow-2xl">
            <button type="button" className="absolute right-6 top-6 text-slate-400" onClick={() => setIsPaymentModalOpen(false)}>
              <X />
            </button>
            <h3 className="mb-6 text-xl font-black uppercase">Encaissement - {selectedMember.name}</h3>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                required
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold"
                value={paymentData.date}
                onChange={(e) => setPaymentData((s) => ({ ...s, date: e.target.value }))}
              />
              <select
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold"
                value={paymentData.method}
                onChange={(e) => setPaymentData((s) => ({ ...s, method: e.target.value }))}
              >
                <option>Espèces</option>
                <option>Mobile Money</option>
                <option>Virement</option>
              </select>
            </div>
            <div className="relative mt-4">
              <DollarSign size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" />
              <input
                autoFocus
                type="number"
                required
                placeholder="Montant"
                className="w-full rounded-2xl border-2 border-slate-200 px-12 py-4 text-right text-3xl font-black outline-none focus:border-emerald-500"
                value={paymentData.amount}
                onChange={(e) => setPaymentData((s) => ({ ...s, amount: e.target.value }))}
              />
            </div>
            <button type="submit" className="mt-6 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white">
              Valider
            </button>
          </form>
        </div>
      )}

      {isHistoryModalOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70" onClick={() => setIsHistoryModalOpen(false)} />
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2.5rem] bg-white p-8 shadow-2xl">
            <button type="button" className="absolute right-6 top-6 text-slate-400" onClick={() => setIsHistoryModalOpen(false)}>
              <X />
            </button>
            <h3 className="mb-6 text-xl font-black uppercase">Grand livre - {selectedMember.name}</h3>
            <div className="max-h-[50vh] overflow-y-auto">
              <table className="w-full">
                <thead className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="pb-3 text-left">Date</th>
                    <th className="pb-3 text-left">Mode</th>
                    <th className="pb-3 text-right">Montant</th>
                    <th className="pb-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(selectedMember.payments || []).map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 font-bold text-slate-500">{new Date(p.date).toLocaleDateString("fr-FR")}</td>
                      <td className="py-3 font-extrabold">{p.method}</td>
                      <td className="py-3 text-right font-black">{money(p.amount)}</td>
                      <td className="py-3 text-center">
                        <button
                          onClick={async () => {
                            if (!(await askConfirm("Supprimer ce versement ?"))) return;
                            await removeMemberPayment(selectedMember.id, p.id);
                          }}
                          className="rounded-xl p-2 text-slate-300 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70" onClick={() => setIsExpenseModalOpen(false)} />
          <form onSubmit={handleExpense} className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2.5rem] bg-white p-8 shadow-2xl md:p-10">
            <button type="button" className="absolute right-6 top-6 text-slate-400" onClick={() => setIsExpenseModalOpen(false)}>
              <X />
            </button>
            <h3 className="text-2xl font-black uppercase text-slate-900">Nouvelle dépense</h3>
            <p className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-400">Sortie de caisse projet FAG</p>

            <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50/70 p-4 md:p-5">
              <p className="mb-4 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Détails de l&apos;opération</p>
              <input
                required
                placeholder="Description de la dépense"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-red-400"
                value={newExpense.description}
                onChange={(e) => setNewExpense((s) => ({ ...s, description: e.target.value }))}
              />
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <select
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-red-400"
                  value={newExpense.category}
                  onChange={(e) => setNewExpense((s) => ({ ...s, category: e.target.value }))}
                >
                  <option>Logistique</option>
                  <option>Communication</option>
                  <option>Restauration</option>
                  <option>Accueil/Protocole</option>
                  <option>Autre</option>
                </select>
                <select
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-red-400"
                  value={newExpense.method}
                  onChange={(e) => setNewExpense((s) => ({ ...s, method: e.target.value }))}
                >
                  <option>Espèces</option>
                  <option>Mobile Money</option>
                  <option>Virement</option>
                  <option>Chèque</option>
                </select>
                <input
                  type="date"
                  required
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-red-400"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense((s) => ({ ...s, date: e.target.value }))}
                />
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Montant"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-black outline-none focus:border-red-400"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense((s) => ({ ...s, amount: e.target.value }))}
                />
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-red-700">Impact immédiat</p>
              <div className="mt-2 flex flex-col gap-1 text-[11px] font-extrabold uppercase text-slate-700 md:flex-row md:items-center md:justify-between">
                <span>Dépense saisie: {money(newExpense.amount || 0)}</span>
                <span>
                  Caisse après sortie: <span className="text-red-700">{money(stats.cashInHand - toNumber(newExpense.amount))}</span>
                </span>
              </div>
            </div>

            <button type="submit" className="mt-6 w-full rounded-2xl bg-red-600 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-red-900/20">
              Enregistrer
            </button>
          </form>
        </div>
      )}

      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70" onClick={() => setEditingExpense(null)} />
          <form
            onSubmit={saveExpenseUpdate}
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2.5rem] bg-white p-8 shadow-2xl md:p-10"
          >
            <button type="button" className="absolute right-6 top-6 text-slate-400" onClick={() => setEditingExpense(null)}>
              <X />
            </button>
            <h3 className="text-2xl font-black uppercase text-slate-900">Modifier la dépense</h3>
            <p className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-400">Mise à jour de la sortie de caisse</p>
            <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50/70 p-4 md:p-5">
              <input
                required
                placeholder="Description"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-red-400"
                value={editingExpense.description}
                onChange={(e) => setEditingExpense((s) => ({ ...s, description: e.target.value }))}
              />
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <select
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-red-400"
                  value={editingExpense.category}
                  onChange={(e) => setEditingExpense((s) => ({ ...s, category: e.target.value }))}
                >
                  <option>Logistique</option>
                  <option>Communication</option>
                  <option>Restauration</option>
                  <option>Accueil/Protocole</option>
                  <option>Autre</option>
                </select>
                <select
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-red-400"
                  value={editingExpense.method}
                  onChange={(e) => setEditingExpense((s) => ({ ...s, method: e.target.value }))}
                >
                  <option>Espèces</option>
                  <option>Mobile Money</option>
                  <option>Virement</option>
                  <option>Chèque</option>
                </select>
                <input
                  type="date"
                  required
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-red-400"
                  value={editingExpense.date}
                  onChange={(e) => setEditingExpense((s) => ({ ...s, date: e.target.value }))}
                />
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Montant"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-black outline-none focus:border-red-400"
                  value={editingExpense.amount}
                  onChange={(e) => setEditingExpense((s) => ({ ...s, amount: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="rounded-2xl bg-red-600 px-6 py-3 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-red-900/20"
              >
                Enregistrer les modifications
              </button>
            </div>
          </form>
        </div>
      )}

      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70" onClick={() => setIsDepositModalOpen(false)} />
          <form onSubmit={handleDeposit} className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2.5rem] bg-white p-8 shadow-2xl md:p-10">
            <button type="button" className="absolute right-6 top-6 text-slate-400" onClick={() => setIsDepositModalOpen(false)}>
              <X />
            </button>
            <h3 className="text-2xl font-black uppercase text-slate-900">Décharge comité</h3>
            <p className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-400">Remise physique des fonds au comité</p>

            <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50/70 p-4 md:p-5">
              <p className="mb-4 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Informations de remise</p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  type="number"
                  required
                  min="1"
                  max={Math.max(0, stats.cashInHand)}
                  placeholder="Montant remis"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-2xl font-black outline-none focus:border-blue-400"
                  value={newDeposit.amount}
                  onChange={(e) => setNewDeposit((s) => ({ ...s, amount: e.target.value }))}
                />
                <input
                  type="date"
                  required
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-blue-400"
                  value={newDeposit.date}
                  onChange={(e) => setNewDeposit((s) => ({ ...s, date: e.target.value }))}
                />
              </div>
              <input
                required
                placeholder="Nom du responsable"
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-blue-400"
                value={newDeposit.recipient}
                onChange={(e) => setNewDeposit((s) => ({ ...s, recipient: e.target.value }))}
              />
              <input
                placeholder="Référence bordereau (optionnel)"
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-blue-400"
                value={newDeposit.bordereauRef}
                onChange={(e) => setNewDeposit((s) => ({ ...s, bordereauRef: e.target.value }))}
              />
              <input
                placeholder="Lien pièce jointe (optionnel, URL https://…)"
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-blue-400"
                value={newDeposit.bordereauUrl}
                onChange={(e) => setNewDeposit((s) => ({ ...s, bordereauUrl: e.target.value }))}
              />
            </div>

            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-700">Contrôle de caisse</p>
              <div className="mt-2 flex flex-col gap-1 text-[11px] font-extrabold uppercase text-slate-700 md:flex-row md:items-center md:justify-between">
                <span>Cash disponible: {money(stats.cashInHand)}</span>
                <span>
                  Solde après remise: <span className="text-blue-700">{money(stats.cashInHand - toNumber(newDeposit.amount))}</span>
                </span>
              </div>
            </div>

            <button type="submit" className="mt-6 w-full rounded-2xl bg-blue-600 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-900/20">
              Valider la remise
            </button>
          </form>
        </div>
      )}

      {confirmState && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/70"
            onClick={() => {
              confirmState.resolve(false);
              setConfirmState(null);
            }}
          />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <p className="text-sm font-bold text-slate-800">{confirmState.message}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-2xl border border-slate-200 px-4 py-2 text-[11px] font-black uppercase text-slate-600"
                onClick={() => {
                  confirmState.resolve(false);
                  setConfirmState(null);
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                className="rounded-2xl bg-slate-900 px-4 py-2 text-[11px] font-black uppercase text-white"
                onClick={() => {
                  confirmState.resolve(true);
                  setConfirmState(null);
                }}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {urlAttachmentModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70" onClick={() => setUrlAttachmentModal(null)} />
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-black uppercase text-slate-900">Pièce jointe / lien</h3>
            <p className="mt-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">URL (Drive, etc.) — ou fichier vers le stockage InsForge</p>
            <input
              className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              placeholder="https://…"
              value={urlAttachmentModal.url}
              onChange={(e) => setUrlAttachmentModal((s) => ({ ...s, url: e.target.value }))}
            />
            <label className="mt-3 flex cursor-pointer flex-col gap-1 rounded-2xl border border-dashed border-slate-300 p-3 text-[10px] font-extrabold uppercase text-slate-500">
              Fichier (PDF, image) — créez le seau « fag-attachments » côté InsForge si besoin
              <input
                type="file"
                accept="application/pdf,image/*"
                className="text-[10px] normal-case"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const r = await tryUploadDepositFile(f);
                  if (r.error) {
                    notify("error", r.error);
                    return;
                  }
                  if (r.url) {
                    setUrlAttachmentModal((s) => ({ ...s, url: r.url || "" }));
                    notify("success", "Fichier importé, URL renseignée.");
                  }
                }}
              />
            </label>
            {urlAttachmentModal.fileHint && <p className="mt-2 text-xs text-amber-700">{urlAttachmentModal.fileHint}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-2xl border border-slate-200 px-4 py-2 text-[11px] font-black uppercase"
                onClick={() => setUrlAttachmentModal(null)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="rounded-2xl bg-blue-600 px-4 py-2 text-[11px] font-black uppercase text-white"
                onClick={async () => {
                  const id = urlAttachmentModal.depositId;
                  const trimmed = (urlAttachmentModal.url || "").trim();
                  setUrlAttachmentModal(null);
                  await applyDepositAttachmentUrl(id, trimmed);
                }}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {bordereauFormModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70" onClick={() => setBordereauFormModal(null)} />
          <form
            className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
            onSubmit={async (e) => {
              e.preventDefault();
              const { depositId, ref, url } = bordereauFormModal;
              if (!String(ref).trim()) {
                notify("error", "Indiquez la référence bordereau.");
                return;
              }
              const attachmentUrl = String(url).trim() || undefined;
              setBordereauFormModal(null);
              await applyDepositReceiptRef(depositId, String(ref).trim(), attachmentUrl);
            }}
          >
            <h3 className="text-lg font-black uppercase text-slate-900">Bordereau comité</h3>
            <input
              required
              className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3"
              placeholder="Référence bordereau"
              value={bordereauFormModal.ref}
              onChange={(e) => setBordereauFormModal((s) => ({ ...s, ref: e.target.value }))}
            />
            <input
              className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3"
              placeholder="Lien pièce jointe (optionnel)"
              value={bordereauFormModal.url}
              onChange={(e) => setBordereauFormModal((s) => ({ ...s, url: e.target.value }))}
            />
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="rounded-2xl border px-4 py-2 text-[11px] font-black uppercase" onClick={() => setBordereauFormModal(null)}>
                Annuler
              </button>
              <button type="submit" className="rounded-2xl bg-slate-900 px-4 py-2 text-[11px] font-black uppercase text-white">
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}
    </motion.div>
  );
};

export default App;
