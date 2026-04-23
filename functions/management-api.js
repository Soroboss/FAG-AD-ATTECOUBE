import crypto from "node:crypto";

const ROLES = {
  users: ["admin"],
  config: ["admin", "tresorier"],
  members: ["admin", "tresorier", "communication"],
  treasury: ["admin", "tresorier"],
  audit: ["admin", "tresorier"]
};

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return corsResponse(204);
  }
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  const dbUrl = process.env.DATABASE_URL || process.env.INSFORGE_BASE_URL;
  if (!dbUrl) {
    return jsonResponse({ ok: false, error: "DATABASE_URL non configuré" }, 503);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    const payload = body?.payload || {};

    if (action === "bootstrap") {
      await ensureDefaultAdmin(dbUrl);
      const users = await runQuery(
        dbUrl,
        `select id, full_name, email, phone, role, is_active, created_at, updated_at
         from public.management_users
         order by created_at asc`,
        []
      );
      const logs = await runQuery(
        dbUrl,
        `select id, actor_user_id, actor_name, actor_role, action, scope, target_type, target_id, target_label, details, created_at
         from public.audit_logs
         order by created_at desc
         limit 500`,
        []
      );
      const appData = await loadAppData(dbUrl);
      return jsonResponse({ ok: true, users, logs, ...appData }, 200);
    }

    if (action === "getAppData") {
      const appData = await loadAppData(dbUrl);
      return jsonResponse({ ok: true, ...appData }, 200);
    }

    if (action === "login") {
      return await handleLogin(dbUrl, payload, req);
    }

    if (action === "migrateUsers") {
      return await handleMigrateUsers(dbUrl, payload);
    }

    if (action === "createLog") {
      await insertAuditLog(dbUrl, payload);
      return jsonResponse({ ok: true }, 200);
    }

    if (action === "listLogs") {
      const gate = requireAuthRequest(req, ROLES.audit);
      if (gate.response) return gate.response;
      const logs = await runQuery(
        dbUrl,
        `select id, actor_user_id, actor_name, actor_role, action, scope, target_type, target_id, target_label, details, created_at
         from public.audit_logs
         order by created_at desc
         limit 1000`,
        []
      );
      return jsonResponse({ ok: true, logs }, 200);
    }

    if (action === "createUser") {
      const gate = requireAuthRequest(req, ROLES.users);
      if (gate.response) return gate.response;
      return await handleCreateUser(dbUrl, payload);
    }

    if (action === "updateUser") {
      const gate = requireAuthRequest(req, ROLES.users);
      if (gate.response) return gate.response;
      return await handleUpdateUser(dbUrl, payload);
    }

    if (action === "toggleUserStatus") {
      const gate = requireAuthRequest(req, ROLES.users);
      if (gate.response) return gate.response;
      return await handleToggleUserStatus(dbUrl, payload);
    }

    if (action === "deleteUser") {
      const gate = requireAuthRequest(req, ROLES.users);
      if (gate.response) return gate.response;
      return await handleDeleteUser(dbUrl, payload);
    }

    if (action === "saveConfig") {
      const gate = requireAuthRequest(req, ROLES.config);
      if (gate.response) return gate.response;
      return await handleSaveConfig(dbUrl, payload, gate.ctx);
    }

    if (action === "addMember") {
      const gate = requireAuthRequest(req, ROLES.members);
      if (gate.response) return gate.response;
      return await handleAddMember(dbUrl, payload, gate.ctx);
    }

    if (action === "updateMember") {
      const gate = requireAuthRequest(req, ROLES.members);
      if (gate.response) return gate.response;
      return await handleUpdateMember(dbUrl, payload, gate.ctx);
    }

    if (action === "deleteMember") {
      const gate = requireAuthRequest(req, ROLES.members);
      if (gate.response) return gate.response;
      return await handleDeleteMember(dbUrl, payload, gate.ctx);
    }

    if (action === "replaceMemberPayments") {
      const gate = requireAuthRequest(req, ROLES.treasury);
      if (gate.response) return gate.response;
      const locked = await assertFinanceNotLockedForNonAdmin(dbUrl, gate.ctx);
      if (locked) return locked;
      return await handleReplaceMemberPayments(dbUrl, payload);
    }

    if (action === "addExpense") {
      const gate = requireAuthRequest(req, ROLES.treasury);
      if (gate.response) return gate.response;
      const locked = await assertFinanceNotLockedForNonAdmin(dbUrl, gate.ctx);
      if (locked) return locked;
      return await handleAddExpense(dbUrl, payload);
    }

    if (action === "updateExpense") {
      const gate = requireAuthRequest(req, ROLES.treasury);
      if (gate.response) return gate.response;
      const locked = await assertFinanceNotLockedForNonAdmin(dbUrl, gate.ctx);
      if (locked) return locked;
      return await handleUpdateExpense(dbUrl, payload);
    }

    if (action === "deleteExpense") {
      const gate = requireAuthRequest(req, ROLES.treasury);
      if (gate.response) return gate.response;
      const locked = await assertFinanceNotLockedForNonAdmin(dbUrl, gate.ctx);
      if (locked) return locked;
      return await handleDeleteExpense(dbUrl, payload);
    }

    if (action === "addDeposit") {
      const gate = requireAuthRequest(req, ROLES.treasury);
      if (gate.response) return gate.response;
      const locked = await assertFinanceNotLockedForNonAdmin(dbUrl, gate.ctx);
      if (locked) return locked;
      return await handleAddDeposit(dbUrl, payload);
    }

    if (action === "deleteDeposit") {
      const gate = requireAuthRequest(req, ROLES.treasury);
      if (gate.response) return gate.response;
      const locked = await assertFinanceNotLockedForNonAdmin(dbUrl, gate.ctx);
      if (locked) return locked;
      return await handleDeleteDeposit(dbUrl, payload);
    }

    if (action === "updateDepositRef") {
      const gate = requireAuthRequest(req, ROLES.treasury);
      if (gate.response) return gate.response;
      const locked = await assertFinanceNotLockedForNonAdmin(dbUrl, gate.ctx);
      if (locked) return locked;
      return await handleUpdateDepositRef(dbUrl, payload);
    }

    if (action === "updateDepositAttachment") {
      const gate = requireAuthRequest(req, ROLES.treasury);
      if (gate.response) return gate.response;
      const locked = await assertFinanceNotLockedForNonAdmin(dbUrl, gate.ctx);
      if (locked) return locked;
      return await handleUpdateDepositAttachment(dbUrl, payload);
    }

    return jsonResponse({ ok: false, error: "Action inconnue" }, 400);
  } catch (error) {
    return jsonResponse({ ok: false, error: error?.message || "Unexpected error" }, 500);
  }
}

