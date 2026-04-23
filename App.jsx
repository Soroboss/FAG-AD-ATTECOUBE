import React, { useEffect, useMemo, useState } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, getFirestore, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import {
  Activity,
  BarChart3,
  BellRing,
  Building2,
  CheckCircle,
  Church,
  Clock,
  Coins,
  DollarSign,
  LayoutDashboard,
  Megaphone,
  Menu,
  Plus,
  Search,
  Settings as SettingsIcon,
  ShoppingBag,
  Trash2,
  Wallet,
  X
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

const DEFAULT_CONFIG = {
  year: 2026,
  months: 6,
  launchDate: "2026-04-19",
  globalGoal: 21000000,
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
const LOCAL_STORAGE_KEY = `fag_local_${appId}`;
const APP_SESSION_KEY = `fag_session_${appId}`;
const APP_USERS =
  typeof __app_users !== "undefined" && Array.isArray(__app_users) && __app_users.length > 0
    ? __app_users
    : [
        {
          username: "admin@fag.local",
          password: "FAG2026@admin",
          fullName: "Administrateur FAG",
          role: "Superviseur"
        }
      ];
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
    <div className="relative h-44 w-44">
      <svg className="h-44 w-44 -rotate-90" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={radius} className="fill-none stroke-slate-100" strokeWidth="16" />
        <circle
          cx="90"
          cy="90"
          r={radius}
          className="fill-none stroke-emerald-500 transition-all duration-700"
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black leading-none text-slate-900">{clamped.toFixed(1)}%</span>
        <span className="mt-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Objectif global</span>
      </div>
    </div>
  );
}

