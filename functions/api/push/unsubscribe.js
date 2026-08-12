async function keyFor(endpoint) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const { endpoint } = body || {};
  if (!endpoint) {
    return new Response(JSON.stringify({ error: "endpoint is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const key = await keyFor(endpoint);
  await env.PUSH_SUBS.delete(key);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
