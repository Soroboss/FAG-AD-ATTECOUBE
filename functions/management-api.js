import crypto from "node:crypto";

export default async function handler(req) {
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const dbUrl = process.env.DATABASE_URL || process.env.INSFORGE_BASE_URL;
    if (!dbUrl) {
      return jsonResponse({ ok: false, error: "DATABASE_URL non configuré" }, 503);
    }

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
      return jsonResponse({ ok: true, users, logs }, 200);
    }

    if (action === "login") {
      const identifier = String(payload.identifier || "").trim().toLowerCase();
      const digits = String(payload.identifier || "").replace(/[^\d]/g, "");
      const password = String(payload.password || "");
      if (!identifier || !password) {
        return jsonResponse({ ok: false, error: "Identifiants requis" }, 400);
      }
      const users = await runQuery(
        dbUrl,
        `select id, full_name, email, phone, role, is_active, password_hash
         from public.management_users
         where (lower(coalesce(email, '')) = $1 or regexp_replace(coalesce(phone, ''), '\D', '', 'g') = $2)
         limit 1`,
        [identifier, digits]
      );
      const user = users[0];
      if (!user || user.is_active === false) {
        await insertAuditLog(dbUrl, {
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
      const valid = user.password_hash === passwordHash || user.password_hash === password;
      if (!valid) {
        await insertAuditLog(dbUrl, {
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
      await insertAuditLog(dbUrl, {
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
      return jsonResponse(
        {
          ok: true,
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

    if (action === "createUser") {
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

    if (action === "updateUser") {
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

    if (action === "toggleUserStatus") {
      const userId = String(payload.userId || "");
      if (!userId) return jsonResponse({ ok: false, error: "userId requis" }, 400);
      await runQuery(dbUrl, "update public.management_users set is_active = $1, updated_at = now() where id = $2", [
        !!payload.isActive,
        userId
      ]);
      return jsonResponse({ ok: true }, 200);
    }

    if (action === "deleteUser") {
      const userId = String(payload.userId || "");
      if (!userId) return jsonResponse({ ok: false, error: "userId requis" }, 400);
      await runQuery(dbUrl, "delete from public.management_users where id = $1", [userId]);
      return jsonResponse({ ok: true }, 200);
    }

    if (action === "createLog") {
      await insertAuditLog(dbUrl, payload);
      return jsonResponse({ ok: true }, 200);
    }

    if (action === "listLogs") {
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

    return jsonResponse({ ok: false, error: "Action inconnue" }, 400);
  } catch (error) {
    return jsonResponse({ ok: false, error: error?.message || "Unexpected error" }, 500);
  }
}

async function runQuery(dbUrl, query, params) {
  const res = await fetch(`${dbUrl}/rpc/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, params })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `SQL error ${res.status}`);
  }
  const payload = await res.json().catch(() => ({}));
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.rows)) return payload.rows;
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
      data.targetId || null,
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

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