function getSessionSecret() {
  return String(process.env.MANAGEMENT_SESSION_SECRET || "fag_dev_session_change_in_production").trim() || "fag_dev";
}

function createSessionToken(user) {
  const secret = getSessionSecret();
  const exp = Date.now() + 7 * 864e5;
  const payload = { sub: String(user.id), role: String(user.role || "consultation"), exp };
  const data = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const secret = getSessionSecret();
  const expect = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  if (expect !== sig) return null;
  let pl;
  try {
    pl = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (pl.exp < Date.now()) return null;
  return { userId: pl.sub, role: pl.role };
}

function getBearerToken(req) {
  const raw = req.headers?.get?.("Authorization") || req.headers?.get?.("authorization") || "";
  if (!raw || !String(raw).startsWith("Bearer ")) return "";
  return String(raw).slice(7).trim();
}

function requireAuthRequest(req, allowedRoles) {
  const token = getBearerToken(req);
  if (!token) {
    return { response: jsonResponse({ ok: false, error: "Authentification requise. Reconnectez-vous." }, 401) };
  }
  const ctx = verifySessionToken(token);
  if (!ctx) {
    return { response: jsonResponse({ ok: false, error: "Session expirée ou invalide. Reconnectez-vous." }, 401) };
  }
  if (!allowedRoles.includes(ctx.role)) {
    return { response: jsonResponse({ ok: false, error: "Droits insuffisants pour cette action." }, 403) };
  }
  return { ctx };
}

async function assertFinanceNotLockedForNonAdmin(dbUrl, ctx) {
  if (ctx.role === "admin") return null;
  const rows = await runQuery(dbUrl, "select payload from public.settings where id = 'main' limit 1", []);
  const locked = rows?.[0]?.payload?.financeLocked === true;
  if (locked) {
    return jsonResponse(
      { ok: false, error: "Période comptable verrouillée. Seul un administrateur peut modifier ces données." },
      403
    );
  }
  return null;
}

async function assertFinanceNotLockedForMembers(dbUrl, ctx) {
  if (ctx.role === "admin") return null;
  return assertFinanceNotLockedForNonAdmin(dbUrl, ctx);
}

/** Variantes de chiffres pour CI (ex. 0757… vs 225757… vs 757…). */
function phoneDigitVariants(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return [];
  const v = new Set([digits]);
  if (digits.length === 10 && digits.startsWith("0")) {
    v.add(digits.slice(1));
    v.add("225" + digits.slice(1));
  }
  if (digits.length === 9) {
    v.add("0" + digits);
    v.add("225" + digits);
  }
  if (digits.length >= 11 && digits.startsWith("225")) {
    const rest = digits.slice(3);
    if (rest.length === 10 && rest.startsWith("0")) {
      v.add(rest);
      v.add(rest.slice(1));
    }
    if (rest.length === 9) {
      v.add("0" + rest);
    }
  }
  return [...v];
}

async function handleLogin(dbUrl, payload) {
  const rawId = String(payload.identifier || "").trim();
  const identifier = rawId.toLowerCase();
  const password = String(payload.password || "");
  if (!identifier || !password) {
    return jsonResponse({ ok: false, error: "Identifiants requis" }, 400);
  }
  const phoneVariants = phoneDigitVariants(rawId);
  const phoneClauses =
    phoneVariants.length > 0
      ? phoneVariants
          .map(
            (_, i) =>
              `regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = $${i + 2}`
          )
          .join(" or ")
      : "false";
  const userParams = [identifier, ...phoneVariants];
  const users = await runQuery(
    dbUrl,
    `select id, full_name, email, phone, role, is_active, password_hash
     from public.management_users
     where (
       lower(coalesce(email, '')) = $1
       or (${phoneClauses})
     )
     limit 1`,
    userParams
  );
  const user = users[0];
  const auditLogin = async (data) => {
    try {
      await insertAuditLog(dbUrl, data);
    } catch (e) {
      console.error("audit_logs (login):", e?.message || e);
    }
  };
  if (!user || user.is_active === false) {
    await auditLogin({
      actorName: "Anonyme",
      actorRole: "unknown",
      action: "ECHEC_CONNEXION",
      scope: "access",
      targetType: "management_user",
      targetLabel: identifier,
      details: "Compte absent ou inactif."
    });
    return jsonResponse({ ok: false, error: "Identifiants invalides" }, 401);
  }
  const passwordHash = sha256(password);
  const valid =
    user.password_hash === passwordHash || user.password_hash === md5(password) || user.password_hash === password;
  if (!valid) {
    await auditLogin({
      actorUserId: user.id,
      actorName: user.full_name || user.email || "Utilisateur",
      actorRole: user.role || "unknown",
      action: "ECHEC_CONNEXION",
      scope: "access",
      targetType: "management_user",
      targetId: user.id,
      targetLabel: user.full_name || user.email || "Utilisateur",
      details: "Mot de passe incorrect."
    });
    return jsonResponse({ ok: false, error: "Identifiants invalides" }, 401);
  }

  await runQuery(dbUrl, "update public.management_users set last_login_at = now(), updated_at = now() where id = $1", [user.id]);
  await auditLogin({
    actorUserId: user.id,
    actorName: user.full_name || user.email || "Utilisateur",
    actorRole: user.role || "unknown",
    action: "CONNEXION",
    scope: "access",
    targetType: "management_user",
    targetId: user.id,
    targetLabel: user.full_name || user.email || "Utilisateur",
    details: "Connexion réussie."
  });
  const sessionToken = createSessionToken({ id: user.id, role: user.role });
  return jsonResponse(
    {
      ok: true,
      sessionToken,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        is_active: user.is_active
      }
    },
    200
  );
}

