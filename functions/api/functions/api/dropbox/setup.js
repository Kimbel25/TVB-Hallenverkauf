
const noCache = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff"
};

const redirectUri =
  "https://tvb-hallenverkauf.pages.dev/api/dropbox/callback";

export function onRequestGet() {
  return new Response(`<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>TVB Dropbox-Einrichtung</title>
<style>
body{font-family:system-ui;background:#f5f5f7;
max-width:460px;margin:60px auto;padding:20px}
main{background:white;padding:24px;border-radius:16px}
input,button{box-sizing:border-box;width:100%;
padding:14px;margin-top:12px;border-radius:9px;font:inherit}
input{border:1px solid #aaa}
button{background:#b8091a;color:white;border:0}
</style>
</head>
<body><main>
<h2>TVB Dropbox verbinden</h2>
<p>Einmalige Freigabe durch den Kassenwart.</p>
<form method="POST">
<label>Einrichtungskennwort</label>
<input type="password" name="setupKey" required>
<button type="submit">Dropbox verbinden</button>
</form>
</main></body></html>`, {
    headers: {
      ...noCache,
      "Content-Type": "text/html; charset=utf-8"
    }
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.TVB_SETUP_KEY || !env.DROPBOX_APP_KEY ||
      !env.DROPBOX_APP_SECRET) {
    return new Response("Server nicht konfiguriert", {
      status: 503, headers: noCache
    });
  }

  const form = await request.formData();
  const supplied = String(form.get("setupKey") || "");

  // Vergleich ohne vorzeitigen Abbruch
  const encoder = new TextEncoder();
  const expected = encoder.encode(env.TVB_SETUP_KEY);
  const actual = encoder.encode(supplied);

  let diff = expected.length ^ actual.length;
  for (let i = 0; i < Math.max(expected.length, actual.length); i++) {
    diff |= (expected[i] || 0) ^ (actual[i] || 0);
  }

  if (diff !== 0) {
    return new Response("Kennwort nicht korrekt", {
      status: 403, headers: noCache
    });
  }

  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const state = Array.from(bytes,
    b => b.toString(16).padStart(2, "0")
  ).join("");

  const url = new URL("https://www.dropbox.com/oauth2/authorize");
  url.searchParams.set("client_id", env.DROPBOX_APP_KEY);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("token_access_type", "offline");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope",
    "files.content.write files.metadata.write");

  return new Response(null, {
    status: 303,
    headers: {
      ...noCache,
      "Location": url.toString(),
      "Set-Cookie": `tvb_oauth_state=${state}; Path=/api/dropbox; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
    }
  });
}
