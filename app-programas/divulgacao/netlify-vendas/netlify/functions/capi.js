// API de Conversões do Meta (servidor): recebe os eventos do navegador e repassa ao Meta.
// O token fica na variável de ambiente META_CAPI_TOKEN da Netlify (nunca no código).
// Sem token, a função não faz nada e o pixel do navegador continua funcionando normalmente.
const PIXEL_ID = '359597814629044';
const ALLOWED = new Set(['PageView', 'ViewContent', 'InitiateCheckout', 'Lead']);
const API = 'https://graph.facebook.com/v21.0/' + PIXEL_ID + '/events';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: '' };
  const token = process.env.META_CAPI_TOKEN;
  if (!token) return { statusCode: 204, body: '' };
  let b;
  try { b = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 400, body: '' }; }
  if (!ALLOWED.has(b.event_name) || !b.event_id) return { statusCode: 400, body: '' };
  const h = event.headers || {};
  const ip = h['x-nf-client-connection-ip'] || (h['x-forwarded-for'] || '').split(',')[0].trim();
  const user_data = { client_ip_address: ip || undefined, client_user_agent: h['user-agent'] || undefined };
  if (b.fbp) user_data.fbp = String(b.fbp).slice(0, 200);
  if (b.fbc) user_data.fbc = String(b.fbc).slice(0, 300);
  const custom = {};
  const cd = b.custom_data || {};
  if (cd.content_name) custom.content_name = String(cd.content_name).slice(0, 100);
  if (cd.value != null && !isNaN(Number(cd.value))) custom.value = Number(cd.value);
  if (cd.currency) custom.currency = String(cd.currency).slice(0, 3);
  const payload = {
    data: [{
      event_name: b.event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id: String(b.event_id).slice(0, 100),
      action_source: 'website',
      event_source_url: String(b.event_source_url || '').slice(0, 1000) || undefined,
      user_data,
      custom_data: Object.keys(custom).length ? custom : undefined,
    }],
  };
  if (process.env.META_CAPI_TEST_CODE) payload.test_event_code = process.env.META_CAPI_TEST_CODE;
  try {
    const r = await fetch(API + '?access_token=' + encodeURIComponent(token), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    if (!r.ok) console.log('CAPI erro', r.status, (await r.text()).slice(0, 300));
  } catch (e) { console.log('CAPI falhou', e.message); }
  return { statusCode: 204, body: '' };
};