async function handleMigrateUsers(dbUrl, payload) {
  const users = Array.isArray(payload.users) ? payload.users : [];
  let migrated = 0;
  for (const item of users) {
    const fullName = String(item.fullName || "").trim();
    const email = nullableEmail(item.username || item.email);
    const phone = nullablePhone(item.phone);
    const role = normalizeRole(item.role);
    const password = String(item.password || "");
    if (!fullName || (!email && !phone) || !password) continue;
    const existing = await runQuery(
      dbUrl,
      `select id from public.management_users
       where (coalesce(email, '') = coalesce($1, '') and $1 is not null)
          or (coalesce(phone, '') = coalesce($2, '') and $2 is not null)
       limit 1`,
      [email, phone]
    );
    if (existing.length > 0) continue;
    await runQuery(
      dbUrl,
      `insert into public.management_users
        (full_name, email, phone, password_hash, role, is_active)
       values ($1, $2, $3, $4, $5, $6)`,
      [fullName, email, phone, sha256(password), role, item.isActive !== false]
    );
    migrated += 1;
  }
  return jsonResponse({ ok: true, migrated }, 200);
}

async function handleCreateUser(dbUrl, payload) {
  const fullName = String(payload.fullName || "").trim();
  const email = nullableEmail(payload.email);
  const phone = nullablePhone(payload.phone);
  const password = String(payload.password || "");
  const role = normalizeRole(payload.role);
  if (!fullName || (!email && !phone) || !password) {
    return jsonResponse({ ok: false, error: "Données insuffisantes pour créer le compte." }, 400);
  }
  const inserted = await runQuery(
    dbUrl,
    `insert into public.management_users
      (full_name, email, phone, password_hash, role, is_active)
     values ($1, $2, $3, $4, $5, true)
     returning id, full_name, email, phone, role, is_active, created_at`,
    [fullName, email, phone, sha256(password), role]
  );
  return jsonResponse({ ok: true, user: inserted[0] }, 200);
}

