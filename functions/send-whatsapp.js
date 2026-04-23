/**
 * InsForge Edge Function: send-whatsapp
 *
 * Required secrets:
 * - WHATSAPP_TOKEN
 * - WHATSAPP_PHONE_NUMBER_ID
 * Optional:
 * - WHATSAPP_API_VERSION (default v20.0)
 */
export default async function handler(req) {
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const to = normalizePhone(body?.to);
    const message = String(body?.message || "").trim();
    const messageType = String(body?.messageType || "manual");
    const memberName = String(body?.memberName || "");

    if (!to || !message) {
      return jsonResponse({ ok: false, error: "Missing to/message" }, 400);
    }

    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const apiVersion = process.env.WHATSAPP_API_VERSION || "v20.0";

    if (!token || !phoneNumberId) {
      return jsonResponse(
        {
          ok: false,
          error: "WhatsApp provider not configured",
          hint: "Set WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID in InsForge secrets."
        },
        503
      );
    }

    const endpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
    const providerRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { preview_url: false, body: message }
      })
    });

    const providerJson = await providerRes.json().catch(() => ({}));
    const status = providerRes.ok ? "sent" : "failed";

    await logMessage({
      memberName,
      whatsapp: to,
      messageType,
      messageBody: message,
      providerStatus: status,
      providerResponse: providerJson
    });

    if (!providerRes.ok) {
      return jsonResponse({ ok: false, error: "Provider error", details: providerJson }, providerRes.status);
    }

    return jsonResponse({ ok: true, provider: providerJson }, 200);
  } catch (error) {
    return jsonResponse({ ok: false, error: error?.message || "Unexpected error" }, 500);
  }
}

async function logMessage(entry) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return;

  try {
    const sql = `
      insert into public.whatsapp_logs
        (member_name, whatsapp, message_type, message_body, provider_status, provider_response)
      values
        ($1, $2, $3, $4, $5, $6::jsonb)
    `;

    const payload = {
      query: sql,
      params: [
        entry.memberName || null,
        entry.whatsapp,
        entry.messageType,
        entry.messageBody,
        entry.providerStatus || null,
        JSON.stringify(entry.providerResponse || {})
      ]
    };

    await fetch(`${dbUrl}/rpc/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch {
    // do not fail message delivery because of logging issues
  }
}

function normalizePhone(input) {
  if (!input) return "";
  return String(input).replace(/[^\d]/g, "");
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

