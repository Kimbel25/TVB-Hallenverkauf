
const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TVB Dropbox-Test</title>
<style>
body {
  font-family: system-ui, sans-serif;
  max-width: 440px;
  margin: 60px auto;
  padding: 20px;
}
input, button {
  box-sizing: border-box;
  width: 100%;
  padding: 14px;
  margin-top: 12px;
  font: inherit;
}
button {
  background: #b8091a;
  color: white;
  border: 0;
  border-radius: 10px;
}
</style>
</head>
<body>
<h2>TVB Dropbox-Verbindungstest</h2>
<p>Erstellt eine Testdatei im Vereins-Dropbox-Konto.</p>
<form method="POST">
<input type="password" name="key"
placeholder="Einrichtungskennwort" required>
<button>Testdatei hochladen</button>
</form>
</body>
</html>`;

const headers = {
  "Cache-Control": "no-store",
  "Content-Type": "text/html; charset=utf-8"
};

export function onRequestGet() {
  return new Response(html, { headers });
}

export async function onRequestPost({ request, env }) {
  try {
    const form = await request.formData();
    const key = String(form.get("key") || "");

    if (!env.TVB_SETUP_KEY ||
        !env.DROPBOX_REFRESH_TOKEN ||
        !env.DROPBOX_APP_KEY ||
        !env.DROPBOX_APP_SECRET ||
        key !== env.TVB_SETUP_KEY) {
      return new Response("Zugriff verweigert", {
        status: 403, headers
      });
    }

    const auth = btoa(
      env.DROPBOX_APP_KEY + ":" +
      env.DROPBOX_APP_SECRET
    );

    const tokenResponse = await fetch(
      "https://api.dropboxapi.com/oauth2/token",
      {
        method: "POST",
        headers: {
          "Authorization": "Basic " + auth,
          "Content-Type":
            "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: env.DROPBOX_REFRESH_TOKEN
        })
      }
    );

    if (!tokenResponse.ok) {
      throw new Error("Dropbox-Token nicht akzeptiert");
    }

    const tokenData = await tokenResponse.json();
    const token = tokenData.access_token;

    const folderResponse = await fetch(
      "https://api.dropboxapi.com/2/files/create_folder_v2",
      {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          path: "/Abrechnungen",
          autorename: false
        })
      }
    );

    if (!folderResponse.ok) {
      const error = await folderResponse.text();
      if (!error.includes("conflict")) {
        throw new Error("Ordner konnte nicht erstellt werden");
      }
    }

    const filename =
      "/Abrechnungen/TVB_Verbindungstest_" +
      Date.now() + ".txt";

    const upload = await fetch(
      "https://content.dropboxapi.com/2/files/upload",
      {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/octet-stream",
          "Dropbox-API-Arg": JSON.stringify({
            path: filename,
            mode: "add",
            autorename: false,
            mute: true
          })
        },
        body: "TVB Hallenverkauf - Dropbox-Verbindung erfolgreich."
      }
    );

    if (!upload.ok) {
      throw new Error("Datei-Upload fehlgeschlagen");
    }

    return new Response(
      "<h2>Dropbox-Verbindung erfolgreich!</h2>" +
      "<p>Die Testdatei wurde gespeichert.</p>",
      { headers }
    );

  } catch (error) {
    console.error("Dropbox-Test fehlgeschlagen:", error);
    return new Response(
      "Dropbox-Test fehlgeschlagen. " +
      "Bitte Cloudflare-Logs prüfen.",
      { status: 500, headers }
    );
  }
}