async function handleUpdateUser(dbUrl, payload) {
  const userId = String(payload.userId || "");
  if (!userId) return jsonResponse({ ok: false, error: "userId requis" }, 400);
  const updates = [];
  const params = [];
  let idx = 1;
  const set = (column, value) => {
    updates.push(`${column} = $${idx}`);
    params.push(value);
    idx += 1;
  };

  if (payload.fullName !== undefined) set("full_name", String(payload.fullName || "").trim());
  if (payload.email !== undefined) set("email", nullableEmail(payload.email));
  if (payload.phone !== undefined) set("phone", nullablePhone(payload.phone));
  if (payload.password !== undefined && String(payload.password || "").trim() !== "") set("password_hash", sha256(String(payload.password)));
  if (payload.role !== undefined) set("role", normalizeRole(payload.role));
  if (payload.isActive !== undefined) set("is_active", !!payload.isActive);
  set("updated_at", new Date().toISOString());
  if (updates.length === 0) return jsonResponse({ ok: true }, 200);

  params.push(userId);
  await runQuery(dbUrl, `update public.management_users set ${updates.join(", ")} where id = $${idx}`, params);
  return jsonResponse({ ok: true }, 200);
}

async function handleToggleUserStatus(dbUrl, payload) {
  const userId = String(payload.userId || "");
  if (!userId) return jsonResponse({ ok: false, error: "userId requis" }, 400);
  await runQuery(dbUrl, "update public.management_users set is_active = $1, updated_at = now() where id = $2", [
    !!payload.isActive,
    userId
  ]);
  return jsonResponse({ ok: true }, 200);
}

async function handleDeleteUser(dbUrl, payload) {
  const userId = String(payload.userId || "");
  if (!userId) return jsonResponse({ ok: false, error: "userId requis" }, 400);
  await runQuery(dbUrl, "delete from public.management_users where id = $1", [userId]);
  return jsonResponse({ ok: true }, 200);
}

async function handleSaveConfig(dbUrl, payload, ctx) {
  const next = payload.config && typeof payload.config === "object" ? { ...payload.config } : {};
  if (next.financeLocked === true && ctx.role !== "admin") {
    return jsonResponse({ ok: false, error: "Seul un administrateur peut activer le verrouillage comptable." }, 403);
  }
  await runQuery(
    dbUrl,
    `insert into public.settings (id, payload, updated_at)
     values ('main', $1::jsonb, now())
     on conflict (id) do update set payload = excluded.payload, updated_at = now()`,
    [JSON.stringify(next || {})]
  );
  return jsonResponse({ ok: true }, 200);
}

