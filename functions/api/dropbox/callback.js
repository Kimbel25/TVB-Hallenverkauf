export function onRequest() {
  return new Response("Einrichtung abgeschlossen. Dieser Endpunkt ist deaktiviert.", {
    status: 410, headers: {"Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8"}
  });
}
