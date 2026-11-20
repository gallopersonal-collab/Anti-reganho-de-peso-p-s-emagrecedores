// Trainer Pro Studio — webhook da Kiwify
// Recebe os eventos de venda e mantém a tabela public.licenses (uma licença por e-mail do comprador).
// URL cadastrada na Kiwify: https://<projeto>.supabase.co/functions/v1/kiwify-webhook?k=<app_config.kiwify_url_key>
// Opcional: se app_config.kiwify_token existir, também aceita a assinatura ?signature= (HMAC-SHA1 do corpo).
import { createClient } from "jsr:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const GRACE_DAYS = 3; // tolerância após a data da próxima cobrança
const REVOKE_EVENTS = ["order_refunded", "chargeback", "compra_reembolsada", "reembolso"];
const REVOKE_STATUS = ["refunded", "chargedback", "chargeback"];
const GRANT_EVENTS = ["order_approved", "subscription_renewed", "compra_aprovada", "assinatura_renovada"];

async function config(key: string): Promise<string | null> {
  const { data } = await sb.from("app_config").select("value").eq("key", key).maybeSingle();
  return data ? data.value : null;
}

async function hmacSha1Hex(secret: string, body: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function parseDate(v: unknown): Date | null {
  if (!v) return null;
  const s = String(v).trim();
  const d = new Date(/^\d{4}-\d{2}-\d{2} \d/.test(s) ? s.replace(" ", "T") : s);
  return isNaN(d.getTime()) ? null : d;
}

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: true, info: "Trainer Pro Studio: webhook Kiwify ativo" });
  const url = new URL(req.url);
  const raw = await req.text();

  // Autenticação: chave secreta na URL ou assinatura da Kiwify
  const urlKey = await config("kiwify_url_key");
  const token = await config("kiwify_token");
  let ok = !!urlKey && url.searchParams.get("k") === urlKey;
  const signature = url.searchParams.get("signature");
  if (!ok && token && signature) ok = (await hmacSha1Hex(token, raw)) === signature.toLowerCase();
  if (!ok) return json({ error: "unauthorized" }, 401);

  let p: Record<string, any>;
  try {
    p = JSON.parse(raw);
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const ev = String(p.webhook_event_type || p.event || p.trigger || "").toLowerCase();
  const st = String(p.order_status || p.status || "").toLowerCase();
  const customer = p.Customer || p.customer || {};
  const email = String(customer.email || p.email || "").trim().toLowerCase();
  const sub = p.Subscription || p.subscription || {};
  const access = sub.customer_access || {};
  const next = parseDate(access.access_until || sub.next_payment || sub.charges?.future?.[0]?.charge_date);
  const product = String((p.Product || p.product || {}).product_name || "");
  const orderId = String(p.order_id || p.order_ref || "");

  let result = "ignorado";
  const { data: adminRow } = email ? await sb.from("admins").select("email").eq("email", email).maybeSingle() : { data: null };
  if (adminRow) {
    result = "ignorado (conta de administrador: licença permanente)";
  } else if (email) {
    let row: Record<string, unknown> | null = null;
    if (REVOKE_EVENTS.includes(ev) || REVOKE_STATUS.includes(st)) {
      row = { status: "inactive", expires_at: new Date().toISOString() };
      result = "licença desativada";
    } else if (ev === "subscription_canceled") {
      // cancelou: mantém o acesso até o fim do período já pago
      row = { status: "active", expires_at: (next || new Date()).toISOString() };
      result = "assinatura cancelada (acesso até o fim do período)";
    } else if (GRANT_EVENTS.includes(ev) || st === "paid" || st === "approved") {
      // Sem a data da próxima cobrança: libera um ciclo (anual = 370 dias, demais = 35 dias), nunca "para sempre"
      const freq = String(sub.plan?.frequency || sub.frequency || p.plan_frequency || "").toLowerCase();
      const yearly = /year|annual|anual/.test(freq) || /anual/i.test(product) || /anual/i.test(String(sub.plan?.name || ""));
      const exp = next
        ? new Date(next.getTime() + GRACE_DAYS * 86400000).toISOString()
        : new Date(Date.now() + (yearly ? 370 : 35) * 86400000).toISOString();
      row = { status: "active", expires_at: exp };
      result = "licença ativada até " + exp.slice(0, 10) + (next ? "" : yearly ? " (ciclo anual)" : " (ciclo mensal)");
    }
    if (row) {
      const { error } = await sb.from("licenses").upsert({
        email, ...row, source: "kiwify", order_id: orderId || null, product: product || null,
        last_event: ev || st, updated_at: new Date().toISOString(),
      });
      if (error) result = "erro: " + error.message;
    }
  } else {
    result = "sem e-mail do comprador";
  }

  await sb.from("kiwify_events").insert({ event: ev || st, email: email || null, order_id: orderId || null, result, payload: p });
  return json({ ok: true, result });
});