async function handleAddMember(dbUrl, payload, ctx) {
  const member = payload.member || {};
  const phone = nullablePhone(member.whatsapp);
  if (phone) {
    const dup = await runQuery(
      dbUrl,
      `select id, name from public.members
       where regexp_replace(coalesce(whatsapp, ''), '\\D', '', 'g') = $1
       limit 1`,
      [phone]
    );
    if (dup.length > 0) {
      return jsonResponse(
        { ok: false, error: `Un fidèle existe déjà avec ce numéro (${dup[0].name || "doublon"}).` },
        409
      );
    }
  }
  const commsOpt = member.commsOptIn === false ? false : true;
  const inserted = await runQuery(
    dbUrl,
    `insert into public.members
      (name, church_function, district, whatsapp, category_id, custom_amount, date_joined, comms_opt_in)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     returning id`,
    [
      member.name || "",
      member.churchFunction || null,
      member.district || null,
      phone,
      member.categoryId || "cat1",
      Number(member.customAmount || 0),
      member.dateJoined || new Date().toISOString(),
      commsOpt
    ]
  );
  return jsonResponse({ ok: true, id: inserted?.[0]?.id || null }, 200);
}

async function handleUpdateMember(dbUrl, payload, ctx) {
  const memberId = String(payload.memberId || "");
  const member = payload.member || {};
  if (!memberId) return jsonResponse({ ok: false, error: "memberId requis" }, 400);
  const phone = nullablePhone(member.whatsapp);
  if (phone) {
    const dup = await runQuery(
      dbUrl,
      `select id from public.members
       where regexp_replace(coalesce(whatsapp, ''), '\\D', '', 'g') = $1
         and id <> $2::uuid
       limit 1`,
      [phone, memberId]
    );
    if (dup.length > 0) {
      return jsonResponse({ ok: false, error: "Un autre fidèle possède déjà ce numéro WhatsApp." }, 409);
    }
  }
  const commsOpt = member.commsOptIn === false ? false : true;
  await runQuery(
    dbUrl,
    `update public.members
     set name = $1,
         church_function = $2,
         district = $3,
         whatsapp = $4,
         category_id = $5,
         custom_amount = $6,
         comms_opt_in = $7,
         updated_at = now()
     where id = $8::uuid`,
    [
      member.name || "",
      member.churchFunction || null,
      member.district || null,
      phone,
      member.categoryId || "cat1",
      Number(member.customAmount || 0),
      commsOpt,
      memberId
    ]
  );
  return jsonResponse({ ok: true }, 200);
}

async function handleDeleteMember(dbUrl, payload, ctx) {
  const memberId = String(payload.memberId || "");
  if (!memberId) return jsonResponse({ ok: false, error: "memberId requis" }, 400);
  const locked = await assertFinanceNotLockedForMembers(dbUrl, ctx);
  if (locked) return locked;
  await runQuery(dbUrl, "delete from public.members where id = $1::uuid", [memberId]);
  return jsonResponse({ ok: true }, 200);
}

async function handleReplaceMemberPayments(dbUrl, payload) {
  const memberId = String(payload.memberId || "");
  const payments = Array.isArray(payload.payments) ? payload.payments : [];
  if (!memberId) return jsonResponse({ ok: false, error: "memberId requis" }, 400);
  await runQuery(dbUrl, "delete from public.payments where member_id = $1::uuid", [memberId]);
  for (const pay of payments) {
    await runQuery(
      dbUrl,
      `insert into public.payments (member_id, amount, method, payment_date)
       values ($1::uuid, $2, $3, $4)`,
      [
        memberId,
        Number(pay.amount || 0),
        pay.method || "Espèces",
        pay.date || new Date().toISOString().slice(0, 10)
      ]
    );
  }
  return jsonResponse({ ok: true }, 200);
}

