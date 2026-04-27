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
  ExternalLink,
  ShieldCheck,
  ChevronRight
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
const LANDING_IMAGES = {
  hero: "/landing/hero-eglise-ivoirienne.png",
  prayer: "/landing/communaute-priere-ivoirienne.png",
  worship: "/landing/louange-ivoirienne.png",
  dashboard: "/landing/dashboard-mockup-eglise.png",
  team: "/landing/equipe-logiciel-eglise.png"
};

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
  
  return (
    <div className="relative h-48 w-48 group">
      <svg className="h-48 w-48 -rotate-90 drop-shadow-2xl" viewBox="0 0 180 180">
        <defs>
          <linearGradient id="gradPrimary" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle cx="90" cy="90" r={radius} className="fill-none stroke-white/5" strokeWidth="14" />
        <motion.circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="url(#gradPrimary)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ filter: "url(#glow)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-4xl font-black leading-none text-white tracking-tighter"
        >
          {clamped.toFixed(1)}%
        </motion.span>
        <span className="mt-2 text-[8px] font-black uppercase tracking-[0.3em] text-slate-500">Objectif Atteint</span>
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
      <div className="rounded-2xl border border-fag-primary/20 bg-fag-primary/5 p-4 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-fag-primary">Évènement en cours</p>
        <p className="mt-1 text-xs font-bold text-slate-300">Nous célébrons ensemble la grâce de Dieu.</p>
      </div>
    );
  }

  const itemClass = "rounded-2xl bg-white/5 border border-white/5 p-3 text-center";
  const valClass = "text-xl font-black text-white tracking-tighter";
  const labelClass = "text-[8px] font-black uppercase tracking-widest text-slate-500 mt-1";

  return (
    <div className="grid grid-cols-4 gap-3">
      <div className={itemClass}><p className={valClass}>{remaining.days}</p><p className={labelClass}>Jours</p></div>
      <div className={itemClass}><p className={valClass}>{remaining.hours}</p><p className={labelClass}>Hrs</p></div>
      <div className={itemClass}><p className={valClass}>{remaining.minutes}</p><p className={labelClass}>Min</p></div>
      <div className={itemClass}><p className={valClass}>{remaining.seconds}</p><p className={labelClass}>Sec</p></div>
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
  const [editingDeposit, setEditingDeposit] = useState(null);
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
          // Déclenchement automatique du message d'accueil
          setTimeout(() => sendWhatsApp({ ...cloudMember, id: result.id }, "welcome"), 500);
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
      // Déclenchement automatique du message d'accueil (local)
      setTimeout(() => sendWhatsApp(localMember, "welcome"), 500);
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
    // Déclenchement automatique du message d'accueil (Firebase legacy)
    setTimeout(() => sendWhatsApp(preparedMember, "welcome"), 500);
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
    const isEditing = !!paymentData.id;
    const payment = {
      id: isEditing ? paymentData.id : Date.now().toString(),
      amount: toNumber(paymentData.amount),
      method: paymentData.method,
      date: paymentData.date,
      timestamp: isEditing ? paymentData.timestamp : new Date().toISOString()
    };
    
    const getUpdatedPayments = () => {
      if (isEditing) {
        return (selectedMember.payments || []).map((p) => p.id === payment.id ? payment : p);
      }
      return [...(selectedMember.payments || []), payment];
    };
    const updatedPayments = getUpdatedPayments();

    if (managementBackendReady) {
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
        action: isEditing ? "MODIFICATION_PAIEMENT" : "ENREGISTREMENT_PAIEMENT",
        scope: "finance",
        targetType: "member",
        targetId: selectedMember.id,
        targetLabel: selectedMember.name,
        details: isEditing ? `Paiement modifié: ${money(payment.amount)} via ${payment.method}.` : `${money(payment.amount)} via ${payment.method}.`
      });
      notify("success", isEditing ? "Paiement modifié avec succès." : "Paiement enregistré avec succès.");
      if (!isEditing) {
        // Déclenchement automatique du message de remerciement
        setTimeout(() => sendWhatsApp(selectedMember, "thanks"), 500);
      }
      return;
    }
    if (storageMode === "local") {
      setMembers((prev) =>
        prev.map((m) => (m.id === selectedMember.id ? { ...m, payments: updatedPayments } : m))
      );
      setSelectedMember((prev) => ({ ...prev, payments: updatedPayments }));
      setPaymentData({ amount: "", date: new Date().toISOString().split("T")[0], method: "Espèces" });
      setIsPaymentModalOpen(false);
      writeAuditLog({
        action: isEditing ? "MODIFICATION_PAIEMENT" : "ENREGISTREMENT_PAIEMENT",
        scope: "finance",
        targetType: "member",
        targetId: selectedMember.id,
        targetLabel: selectedMember.name,
        details: isEditing ? `Paiement modifié: ${money(payment.amount)} via ${payment.method}.` : `${money(payment.amount)} via ${payment.method}.`
      });
      return;
    }
    if (!user) return;
    await updateDoc(doc(db, "artifacts", appId, "public", "data", "members", selectedMember.id), {
      payments: updatedPayments
    });
    setPaymentData({ amount: "", date: new Date().toISOString().split("T")[0], method: "Espèces" });
    setIsPaymentModalOpen(false);
    writeAuditLog({
      action: isEditing ? "MODIFICATION_PAIEMENT" : "ENREGISTREMENT_PAIEMENT",
      scope: "finance",
      targetType: "member",
      targetId: selectedMember.id,
      targetLabel: selectedMember.name,
      details: isEditing ? `Paiement modifié: ${money(payment.amount)} via ${payment.method}.` : `${money(payment.amount)} via ${payment.method}.`
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

  const openEditDepositModal = (d) => {
    setEditingDeposit({
      id: d.id,
      recipient: d.recipient || "",
      amount: String(d.amount || ""),
      date: d.date || new Date().toISOString().split("T")[0],
      bordereauRef: d.bordereauRef || "",
      bordereauUrl: d.bordereauUrl || ""
    });
  };

  const saveDepositUpdate = async (e) => {
    e.preventDefault();
    if (!editingDeposit?.recipient?.trim() || !editingDeposit?.amount) {
      notify("error", "Indiquez le responsable et le montant.");
      return;
    }
    const dId = editingDeposit.id;
    const patch = {
      recipient: editingDeposit.recipient.trim(),
      amount: toNumber(editingDeposit.amount),
      date: editingDeposit.date,
      bordereauRef: editingDeposit.bordereauRef.trim(),
      bordereauUrl: editingDeposit.bordereauUrl.trim(),
      isDeposited: !!(editingDeposit.bordereauRef.trim() || editingDeposit.bordereauUrl.trim())
    };

    if (managementBackendReady) {
      try {
        await callManagementApi("updateDeposit", {
          depositId: dId,
          deposit: patch
        });
      } catch (error) {
        // Fallback
      }
      setDeposits((prev) => prev.map((d) => (d.id === dId ? { ...d, ...patch } : d)));
      setEditingDeposit(null);
      notify("success", "Remise mise à jour.");
      await writeAuditLog({
        action: "MODIFICATION_REMISE",
        scope: "finance",
        targetType: "deposit",
        targetId: dId,
        targetLabel: patch.recipient,
        details: `Modification: ${money(patch.amount)}.`
      });
      return;
    }
    if (storageMode === "local") {
      setDeposits((prev) => prev.map((d) => (d.id === dId ? { ...d, ...patch } : d)));
      setEditingDeposit(null);
      notify("success", "Remise mise à jour.");
      writeAuditLog({
        action: "MODIFICATION_REMISE",
        scope: "finance",
        targetType: "deposit",
        targetId: dId,
        targetLabel: patch.recipient,
        details: `Modification (local): ${money(patch.amount)}.`
      });
      return;
    }
    if (!user) return;
    await updateDoc(doc(db, "artifacts", appId, "public", "data", "deposits", dId), patch);
    setDeposits((prev) => prev.map((d) => (d.id === dId ? { ...d, ...patch } : d)));
    setEditingDeposit(null);
    notify("success", "Remise mise à jour.");
    writeAuditLog({
      action: "MODIFICATION_REMISE",
      scope: "finance",
      targetType: "deposit",
      targetId: dId,
      targetLabel: patch.recipient,
      details: `Modification: ${money(patch.amount)}.`
    });
  };

  const tryUploadDepositFile = async (file) => {
    const base =
      import.meta.env?.VITE_INSFORGE_URL ||
      import.meta.env?.VITE_INSFORGE_BASE_URL ||
      import.meta.env?.VITE_INSFORGE_OSS_HOST;
    const ak = import.meta.env?.VITE_INSFORGE_ANON_KEY;
    if (!base || !ak) {
      return { error: "Le service de fichiers est momentanément indisponible. Réessayez plus tard." };
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
        className="min-h-screen bg-[#022c22] text-emerald-50 selection:bg-emerald-500/30 overflow-hidden relative"
        style={{ fontFamily: "'Montserrat', sans-serif" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700;800;900&family=Cinzel:wght@400;600;700;800&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');
          .glass-eden {
            background: rgba(6, 78, 59, 0.5); /* Lighter Emerald */
            backdrop-filter: blur(24px);
            border: 1px solid rgba(52, 211, 153, 0.4);
            box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.6);
          }
          .glass-eden-card {
            background: rgba(255, 255, 255, 0.12); /* Brighter for popups */
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          .text-gold-gradient {
            background: linear-gradient(135deg, #fde047 0%, #d97706 50%, #f59e0b 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .text-emerald-gradient {
            background: linear-gradient(135deg, #34d399 0%, #059669 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
        `}</style>

        {/* Ambient Light & Eden Background */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          {/* Main sunlight */}
          <motion.div 
            className="absolute -top-[15%] -right-[5%] w-[55%] h-[55%] rounded-full bg-yellow-400/25 blur-[120px]"
            animate={{ 
              scale: [1, 1.15, 1],
              opacity: [0.4, 0.6, 0.4],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Lighter emerald ambient */}
          <motion.div 
            className="absolute top-[25%] -left-[15%] w-[65%] h-[65%] rounded-full bg-emerald-500/15 blur-[130px]"
            animate={{ 
              x: [0, 40, 0],
              y: [0, 20, 0],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Soft gold floor reflection */}
          <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-emerald-500/20 to-transparent blur-3xl opacity-60" />


          {/* Floating particles (spores/light dust) */}
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-yellow-200/40"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -100 - Math.random() * 100],
                x: [0, (Math.random() - 0.5) * 100],
                opacity: [0, 0.8, 0],
                scale: [0, 1.5, 0],
              }}
              transition={{
                duration: 5 + Math.random() * 10,
                repeat: Infinity,
                delay: Math.random() * 5,
                ease: "linear",
              }}
            />
          ))}
        </div>

        {/* Intro Curtains - The Opening of the Garden */}
        <AnimatePresence>
          {!landingOpen && (
            <>
              <motion.div 
                className="fixed inset-y-0 left-0 z-[100] w-1/2 bg-[#022c22] border-r border-emerald-900/50"
                exit={{ x: "-100%" }}
                transition={{ duration: 1.5, ease: [0.83, 0, 0.173, 1] }}
              />
              <motion.div 
                className="fixed inset-y-0 right-0 z-[100] w-1/2 bg-[#022c22] border-l border-emerald-900/50"
                exit={{ x: "100%" }}
                transition={{ duration: 1.5, ease: [0.83, 0, 0.173, 1] }}
              />
            </>
          )}
        </AnimatePresence>

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 md:px-10">
          {/* Header */}
          <motion.header 
            className="flex items-center justify-between"
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <motion.div 
                  className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-yellow-500 opacity-40 blur-md"
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 5, repeat: Infinity }}
                />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-black/40 border border-emerald-500/30 backdrop-blur-sm overflow-hidden">
                   <img src="/logos/logo-ad-att.png" alt="Logo AD" className="h-full w-full object-cover" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-black uppercase tracking-[0.1em] text-white" style={{ fontFamily: "'Cinzel', serif" }}>FAG {DEFAULT_CONFIG.year}</h1>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.4em] text-emerald-400">Jardin d&apos;Abondance</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowLoginModal(true)}
              className="group relative overflow-hidden rounded-2xl bg-emerald-900/40 border border-emerald-500/30 px-6 py-3.5 text-[11px] font-black uppercase tracking-widest text-emerald-50 backdrop-blur-md shadow-[0_0_20px_rgba(16,185,129,0.1)] transition-all hover:border-emerald-400/60"
            >
              <span className="relative z-10">Accès Portail</span>
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />
            </motion.button>
          </motion.header>

          <main className="mt-12 grid flex-1 grid-cols-1 gap-16 lg:grid-cols-12 items-center">
            {/* Left Column: Hero Content */}
            <div className="lg:col-span-7 space-y-12">
              <motion.div
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1, duration: 1, ease: "easeOut" }}
              >
                <span className="inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                  <Sparkles size={12} className="animate-pulse" />
                  Festival d'Action de Grâces
                </span>
                <h2 className="mt-8 text-6xl font-black leading-[1.1] md:text-7xl lg:text-8xl" style={{ fontFamily: "'Cinzel', serif" }}>
                  <span className="block text-white">Célébrons</span>
                  <span className="block text-gold-gradient mt-2">L'Action de Grâces</span>
                </h2>
                <p className="mt-8 max-w-xl text-lg font-light leading-relaxed text-emerald-100/80" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.25rem' }}>
                  "Rendez grâces à l'Éternel, car il est bon, Car sa miséricorde dure à toujours !"
                  <span className="block mt-4 text-emerald-400 font-sans text-sm font-semibold tracking-wider uppercase">— Psaumes 136:1</span>
                </p>
                <p className="mt-6 max-w-xl text-sm font-medium leading-relaxed text-emerald-200/60">
                  Orchestrez le Festival d'Action de Grâces avec une pureté et une clarté dignes de l'excellence divine. Une gestion transparente, sécurisée et baignée de lumière.
                </p>
              </motion.div>

              <motion.div 
                className="grid grid-cols-1 gap-5 sm:grid-cols-2"
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.2, duration: 1, ease: "easeOut" }}
              >
                {[
                  { icon: Target, title: "Moisson Suivie", desc: "La croissance des dons en temps réel" },
                  { icon: ShieldCheck, title: "Sanctuaire Sûr", desc: "Protection absolue des données" },
                  { icon: HandCoins, title: "Bénédictions", desc: "Traçabilité de chaque offrande" },
                  { icon: Activity, title: "Sagesse", desc: "Analyses et visions claires" }
                ].map((feature, i) => (
                  <motion.div 
                    key={i}
                    whileHover={{ y: -5, backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                    className="flex items-start gap-5 rounded-3xl border border-emerald-500/20 glass-eden-card p-5 transition-all group"
                  >
                    <div className="rounded-2xl bg-emerald-900/50 border border-emerald-500/20 p-3 text-emerald-400 group-hover:text-yellow-400 group-hover:border-yellow-500/30 transition-colors">
                      <feature.icon size={22} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold tracking-wide text-emerald-50">{feature.title}</h4>
                      <p className="mt-1.5 text-[11px] font-medium text-emerald-200/50">{feature.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Right Column: The Gateway Card */}
            <motion.div 
              className="lg:col-span-5 relative"
              initial={{ scale: 0.95, opacity: 0, rotateY: 10 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              transition={{ delay: 1.1, duration: 1.2, type: "spring", bounce: 0.4 }}
              style={{ perspective: 1000 }}
            >
              <div className="absolute -inset-1 rounded-[3rem] bg-gradient-to-br from-emerald-400/30 via-yellow-500/20 to-emerald-900/50 blur-2xl opacity-60" />
              <div className="glass-eden relative rounded-[3rem] p-10 overflow-hidden">
                <div className="absolute -top-12 -right-12 p-6 opacity-[0.05] text-yellow-400 pointer-events-none">
                  <Sparkles size={280} />
                </div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-10">
                    <div className="h-2 w-2 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)] animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-400">Portail des Gardiens</span>
                  </div>

                  <h3 className="text-3xl font-black text-white" style={{ fontFamily: "'Cinzel', serif" }}>Entrez dans<br/>le sanctuaire</h3>
                  <p className="mt-5 text-sm font-medium leading-relaxed text-emerald-100/70">
                    Connectez-vous pour administrer les ressources, cultiver la croissance et préparer la grande célébration.
                  </p>

                  <div className="mt-12 space-y-5">
                    <motion.button
                      whileHover={{ scale: 1.02, x: 5 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowLoginModal(true)}
                      className="group flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-400 p-5 text-white shadow-[0_10px_30px_rgba(16,185,129,0.3)]"
                    >
                      <span className="text-[12px] font-black uppercase tracking-widest text-white shadow-sm">Ouvrir les portes</span>
                      <ChevronRight size={20} className="transition-transform group-hover:translate-x-1" />
                    </motion.button>
                    
                    <div className="rounded-2xl border border-emerald-500/20 bg-black/20 p-6 backdrop-blur-md">
                      <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400/80 mb-4">La Grande Célébration</p>
                      <CountdownCard targetDate={`${DEFAULT_CONFIG.year}-10-31T23:59:59`} />
                    </div>
                  </div>

                  <div className="mt-10 pt-8 border-t border-emerald-800/50 flex items-center justify-between">
                    <div className="text-center">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500/80">Version</p>
                      <p className="text-xs font-bold text-emerald-100 mt-1">Eden 4.2.0</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500/80">Statut</p>
                      <p className="text-xs font-bold text-yellow-400 mt-1 flex items-center justify-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.8)]" /> Divin
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </main>

          {/* Footer */}
          <motion.footer 
            className="mt-16 py-8 border-t border-emerald-900/50 flex flex-col md:flex-row items-center justify-between gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500/80">
              © {DEFAULT_CONFIG.year} AD ATTÉCOUBÉ • Église Locale
            </p>
            <div className="flex items-center gap-8">
              <a href="#" className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500/80 hover:text-yellow-400 transition-colors">Support</a>
              <a href="#" className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500/80 hover:text-yellow-400 transition-colors">Confidentialité</a>
              <a href="#" className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500/80 hover:text-yellow-400 transition-colors">Bible Online</a>
            </div>
          </motion.footer>
        </div>

        {/* Login Modal Overlay */}
        <AnimatePresence>
          {showLoginModal && (
            <motion.div
              className="fixed inset-0 z-[110] flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="absolute inset-0 bg-[#022c22]/90 backdrop-blur-xl"
                onClick={() => setShowLoginModal(false)}
              />
              <motion.form
                onSubmit={handleAppLogin}
                className="relative w-full max-w-md rounded-[2.5rem] p-10 shadow-[0_30px_60px_rgba(0,0,0,0.5)] border border-emerald-500/20 glass-eden"
                initial={{ y: 50, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 30, opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              >
                <button type="button" className="absolute right-8 top-8 text-emerald-500/50 hover:text-yellow-400 transition-colors" onClick={() => setShowLoginModal(false)}>
                  <X />
                </button>
                <h3 className="text-3xl font-black text-white" style={{ fontFamily: "'Cinzel', serif" }}>Le Portail</h3>
                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Accès Restreint aux Gardiens</p>
                
                <div className="mt-10 space-y-5">
                  <div className="space-y-2">
                    <label className="ml-4 text-[10px] font-black uppercase tracking-widest text-emerald-500/80">Identifiant Sacré</label>
                    <input type="text"
                      required
                      placeholder="Email ou Téléphone"
                      className="text-white w-full rounded-2xl border border-emerald-500/20 bg-black/20 px-5 py-4 font-bold text-white placeholder-emerald-700/60 outline-none focus:border-yellow-500/50 focus:bg-black/40 transition-all shadow-inner"
                      value={loginData.identifier}
                      onChange={(e) => setLoginData((prev) => ({ ...prev, identifier: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="ml-4 text-[10px] font-black uppercase tracking-widest text-emerald-500/80">Sceau de passage</label>
                    <input type="password"
                      required
                      placeholder="••••••••"
                      className="text-white w-full rounded-2xl border border-emerald-500/20 bg-black/20 px-5 py-4 font-bold text-white placeholder-emerald-700/60 outline-none focus:border-yellow-500/50 focus:bg-black/40 transition-all shadow-inner"
                      value={loginData.password}
                      onChange={(e) => setLoginData((prev) => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <label className="flex items-center gap-3 text-xs font-bold text-emerald-400/80 cursor-pointer hover:text-emerald-300 transition-colors">
                    <input type="checkbox"
                      className="text-white accent-yellow-500 w-4 h-4 rounded border-emerald-700 bg-black/20"
                      checked={loginData.remember}
                      onChange={(e) => setLoginData((prev) => ({ ...prev, remember: e.target.checked }))}
                    />
                    Préserver l'accès
                  </label>
                </div>

                {loginError && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-6 rounded-2xl bg-red-900/30 border border-red-500/30 p-4 text-xs font-bold text-red-400"
                  >
                    {loginError}
                  </motion.p>
                )}

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit" 
                  className="mt-10 w-full rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-500 px-4 py-5 text-[12px] font-black uppercase tracking-[0.2em] text-amber-950 shadow-[0_10px_20px_rgba(250,204,21,0.2)] hover:from-yellow-400 hover:to-amber-400 transition-all"
                >
                  Franchir le Portail
                </motion.button>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="min-h-screen overflow-x-hidden bg-[#022c22] text-emerald-50 antialiased selection:bg-fag-primary/30"
      style={{ fontFamily: "'Montserrat', sans-serif" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&family=Cinzel:wght@600;700;800&display=swap');`}</style>
      
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Main sunlight */}
        <motion.div 
          className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-yellow-500/10 blur-[150px]"
          animate={shouldReduceMotion ? { opacity: 0.1 } : { scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Deep green ambient */}
        <motion.div 
          className="absolute top-[30%] -left-[20%] w-[70%] h-[70%] rounded-full bg-emerald-900/20 blur-[150px]"
          animate={shouldReduceMotion ? { opacity: 0.1 } : { x: [0, 50, 0], y: [0, 30, 0], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Floating particles (spores/light dust) */}
        {!shouldReduceMotion && [...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-yellow-200/30"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100 - Math.random() * 100],
              x: [0, (Math.random() - 0.5) * 100],
              opacity: [0, 0.6, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 10 + Math.random() * 15,
              repeat: Infinity,
              delay: Math.random() * 10,
              ease: "linear",
            }}
          />
        ))}
      </div>

      <div className="min-h-screen md:flex">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-emerald-500/20 bg-[#042f2e]/95 backdrop-blur-xl border-b border-emerald-500/20 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <img src="/logos/logo-ad-att.png" alt="Logo AD" className="h-9 w-9 rounded-xl object-cover" />
            <div>
              <p className="text-sm font-black uppercase leading-none text-white">FAG {config.year}</p>
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-500/80">Trésorerie</p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="rounded-xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-2 text-emerald-100"
            aria-label="Ouvrir le menu"
          >
            <Menu size={18} />
          </button>
        </header>

        {isMobileMenuOpen && <div className="fixed inset-0 z-40 bg-slate-900/50 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex h-screen w-72 transform flex-col overflow-hidden bg-[#042f2e]/90 backdrop-blur-xl p-5 text-white shadow-2xl transition-transform duration-300 md:translate-x-0 md:p-6 border-r border-emerald-500/20 ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full bg-[#042f2e]/40 backdrop-blur-md glass-eden-card/10 blur-3xl" />
          <div className="relative mb-10 flex items-center gap-3">
            <div className="relative">
              <div className="absolute -inset-1 rounded-2xl bg-fag-primary/20 blur-sm" />
              <img src="/logos/logo-att.png" alt="Logo ATT" className="relative h-14 w-14 rounded-2xl object-cover shadow-lg border border-white/10" />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase leading-none tracking-tight text-white">FAG {config.year}</h1>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-yellow-200/80">Tableau de Bord</p>
            </div>
          </div>
          <nav className="relative flex-1 space-y-2 overflow-y-auto pr-1">
            {[
              ["dashboard", "Pilotage", LayoutDashboard],
              ["members", "Fidèles", Users],
              ["expenses", "Dépenses", HandCoins],
              ["deposits", "Comité/Banque", Landmark],
              ["marketing", "Campagnes", Megaphone],
              ["settings", "Réglages", SettingsIcon]
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
                    className={`group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl px-4 py-4 text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${
                      isActive
                        ? "bg-[#042f2e]/40 backdrop-blur-md glass-eden-card text-fag-primary shadow-lg shadow-black/10"
                        : "text-yellow-100/80 hover:bg-[#042f2e]/40 backdrop-blur-md glass-eden-card/10 hover:text-white"
                    }`}
                  >
                    <Icon size={18} className={isActive ? "text-fag-primary" : "text-yellow-200/80 group-hover:text-white transition-colors"} />
                    <span className="flex-1 text-left">{label}</span>
                    {isActive && <motion.div layoutId="activeNav" className="h-1.5 w-1.5 rounded-full bg-fag-primary" />}
                  </button>
                );
              })}
          </nav>
          
          <div className="relative mt-6 overflow-hidden rounded-3xl border border-white/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card/10 p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-yellow-100/80">Caisse Actuelle</p>
            <p className="mt-2 text-2xl font-black text-white">{money(stats.cashInHand)}</p>
            <div className="mt-4 h-1 w-full bg-black/20 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-[#042f2e]/40 backdrop-blur-md glass-eden-card"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, stats.progression)}%` }}
              />
            </div>
          </div>

          <div className="mt-6 border-t border-white/20 pt-6 space-y-4">
            {sessionUser && (
              <div className="flex items-center gap-3 px-2">
                <div className="h-8 w-8 rounded-full bg-[#042f2e]/40 backdrop-blur-md glass-eden-card/20 flex items-center justify-center text-white text-xs font-black">
                  {sessionUser.fullName?.[0]}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-black uppercase tracking-wider text-white">{sessionUser.fullName}</p>
                  <p className="truncate text-[9px] font-bold text-yellow-200/80 uppercase tracking-widest">{ROLE_LABELS[sessionUser.role] || sessionUser.role}</p>
                </div>
              </div>
            )}
            <button
              onClick={handleAppLogout}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[#042f2e]/40 backdrop-blur-md glass-eden-card/10 border border-white/20 px-5 py-4 text-[10px] font-black uppercase tracking-widest text-white hover:bg-red-500 hover:border-red-500 transition-all duration-300"
            >
              Déconnexion
            </button>
          </div>
        </aside>

        <main className="relative min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 md:ml-72 md:h-screen md:overflow-y-auto md:p-8 lg:p-10">
          <header className="sticky top-0 z-30 mb-8 flex flex-col gap-6 rounded-[2rem] border border-emerald-500/30 bg-[#064e3b] px-8 py-5 shadow-2xl md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-fag-primary animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-300">Pilotage FAG</span>
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
                {activeTab === "dashboard" && "Dashboard"}
                {activeTab === "members" && "Fidèles"}
                {activeTab === "expenses" && "Dépenses"}
                {activeTab === "deposits" && "Trésorerie"}
                {activeTab === "marketing" && "Communication"}
                {activeTab === "settings" && "Paramètres"}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest ${managementBackendReady ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-400"}`}
                >
                  {managementBackendReady ? "Online" : "Offline"}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest ${netOnline ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-400"}`}
                >
                  {netOnline ? "Connecté" : "Déconnecté"}
                </span>
              </div>
              <p className="mt-2 border-l-4 border-emerald-500 pl-3 text-[10px] font-extrabold uppercase tracking-[0.25em] text-emerald-400/80">
                Trésorerie synchronisée • {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
              <motion.p
                className="mt-1 text-[10px] font-semibold italic text-emerald-400/90"
                animate={shouldReduceMotion ? { opacity: 1 } : { y: [0, -2, 0], opacity: [0.85, 1, 0.85] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
              >
                “L&apos;Eternel Dieu planta un jardin en Eden...” — Genèse 2:8
              </motion.p>
              {backendError && (
                <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-red-400">
                  {backendError}
                </p>
              )}
            </div>
            {activeTab === "dashboard" && (
              <div className="hidden shrink-0 rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card/90 px-4 py-3 shadow-sm md:flex md:items-center md:gap-4">
                <div className="text-right">
                  <p className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-500/80">Progression</p>
                  <p className="text-xl font-black text-emerald-400">{stats.progression.toFixed(1)}%</p>
                </div>
                <div className="h-10 w-px bg-emerald-800/40" />
                <div className="text-right">
                  <p className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-500/80">Fidèles</p>
                  <p className="text-xl font-black text-white">{members.length}</p>
                </div>
              </div>
            )}
          </header>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Activity size={40} className="animate-spin text-emerald-500" />
              <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.25em] text-emerald-500/80">Chargement des données FAG…</p>
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
                      className="group relative overflow-hidden rounded-[2rem] border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-6 shadow-sm transition hover:shadow-xl"
                    >
                      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-400/10 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-emerald-900/300/15 p-2.5 text-emerald-400"><HandCoins size={20} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">Total encaissé</p>
                      </div>
                      <p className="mt-4 text-[28px] font-black leading-none text-emerald-400">{money(stats.totalCollected)}</p>
                      <p className="mt-2 text-[10px] font-extrabold uppercase tracking-widest text-emerald-500/80">
                        {stats.progression.toFixed(1)}% de l&apos;objectif
                      </p>
                    </motion.div>

                    <motion.div
                      variants={edenItemVariants}
                      whileHover={shouldReduceMotion ? {} : { y: -6, scale: 1.01 }}
                      className="group relative overflow-hidden rounded-[2rem] border border-red-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-6 shadow-sm transition hover:shadow-xl"
                    >
                      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-red-400/10 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-red-500/15 p-2.5 text-red-600"><Receipt size={20} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">Dépenses validées</p>
                      </div>
                      <p className="mt-4 text-[28px] font-black leading-none text-red-600">{money(stats.totalExpenses)}</p>
                      <p className="mt-2 text-[10px] font-extrabold uppercase tracking-widest text-red-500/80">
                        {stats.totalCollected > 0 ? ((stats.totalExpenses / stats.totalCollected) * 100).toFixed(1) : "0.0"}% du collecté
                      </p>
                    </motion.div>

                    <motion.div
                      variants={edenItemVariants}
                      whileHover={shouldReduceMotion ? {} : { y: -6, scale: 1.01 }}
                      className="group relative overflow-hidden rounded-[2rem] border border-yellow-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-6 shadow-sm transition hover:shadow-xl"
                    >
                      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-blue-400/10 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-emerald-900/200/15 p-2.5 text-yellow-400"><Landmark size={20} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">Versements comité</p>
                      </div>
                      <p className="mt-4 text-[28px] font-black leading-none text-yellow-400">{money(stats.totalHandedOver)}</p>
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

                    <div className={`group relative overflow-hidden rounded-[2rem] border p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${stats.recoveryRate >= 60 ? "border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card" : "border-orange-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card"}`}>
                      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl ${stats.recoveryRate >= 60 ? "bg-emerald-400/10" : "bg-orange-400/10"}`} />
                      <div className="flex items-center gap-3">
                        <div className={`rounded-2xl p-2.5 ${stats.recoveryRate >= 60 ? "bg-emerald-900/300/15 text-emerald-400" : "bg-orange-500/15 text-orange-600"}`}>
                          <Target size={20} />
                        </div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">Taux recouvrement</p>
                      </div>
                      <p className={`mt-4 text-[28px] font-black leading-none ${stats.recoveryRate >= 60 ? "text-emerald-400" : "text-orange-600"}`}>
                        {stats.recoveryRate.toFixed(1)}%
                      </p>
                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-emerald-800/40">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-700 ${stats.recoveryRate >= 60 ? "bg-emerald-900/300" : "bg-orange-500"}`}
                          style={{ width: `${Math.min(100, stats.recoveryRate)}%` }}
                        />
                      </div>
                    </div>

                    <div className="group relative overflow-hidden rounded-[2rem] border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-slate-400/10 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-slate-900/90 p-2.5 text-white"><Sparkles size={20} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">Reste à mobiliser</p>
                      </div>
                      <p className="mt-4 text-[28px] font-black leading-none text-white">{money(stats.remainingGoal)}</p>
                      <p className="mt-2 text-[10px] font-extrabold uppercase tracking-widest text-emerald-500/80">
                        {stats.monthlyGrowth >= 0 ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400"><TrendingUp size={12} /> +{stats.monthlyGrowth.toFixed(1)}% vs mois -1</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600"><TrendingDown size={12} /> {stats.monthlyGrowth.toFixed(1)}% vs mois -1</span>
                        )}
                        <br />
                        Objectif: {money(config.globalGoal)}
                      </p>
                      <div className="mt-4 rounded-2xl border border-emerald-500/10 bg-[#022c22] p-4">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">Signal du mois</p>
                        <p className={`mt-2 text-lg font-black ${stats.monthlyGrowth >= 0 ? "text-emerald-400" : "text-red-600"}`}>
                          {stats.monthlyGrowth >= 0 ? "+" : ""}
                          {stats.monthlyGrowth.toFixed(1)}%
                        </p>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500/80">Variation des encaissements vs mois précédent</p>
                      </div>
                    </div>

                    <div className="min-w-0 rounded-[2.5rem] bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-8 shadow-sm lg:col-span-8">
                      <h3 className="mb-6 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-emerald-50">
                        <BarChart3 size={16} className="text-emerald-500" />
                        Analyse prévisionnelle
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500/80">
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
                                <td className="py-4 text-center font-extrabold text-emerald-200/80">
                                  {cat.count} {cat.target > 0 ? `/ ${cat.target}` : ""}
                                </td>
                                <td className="py-4 text-right font-extrabold">{money(cat.promised)}</td>
                                <td className="py-4 text-right font-black text-emerald-400">{money(cat.collected)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-white/5 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card/[0.03] p-8">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                      <HandCoins size={18} className="text-fag-primary" />
                      Rapprochement de Caisse
                    </h3>
                    <p className="mt-4 text-sm text-emerald-500/80">
                      Calcul théorique basé sur le flux enregistré: Encaissements − Dépenses − Remises.
                    </p>
                    <div className="mt-6 flex flex-wrap items-center gap-4 text-xl font-black text-white">
                      <span className="text-fag-primary">{money(stats.totalCollected)}</span>
                      <span className="text-emerald-200/80">−</span>
                      <span className="text-red-400">{money(stats.totalExpenses)}</span>
                      <span className="text-emerald-200/80">−</span>
                      <span className="text-fag-secondary">{money(stats.totalHandedOver)}</span>
                      <span className="text-emerald-200/80">=</span>
                      <span className="bg-fag-primary/10 px-4 py-2 rounded-2xl text-fag-primary border border-fag-primary/20">
                        {money(stats.cashInHand)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                    <div className="min-w-0 rounded-[2.5rem] bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-8 shadow-sm lg:col-span-8">
                      <h3 className="mb-5 text-[11px] font-extrabold uppercase tracking-widest text-emerald-50">
                        Courbe de performance mensuelle (encaissements vs dépenses)
                      </h3>
                      {stats.monthlyFinance.length === 0 ? (
                        <p className="rounded-2xl border border-emerald-500/10 bg-[#022c22] p-6 text-center text-[10px] font-extrabold uppercase tracking-widest text-emerald-500/80">
                          Pas encore de données mensuelles
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {stats.monthlyFinance.map((row) => (
                            <div key={row.monthKey} className="rounded-2xl border border-emerald-500/10 bg-[#022c22] p-4">
                              <div className="mb-2 flex items-center justify-between">
                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">{row.monthKey}</span>
                                <span className={`text-[10px] font-extrabold uppercase tracking-widest ${row.net >= 0 ? "text-emerald-400" : "text-red-600"}`}>
                                  Net {money(row.net)}
                                </span>
                              </div>
                              <div className="space-y-2">
                                <div>
                                  <div className="mb-1 flex justify-between text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">
                                    <span>Encaissements</span>
                                    <span>{money(row.collected)}</span>
                                  </div>
                                  <div className="h-2 rounded-full bg-emerald-800/40">
                                    <div className="h-2 rounded-full bg-emerald-900/300" style={{ width: `${(row.collected / maxMonthlyCollected) * 100}%` }} />
                                  </div>
                                </div>
                                <div>
                                  <div className="mb-1 flex justify-between text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">
                                    <span>Dépenses</span>
                                    <span>{money(row.spent)}</span>
                                  </div>
                                  <div className="h-2 rounded-full bg-emerald-800/40">
                                    <div className="h-2 rounded-full bg-red-500" style={{ width: `${(row.spent / maxMonthlySpent) * 100}%` }} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 rounded-[2.5rem] bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-8 shadow-sm lg:col-span-4">
                      <h3 className="mb-5 text-[11px] font-extrabold uppercase tracking-widest text-emerald-50">Diagramme des canaux de paiement</h3>
                      <div className="space-y-4">
                        {Object.entries(stats.methodBreakdown).map(([method, amount]) => {
                          const total = Math.max(1, stats.totalCollected);
                          const percent = (amount / total) * 100;
                          return (
                            <div key={method}>
                              <div className="mb-1 flex justify-between text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">
                                <span>{method}</span>
                                <span>
                                  {percent.toFixed(1)}% • {money(amount)}
                                </span>
                              </div>
                              <div className="h-2 rounded-full bg-emerald-800/40">
                                <div
                                  className={`h-2 rounded-full ${method === "Espèces" ? "bg-slate-900" : method === "Mobile Money" ? "bg-emerald-900/300" : "bg-emerald-900/200"}`}
                                  style={{ width: `${Math.max(3, percent)}%` }}
                                />
      </div>
    </div>
                          );
                        })}
                      </div>
                      <div className="mt-6 rounded-2xl border border-emerald-500/10 bg-[#022c22] p-4">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">Ticket moyen</p>
                        <p className="mt-1 text-xl font-black text-white">{money(stats.averageContribution)}</p>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500/80">Montant moyen encaissé par membre</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                    <div className="min-w-0 rounded-[2.5rem] bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-8 shadow-sm lg:col-span-8">
                      <h3 className="mb-5 text-[11px] font-extrabold uppercase tracking-widest text-emerald-50">Santé des mensualités (M1 à M6)</h3>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                        {stats.monthlyGlobalProgress.map((count, i) => (
                          <div key={i} className="rounded-2xl border border-emerald-500/10 bg-[#022c22] p-4 text-center">
                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500/80">M{i + 1}</p>
                            <p className="mt-2 text-2xl font-black text-white">{count}</p>
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
                        <div className="mt-4 rounded-2xl bg-emerald-900/300/20 p-4">
                          <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-300">Catégorie leader</p>
                          <p className="mt-1 text-sm font-black uppercase text-white">{bestCategory.label}</p>
                          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-300">{money(bestCategory.collected)} encaissés</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-8 rounded-[3rem] border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-8 shadow-sm">
                    <div className="flex flex-col gap-2 border-b border-emerald-500/10 pb-6 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">Synthèse Opérationnelle</h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80 mt-1">Performance par segment et cumul mensuel</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                      <div className="min-w-0 overflow-x-auto rounded-[2rem] border border-emerald-500/20 bg-[#022c22] lg:col-span-8">
                        <table className="w-full min-w-[760px] text-left">
                          <thead className="bg-emerald-900/40/50 text-[10px] font-black uppercase tracking-widest text-emerald-400/80">
                            <tr>
                              <th className="px-6 py-4">Catégorie</th>
                              <th className="px-6 py-4 text-center">Inscrits</th>
                              <th className="px-6 py-4 text-center">Taux Recr.</th>
                              <th className="px-6 py-4 text-right">Engagement</th>
                              <th className="px-6 py-4 text-right">Collecté</th>
                              <th className="px-6 py-4 text-center">% Réalisé</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-[11px] font-bold text-white uppercase">
                            {categorySheetRows.map((row) => (
                              <tr key={row.id} className="hover:bg-[#042f2e]/40 backdrop-blur-md glass-eden-card/[0.03] transition-colors">
                                <td className="px-6 py-4 font-black">{row.label}</td>
                                <td className="px-6 py-4 text-center">{row.count} <span className="text-emerald-200/80">/ {row.target > 0 ? row.target : "∞"}</span></td>
                                <td className="px-6 py-4 text-center text-fag-secondary">{row.recruitRate.toFixed(1)}%</td>
                                <td className="px-6 py-4 text-right">{money(row.promised)}</td>
                                <td className="px-6 py-4 text-right text-fag-primary">{money(row.collected)}</td>
                                <td className="px-6 py-4 text-center">
                                  <div className="flex items-center gap-2 justify-center">
                                    <div className="h-1.5 w-12 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card/5 rounded-full overflow-hidden">
                                      <div className="h-full bg-fag-primary" style={{ width: `${row.realizationRate}%` }} />
                                    </div>
                                    <span className="w-10">{row.realizationRate.toFixed(1)}%</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="lg:col-span-4 space-y-6">
                        <div className="rounded-[2rem] border border-white/5 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card/[0.02] p-6">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400/80 mb-6">Volumes de Collecte</h4>
                          <div className="space-y-6">
                            {categorySheetRows.map((row) => (
                              <div key={`bar-${row.id}`}>
                                <div className="flex justify-between text-[10px] font-bold uppercase mb-2">
                                  <span className="text-white">{row.label}</span>
                                  <span className="text-fag-primary">{money(row.collected)}</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-[#042f2e]/40 backdrop-blur-md glass-eden-card/5 overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(row.collected / maxCategoryCollected) * 100}%` }}
                                    className="h-full bg-fag-primary shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "members" && (
                <div className="space-y-6">
                  <div className="rounded-[2rem] border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-5 shadow-sm md:p-6">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h2 className="text-sm font-black uppercase tracking-widest text-white">Gestion Fidèles</h2>
                      </div>
                      <div className="rounded-xl bg-[#042f2e]/40 backdrop-blur-md glass-eden-card/90 px-3 py-2 text-center shadow-sm md:text-left">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500/80">Vue filtrée</p>
                        <p className="mt-1 text-lg font-black text-emerald-400">
                          {memberFilteredStats.count} / {members.length}
                        </p>
                      </div>
                    </div>
                    {memberFilteredStats.count > 0 && (
                      <div className="mt-4 rounded-2xl border border-emerald-500/10 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-4">
                        <div className="flex flex-col gap-2 text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80 md:flex-row md:items-center md:justify-between">
                          <span>
                            Engagement (filtre): <span className="text-white">{money(memberFilteredStats.promised)}</span>
                          </span>
                          <span>
                            Versé (filtre): <span className="text-emerald-400">{money(memberFilteredStats.paid)}</span>
                          </span>
                          <span>
                            Taux sur la sélection: <span className="text-yellow-400">{memberFilteredStats.progressPct.toFixed(1)}%</span>
                          </span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-900/40">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-500"
                            style={{ width: `${memberFilteredStats.progressPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="group relative overflow-hidden rounded-3xl border border-emerald-500/10 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                      <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-slate-900/5 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-slate-900 p-2.5 text-white"><Users size={18} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">Fidèles enregistrés</p>
                      </div>
                      <p className="mt-3 text-3xl font-black text-white">{members.length}</p>
                    </div>
                    <div className="group relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                      <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-emerald-400/10 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-emerald-900/300/15 p-2.5 text-emerald-400"><CheckCircle size={18} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">Engagements soldés</p>
                      </div>
                      <p className="mt-3 text-3xl font-black text-emerald-400">{memberInsights.completed}</p>
                    </div>
                    <div className="group relative overflow-hidden rounded-3xl border border-orange-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                      <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-orange-400/10 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-orange-500/15 p-2.5 text-orange-600"><Clock size={18} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">Reliquats actifs</p>
                      </div>
                      <p className="mt-3 text-3xl font-black text-orange-600">{memberInsights.pending}</p>
                    </div>
                    <div className="group relative overflow-hidden rounded-3xl border border-yellow-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                      <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-blue-400/10 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-emerald-900/200/15 p-2.5 text-yellow-400"><Sparkles size={18} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">Meilleur contributeur</p>
                      </div>
                      <p className="mt-3 text-base font-black uppercase text-white">{memberInsights.topContributorName}</p>
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">{money(memberInsights.topContributorAmount)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex w-full flex-col gap-3 lg:max-w-3xl lg:flex-row">
                      <div className="relative w-full">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input className="text-white w-full rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card py-3 pl-11 pr-4 font-semibold outline-none focus:border-emerald-500"
                          placeholder="Nom, WhatsApp, quartier, fonction…"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <select className="text-white rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 text-[11px] font-extrabold uppercase tracking-widest text-emerald-200/80 outline-none focus:border-emerald-500"
                        value={memberCategoryFilter}
                        onChange={(e) => setMemberCategoryFilter(e.target.value)}
                      >
                        <option className="bg-[#022c22] text-white" value="all">Toutes catégories</option>
                        {config.categories.map((cat) => (
                          <option className="bg-[#022c22] text-white" key={cat.id} value={cat.id}>
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
                            memberFilter === id ? "bg-slate-900 text-white" : "bg-[#042f2e]/40 backdrop-blur-md glass-eden-card text-emerald-200/80"
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
                        className="rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80 hover:bg-[#022c22]"
                      >
                        Réinitialiser filtres
                      </button>
                      <button
                        type="button"
                        onClick={exportMembersCsv}
                        className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-900/30 px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-emerald-800 hover:bg-emerald-100"
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

                  <div className="overflow-x-auto rounded-[2.5rem] bg-[#042f2e]/40 backdrop-blur-md glass-eden-card shadow-sm border border-emerald-500/20">
                    <table className="w-full min-w-[1180px]">
                      <thead className="bg-[#022c22] text-[10px] font-black uppercase tracking-widest text-emerald-400/80">
                        <tr>
                          <th className="px-8 py-5 text-left">Fidèle</th>
                          <th className="px-8 py-5 text-left">Identité & Contact</th>
                          <th className="px-8 py-5 text-center">Mensualités</th>
                          <th className="px-8 py-5 text-right">Collecté</th>
                          <th className="px-8 py-5 text-center">Progression</th>
                          <th className="px-8 py-5 text-center">Gestion</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-white">
                        {filteredMembers.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-6 py-16 text-center">
                              <p className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-500/80">
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
                              className={`group transition-colors hover:bg-[#022c22] ${isSettled ? "bg-emerald-900/30/50" : ""}`}
                            >
                              <td className="px-8 py-6">
                                <p className="font-black uppercase tracking-tight text-white">{m.name}</p>
                                <div className="mt-1 flex items-center gap-2">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-100 px-2 py-0.5 rounded-md">
                                    {cat?.label || "Libre"}
                                  </span>
                                  {credit > 0 && <span className="text-[9px] font-black uppercase tracking-widest text-orange-600">+ {money(credit)}</span>}
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200/80">
                                  {m.churchFunction || "Membre"}
                                </p>
                                <p className="mt-1 text-[10px] font-bold text-emerald-400/80">{m.whatsapp || "Non renseigné"}</p>
                                <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-emerald-500/80">{m.district || "Secteur Alpha"}</p>
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex justify-center gap-1.5">
                                  {Array.from({ length: config.months }).map((_, i) => (
                                    <div
                                      key={i}
                                      className={`flex h-8 w-8 items-center justify-center rounded-xl border text-[10px] font-black transition-all ${
                                        i < fullMonths
                                          ? "border-emerald-500 bg-emerald-900/300 text-white shadow-lg shadow-emerald-200"
                                          : "border-emerald-500/20 bg-emerald-900/40 text-emerald-500/80"
                                      }`}
                                    >
                                      {i < fullMonths ? <CheckCircle size={14} /> : i + 1}
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="px-8 py-6 text-right font-black text-white">{money(paid)}</td>
                              <td className="px-8 py-6">
                                <div className="mx-auto max-w-[140px]">
                                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest mb-2">
                                    <span className={isSettled ? "text-emerald-400" : "text-emerald-500/80"}>{progressRow.toFixed(0)}%</span>
                                    <span className="text-emerald-400/80">/ {money(totalCommit)}</span>
                                  </div>
                                  <div className="h-1.5 overflow-hidden rounded-full bg-emerald-900/40">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${progressRow}%` }}
                                      className={`h-full rounded-full ${isSettled ? "bg-emerald-900/300" : "bg-blue-400"}`}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-6 text-center">
                                <div className="flex flex-wrap items-center justify-center gap-2 transition-all">
                                  <button
                                    type="button"
                                    onClick={() => openEditMemberModal(m)}
                                    className="p-2.5 rounded-xl bg-emerald-900/40 text-emerald-400/80 hover:bg-emerald-800/40 hover:text-white transition-all"
                                  >
                                    <Pencil size={16} />
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
                                    className="rounded-xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-2 text-emerald-400/80 hover:bg-[#022c22]"
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
                                    className="rounded-xl border border-red-500/20 bg-red-50 p-2 text-red-600 hover:bg-red-100"
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
                  <div className="rounded-[2rem] border border-red-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-5 shadow-sm md:p-6">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h2 className="text-sm font-black uppercase tracking-widest text-white">Sorties de Caisse</h2>
                      </div>
                      <div className="rounded-xl bg-[#042f2e]/40 backdrop-blur-md glass-eden-card/90 px-3 py-2 text-center shadow-sm md:text-left">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500/80">Lignes filtrées</p>
                        <p className="mt-1 text-lg font-black text-red-400">
                          {filteredExpenses.length} / {expenses.length}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-emerald-500/10 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-4 text-[10px] font-extrabold uppercase tracking-widest text-emerald-200/80 md:flex-row md:items-center md:justify-between">
                      <span>
                        Part des dépenses filtrées vs collecté total :{" "}
                        <span className="text-white">
                          {stats.totalCollected > 0 ? ((expenseFilteredSum / stats.totalCollected) * 100).toFixed(1) : "0.0"}%
                        </span>
                      </span>
                      <span className="text-emerald-500/80">Collecté à ce jour : {money(stats.totalCollected)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="group relative overflow-hidden rounded-3xl border border-red-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                      <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-red-400/10 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-red-500/15 p-2.5 text-red-600"><Receipt size={18} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">Total dépenses</p>
                      </div>
                      <p className="mt-3 text-3xl font-black text-red-600">{money(stats.totalExpenses)}</p>
                      <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-emerald-500/80">Historique complet</p>
                    </div>
                    <div className="group relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                      <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-slate-900/5 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-slate-900 p-2.5 text-white"><BarChart3 size={18} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">Montant filtré</p>
                      </div>
                      <p className="mt-3 text-3xl font-black text-white">{money(expenseFilteredSum)}</p>
                    </div>
                    <div className="group relative overflow-hidden rounded-3xl border border-yellow-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                      <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-blue-400/10 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-emerald-900/200/15 p-2.5 text-yellow-400"><Activity size={18} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">Opérations</p>
                      </div>
                      <p className="mt-3 text-3xl font-black text-white">{filteredExpenses.length}</p>
                    </div>
                    <div className="group relative overflow-hidden rounded-3xl border border-orange-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                      <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-orange-400/10 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-orange-500/15 p-2.5 text-orange-600"><Coins size={18} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">Ticket moyen (filtre)</p>
                      </div>
                      <p className="mt-3 text-3xl font-black text-white">
                        {money(filteredExpenses.length > 0 ? expenseFilteredSum / filteredExpenses.length : 0)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-[2.5rem] bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-6 shadow-sm">
                    <div className="flex w-full flex-col gap-3 lg:max-w-3xl lg:flex-row">
                      <div className="relative w-full">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input className="text-white w-full rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card py-3 pl-11 pr-4 font-semibold outline-none focus:border-red-500"
                          placeholder="Rechercher dans la description…"
                          value={expenseSearchTerm}
                          onChange={(e) => setExpenseSearchTerm(e.target.value)}
                        />
                      </div>
                      <select className="text-white rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 text-[11px] font-extrabold uppercase tracking-widest text-emerald-200/80 outline-none focus:border-red-500"
                        value={expenseCategoryFilter}
                        onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                      >
                        {expenseCategories.map((cat) => (
                          <option className="bg-[#022c22] text-white" key={cat} value={cat}>
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
                        className="rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80 hover:bg-[#022c22]"
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
                    <div className="overflow-x-auto rounded-[2.5rem] bg-[#042f2e]/40 backdrop-blur-md glass-eden-card shadow-sm border border-emerald-500/20 lg:col-span-8">
                      <table className="w-full min-w-[980px]">
                      <thead className="bg-[#022c22] text-[10px] font-black uppercase tracking-widest text-emerald-400/80">
                        <tr>
                          <th className="px-8 py-5 text-left">Date</th>
                          <th className="px-8 py-5 text-left">Désignation</th>
                          <th className="px-8 py-5 text-left">Catégorie</th>
                          <th className="px-8 py-5 text-left">Paiement</th>
                          <th className="px-8 py-5 text-right">Montant</th>
                          <th className="px-8 py-5 text-center">Gestion</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-white">
                        {sortedFilteredExpenses.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-8 py-16 text-center text-[10px] font-black uppercase tracking-widest text-emerald-400/80 italic">
                              Aucune dépense enregistrée.
                            </td>
                          </tr>
                        )}
                        {sortedFilteredExpenses.map((e) => (
                          <tr key={e.id} className="group hover:bg-[#022c22] transition-colors">
                            <td className="px-8 py-6 font-bold text-emerald-400/80">{new Date(e.date).toLocaleDateString("fr-FR")}</td>
                            <td className="px-8 py-6 font-black uppercase tracking-tight">{e.description}</td>
                            <td className="px-8 py-6">
                              <span className="bg-emerald-900/40 border border-emerald-500/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-emerald-200/80">
                                {e.category}
                              </span>
                            </td>
                            <td className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-emerald-400/80">{e.method || "Espèces"}</td>
                            <td className="px-8 py-6 text-right font-black text-red-600">{money(e.amount)}</td>
                            <td className="px-8 py-6 text-center">
                              <div className="flex flex-wrap items-center justify-center gap-2 transition-all">
                                <button
                                  onClick={() => openEditExpense(e)}
                                  className="p-2.5 rounded-xl bg-emerald-900/40 text-emerald-400/80 hover:bg-emerald-800/40 hover:text-white transition-all"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!(await askConfirm("Supprimer cette dépense ?"))) return;
                                    await removeExpense(e.id);
                                  }}
                                  className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                    <div className="space-y-4 lg:col-span-4">
                      <div className="rounded-[2.5rem] bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-6 shadow-sm border border-emerald-500/20">
                        <h3 className="mb-4 text-[11px] font-extrabold uppercase tracking-widest text-emerald-50">Par catégorie</h3>
                        {expenseBreakdown.length === 0 ? (
                          <p className="rounded-2xl border border-emerald-500/10 bg-[#022c22] p-5 text-center text-[10px] font-extrabold uppercase tracking-widest text-emerald-500/80">
                            Aucune donnée filtrée
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {expenseBreakdown.map(([category, amount]) => {
                              const totalFiltered = Math.max(1, expenseFilteredSum);
                              const percent = (amount / totalFiltered) * 100;
                              return (
                                <div key={category}>
                                  <div className="mb-1 flex justify-between text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">
                                    <span>{category}</span>
                                    <span>
                                      {percent.toFixed(1)}% • {money(amount)}
                                    </span>
                                  </div>
                                  <div className="h-2 rounded-full bg-emerald-800/40">
                                    <div className="h-2 rounded-full bg-red-500" style={{ width: `${Math.max(4, percent)}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="rounded-[2.5rem] bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-6 shadow-sm border border-emerald-500/20">
                        <h3 className="mb-4 text-[11px] font-extrabold uppercase tracking-widest text-emerald-50">Par mode de paiement</h3>
                        {expenseMethodBreakdown.length === 0 ? (
                          <p className="rounded-2xl border border-emerald-500/10 bg-[#022c22] p-5 text-center text-[10px] font-extrabold uppercase tracking-widest text-emerald-500/80">
                            Aucune donnée filtrée
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {expenseMethodBreakdown.map(([mode, amount]) => {
                              const totalFiltered = Math.max(1, expenseFilteredSum);
                              const percent = (amount / totalFiltered) * 100;
                              return (
                                <div key={mode}>
                                  <div className="mb-1 flex justify-between text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">
                                    <span>{mode}</span>
                                    <span>
                                      {percent.toFixed(1)}% • {money(amount)}
                                    </span>
                                  </div>
                                  <div className="h-2 rounded-full bg-emerald-800/40">
                                    <div className="h-2 rounded-full bg-emerald-900/200" style={{ width: `${Math.max(4, percent)}%` }} />
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
                  <div className="rounded-[2rem] border border-yellow-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-5 shadow-sm md:p-6">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                      <div>
                        <h2 className="text-sm font-black uppercase tracking-widest text-white">Comité &amp; Banque</h2>
                      </div>
                      </div>
                      <div className="rounded-xl bg-[#042f2e]/40 backdrop-blur-md glass-eden-card/90 px-3 py-2 text-center shadow-sm md:text-left">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500/80">Vue filtrée</p>
                        <p className="mt-1 text-lg font-black text-yellow-500">
                          {depositFilteredRefSummary.n} / {deposits.length}
                        </p>
                        <p className="mt-1 text-[9px] font-extrabold uppercase tracking-widest text-emerald-400">
                          OK bordereau : {depositFilteredRefSummary.ok}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 rounded-2xl border border-emerald-500/10 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-4 text-[10px] font-extrabold uppercase tracking-widest text-emerald-200/80 md:grid-cols-2">
                      <p>
                        Cumul toutes remises : <span className="text-white">{money(depositInsights.sumAll)}</span>
                        <span className="ml-2 text-emerald-500/80">({depositInsights.countAll} décharge{depositInsights.countAll !== 1 ? "s" : ""})</span>
                      </p>
                      <p>
                        Sélection affichée : <span className="text-yellow-400">{money(depositInsights.totalFiltered)}</span>
                        {depositFilteredRefSummary.missing > 0 && (
                          <span className="ml-2 text-red-600">• {depositFilteredRefSummary.missing} sans réf.</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="group relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-5 text-white shadow-xl transition hover:-translate-y-1">
                      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-400/20 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-emerald-400/20 p-2.5 text-emerald-300"><PiggyBank size={18} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-200">Caisse à remettre</p>
                      </div>
                      <p className="mt-3 text-3xl font-black text-emerald-300">{money(stats.cashInHand)}</p>
                      <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-emerald-200/80">Après collectes et dépenses</p>
                    </div>
                    <div className="group relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                      <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-emerald-400/10 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-emerald-900/300/15 p-2.5 text-emerald-400"><CheckCircle size={18} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">Décharges documentées</p>
                      </div>
                      <p className="mt-3 text-3xl font-black text-emerald-400">{depositInsights.withRef}</p>
                      <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-emerald-500/80">Réf. ou lien pièce (total)</p>
                    </div>
                    <div className="group relative overflow-hidden rounded-3xl border border-red-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                      <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-red-400/10 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-red-500/15 p-2.5 text-red-600"><BellRing size={18} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">À compléter</p>
                      </div>
                      <p className="mt-3 text-3xl font-black text-red-600">{depositInsights.missingRef}</p>
                      <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-emerald-500/80">Sans référence (total)</p>
                    </div>
                    <div className="group relative overflow-hidden rounded-3xl border border-yellow-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                      <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-blue-400/10 blur-2xl" />
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-emerald-900/200/15 p-2.5 text-yellow-400"><Landmark size={18} /></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">Montant sélection</p>
                      </div>
                      <p className="mt-3 text-3xl font-black text-yellow-400">{money(depositInsights.totalFiltered)}</p>
                      <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-emerald-500/80">Selon filtres actifs</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-[2.5rem] bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-6 shadow-sm">
                    <div className="flex w-full flex-col gap-3 lg:max-w-3xl lg:flex-row">
                      <div className="relative w-full">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input className="text-white w-full rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card py-3 pl-11 pr-4 font-semibold outline-none focus:border-blue-500"
                          placeholder="Responsable ou référence…"
                          value={depositSearchTerm}
                          onChange={(e) => setDepositSearchTerm(e.target.value)}
                        />
                      </div>
                      <select className="text-white rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 text-[11px] font-extrabold uppercase tracking-widest text-emerald-200/80 outline-none focus:border-blue-500"
                        value={depositFilter}
                        onChange={(e) => setDepositFilter(e.target.value)}
                      >
                        <option className="bg-[#022c22] text-white" value="all">Toutes les remises</option>
                        <option className="bg-[#022c22] text-white" value="with_ref">Avec traçabilité (réf. ou lien)</option>
                        <option className="bg-[#022c22] text-white" value="missing_ref">Sans traçabilité</option>
                      </select>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDepositSearchTerm("");
                          setDepositFilter("all");
                        }}
                        className="rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80 hover:bg-[#022c22]"
                      >
                        Réinitialiser
                      </button>
                      <button
                        type="button"
                        onClick={exportDepositsCsv}
                        className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-emerald-900/20 px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-blue-800 hover:bg-yellow-500/20"
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
                  <div className="overflow-x-auto rounded-[2.5rem] bg-[#042f2e]/40 backdrop-blur-md glass-eden-card shadow-sm border border-emerald-500/20">
                    <table className="w-full min-w-[1180px]">
                      <thead className="bg-[#022c22] text-[10px] font-black uppercase tracking-widest text-emerald-400/80">
                        <tr>
                          <th className="px-8 py-5 text-left">Date</th>
                          <th className="px-8 py-5 text-left">Responsable</th>
                          <th className="px-8 py-5 text-right">Montant</th>
                          <th className="px-8 py-5 text-center">Traçabilité</th>
                          <th className="px-8 py-5 text-center">Référence</th>
                          <th className="px-8 py-5 text-center">Gestion</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-white">
                        {sortedFilteredDeposits.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-8 py-16 text-center text-[10px] font-black uppercase tracking-widest text-emerald-400/80 italic">
                              Aucune décharge enregistrée.
                            </td>
                          </tr>
                        )}
                        {sortedFilteredDeposits.map((d) => {
                          const hasTrace = !!(d.bordereauRef || String(d.bordereauUrl || "").trim());
                          return (
                            <tr
                              key={d.id}
                              className={`group transition-colors hover:bg-[#022c22] ${hasTrace ? "" : "bg-orange-50/30"}`}
                            >
                              <td className="px-8 py-6 font-bold text-emerald-400/80">{new Date(d.date).toLocaleDateString("fr-FR")}</td>
                              <td className="px-8 py-6 font-black uppercase tracking-tight">{d.recipient}</td>
                              <td className="px-8 py-6 text-right font-black text-fag-secondary">{money(d.amount)}</td>
                              <td className="px-8 py-6 text-center">
                                {hasTrace ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-800 border border-emerald-200">
                                    <CheckCircle size={12} /> Validé
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-orange-100 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-orange-800 border border-orange-200">
                                    À compléter
                                  </span>
                                )}
                              </td>
                              <td className="px-8 py-6 text-center">
                                {d.bordereauRef ? (
                                  <span className="rounded-xl bg-emerald-900/40 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-100 border border-emerald-500/20">
                                    {d.bordereauRef}
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => openBordereauModal(d.id)}
                                    className="rounded-xl bg-orange-100 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-orange-400 border border-orange-200 hover:bg-orange-200 transition-all"
                                  >
                                    Saisir réf.
                                )}
                              </td>
                              <td className="px-8 py-6 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => openEditDepositModal(d)}
                                    className="p-2.5 rounded-xl bg-emerald-900/40 text-emerald-400/80 hover:bg-emerald-800/40 hover:text-white transition-all"
                                    title="Modifier"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (!(await askConfirm("Supprimer cette remise ?"))) return;
                                      await removeDeposit(d.id);
                                    }}
                                    className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                                    title="Supprimer"
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

              {activeTab === "marketing" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-3xl bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-4 shadow-sm border border-emerald-500/20">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500/80">Ciblés</p>
                      <p className="mt-1 text-2xl font-black text-white">{marketingMembers.length}</p>
                    </div>
                    <div className="rounded-3xl bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-4 shadow-sm border border-emerald-500/20">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500/80">Filtre</p>
                      <p className="mt-1 text-sm font-black uppercase text-emerald-400">
                        {marketingFilter === "all" ? "Tous" : marketingFilter === "pending" ? "Reliquats" : "Soldés"}
                      </p>
                    </div>
                    <div className="rounded-3xl bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-4 shadow-sm border border-emerald-500/20">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500/80">Objectif</p>
                      <p className="mt-1 text-sm font-black uppercase text-emerald-50">Écoute & Foi</p>
                    </div>
                  </div>

                  <div className="rounded-[2.5rem] bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-6 shadow-sm border border-emerald-500/20">
                    <div className="relative w-full lg:max-w-xl">
                      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input className="text-white w-full rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card py-3 pl-11 pr-4 font-semibold outline-none focus:border-emerald-500"
                        placeholder="Rechercher (nom/WhatsApp)"
                        value={marketingSearchTerm}
                        onChange={(e) => setMarketingSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {[
                      { id: "all", label: "Audience Totale", icon: Megaphone, color: "text-fag-primary", bg: "bg-fag-primary/10" },
                      { id: "pending", label: "Reliquats Actifs", icon: BellRing, color: "text-orange-600", bg: "bg-orange-100" },
                      { id: "done", label: "Fidèles Soldés", icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-100" }
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setMarketingFilter(s.id)}
                        className={`relative group overflow-hidden rounded-[2.5rem] border p-8 text-left transition-all ${
                          marketingFilter === s.id ? "border-fag-primary bg-[#022c22] shadow-lg" : "border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card hover:bg-[#022c22]"
                        }`}
                      >
                        <div className={`inline-flex rounded-2xl p-4 ${s.bg} ${s.color}`}>
                          <s.icon size={28} />
                        </div>
                        <p className={`mt-6 text-xl font-black uppercase tracking-tight ${marketingFilter === s.id ? "text-white" : "text-emerald-500/80"}`}>
                          {s.label}
                        </p>
                        <div className={`absolute bottom-0 left-0 h-1 bg-fag-primary transition-all duration-500 ${marketingFilter === s.id ? "w-full" : "w-0"}`} />
                      </button>
                    ))}
                  </div>
                  <div className="overflow-x-auto rounded-[2.5rem] bg-[#042f2e]/40 backdrop-blur-md glass-eden-card shadow-sm border border-emerald-500/20">
                    <table className="w-full min-w-[900px]">
                      <thead className="bg-[#022c22] text-[10px] font-black uppercase tracking-widest text-emerald-400/80">
                        <tr>
                          <th className="px-8 py-5 text-left">Fidèle & Contact</th>
                          <th className="px-8 py-5 text-left">Action Fiche</th>
                          <th className="px-8 py-5 text-right">Diffusion WhatsApp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-white">
                        {marketingMembers.map((m) => (
                          <tr key={m.id} className="group hover:bg-[#022c22] transition-colors">
                            <td className="px-8 py-6">
                              <p className="font-black uppercase text-white tracking-tight">{m.name}</p>
                              <p className="mt-1 text-[10px] font-bold text-fag-primary">{m.whatsapp}</p>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openEditMemberModal(m)}
                                  className="p-2.5 rounded-xl bg-emerald-900/40 text-emerald-400/80 hover:bg-emerald-800/40 hover:text-white transition-all"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!(await askConfirm(`Supprimer ${m.name} ?`))) return;
                                    await removeMember(m.id);
                                  }}
                                  className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex flex-wrap justify-end gap-2">
                                {[
                                  { type: "welcome", label: "Accueil", color: "bg-emerald-900/40 hover:bg-fag-primary hover:text-white" },
                                  { type: "engagement", label: "Engagement", color: "bg-emerald-900/40 hover:bg-blue-600 hover:text-white" },
                                  { type: "reminder", label: "Rappel", color: "bg-emerald-900/40 hover:bg-orange-500 hover:text-white" },
                                  { type: "thanks", label: "Merci", color: "bg-emerald-900/40 hover:bg-slate-700 hover:text-white" },
                                  { type: "congrats", label: "Félicitations", color: "bg-emerald-900/40 hover:bg-emerald-600 hover:text-white" }
                                ].map((btn) => (
                                  <button
                                    key={btn.type}
                                    onClick={() => sendWhatsApp(m, btn.type)}
                                    className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${btn.color} hover:scale-105`}
                                  >
                                    {btn.label}
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="rounded-[3rem] border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-8 shadow-sm mt-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="rounded-2xl bg-yellow-500/20 p-3 text-yellow-400">
                        <Activity size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-white">Log de Diffusion</h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80 mt-1">Traçabilité des envois automatiques</p>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto pr-4 custom-scrollbar">
                      {whatsAppLogs.length === 0 ? (
                        <p className="text-[10px] font-bold text-emerald-400/80 italic">Aucune activité enregistrée.</p>
                      ) : (
                        <div className="space-y-3">
                          {whatsAppLogs.map((w) => (
                            <div key={w.id} className="flex items-center justify-between p-4 rounded-2xl bg-[#022c22] border border-emerald-500/10">
                              <div className="flex items-center gap-4">
                                <span className="text-[9px] font-black text-emerald-500/80">{new Date(w.createdAt).toLocaleTimeString()}</span>
                                <span className="px-2 py-0.5 rounded-md bg-yellow-500/20 text-yellow-500 text-[9px] font-black uppercase">{w.messageType}</span>
                                <span className="text-xs font-bold text-white">{w.memberName}</span>
                              </div>
                              <span className="text-[9px] font-black text-emerald-400/80 italic">{w.providerStatus}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "settings" && (
                <div className="space-y-8">
                  <div className="rounded-[3rem] border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-10 shadow-sm">
                    <div className="flex items-center justify-between mb-10 pb-6 border-b border-emerald-500/10">
                      <div>
                        <h3 className="text-2xl font-black text-white tracking-tight">Configuration Campagne</h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80 mt-1">Paramètres globaux et objectifs annuels</p>
                      </div>
                      <button onClick={exportDataBackup} className="rounded-2xl bg-emerald-900/40 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-200/80 hover:bg-emerald-800/40 transition-all border border-emerald-500/20">
                        Sauvegarde Système
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
                      {[
                        { label: "Année FAG", key: "year", type: "number" },
                        { label: "Objectif Global", key: "globalGoal", type: "number" },
                        { label: "Durée (Mois)", key: "months", type: "number", min: 1, max: 12 },
                        { label: "Date de Lancement", key: "launchDate", type: "date" }
                      ].map((field) => (
                        <div key={field.key} className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-emerald-400/80 ml-4">{field.label}</label>
                          <input type={field.type}
                            min={field.min}
                            max={field.max}
                            className="text-white w-full rounded-[1.5rem] bg-[#022c22] border border-emerald-500/20 px-6 py-4 text-white font-black outline-none focus:border-emerald-500 transition-all"
                            value={config[field.key] || ""}
                            onChange={(e) => {
                              const next = { ...config, [field.key]: field.type === "number" ? toNumber(e.target.value) : e.target.value };
                              setConfig(next);
                              saveConfig(next);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-emerald-500/10 bg-[#022c22] p-4">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">Objectif mensuel moyen</p>
                      <p className="mt-1 text-xl font-black text-white">{money(config.globalGoal / Math.max(1, config.months))}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-500/10 bg-[#022c22] p-4">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">Potentiel total catégories</p>
                      <p className="mt-1 text-xl font-black text-emerald-400">
                        {money(
                          config.categories.reduce((sum, c) => sum + toNumber(c.amount) * toNumber(c.targetPeople) * Math.max(1, config.months), 0)
                        )}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-emerald-500/10 bg-[#022c22] p-4">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">Écart potentiel vs objectif</p>
                      <p className="mt-1 text-xl font-black text-yellow-400">
                        {money(
                          config.categories.reduce((sum, c) => sum + toNumber(c.amount) * toNumber(c.targetPeople) * Math.max(1, config.months), 0) -
                            toNumber(config.globalGoal)
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="mt-8 space-y-4">
                    {config.categories.map((cat, idx) => (
                      <div key={cat.id} className="grid grid-cols-1 gap-4 rounded-3xl border border-emerald-500/10 p-5 md:grid-cols-12">
                        <div className="md:col-span-4">
                          <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-widest text-emerald-500/80">Label</label>
                          <input className="text-white w-full rounded-xl border border-emerald-500/20 bg-[#022c22] px-3 py-2 font-black uppercase"
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
                          <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-widest text-emerald-500/80">Montant mensuel</label>
                          <input type="number"
                            disabled={cat.id === "cat5"}
                            className="text-white w-full rounded-xl border border-emerald-500/20 bg-[#022c22] px-3 py-2 font-black"
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
                          <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-widest text-emerald-500/80">Cible</label>
                          <input type="number"
                            className="text-white w-full rounded-xl border border-emerald-500/20 bg-[#022c22] px-3 py-2 font-black"
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
                  <div className="mt-8 rounded-3xl border border-red-500/20 bg-red-50 p-5">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-red-400">Zone de sécurité</p>
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
                  </div>

                  <div className="mt-8 rounded-3xl border border-emerald-500/10 bg-[#022c22] p-5">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-emerald-50">Comptes équipe & niveaux d&apos;accès</h4>
                    {!canManageUsers ? (
                      <p className="mt-3 rounded-2xl border border-orange-500/20 bg-orange-50 p-4 text-[11px] font-bold text-orange-400">
                        Seul le rôle Administrateur peut créer ou modifier les comptes utilisateurs.
                      </p>
                    ) : (
                      <>
                        <form onSubmit={createTeamUser} className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-5">
                          <input required
                            placeholder="Nom complet"
                            className="text-white rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-emerald-500"
                            value={newTeamUser.fullName}
                            onChange={(e) => setNewTeamUser((prev) => ({ ...prev, fullName: e.target.value }))}
                          />
                          <input type="email"
                            placeholder="Email connexion (optionnel)"
                            className="text-white rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-emerald-500"
                            value={newTeamUser.username}
                            onChange={(e) => setNewTeamUser((prev) => ({ ...prev, username: e.target.value }))}
                          />
                          <input placeholder="Téléphone connexion (optionnel)"
                            className="text-white rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-emerald-500"
                            value={newTeamUser.phone}
                            onChange={(e) => setNewTeamUser((prev) => ({ ...prev, phone: e.target.value }))}
                          />
                          <input required
                            type="password"
                            placeholder="Mot de passe"
                            className="text-white rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-emerald-500"
                            value={newTeamUser.password}
                            onChange={(e) => setNewTeamUser((prev) => ({ ...prev, password: e.target.value }))}
                          />
                          <div className="flex gap-2">
                            <select className="text-white w-full rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 text-[11px] font-extrabold uppercase tracking-widest text-emerald-200/80 outline-none focus:border-emerald-500"
                              value={newTeamUser.role}
                              onChange={(e) => setNewTeamUser((prev) => ({ ...prev, role: e.target.value }))}
                            >
                              {ROLE_OPTIONS.map((role) => (
                                <option className="bg-[#022c22] text-white" key={role.id} value={role.id}>
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

                        <div className="mt-4 overflow-x-auto rounded-2xl bg-[#042f2e]/40 backdrop-blur-md glass-eden-card">
                          <table className="w-full min-w-[960px]">
                            <thead className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500/80">
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
                                    <p className="font-black uppercase text-white">{u.fullName}</p>
                                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500/80">{u.username}</p>
                                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">{u.phone || "Téléphone non défini"}</p>
                                  </td>
                                  <td className="px-4 py-3">
                                    <select className="text-white rounded-xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-emerald-200/80"
                                      value={u.role}
                                      onChange={(e) => updateTeamUserRole(u.id, e.target.value)}
                                    >
                                      {ROLE_OPTIONS.map((role) => (
                                        <option className="bg-[#022c22] text-white" key={role.id} value={role.id}>
                                          {role.label}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">
                                    {(ROLE_PERMISSIONS[u.role] || []).join(" • ")}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <button
                                      onClick={() => toggleTeamUserStatus(u.id)}
                                      className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest ${
                                        u.isActive !== false ? "bg-emerald-100 text-emerald-400" : "bg-emerald-800/40 text-emerald-200/80"
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
                                        className="rounded-xl border border-blue-200 bg-emerald-900/20 px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-yellow-500 hover:bg-yellow-500/20"
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

                  <div className="mt-8 rounded-3xl border border-emerald-500/10 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-emerald-50">
                          <FileClock size={15} className="text-yellow-400" />
                          Historique des logs d&apos;audit
                        </h4>
                        <p className="mt-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-500/80">
                          Traçabilité des accès et actions sensibles du logiciel
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="rounded-full bg-emerald-900/40 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-200/80">
                          {filteredAuditLogs.length} logs affichés
                        </p>
                        <button
                          onClick={exportAuditCsv}
                          className="rounded-xl border border-emerald-200 bg-emerald-900/30 px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-emerald-400"
                        >
                          Export CSV
                        </button>
                        <button
                          onClick={exportAuditPdf}
                          className="rounded-xl border border-blue-200 bg-emerald-900/20 px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-yellow-500"
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
                          className="w-full rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 text-[11px] font-semibold outline-none focus:border-blue-500"
                        />
                      </div>
                      <select
                        value={auditFilter}
                        onChange={(e) => setAuditFilter(e.target.value)}
                        className="rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 text-[11px] font-extrabold uppercase tracking-widest text-emerald-200/80 outline-none focus:border-blue-500"
                      >
                        <option className="bg-[#022c22] text-white" value="all">Tous les logs</option>
                        <option className="bg-[#022c22] text-white" value="access">Accès</option>
                        <option className="bg-[#022c22] text-white" value="users">Comptes équipe</option>
                        <option className="bg-[#022c22] text-white" value="finance">Finance</option>
                        <option className="bg-[#022c22] text-white" value="communication">Communication</option>
                      </select>
                    </div>

                    <div className="mt-4 overflow-x-auto rounded-2xl border border-emerald-500/10">
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
                        <tbody className="divide-y divide-slate-100 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card text-[11px] font-semibold">
                          {filteredAuditLogs.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-[10px] font-extrabold uppercase tracking-widest text-emerald-500/80">
                                Aucun log pour ce filtre
                              </td>
                            </tr>
                          ) : (
                            filteredAuditLogs.slice(0, 400).map((log, idx) => (
                              <tr key={`${log.id || log.timestamp || "log"}-${idx}`} className="hover:bg-[#022c22]/70">
                                <td className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">
                                  {new Date(log.timestamp || Date.now()).toLocaleString("fr-FR")}
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-black uppercase text-white">{log.actorName || "Système"}</p>
                                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500/80">{log.actorRole || "N/A"}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="rounded-full bg-yellow-500/20 px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-yellow-500">
                                    {log.action || "ACTION"}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-black uppercase text-emerald-50">{log.targetLabel || "N/A"}</p>
                                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500/80">{log.targetType || "N/A"}</p>
                                </td>
                                <td className="px-4 py-3 text-emerald-200/80">{log.details || "-"}</td>
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
                ? "border-emerald-200 bg-emerald-900/30 text-emerald-800"
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
            className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[2.5rem] bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-8 shadow-2xl md:p-10"
          >
            <button type="button" className="absolute right-6 top-6 text-emerald-500/80" onClick={() => setEditingTeamUser(null)}>
              <X />
            </button>
            <h3 className="text-2xl font-black uppercase text-white">Modifier le compte</h3>
            <p className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.25em] text-emerald-500/80">
              Mettez à jour l&apos;identité, les identifiants, le mot de passe et le niveau d&apos;accès du membre de gestion.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-3">
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">Nom complet</label>
                <input required
                  className="text-white mt-1 w-full rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-emerald-500"
                  value={editingTeamUser.fullName}
                  onChange={(e) => setEditingTeamUser((prev) => ({ ...prev, fullName: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">Email</label>
                  <input type="email"
                    className="text-white mt-1 w-full rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-emerald-500"
                    value={editingTeamUser.username}
                    onChange={(e) => setEditingTeamUser((prev) => ({ ...prev, username: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">Téléphone</label>
                  <input className="text-white mt-1 w-full rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-emerald-500"
                    value={editingTeamUser.phone}
                    onChange={(e) => setEditingTeamUser((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">Nouveau mot de passe (optionnel)</label>
                <input type="password"
                  placeholder="Laisser vide pour conserver le mot de passe actuel"
                  className="text-white mt-1 w-full rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-emerald-500"
                  value={editingTeamUser.password}
                  onChange={(e) => setEditingTeamUser((prev) => ({ ...prev, password: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">Rôle & accès</label>
                <select className="text-white mt-1 w-full rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 text-[11px] font-extrabold uppercase tracking-widest text-emerald-200/80 outline-none focus:border-emerald-500"
                  value={editingTeamUser.role}
                  onChange={(e) => setEditingTeamUser((prev) => ({ ...prev, role: e.target.value }))}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option className="bg-[#022c22] text-white" key={role.id} value={role.id}>
                      {role.label} — {role.description}
                    </option>
                  ))}
                </select>
                <p className="mt-2 rounded-xl bg-[#022c22] px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">
                  Modules accessibles : {(ROLE_PERMISSIONS[editingTeamUser.role] || []).join(" • ") || "Aucun"}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingTeamUser(null)}
                className="rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-5 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-200/80"
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
          <form onSubmit={addMember} className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2.5rem] bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-8 shadow-2xl md:p-10">
            <button type="button" className="absolute right-6 top-6 text-emerald-500/80" onClick={() => setIsMemberModalOpen(false)}>
              <X />
            </button>
            <h3 className="text-2xl font-black uppercase text-white">Inscrire un fidèle</h3>
            <p className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.25em] text-emerald-500/80">
              Identification membre FAG
            </p>

            <div className="mt-6 rounded-3xl border border-emerald-500/10 bg-[#022c22]/70 p-4 md:p-5">
              <p className="mb-4 text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">Informations d&apos;identité</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input required
                  placeholder="Nom et prénoms"
                  className="text-white rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-emerald-500"
                  value={newMember.name}
                  onChange={(e) => setNewMember((s) => ({ ...s, name: e.target.value }))}
                />
                <input required
                  placeholder="WhatsApp (ex: 2250700000000)"
                  className="text-white rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-emerald-500"
                  value={newMember.whatsapp}
                  onChange={(e) => setNewMember((s) => ({ ...s, whatsapp: e.target.value }))}
                />
                <input placeholder="Quartier / cellule"
                  className="text-white rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-emerald-500"
                  value={newMember.district}
                  onChange={(e) => setNewMember((s) => ({ ...s, district: e.target.value }))}
                />
                <select className="text-white rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-black outline-none focus:border-emerald-500"
                  value={newMember.churchFunctionType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewMember((s) => ({ ...s, churchFunctionType: val, churchFunction: val === "__other__" ? s.churchFunction : val }));
                  }}
                >
                  <option className="bg-[#022c22] text-white" value="">Fonction dans l&apos;église</option>
                  {CHURCH_FUNCTION_OPTIONS.map((role) => (
                    <option className="bg-[#022c22] text-white" key={role} value={role}>
                      {role}
                    </option>
                  ))}
                  <option className="bg-[#022c22] text-white" value="__other__">Autre fonction (saisie manuelle)</option>
                </select>
              </div>
              {newMember.churchFunctionType === "__other__" && (
                <input placeholder="Préciser la fonction"
                  className="text-white mt-4 w-full rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-emerald-500"
                  value={newMember.churchFunction}
                  onChange={(e) => setNewMember((s) => ({ ...s, churchFunction: e.target.value }))}
                />
              )}
            </div>

            <select className="text-white mt-4 w-full rounded-2xl border border-emerald-500/20 bg-[#022c22] px-4 py-3 font-black uppercase outline-none focus:border-emerald-500"
              value={newMember.categoryId}
              onChange={(e) => setNewMember((s) => ({ ...s, categoryId: e.target.value }))}
            >
              {config.categories.map((cat) => (
                <option className="bg-[#022c22] text-white" key={cat.id} value={cat.id}>
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
            <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-900/30 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">Récapitulatif engagement</p>
              <div className="mt-2 flex flex-col gap-1 text-[11px] font-extrabold uppercase text-emerald-100 md:flex-row md:items-center md:justify-between">
                <span>Mensualité: {money(selectedMonthlyAmount)}</span>
                <span>
                  Total ({config.months} mois): <span className="text-emerald-400">{money(selectedTotalAmount)}</span>
                </span>
              </div>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm font-bold text-emerald-100">
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
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2.5rem] bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-8 shadow-2xl md:p-10"
          >
            <button type="button" className="absolute right-6 top-6 text-emerald-500/80" onClick={() => setEditingMember(null)}>
              <X />
            </button>
            <h3 className="text-2xl font-black uppercase text-white">Modifier le fidèle</h3>
            <p className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.25em] text-emerald-500/80">
              Mettre à jour les informations et l&apos;engagement (les versements enregistrés sont conservés).
            </p>

            <div className="mt-6 rounded-3xl border border-emerald-500/10 bg-[#022c22]/70 p-4 md:p-5">
              <p className="mb-4 text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">Informations d&apos;identité</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input required
                  placeholder="Nom et prénoms"
                  className="text-white rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-emerald-500"
                  value={editingMember.name}
                  onChange={(e) => setEditingMember((s) => ({ ...s, name: e.target.value }))}
                />
                <input required
                  placeholder="WhatsApp (ex: 0757228731)"
                  className="text-white rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-emerald-500"
                  value={editingMember.whatsapp}
                  onChange={(e) => setEditingMember((s) => ({ ...s, whatsapp: e.target.value }))}
                />
                <input placeholder="Quartier / cellule"
                  className="text-white rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-emerald-500"
                  value={editingMember.district}
                  onChange={(e) => setEditingMember((s) => ({ ...s, district: e.target.value }))}
                />
                <select className="text-white rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-black outline-none focus:border-emerald-500"
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
                  <option className="bg-[#022c22] text-white" value="">Fonction dans l&apos;église</option>
                  {CHURCH_FUNCTION_OPTIONS.map((role) => (
                    <option className="bg-[#022c22] text-white" key={role} value={role}>
                      {role}
                    </option>
                  ))}
                  <option className="bg-[#022c22] text-white" value="__other__">Autre fonction (saisie manuelle)</option>
                </select>
              </div>
              {editingMember.churchFunctionType === "__other__" && (
                <input placeholder="Préciser la fonction"
                  className="text-white mt-4 w-full rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-emerald-500"
                  value={editingMember.churchFunction}
                  onChange={(e) => setEditingMember((s) => ({ ...s, churchFunction: e.target.value }))}
                />
              )}
            </div>

            <select className="text-white mt-4 w-full rounded-2xl border border-emerald-500/20 bg-[#022c22] px-4 py-3 font-black uppercase outline-none focus:border-emerald-500"
              value={editingMember.categoryId}
              onChange={(e) => setEditingMember((s) => ({ ...s, categoryId: e.target.value }))}
            >
              {config.categories.map((cat) => (
                <option className="bg-[#022c22] text-white" key={cat.id} value={cat.id}>
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
            <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-900/30 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">Récapitulatif engagement</p>
              <div className="mt-2 flex flex-col gap-1 text-[11px] font-extrabold uppercase text-emerald-100 md:flex-row md:items-center md:justify-between">
                <span>Mensualité: {money(editingMonthlyAmount)}</span>
                <span>
                  Total ({config.months} mois): <span className="text-emerald-400">{money(editingTotalAmount)}</span>
                </span>
              </div>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm font-bold text-emerald-100">
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
                className="rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-6 py-3 text-[11px] font-black uppercase tracking-widest text-emerald-200/80"
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
          <form onSubmit={handlePayment} className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[2.5rem] bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-8 shadow-2xl">
            <button type="button" className="absolute right-6 top-6 text-emerald-500/80" onClick={() => setIsPaymentModalOpen(false)}>
              <X />
            </button>
            <h3 className="mb-6 text-xl font-black uppercase">Encaissement - {selectedMember.name}</h3>
            <div className="grid grid-cols-2 gap-3">
              <input type="date"
                required
                className="text-white rounded-xl border border-emerald-500/20 bg-[#022c22] px-3 py-2 font-bold"
                value={paymentData.date}
                onChange={(e) => setPaymentData((s) => ({ ...s, date: e.target.value }))}
              />
              <select className="text-white rounded-xl border border-emerald-500/20 bg-[#022c22] px-3 py-2 font-bold"
                value={paymentData.method}
                onChange={(e) => setPaymentData((s) => ({ ...s, method: e.target.value }))}
              >
                <option className="bg-[#022c22] text-white">Espèces</option>
                <option className="bg-[#022c22] text-white">Mobile Money</option>
                <option className="bg-[#022c22] text-white">Virement</option>
              </select>
            </div>
            <div className="relative mt-4">
              <DollarSign size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" />
              <input autoFocus
                type="number"
                required
                placeholder="Montant"
                className="text-white w-full rounded-2xl border-2 border-emerald-500/20 bg-[#022c22] px-12 py-4 text-right text-3xl font-black outline-none focus:border-emerald-500"
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
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2.5rem] bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-8 shadow-2xl">
            <button type="button" className="absolute right-6 top-6 text-emerald-500/80" onClick={() => setIsHistoryModalOpen(false)}>
              <X />
            </button>
            <h3 className="mb-6 text-xl font-black uppercase">Grand livre - {selectedMember.name}</h3>
            <div className="max-h-[50vh] overflow-y-auto">
              <table className="w-full">
                <thead className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500/80">
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
                      <td className="py-3 font-bold text-emerald-400/80">{new Date(p.date).toLocaleDateString("fr-FR")}</td>
                      <td className="py-3 font-extrabold">{p.method}</td>
                      <td className="py-3 text-right font-black">{money(p.amount)}</td>
                      <td className="py-3 text-center">
                        {canManageUsers && (
                          <button
                            onClick={() => {
                              setPaymentData({ id: p.id, amount: p.amount, method: p.method, date: p.date, timestamp: p.timestamp });
                              setIsHistoryModalOpen(false);
                              setIsPaymentModalOpen(true);
                            }}
                            className="rounded-xl p-2 text-slate-300 hover:text-yellow-500"
                            title="Modifier ce versement"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
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
          <form onSubmit={handleExpense} className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2.5rem] bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-8 shadow-2xl md:p-10">
            <button type="button" className="absolute right-6 top-6 text-emerald-500/80" onClick={() => setIsExpenseModalOpen(false)}>
              <X />
            </button>
            <h3 className="text-2xl font-black uppercase text-white">Nouvelle dépense</h3>
            <p className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.25em] text-emerald-500/80">Sortie de caisse projet FAG</p>

            <div className="mt-6 rounded-3xl border border-emerald-500/10 bg-[#022c22]/70 p-4 md:p-5">
              <p className="mb-4 text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">Détails de l&apos;opération</p>
              <input required
                placeholder="Description de la dépense"
                className="text-white w-full rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-red-400"
                value={newExpense.description}
                onChange={(e) => setNewExpense((s) => ({ ...s, description: e.target.value }))}
              />
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <select className="text-white rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-red-400"
                  value={newExpense.category}
                  onChange={(e) => setNewExpense((s) => ({ ...s, category: e.target.value }))}
                >
                  <option className="bg-[#022c22] text-white">Logistique</option>
                  <option className="bg-[#022c22] text-white">Communication</option>
                  <option className="bg-[#022c22] text-white">Restauration</option>
                  <option className="bg-[#022c22] text-white">Accueil/Protocole</option>
                  <option className="bg-[#022c22] text-white">Autre</option>
                </select>
                <select className="text-white rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-red-400"
                  value={newExpense.method}
                  onChange={(e) => setNewExpense((s) => ({ ...s, method: e.target.value }))}
                >
                  <option className="bg-[#022c22] text-white">Espèces</option>
                  <option className="bg-[#022c22] text-white">Mobile Money</option>
                  <option className="bg-[#022c22] text-white">Virement</option>
                  <option className="bg-[#022c22] text-white">Chèque</option>
                </select>
                <input type="date"
                  required
                  className="text-white rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-red-400"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense((s) => ({ ...s, date: e.target.value }))}
                />
                <input type="number"
                  required
                  min="1"
                  placeholder="Montant"
                  className="text-white rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-black outline-none focus:border-red-400"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense((s) => ({ ...s, amount: e.target.value }))}
                />
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-50 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-red-400">Impact immédiat</p>
              <div className="mt-2 flex flex-col gap-1 text-[11px] font-extrabold uppercase text-emerald-100 md:flex-row md:items-center md:justify-between">
                <span>Dépense saisie: {money(newExpense.amount || 0)}</span>
                <span>
                  Caisse après sortie: <span className="text-red-400">{money(stats.cashInHand - toNumber(newExpense.amount))}</span>
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
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2.5rem] bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-8 shadow-2xl md:p-10"
          >
            <button type="button" className="absolute right-6 top-6 text-emerald-500/80" onClick={() => setEditingExpense(null)}>
              <X />
            </button>
            <h3 className="text-2xl font-black uppercase text-white">Modifier la dépense</h3>
            <p className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.25em] text-emerald-500/80">Mise à jour de la sortie de caisse</p>
            <div className="mt-6 rounded-3xl border border-emerald-500/10 bg-[#022c22]/70 p-4 md:p-5">
              <input required
                placeholder="Description"
                className="text-white w-full rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-red-400"
                value={editingExpense.description}
                onChange={(e) => setEditingExpense((s) => ({ ...s, description: e.target.value }))}
              />
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <select className="text-white rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-red-400"
                  value={editingExpense.category}
                  onChange={(e) => setEditingExpense((s) => ({ ...s, category: e.target.value }))}
                >
                  <option className="bg-[#022c22] text-white">Logistique</option>
                  <option className="bg-[#022c22] text-white">Communication</option>
                  <option className="bg-[#022c22] text-white">Restauration</option>
                  <option className="bg-[#022c22] text-white">Accueil/Protocole</option>
                  <option className="bg-[#022c22] text-white">Autre</option>
                </select>
                <select className="text-white rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-red-400"
                  value={editingExpense.method}
                  onChange={(e) => setEditingExpense((s) => ({ ...s, method: e.target.value }))}
                >
                  <option className="bg-[#022c22] text-white">Espèces</option>
                  <option className="bg-[#022c22] text-white">Mobile Money</option>
                  <option className="bg-[#022c22] text-white">Virement</option>
                  <option className="bg-[#022c22] text-white">Chèque</option>
                </select>
                <input type="date"
                  required
                  className="text-white rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-red-400"
                  value={editingExpense.date}
                  onChange={(e) => setEditingExpense((s) => ({ ...s, date: e.target.value }))}
                />
                <input type="number"
                  required
                  min="1"
                  placeholder="Montant"
                  className="text-white rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-black outline-none focus:border-red-400"
                  value={editingExpense.amount}
                  onChange={(e) => setEditingExpense((s) => ({ ...s, amount: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                className="rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-6 py-3 text-[11px] font-black uppercase tracking-widest text-emerald-200/80"
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
          <form onSubmit={handleDeposit} className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2.5rem] bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-8 shadow-2xl md:p-10">
            <button type="button" className="absolute right-6 top-6 text-emerald-500/80" onClick={() => setIsDepositModalOpen(false)}>
              <X />
            </button>
            <h3 className="text-2xl font-black uppercase text-white">Décharge comité</h3>
            <p className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.25em] text-emerald-500/80">Remise physique des fonds au comité</p>

            <div className="mt-6 rounded-3xl border border-emerald-500/10 bg-[#022c22]/70 p-4 md:p-5">
              <p className="mb-4 text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">Informations de remise</p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input type="number"
                  required
                  min="1"
                  max={Math.max(0, stats.cashInHand)}
                  placeholder="Montant remis"
                  className="text-white rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 text-2xl font-black outline-none focus:border-blue-400"
                  value={newDeposit.amount}
                  onChange={(e) => setNewDeposit((s) => ({ ...s, amount: e.target.value }))}
                />
                <input type="date"
                  required
                  className="text-white rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-blue-400"
                  value={newDeposit.date}
                  onChange={(e) => setNewDeposit((s) => ({ ...s, date: e.target.value }))}
                />
              </div>
              <input required
                placeholder="Nom du responsable"
                className="text-white mt-3 w-full rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-blue-400"
                value={newDeposit.recipient}
                onChange={(e) => setNewDeposit((s) => ({ ...s, recipient: e.target.value }))}
              />
              <input placeholder="Référence bordereau (optionnel)"
                className="text-white mt-3 w-full rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-blue-400"
                value={newDeposit.bordereauRef}
                onChange={(e) => setNewDeposit((s) => ({ ...s, bordereauRef: e.target.value }))}
              />
              <input placeholder="Lien pièce jointe (optionnel, URL https://…)"
                className="text-white mt-3 w-full rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-blue-400"
                value={newDeposit.bordereauUrl}
                onChange={(e) => setNewDeposit((s) => ({ ...s, bordereauUrl: e.target.value }))}
              />
            </div>

            <div className="mt-4 rounded-2xl border border-yellow-500/20 bg-emerald-900/20 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-yellow-500">Contrôle de caisse</p>
              <div className="mt-2 flex flex-col gap-1 text-[11px] font-extrabold uppercase text-emerald-100 md:flex-row md:items-center md:justify-between">
                <span>Cash disponible: {money(stats.cashInHand)}</span>
                <span>
                  Solde après remise: <span className="text-yellow-500">{money(stats.cashInHand - toNumber(newDeposit.amount))}</span>
                </span>
              </div>
            </div>

            <button type="submit" className="mt-6 w-full rounded-2xl bg-blue-600 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-900/20">
              Valider la remise
            </button>
          </form>
        </div>
      )}

      {editingDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70" onClick={() => setEditingDeposit(null)} />
          <form onSubmit={saveDepositUpdate} className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2.5rem] bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-8 shadow-2xl md:p-10">
            <button type="button" className="absolute right-6 top-6 text-emerald-500/80" onClick={() => setEditingDeposit(null)}>
              <X />
            </button>
            <h3 className="text-2xl font-black uppercase text-white">Modifier la remise</h3>
            <p className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.25em] text-emerald-500/80">Mise à jour de la décharge comité</p>

            <div className="mt-6 rounded-3xl border border-emerald-500/10 bg-[#022c22]/70 p-4 md:p-5">
              <p className="mb-4 text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">Informations de remise</p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input type="number"
                  required
                  min="1"
                  placeholder="Montant remis"
                  className="text-white rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 text-2xl font-black outline-none focus:border-blue-400"
                  value={editingDeposit.amount}
                  onChange={(e) => setEditingDeposit((s) => ({ ...s, amount: e.target.value }))}
                />
                <input type="date"
                  required
                  className="text-white rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-blue-400"
                  value={editingDeposit.date}
                  onChange={(e) => setEditingDeposit((s) => ({ ...s, date: e.target.value }))}
                />
              </div>
              <input required
                placeholder="Nom du responsable"
                className="text-white mt-3 w-full rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-blue-400"
                value={editingDeposit.recipient}
                onChange={(e) => setEditingDeposit((s) => ({ ...s, recipient: e.target.value }))}
              />
              <input placeholder="Référence bordereau"
                className="text-white mt-3 w-full rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-blue-400"
                value={editingDeposit.bordereauRef}
                onChange={(e) => setEditingDeposit((s) => ({ ...s, bordereauRef: e.target.value }))}
              />
              <input placeholder="Lien pièce jointe"
                className="text-white mt-3 w-full rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-4 py-3 font-bold outline-none focus:border-blue-400"
                value={editingDeposit.bordereauUrl}
                onChange={(e) => setEditingDeposit((s) => ({ ...s, bordereauUrl: e.target.value }))}
              />
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setEditingDeposit(null)}
                className="rounded-2xl border border-emerald-500/20 bg-[#042f2e]/40 backdrop-blur-md glass-eden-card px-6 py-3 text-[11px] font-black uppercase tracking-widest text-emerald-200/80"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="rounded-2xl bg-blue-600 px-6 py-3 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-900/20"
              >
                Enregistrer les modifications
              </button>
            </div>
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
          <div className="relative w-full max-w-md rounded-3xl bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-6 shadow-2xl">
            <p className="text-sm font-bold text-emerald-50">{confirmState.message}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-2xl border border-emerald-500/20 px-4 py-2 text-[11px] font-black uppercase text-emerald-200/80"
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
          <div className="relative w-full max-w-lg rounded-3xl bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-6 shadow-2xl">
            <h3 className="text-lg font-black uppercase text-white">Pièce jointe / lien</h3>
            <p className="mt-2 text-[10px] font-extrabold uppercase tracking-widest text-emerald-500/80">URL (Drive, etc.) — ou import direct d&apos;un fichier</p>
            <input className="text-white mt-4 w-full rounded-2xl border border-emerald-500/20 px-4 py-3 text-sm"
              placeholder="https://…"
              value={urlAttachmentModal.url}
              onChange={(e) => setUrlAttachmentModal((s) => ({ ...s, url: e.target.value }))}
            />
            <label className="mt-3 flex cursor-pointer flex-col gap-1 rounded-2xl border border-dashed border-emerald-500/30 p-3 text-[10px] font-extrabold uppercase text-emerald-400/80">
              Fichier (PDF, image)
              <input type="file"
                accept="application/pdf,image/*"
                className="text-white text-[10px] normal-case"
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
                className="rounded-2xl border border-emerald-500/20 px-4 py-2 text-[11px] font-black uppercase"
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
            className="relative w-full max-w-lg rounded-3xl bg-[#042f2e]/40 backdrop-blur-md glass-eden-card p-6 shadow-2xl"
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
            <h3 className="text-lg font-black uppercase text-white">Bordereau comité</h3>
            <input required
              className="text-white mt-4 w-full rounded-2xl border border-emerald-500/20 px-4 py-3"
              placeholder="Référence bordereau"
              value={bordereauFormModal.ref}
              onChange={(e) => setBordereauFormModal((s) => ({ ...s, ref: e.target.value }))}
            />
            <input className="text-white mt-3 w-full rounded-2xl border border-emerald-500/20 px-4 py-3"
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
