import { buildPushHTTPRequest } from "@pushforge/builder";

const WMO_LABELS = {
  0: "آسمان صاف", 1: "عمدتاً صاف", 2: "نیمه‌ابری", 3: "ابری",
  45: "مه", 48: "مه یخ‌زده",
  51: "نم‌نم خفیف", 53: "نم‌نم متوسط", 55: "نم‌نم شدید",
  61: "باران خفیف", 63: "باران متوسط", 65: "باران شدید",
  71: "برف خفیف", 73: "برف متوسط", 75: "برف شدید",
  80: "رگبار خفیف", 81: "رگبار متوسط", 82: "رگبار شدید",
  95: "رعد و برق", 96: "رعد و برق با تگرگ", 99: "رعد و برق با تگرگ شدید"
};

async function fetchTemperature(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;
  const res = await fetch(url, { headers: { "User-Agent": "weather-app-push-cron/1.0" } });
  if (!res.ok) throw new Error(`open-meteo responded ${res.status}`);
  const data = await res.json();
  return {
    temp: Math.round(data.current.temperature_2m),
    label: WMO_LABELS[data.current.weather_code] || "نامشخص"
  };
}

async function listAllKeys(kv) {
  const keys = [];
  let cursor;
  do {
    const page = await kv.list({ cursor });
    keys.push(...page.keys);
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return keys;
}

async function runForAllSubscriptions(env, ctx) {
  const keys = await listAllKeys(env.PUSH_SUBS);
  console.log(`push-cron: ${keys.length} subscription(s) found`);
  for (const { name } of keys) {
    ctx.waitUntil(processSubscription(env, name));
  }
  return keys.length;
}

export default {
  async scheduled(event, env, ctx) {
    await runForAllSubscriptions(env, ctx);
  },

  // Temporary manual-test endpoint, gated behind a shared secret header.
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname !== "/trigger" || request.headers.get("x-trigger-secret") !== env.TRIGGER_SECRET) {
      return new Response("not found", { status: 404 });
    }
    const count = await runForAllSubscriptions(env, ctx);
    return new Response(JSON.stringify({ triggered: count }), {
      headers: { "Content-Type": "application/json" }
    });
  }
};

async function processSubscription(env, key) {
  const raw = await env.PUSH_SUBS.get(key);
  if (!raw) return;

  const { subscription, lat, lon, city } = JSON.parse(raw);

  try {
    const { temp, label } = await fetchTemperature(lat, lon);

    const { endpoint, headers, body } = await buildPushHTTPRequest({
      privateJWK: JSON.parse(env.VAPID_PRIVATE_JWK),
      subscription,
      message: {
        payload: {
          title: city || "آب و هوای من",
          body: `${temp}°C، ${label}`
        },
        adminContact: env.VAPID_SUBJECT,
        options: { ttl: 3600, urgency: "normal", topic: "weather-update" }
      }
    });

    const res = await fetch(endpoint, { method: "POST", headers, body });
    if (!res.ok) {
      if (res.status === 404 || res.status === 410) {
        await env.PUSH_SUBS.delete(key);
        console.log(`push-cron: removed expired subscription ${key}`);
      } else {
        const text = await res.text().catch(() => "");
        console.error(`push-cron: push service responded ${res.status} for ${key}: ${text}`);
      }
    } else {
      console.log(`push-cron: sent to ${key}`);
    }
  } catch (err) {
    console.error(`push-cron: failed to notify ${key}`, err);
  }
}
