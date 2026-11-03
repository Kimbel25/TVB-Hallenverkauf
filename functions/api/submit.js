
const PREISE = [
  16, 20, 0.80, 18, 0.80,
  21, 1.10, 16, 0.80, 18,
  0.90, 6, 0.40, 1, 0.25
];

const ANTWORT = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

function antwort(daten, status = 200) {
  return new Response(JSON.stringify(daten), {
    status,
    headers: ANTWORT
  });
}

function cent(wert) {
  return Math.round(Number(wert) * 100);
}

function sichererName(wert) {
  return String(wert)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 45);
}

async function accessToken(env) {
  const basic = btoa(
    env.DROPBOX_APP_KEY + ":" + env.DROPBOX_APP_SECRET
  );

  const res = await fetch(
    "https://api.dropboxapi.com/oauth2/token",
    {
      method: "POST",
      headers: {
        Authorization: "Basic " + basic,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: env.DROPBOX_REFRESH_TOKEN
      })
    }
  );

  if (!res.ok) throw Error("Dropbox-Autorisierung");
  const data = await res.json();
  return data.access_token;
}

async function ordnerAnlegen(token, path) {
  const res = await fetch(
    "https://api.dropboxapi.com/2/files/create_folder_v2",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        path,
        autorename: false
      })
    }
  );

  if (res.ok) return;

  if (res.status === 409) {
    const data = await res.json();
    if (data.error?.[".tag"] === "path" &&
        data.error?.path?.[".tag"] === "conflict") {
      return;
    }
  }

  throw Error("Dropbox-Ordner");
}

async function dateiHochladen(token, path, inhalt) {
  const res = await fetch(
    "https://content.dropboxapi.com/2/files/upload",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({
          path,
          mode: "add",
          autorename: false,
          mute: true
        })
      },
      body: new TextEncoder().encode(inhalt)
    }
  );

  if (res.ok) return "gespeichert";

  if (res.status === 409) {
    const data = await res.json();
    if (data.error?.[".tag"] === "path" &&
        data.error?.path?.[".tag"] === "conflict") {
      return "bereits vorhanden";
    }
  }

  throw Error("Dropbox-Upload");
}

export async function onRequestPost({ request, env }) {
  try {
    const origin = request.headers.get("Origin");
    const eigeneOrigin =
      new URL(request.url).origin;

    if (origin !== eigeneOrigin) {
      return antwort({ ok: false, error: "Ursprung" }, 403);
    }

    if (!request.headers.get("Content-Type")
        ?.includes("application/json")) {
      return antwort({ ok: false, error: "Format" }, 415);
    }

    const roh = await request.text();

    if (roh.length > 50000) {
      return antwort({ ok: false, error: "Datei zu gross" }, 413);
    }

    const eingabe = JSON.parse(roh);

    if (!env.TVB_VEREINSCODE ||
        !env.DROPBOX_REFRESH_TOKEN ||
        eingabe.vereinscode !== env.TVB_VEREINSCODE) {
      return antwort({
        ok: false, error: "Vereinscode ungueltig"
      }, 403);
    }

    const d = eingabe.abrechnung;
    const id = String(eingabe.id || "");

    if (!/^[a-f0-9-]{36}$/.test(id) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(d?.datum || "") ||
        !Number.isFinite(Date.parse(d.datum)) ||
        !String(d.mannschaft || "").trim() ||
        !String(d.person || "").trim() ||
        String(d.mannschaft).length > 120 ||
        String(d.person).length > 120 ||
        String(d.bemerkung || "").length > 2000 ||
        !Array.isArray(d.waren) ||
        d.waren.length !== PREISE.length ||
        !Array.isArray(d.ausgaben) ||
        d.ausgaben.length > 50) {
      return antwort({
        ok: false, error: "Ungueltige Abrechnung"
      }, 400);
    }

    let getraenkeCent = 0;

    for (let i = 0; i < PREISE.length; i++) {
      const anzahl = Number(d.waren[i].anzahl);

      if (!Number.isInteger(anzahl) ||
          anzahl < 0 || anzahl > 10000) {
        return antwort({
          ok: false, error: "Ungueltige Menge"
        }, 400);
      }

      getraenkeCent += anzahl * cent(PREISE[i]);
    }

    let sonstigeCent = 0;

    for (const ausgabe of d.ausgaben) {
      const wert = Number(ausgabe.betrag);

      if (!Number.isFinite(wert) ||
          wert < 0 || wert > 100000 ||
          Math.abs(wert * 100 - cent(wert)) > 0.001 ||
          String(ausgabe.text || "").length > 200 ||
          (wert > 0 && !String(ausgabe.text || "").trim())) {
        return antwort({
          ok: false, error: "Ungueltige Ausgabe"
        }, 400);
      }

      sonstigeCent += cent(wert);
    }

    if (sonstigeCent > 0 && d.quittungen !== true) {
      return antwort({
        ok: false, error: "Quittungen nicht bestaetigt"
      }, 400);
    }

    const daten = {
      ...d,
      id,
      summen: {
        getraenke: getraenkeCent / 100,
        sonstige: sonstigeCent / 100,
        gesamt: (getraenkeCent + sonstigeCent) / 100
      },
      eingegangenAm: new Date().toISOString()
    };

    const token = await accessToken(env);
    const jahr = d.datum.slice(0, 4);

    await ordnerAnlegen(token, "/Abrechnungen");
    await ordnerAnlegen(token, "/Abrechnungen/" + jahr);

    const name =
      d.datum + "_" +
      sichererName(d.mannschaft) + "_" +
      id + ".json";

    const ziel = "/Abrechnungen/" + jahr + "/" + name;

    const ergebnis = await dateiHochladen(
      token,
      ziel,
      JSON.stringify(daten, null, 2)
    );

    return antwort({
      ok: true,
      id,
      datei: name,
      status: ergebnis
    });

  } catch (e) {
    console.error("TVB Upload:", e.message);

    return antwort({
      ok: false,
      error: "Uebermittlung fehlgeschlagen"
    }, 500);
  }
}