async function handleAddExpense(dbUrl, payload) {
  const expense = payload.expense || {};
  if (toNum(expense.amount) <= 0) {
    return jsonResponse({ ok: false, error: "Montant de dépense invalide." }, 400);
  }
  const inserted = await runQuery(
    dbUrl,
    `insert into public.expenses (description, amount, expense_date, category, method)
     values ($1, $2, $3, $4, $5)
     returning id`,
    [
      expense.description || "",
      toNum(expense.amount),
      expense.date || new Date().toISOString().slice(0, 10),
      expense.category || "Logistique",
      expense.method || "Espèces"
    ]
  );
  return jsonResponse({ ok: true, id: inserted?.[0]?.id || null }, 200);
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function handleUpdateExpense(dbUrl, payload) {
  const expenseId = String(payload.expenseId || "");
  const expense = payload.expense || {};
  if (!expenseId) return jsonResponse({ ok: false, error: "expenseId requis" }, 400);
  if (toNum(expense.amount) <= 0) {
    return jsonResponse({ ok: false, error: "Montant de dépense invalide." }, 400);
  }
  await runQuery(
    dbUrl,
    `update public.expenses
     set description = $1,
         amount = $2,
         expense_date = $3,
         category = $4,
         method = $5
     where id = $6::uuid`,
    [
      expense.description || "",
      toNum(expense.amount),
      expense.date || new Date().toISOString().slice(0, 10),
      expense.category || "Logistique",
      expense.method || "Espèces",
      expenseId
    ]
  );
  return jsonResponse({ ok: true }, 200);
}

async function handleAddDeposit(dbUrl, payload) {
  const deposit = payload.deposit || {};
  if (toNum(deposit.amount) <= 0) {
    return jsonResponse({ ok: false, error: "Montant de remise invalide." }, 400);
  }
  const hasPaper = !!(deposit.bordereauRef || String(deposit.bordereauUrl || "").trim());
  const inserted = await runQuery(
    dbUrl,
    `insert into public.deposits (recipient, amount, deposit_date, bordereau_ref, bordereau_url, is_deposited)
     values ($1, $2, $3, $4, $5, $6)
     returning id`,
    [
      deposit.recipient || "",
      toNum(deposit.amount),
      deposit.date || new Date().toISOString().slice(0, 10),
      deposit.bordereauRef || null,
      String(deposit.bordereauUrl || "").trim() || null,
      hasPaper
    ]
  );
  return jsonResponse({ ok: true, id: inserted?.[0]?.id || null }, 200);
}

async function handleDeleteExpense(dbUrl, payload) {
  const expenseId = String(payload.expenseId || "");
  if (!expenseId) return jsonResponse({ ok: false, error: "expenseId requis" }, 400);
  await runQuery(dbUrl, "delete from public.expenses where id = $1::uuid", [expenseId]);
  return jsonResponse({ ok: true }, 200);
}

async function handleDeleteDeposit(dbUrl, payload) {
  const depositId = String(payload.depositId || "");
  if (!depositId) return jsonResponse({ ok: false, error: "depositId requis" }, 400);
  await runQuery(dbUrl, "delete from public.deposits where id = $1::uuid", [depositId]);
  return jsonResponse({ ok: true }, 200);
}

async function handleUpdateDepositRef(dbUrl, payload) {
  const depositId = String(payload.depositId || "");
  const ref = String(payload.ref || "").trim();
  if (!depositId || !ref) return jsonResponse({ ok: false, error: "depositId/ref requis" }, 400);
  const attachmentUrl = String(payload.attachmentUrl || "").trim();
  if (attachmentUrl) {
    await runQuery(
      dbUrl,
      "update public.deposits set bordereau_ref = $1, bordereau_url = $3, is_deposited = true where id = $2::uuid",
      [ref, depositId, attachmentUrl]
    );
  } else {
    await runQuery(
      dbUrl,
      "update public.deposits set bordereau_ref = $1, is_deposited = true where id = $2::uuid",
      [ref, depositId]
    );
  }
  return jsonResponse({ ok: true }, 200);
}

async function handleUpdateDepositAttachment(dbUrl, payload) {
  const depositId = String(payload.depositId || "");
  const attachmentUrl = String(payload.attachmentUrl || "").trim();
  if (!depositId) return jsonResponse({ ok: false, error: "depositId requis" }, 400);
  await runQuery(
    dbUrl,
    "update public.deposits set bordereau_url = $1, is_deposited = true where id = $2::uuid",
    [attachmentUrl || null, depositId]
  );
  return jsonResponse({ ok: true }, 200);
}

async function runQuery(dbUrl, query, params) {
  const apiKey = process.env.API_KEY;
  const res = await fetch(`${dbUrl}/api/database/advance/rawsql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      apikey: apiKey
    },
    body: JSON.stringify({ query, params })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `SQL error ${res.status}`);
  }
  const p = await res.json().catch(() => ({}));
  if (Array.isArray(p)) return p;
  if (Array.isArray(p?.rows)) return p.rows;
  return [];
}

async function ensureDefaultAdmin(dbUrl) {
  const rows = await runQuery(dbUrl, "select count(*)::int as total from public.management_users", []);
  const total = Number(rows?.[0]?.total || 0);
  if (total > 0) return;
  await runQuery(
    dbUrl,
    `insert into public.management_users (full_name, email, phone, password_hash, role, is_active)
     values ($1, $2, $3, $4, 'admin', true)`,
    ["Administrateur FAG", "admin@fag.local", "2250700000000", sha256("FAG2026@admin")]
  );
}

async function loadAppData(dbUrl) {
  const settingsRows = await runQuery(dbUrl, "select payload from public.settings where id = 'main' limit 1", []);
  const members = await runQuery(
    dbUrl,
    `select id, name, church_function, district, whatsapp, category_id, custom_amount, date_joined,
            coalesce(comms_opt_in, true) as comms_opt_in
     from public.members
     order by created_at asc`,
    []
  );
  const payments = await runQuery(
    dbUrl,
    `select id, member_id, amount, method, payment_date, created_at
     from public.payments
     order by created_at asc`,
    []
  );
  const expenses = await runQuery(
    dbUrl,
    `select id, description, amount, expense_date, category, method
     from public.expenses
     order by created_at desc`,
    []
  );
  const deposits = await runQuery(
    dbUrl,
    `select id, recipient, amount, deposit_date, bordereau_ref, bordereau_url, is_deposited
     from public.deposits
     order by created_at desc`,
    []
  );
  const whatsappRows = await runQuery(
    dbUrl,
    `select id, member_name, whatsapp, message_type, message_body, provider_status, created_at
     from public.whatsapp_logs
     order by created_at desc
     limit 200`,
    []
  );

  const payByMember = payments.reduce((acc, row) => {
    if (!acc[row.member_id]) acc[row.member_id] = [];
    acc[row.member_id].push({
      id: row.id,
      amount: Number(row.amount || 0),
      method: row.method || "Espèces",
      date: row.payment_date,
      timestamp: row.created_at
    });
    return acc;
  }, {});

  const normalizedMembers = members.map((row) => ({
    id: row.id,
    name: row.name,
    churchFunction: row.church_function || "",
    district: row.district || "",
    whatsapp: row.whatsapp || "",
    categoryId: row.category_id || "cat1",
    customAmount: Number(row.custom_amount || 0),
    dateJoined: row.date_joined,
    commsOptIn: row.comms_opt_in !== false,
    payments: payByMember[row.id] || []
  }));

  const normalizedExpenses = expenses.map((row) => ({
    id: row.id,
    description: row.description,
    amount: Number(row.amount || 0),
    date: row.expense_date,
    category: row.category,
    method: row.method || "Espèces"
  }));

  const normalizedDeposits = deposits.map((row) => ({
    id: row.id,
    recipient: row.recipient,
    amount: Number(row.amount || 0),
    date: row.deposit_date,
    bordereauRef: row.bordereau_ref || "",
    bordereauUrl: row.bordereau_url || "",
    isDeposited: row.is_deposited === true
  }));

  const whatsAppLogs = whatsappRows.map((row) => ({
    id: row.id,
    memberName: row.member_name || "",
    whatsapp: row.whatsapp,
    messageType: row.message_type,
    messageBody: row.message_body,
    providerStatus: row.provider_status,
    createdAt: row.created_at
  }));

  return {
    config: settingsRows?.[0]?.payload || null,
    members: normalizedMembers,
    expenses: normalizedExpenses,
    deposits: normalizedDeposits,
    whatsAppLogs
  };
}

async function insertAuditLog(dbUrl, data) {
  await runQuery(
    dbUrl,
    `insert into public.audit_logs
      (actor_user_id, actor_name, actor_role, action, scope, target_type, target_id, target_label, details, ip_address, user_agent)
     values
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      data.actorUserId || null,
      data.actorName || null,
      data.actorRole || null,
      String(data.action || "ACTION"),
      String(data.scope || "general"),
      data.targetType || null,
      data.targetId != null && data.targetId !== "" ? String(data.targetId) : null,
      data.targetLabel || null,
      data.details || null,
      data.ipAddress || null,
      data.userAgent || null
    ]
  );
}

function nullableEmail(input) {
  const value = String(input || "").trim().toLowerCase();
  return value || null;
}

function nullablePhone(input) {
  const digits = String(input || "").replace(/[^\d]/g, "");
  return digits || null;
}

function normalizeRole(input) {
  const role = String(input || "consultation");
  return ["admin", "tresorier", "communication", "consultation"].includes(role) ? role : "consultation";
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function md5(value) {
  return crypto.createHash("md5").update(String(value || "")).digest("hex");
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey"
    }
  });
}

function corsResponse(status = 204) {
  return new Response(null, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey"
    }
  });
}