const App = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [storageMode, setStorageMode] = useState("cloud");
  const [isAppAuthenticated, setIsAppAuthenticated] = useState(false);
  const [sessionUser, setSessionUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginData, setLoginData] = useState({ username: "", password: "", remember: true });
  const [loginError, setLoginError] = useState("");

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
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [selectedMember, setSelectedMember] = useState(null);

  const [newMember, setNewMember] = useState({
    name: "",
    churchFunctionType: "",
    churchFunction: "",
    district: "",
    whatsapp: "",
    categoryId: "cat1",
    customAmount: ""
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
  const [newDeposit, setNewDeposit] = useState({
    recipient: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    bordereauRef: ""
  });

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

  useEffect(() => {
    try {
      const rawSession = window.localStorage.getItem(APP_SESSION_KEY);
      if (!rawSession) return;
      const parsedSession = JSON.parse(rawSession);
      if (parsedSession?.username) {
        setSessionUser(parsedSession);
        setIsAppAuthenticated(true);
      }
    } catch {
      // ignore invalid session payload
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        if (typeof __initial_auth_token !== "undefined" && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error, fallback local mode:", error);
        setStorageMode("local");
        const cached = loadLocalState();
        if (cached) {
          setMembers(cached.members);
          setDeposits(cached.deposits);
          setExpenses(cached.expenses);
          setConfig(cached.config);
        }
        setLoading(false);
      }
    };
    init();
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      if (!nextUser) {
        if (storageMode === "local") return;
        const cached = loadLocalState();
        if (cached) {
          setStorageMode("local");
          setMembers(cached.members);
          setDeposits(cached.deposits);
          setExpenses(cached.expenses);
          setConfig(cached.config);
          setLoading(false);
        }
        return;
      }
      setStorageMode("cloud");
      setUser(nextUser);
    });
    return () => unsub();
  }, [storageMode]);

  useEffect(() => {
    if (storageMode === "local") return;
    if (!user) return;

    const basePath = (name) => collection(db, "artifacts", appId, "public", "data", name);
    const configRef = doc(db, "artifacts", appId, "public", "data", "settings", "main");

    const unsubMembers = onSnapshot(basePath("members"), (snap) => {
      setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubDeposits = onSnapshot(basePath("deposits"), (snap) => {
      setDeposits(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubExpenses = onSnapshot(basePath("expenses"), (snap) => {
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubConfig = onSnapshot(configRef, (snap) => {
      if (snap.exists()) setConfig({ ...DEFAULT_CONFIG, ...snap.data() });
    });

    setLoading(false);
    return () => {
      unsubMembers();
      unsubDeposits();
      unsubExpenses();
      unsubConfig();
    };
  }, [user]);

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
    if (storageMode === "local") {
      setConfig(next);
      return;
    }
    if (!user) return;
    await setDoc(doc(db, "artifacts", appId, "public", "data", "settings", "main"), next);
  };

  const handleAppLogin = (e) => {
    e.preventDefault();
    const normalizedUsername = loginData.username.trim().toLowerCase();
    const matchedUser = APP_USERS.find(
      (item) => item.username.toLowerCase() === normalizedUsername && item.password === loginData.password
    );
    if (!matchedUser) {
      setLoginError("Identifiants invalides. Vérifiez l'email et le mot de passe.");
      return;
    }
    const safeSession = {
      username: matchedUser.username,
      fullName: matchedUser.fullName || matchedUser.username,
      role: matchedUser.role || "Opérateur"
    };
    setSessionUser(safeSession);
    setIsAppAuthenticated(true);
    setShowLoginModal(false);
    setLoginError("");
    if (loginData.remember) {
      window.localStorage.setItem(APP_SESSION_KEY, JSON.stringify(safeSession));
    } else {
      window.localStorage.removeItem(APP_SESSION_KEY);
    }
    setLoginData((prev) => ({ ...prev, password: "" }));
  };

  const handleAppLogout = () => {
    window.localStorage.removeItem(APP_SESSION_KEY);
    setIsAppAuthenticated(false);
    setSessionUser(null);
    setShowLoginModal(false);
    setLoginData({ username: "", password: "", remember: true });
  };

  const addMember = async (e) => {
    e.preventDefault();
    if (!newMember.name || !newMember.whatsapp) return;
    const preparedMember = {
      ...newMember,
      churchFunction:
        newMember.churchFunctionType === "__other__"
          ? newMember.churchFunction
          : newMember.churchFunctionType || newMember.churchFunction
    };
    if (storageMode === "local") {
      const localMember = { ...preparedMember, id: Date.now().toString(), dateJoined: new Date().toISOString(), payments: [] };
      setMembers((prev) => [...prev, localMember]);
      setNewMember({ name: "", churchFunctionType: "", churchFunction: "", district: "", whatsapp: "", categoryId: "cat1", customAmount: "" });
      setIsMemberModalOpen(false);
      return;
    }
    if (!user) return;
    await addDoc(collection(db, "artifacts", appId, "public", "data", "members"), {
      ...preparedMember,
      dateJoined: new Date().toISOString(),
      payments: []
    });
    setNewMember({ name: "", churchFunctionType: "", churchFunction: "", district: "", whatsapp: "", categoryId: "cat1", customAmount: "" });
    setIsMemberModalOpen(false);
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
    if (storageMode === "local") {
      setMembers((prev) =>
        prev.map((m) => (m.id === selectedMember.id ? { ...m, payments: [...(m.payments || []), payment] } : m))
      );
      setSelectedMember((prev) => ({ ...prev, payments: [...(prev?.payments || []), payment] }));
      setPaymentData({ amount: "", date: new Date().toISOString().split("T")[0], method: "Espèces" });
      setIsPaymentModalOpen(false);
      return;
    }
    if (!user) return;
    await updateDoc(doc(db, "artifacts", appId, "public", "data", "members", selectedMember.id), {
      payments: [...(selectedMember.payments || []), payment]
    });
    setPaymentData({ amount: "", date: new Date().toISOString().split("T")[0], method: "Espèces" });
    setIsPaymentModalOpen(false);
  };

  const handleExpense = async (e) => {
    e.preventDefault();
    if (!newExpense.description || !newExpense.amount) return;
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
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!newDeposit.recipient || !newDeposit.amount) return;
    if (storageMode === "local") {
      setDeposits((prev) => [...prev, { ...newDeposit, id: Date.now().toString(), isDeposited: !!newDeposit.bordereauRef }]);
      setNewDeposit({ recipient: "", amount: "", date: new Date().toISOString().split("T")[0], bordereauRef: "" });
      setIsDepositModalOpen(false);
      return;
    }
    if (!user) return;
    await addDoc(collection(db, "artifacts", appId, "public", "data", "deposits"), {
      ...newDeposit,
      isDeposited: !!newDeposit.bordereauRef
    });
    setNewDeposit({ recipient: "", amount: "", date: new Date().toISOString().split("T")[0], bordereauRef: "" });
    setIsDepositModalOpen(false);
  };

  const sendWhatsApp = (member, type) => {
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
    window.open(`https://wa.me/${String(member.whatsapp || "").replace(/\s/g, "")}?text=${encodeURIComponent(finalMessage)}`, "_blank");
  };

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const cat = config.categories.find((c) => c.id === m.categoryId);
      const monthly = m.categoryId === "cat5" ? toNumber(m.customAmount) : toNumber(cat?.amount);
      const paid = (m.payments || []).reduce((sum, p) => sum + toNumber(p.amount), 0);
      const total = monthly * config.months;
      const nameOk = m.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const categoryOk = memberCategoryFilter === "all" || m.categoryId === memberCategoryFilter;
      const filterOk =
        memberFilter === "all" ||
        (memberFilter === "pending" && paid < total) ||
        (memberFilter === "done" && total > 0 && paid >= total);
      return nameOk && filterOk && categoryOk;
    });
  }, [members, config.categories, config.months, searchTerm, memberFilter, memberCategoryFilter]);

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

  const filteredDeposits = useMemo(() => {
    return deposits.filter((d) => {
      const bySearch = (d.recipient || "").toLowerCase().includes(depositSearchTerm.toLowerCase());
      const byFilter =
        depositFilter === "all" ||
        (depositFilter === "with_ref" && !!d.bordereauRef) ||
        (depositFilter === "missing_ref" && !d.bordereauRef);
      return bySearch && byFilter;
    });
  }, [deposits, depositSearchTerm, depositFilter]);

  const depositInsights = useMemo(() => {
    const withRef = deposits.filter((d) => !!d.bordereauRef).length;
    const missingRef = deposits.length - withRef;
    const totalFiltered = filteredDeposits.reduce((sum, d) => sum + toNumber(d.amount), 0);
    return { withRef, missingRef, totalFiltered };
  }, [deposits, filteredDeposits]);

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

  const removeMember = async (memberId) => {
    if (storageMode === "local") {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      return;
    }
    await deleteDoc(doc(db, "artifacts", appId, "public", "data", "members", memberId));
  };

  const removeExpense = async (expenseId) => {
    if (storageMode === "local") {
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
      return;
    }
    await deleteDoc(doc(db, "artifacts", appId, "public", "data", "expenses", expenseId));
  };

  const removeDeposit = async (depositId) => {
    if (storageMode === "local") {
      setDeposits((prev) => prev.filter((d) => d.id !== depositId));
      return;
    }
    await deleteDoc(doc(db, "artifacts", appId, "public", "data", "deposits", depositId));
  };

  const setDepositReceiptRef = async (depositId, ref) => {
    if (storageMode === "local") {
      setDeposits((prev) =>
        prev.map((d) => (d.id === depositId ? { ...d, bordereauRef: ref, isDeposited: true } : d))
      );
      return;
    }
    await updateDoc(doc(db, "artifacts", appId, "public", "data", "deposits", depositId), {
      bordereauRef: ref,
      isDeposited: true
    });
  };

  const removeMemberPayment = async (memberId, paymentId) => {
    const currentMember = members.find((m) => m.id === memberId) || selectedMember;
    const updated = (currentMember?.payments || []).filter((pay) => pay.id !== paymentId);
    if (storageMode === "local") {
      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, payments: updated } : m)));
      setSelectedMember((prev) => ({ ...prev, payments: updated }));
      return;
    }
    await updateDoc(doc(db, "artifacts", appId, "public", "data", "members", memberId), { payments: updated });
    setSelectedMember((prev) => ({ ...prev, payments: updated }));
  };

  const forceLocalMode = () => {
    const cached = loadLocalState();
    if (cached) {
      setMembers(cached.members);
      setDeposits(cached.deposits);
      setExpenses(cached.expenses);
      setConfig(cached.config);
    }
    setStorageMode("local");
    setLoading(false);
  };

  const seedLocalDemoData = () => {
    const demoMembers = [
      {
        id: "m1",
        name: "Kouadio Jean",
        churchFunction: "Diacre",
        whatsapp: "2250700000001",
        categoryId: "cat1",
        customAmount: "",
        dateJoined: new Date().toISOString(),
        payments: [
          { id: "p11", amount: 20000, method: "Espèces", date: "2026-04-10", timestamp: new Date().toISOString() },
          { id: "p12", amount: 30000, method: "Mobile Money", date: "2026-05-10", timestamp: new Date().toISOString() }
        ]
      },
      {
        id: "m2",
        name: "Ahou Elise",
        churchFunction: "Chorale",
        whatsapp: "2250700000002",
        categoryId: "cat3",
        customAmount: "",
        dateJoined: new Date().toISOString(),
        payments: [{ id: "p21", amount: 10000, method: "Virement", date: "2026-04-12", timestamp: new Date().toISOString() }]
      }
    ];
    const demoExpenses = [
      { id: "e1", description: "Impression affiches", amount: 25000, date: "2026-04-13", category: "Communication", method: "Espèces" }
    ];
    const demoDeposits = [
      { id: "d1", recipient: "Comité FAG", amount: 30000, date: "2026-04-15", bordereauRef: "BR-2026-001", isDeposited: true }
    ];
    setMembers(demoMembers);
    setExpenses(demoExpenses);
    setDeposits(demoDeposits);
    setStorageMode("local");
    setLoading(false);
  };

  const resetLocalData = () => {
    window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    setMembers([]);
    setDeposits([]);
    setExpenses([]);
    setConfig(DEFAULT_CONFIG);
    setStorageMode("local");
  };

  if (!isAppAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-white" style={{ fontFamily: "'Montserrat', sans-serif", fontStyle: "normal" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');`}</style>
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-10 md:px-10">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-500 p-3"><Church size={24} /></div>
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
            <section className="rounded-[2.5rem] border border-slate-800 bg-slate-900 p-8 shadow-2xl lg:col-span-7">
              <p className="inline-flex rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-300">
                Logiciel de trésorerie FAG
              </p>
              <h2 className="mt-5 text-4xl font-black uppercase leading-tight text-white md:text-5xl">
                Pilotage professionnel de la levée de fonds de l&apos;église
              </h2>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-relaxed text-slate-300">
                Suivi en temps réel des engagements, des encaissements, des dépenses, des remises comité et des campagnes WhatsApp.
                Une solution claire, fraternelle et sécurisée pour la gestion de votre projet FAG.
              </p>
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Modules</p>
                  <p className="mt-2 text-xl font-black text-white">6</p>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Mode local</p>
                  <p className="mt-2 text-xl font-black text-emerald-400">Disponible</p>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Synchronisation</p>
                  <p className="mt-2 text-xl font-black text-blue-400">Cloud/Comité</p>
                </div>
              </div>
            </section>

            <section className="rounded-[2.5rem] border border-slate-800 bg-slate-900 p-8 shadow-2xl lg:col-span-5">
              <h3 className="text-lg font-black uppercase text-white">Accès au logiciel</h3>
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
                <p className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4 text-[11px] font-semibold leading-relaxed text-slate-300">
                  Compte de démonstration local: <span className="font-black">admin@fag.local</span> / <span className="font-black">FAG2026@admin</span>
                </p>
              </div>
            </section>
          </main>
        </div>

        {showLoginModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80" onClick={() => setShowLoginModal(false)} />
            <form onSubmit={handleAppLogin} className="relative w-full max-w-md rounded-[2.5rem] border border-slate-700 bg-slate-900 p-8 shadow-2xl">
              <button type="button" className="absolute right-6 top-6 text-slate-400" onClick={() => setShowLoginModal(false)}>
                <X />
              </button>
              <h3 className="text-2xl font-black uppercase text-white">Connexion</h3>
              <p className="mt-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Comité FAG</p>
              <input
                type="email"
                required
                placeholder="Email"
                className="mt-5 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 font-bold text-white outline-none focus:border-emerald-500"
                value={loginData.username}
                onChange={(e) => setLoginData((prev) => ({ ...prev, username: e.target.value }))}
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
              <button type="submit" className="mt-5 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white">
                Se connecter
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-800 antialiased not-italic"
      style={{ fontFamily: "'Montserrat', sans-serif", fontStyle: "normal" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');`}</style>
      <div className="min-h-screen md:flex">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-emerald-500 p-2 text-white"><Church size={16} /></div>
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
          className={`fixed inset-y-0 left-0 z-50 flex h-screen w-72 transform flex-col overflow-hidden bg-slate-900 p-5 text-white shadow-2xl transition-transform duration-300 md:translate-x-0 md:p-6 ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-500 p-3 shadow-lg"><Church size={24} /></div>
            <div>
              <h1 className="text-lg font-black uppercase leading-none">FAG {config.year}</h1>
              <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">Festival d&apos;Action de Grâce</p>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="ml-auto rounded-xl border border-slate-700 p-2 text-slate-300 md:hidden" aria-label="Fermer le menu">
              <X size={16} />
            </button>
          </div>
          <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
            {[
              ["dashboard", "Dashboard", LayoutDashboard],
              ["members", "Fidèles", Wallet],
              ["expenses", "Dépenses", ShoppingBag],
              ["deposits", "Comité/Banque", Building2],
              ["marketing", "Communication", Megaphone],
              ["settings", "Configuration", SettingsIcon]
            ].map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => {
                  setActiveTab(id);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-[11px] font-extrabold uppercase tracking-wider transition ${
                  activeTab === id ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>
          <div className="mt-6 rounded-[2.5rem] border border-emerald-500/20 bg-emerald-500/10 p-5">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-200">Caisse réelle</p>
            <p className="mt-2 text-2xl font-black text-white">{money(stats.cashInHand)}</p>
          </div>
          <div className="mt-4 border-t border-slate-800 pt-4">
            {sessionUser && (
              <p className="mb-3 rounded-xl bg-slate-800 px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-300">
                {sessionUser.fullName} • {sessionUser.role}
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
          <header className="sticky top-0 z-30 mb-6 flex flex-col gap-4 bg-slate-50/95 pb-4 pt-1 backdrop-blur md:mb-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 md:text-3xl">
                {activeTab === "dashboard" && "Cockpit de Pilotage"}
                {activeTab === "members" && "Gestion des Fidèles"}
                {activeTab === "expenses" && "Gestion des Dépenses"}
                {activeTab === "deposits" && "Suivi Comité et Banque"}
                {activeTab === "marketing" && "Communication Marketing"}
                {activeTab === "settings" && "Configuration FAG"}
              </h2>
              <p className="mt-2 border-l-4 border-emerald-500 pl-3 text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-400">
                Trésorerie cloud synchronisée temps réel
              </p>
              <p className={`mt-3 inline-flex rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest ${storageMode === "local" ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"}`}>
                {storageMode === "local" ? "Mode local actif" : "Mode cloud actif"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={forceLocalMode}
                  className="rounded-xl border border-purple-200 bg-purple-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-purple-700"
                >
                  Forcer local
                </button>
                <button
                  onClick={seedLocalDemoData}
                  className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-blue-700"
                >
                  Charger données test
                </button>
                <button
                  onClick={resetLocalData}
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-red-700"
                >
                  Vider données locales
                </button>
              </div>
            </div>
          </header>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Activity size={40} className="animate-spin text-emerald-500" />
              <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-400">Connexion Firebase...</p>
            </div>
          ) : (
            <>
              {activeTab === "dashboard" && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-6">
                    <div className="rounded-[2.5rem] bg-white p-6 shadow-sm">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Total encaissé</p>
                      <p className="mt-3 text-3xl font-black text-emerald-600">{money(stats.totalCollected)}</p>
                    </div>
                    <div className="rounded-[2.5rem] bg-white p-6 shadow-sm">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Dépenses validées</p>
                      <p className="mt-3 text-3xl font-black text-red-600">{money(stats.totalExpenses)}</p>
                    </div>
                    <div className="rounded-[2.5rem] bg-white p-6 shadow-sm">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Versements comité</p>
                      <p className="mt-3 text-3xl font-black text-blue-600">{money(stats.totalHandedOver)}</p>
                    </div>
                    <div className="rounded-[2.5rem] bg-slate-900 p-6 shadow-xl">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Cash en main</p>
                      <p className="mt-3 text-3xl font-black text-emerald-400">{money(stats.cashInHand)}</p>
                    </div>
                    <div className="rounded-[2.5rem] bg-white p-6 shadow-sm">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Taux de recouvrement</p>
                      <p className={`mt-3 text-3xl font-black ${stats.recoveryRate >= 60 ? "text-emerald-600" : "text-orange-500"}`}>
                        {stats.recoveryRate.toFixed(1)}%
                      </p>
                    </div>
                    <div className="rounded-[2.5rem] bg-white p-6 shadow-sm">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Reste à mobiliser</p>
                      <p className="mt-3 text-3xl font-black text-slate-800">{money(stats.remainingGoal)}</p>
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
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div className="rounded-3xl bg-white p-5 shadow-sm">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Fidèles enregistrés</p>
                      <p className="mt-2 text-2xl font-black text-slate-900">{members.length}</p>
                    </div>
                    <div className="rounded-3xl bg-white p-5 shadow-sm">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Engagements soldés</p>
                      <p className="mt-2 text-2xl font-black text-emerald-600">{memberInsights.completed}</p>
                    </div>
                    <div className="rounded-3xl bg-white p-5 shadow-sm">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Reliquats actifs</p>
                      <p className="mt-2 text-2xl font-black text-orange-500">{memberInsights.pending}</p>
                    </div>
                    <div className="rounded-3xl bg-white p-5 shadow-sm">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Meilleur contributeur</p>
                      <p className="mt-2 text-sm font-black uppercase text-slate-900">{memberInsights.topContributorName}</p>
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600">{money(memberInsights.topContributorAmount)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex w-full flex-col gap-3 lg:max-w-3xl lg:flex-row">
                      <div className="relative w-full">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input
                          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 font-semibold outline-none focus:border-emerald-500"
                          placeholder="Rechercher un fidèle"
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
                    <button
                      onClick={() => setIsMemberModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white"
                    >
                      <Plus size={16} /> Nouveau fidèle
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-[2.5rem] bg-white shadow-sm">
                    <table className="w-full min-w-[1100px]">
                      <thead className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                        <tr>
                          <th className="px-6 py-4 text-left">Fidèle</th>
                          <th className="px-6 py-4 text-left">Contact & identité</th>
                          <th className="px-6 py-4 text-center">Mois soldés</th>
                          <th className="px-6 py-4 text-right">Cumul versé</th>
                          <th className="px-6 py-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredMembers.map((m) => {
                          const cat = config.categories.find((c) => c.id === m.categoryId);
                          const monthly = m.categoryId === "cat5" ? toNumber(m.customAmount) : toNumber(cat?.amount);
                          const paid = (m.payments || []).reduce((sum, p) => sum + toNumber(p.amount), 0);
                          const fullMonths = monthly > 0 ? Math.floor(paid / monthly) : 0;
                          const credit = monthly > 0 ? paid % monthly : 0;
                          return (
                            <tr key={m.id} className="hover:bg-slate-50/70">
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
                              <td className="px-6 py-4 text-center">
                                <div className="flex justify-center gap-2">
                                  <button
                                    onClick={() => {
                                      setSelectedMember(m);
                                      setIsPaymentModalOpen(true);
                                    }}
                                    className="rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-white"
                                  >
                                    Encaisser
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedMember(m);
                                      setIsHistoryModalOpen(true);
                                    }}
                                    className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500"
                                  >
                                    <Clock size={14} />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (!window.confirm("Supprimer ce fidèle ?")) return;
                                      await removeMember(m.id);
                                    }}
                                    className="rounded-xl p-2 text-slate-300 hover:text-red-600"
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
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div className="rounded-3xl bg-white p-5 shadow-sm">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Total dépenses</p>
                      <p className="mt-2 text-2xl font-black text-red-600">{money(stats.totalExpenses)}</p>
                    </div>
                    <div className="rounded-3xl bg-white p-5 shadow-sm">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Dépenses filtrées</p>
                      <p className="mt-2 text-2xl font-black text-slate-900">
                        {money(filteredExpenses.reduce((sum, e) => sum + toNumber(e.amount), 0))}
                      </p>
                    </div>
                    <div className="rounded-3xl bg-white p-5 shadow-sm">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Nombre d&apos;opérations</p>
                      <p className="mt-2 text-2xl font-black text-slate-900">{filteredExpenses.length}</p>
                    </div>
                    <div className="rounded-3xl bg-white p-5 shadow-sm">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Ticket moyen</p>
                      <p className="mt-2 text-2xl font-black text-slate-900">
                        {money(
                          filteredExpenses.length > 0
                            ? filteredExpenses.reduce((sum, e) => sum + toNumber(e.amount), 0) / filteredExpenses.length
                            : 0
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-[2.5rem] bg-white p-6 shadow-sm">
                    <div className="flex w-full flex-col gap-3 lg:max-w-3xl lg:flex-row">
                      <div className="relative w-full">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input
                          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 font-semibold outline-none focus:border-red-500"
                          placeholder="Rechercher une dépense"
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
                    <button
                      onClick={() => setIsExpenseModalOpen(true)}
                      className="rounded-2xl bg-red-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white"
                    >
                      Nouvelle sortie
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    <div className="overflow-x-auto rounded-[2.5rem] bg-white shadow-sm lg:col-span-8">
                    <table className="w-full min-w-[760px]">
                      <thead className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                        <tr>
                          <th className="px-6 py-4 text-left">Date</th>
                          <th className="px-6 py-4 text-left">Description</th>
                          <th className="px-6 py-4 text-left">Catégorie</th>
                          <th className="px-6 py-4 text-right">Montant</th>
                          <th className="px-6 py-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredExpenses.map((e) => (
                          <tr key={e.id}>
                            <td className="px-6 py-4 font-bold text-slate-500">{new Date(e.date).toLocaleDateString("fr-FR")}</td>
                            <td className="px-6 py-4 font-black uppercase">{e.description}</td>
                            <td className="px-6 py-4 font-extrabold text-slate-500">{e.category}</td>
                            <td className="px-6 py-4 text-right font-black text-red-600">{money(e.amount)}</td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={async () => {
                                  if (!window.confirm("Supprimer cette dépense ?")) return;
                                  await removeExpense(e.id);
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
                    <div className="rounded-[2.5rem] bg-white p-6 shadow-sm lg:col-span-4">
                      <h3 className="mb-4 text-[11px] font-extrabold uppercase tracking-widest text-slate-800">Répartition dépenses</h3>
                      {expenseBreakdown.length === 0 ? (
                        <p className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-center text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                          Aucune donnée filtrée
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {expenseBreakdown.map(([category, amount]) => {
                            const totalFiltered = Math.max(
                              1,
                              filteredExpenses.reduce((sum, e) => sum + toNumber(e.amount), 0)
                            );
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
                  </div>
                </div>
              )}

              {activeTab === "deposits" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div className="rounded-3xl bg-white p-5 shadow-sm">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Caisse réelle à remettre</p>
                      <p className="mt-2 text-2xl font-black text-slate-900">{money(stats.cashInHand)}</p>
                    </div>
                    <div className="rounded-3xl bg-white p-5 shadow-sm">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Remises avec bordereau</p>
                      <p className="mt-2 text-2xl font-black text-emerald-600">{depositInsights.withRef}</p>
                    </div>
                    <div className="rounded-3xl bg-white p-5 shadow-sm">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Bordereaux manquants</p>
                      <p className="mt-2 text-2xl font-black text-red-600">{depositInsights.missingRef}</p>
                    </div>
                    <div className="rounded-3xl bg-white p-5 shadow-sm">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Montant filtré</p>
                      <p className="mt-2 text-2xl font-black text-blue-600">{money(depositInsights.totalFiltered)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-[2.5rem] bg-white p-6 shadow-sm">
                    <div className="flex w-full flex-col gap-3 lg:max-w-3xl lg:flex-row">
                      <div className="relative w-full">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input
                          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 font-semibold outline-none focus:border-blue-500"
                          placeholder="Rechercher un responsable"
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
                        <option value="with_ref">Avec bordereau</option>
                        <option value="missing_ref">Sans bordereau</option>
                      </select>
                    </div>
                    <button
                      onClick={() => setIsDepositModalOpen(true)}
                      className="rounded-2xl bg-blue-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white"
                    >
                      Décharge comité
                    </button>
                  </div>
                  <div className="overflow-x-auto rounded-[2.5rem] bg-white shadow-sm">
                    <table className="w-full min-w-[980px]">
                      <thead className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                        <tr>
                          <th className="px-6 py-4 text-left">Date</th>
                          <th className="px-6 py-4 text-left">Responsable</th>
                          <th className="px-6 py-4 text-right">Montant</th>
                          <th className="px-6 py-4 text-center">Bordereau</th>
                          <th className="px-6 py-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredDeposits.map((d) => (
                          <tr key={d.id}>
                            <td className="px-6 py-4 font-bold text-slate-500">{new Date(d.date).toLocaleDateString("fr-FR")}</td>
                            <td className="px-6 py-4 font-black uppercase">{d.recipient}</td>
                            <td className="px-6 py-4 text-right font-black text-blue-600">{money(d.amount)}</td>
                            <td className="px-6 py-4 text-center">
                              {d.bordereauRef ? (
                                <span className="rounded-full bg-blue-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-blue-700">
                                  REF: {d.bordereauRef}
                                </span>
                              ) : (
                                <button
                                  onClick={async () => {
                                    const ref = window.prompt("Référence bordereau");
                                    if (!ref) return;
                                    await setDepositReceiptRef(d.id, ref);
                                  }}
                                  className="rounded-full bg-red-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-red-600"
                                >
                                  Manquant
                                </button>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={async () => {
                                  if (!window.confirm("Supprimer cette décharge ?")) return;
                                  await removeDeposit(d.id);
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
                    <table className="w-full min-w-[760px]">
                      <tbody className="divide-y divide-slate-100">
                        {marketingMembers.map((m) => (
                            <tr key={m.id}>
                              <td className="px-6 py-5">
                                <p className="font-black uppercase">{m.name}</p>
                                <p className="mt-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-600">{m.whatsapp}</p>
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
                </div>
              )}

              {activeTab === "settings" && (
                <div className="rounded-[2.5rem] bg-white p-8 shadow-sm">
                  <h3 className="mb-8 text-2xl font-black uppercase tracking-tight text-slate-900">Paramètres de campagne</h3>
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
                      onClick={() => {
                        if (!window.confirm("Réinitialiser la configuration de campagne ?")) return;
                        setConfig(DEFAULT_CONFIG);
                        saveConfig(DEFAULT_CONFIG);
                      }}
                      className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white"
                    >
                      Réinitialiser configuration
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

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
            <button type="submit" className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-slate-900/20">
              Enregistrer
            </button>
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
                            if (!window.confirm("Supprimer ce versement ?")) return;
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
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
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
    </div>
  );
};

export default App;
