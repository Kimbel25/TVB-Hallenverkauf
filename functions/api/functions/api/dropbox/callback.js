
const redirectUri =
  "https://tvb-hallenverkauf.pages.dev/api/dropbox/callback";

const headers = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "Content-Type": "text/html; charset=utf-8",
  "X-Content-Type-Options": "nosniff"
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  }[c]));
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const cookies = request.headers.get("Cookie") || "";
  const stored = cookies
    .split(";")
    .map(x => x.trim())
    .find(x => x.startsWith("tvb_oauth_state="))
    ?.slice("tvb_oauth_state=".length);

  const commonHeaders = {
    ...headers,
    "Set-Cookie":
      "tvb_oauth_state=; Path=/api/dropbox; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
  };

  if (error) {
    return new Response("Dropbox-Freigabe abgebrochen.", {
      status: 400, headers: commonHeaders
    });
  }

  if (!code || !state || !stored || state !== stored) {
    return new Response(
      "Ungueltige oder abgelaufene Freigabe. Bitte erneut starten.",
      { status: 403, headers: commonHeaders }
    );
  }

  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    client_id: env.DROPBOX_APP_KEY,
    client_secret: env.DROPBOX_APP_SECRET,
    redirect_uri: redirectUri
  });

  const response = await fetch(
    "https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded"
      },
      body
    }
  );

  if (!response.ok) {
    return new Response(
      "Dropbox konnte die Freigabe nicht abschliessen. Bitte Einstellungen pruefen.",
      { status: 502, headers: commonHeaders }
    );
  }

  const result = await response.json();

  if (!result.refresh_token) {
    return new Response(
      "Kein Refresh-Token erhalten. Offline-Zugriff pruefen.",
      { status: 502, headers: commonHeaders }
    );
  }

  return new Response(`<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dropbox verbunden</title>
<style>
body{font-family:system-ui;max-width:620px;
margin:50px auto;padding:20px}
textarea{width:100%;box-sizing:border-box;padding:12px}
</style>
</head>
<body>
<h2>Dropbox-Freigabe erfolgreich</h2>
<p>Speichere den folgenden Wert als verschluesseltes
Cloudflare-Secret mit dem Namen
<strong>DROPBOX_REFRESH_TOKEN</strong>.</p>
<textarea rows="5" readonly>${escapeHtml(
  result.refresh_token
)}</textarea>
<p><strong>Vertraulich:</strong> Diesen Token nicht
an andere Personen senden und nicht in GitHub eintragen.
Nach dem Speichern diese Seite schliessen.</p>
</body>
</html>`, { headers: commonHeaders });
}
