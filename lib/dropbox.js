import { PublicError } from './abrechnung.js';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function contentHash(bytes) {
  const blocks = [];
  for (let offset = 0; offset < bytes.length; offset += 4194304) {
    blocks.push(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes.slice(offset, offset + 4194304))));
  }
  const joined = new Uint8Array(blocks.length * 32);
  blocks.forEach((block, i) => joined.set(block, i * 32));
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', joined))]
    .map(n => n.toString(16).padStart(2, '0')).join('');
}
export class Dropbox {
  constructor(env, {fetcher = fetch, sleep = pause} = {}) {
    this.env = env; this.fetcher = fetcher; this.sleep = sleep;
  }
  async request(url, options) {
    for (let attempt = 0; attempt < 3; attempt++) {
      let response;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        try {
          response = await (0, this.fetcher)(url, {...options, signal: controller.signal});
        } finally { clearTimeout(timer); }
      } catch (error) {
        if (attempt === 2) throw new PublicError('Dropbox-Verbindungsfehler: ' + (error?.name || 'Netzwerkfehler'), 503);
      }
      if (response && response.status !== 429 && response.status < 500) return response;
      if (attempt === 2) break;
      const retry = Number(response?.headers.get('Retry-After'));
      // Lange Sperren dem nächsten manuellen Versuch überlassen, nicht früher erneut senden.
      if (response?.status === 429 && Number.isFinite(retry) && retry > 3) break;
      if (response) await response.body?.cancel();
      await this.sleep(Math.max(250 * 2 ** attempt, Math.min(3, retry || 0) * 1000) + Math.floor(Math.random() * 100));
    }
    throw new PublicError('Dropbox ist vorübergehend nicht erreichbar. Bitte dieselbe Abrechnung erneut übermitteln.', 503);
  }
  async connect() {
    const response = await this.request('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST', headers: {
        Authorization: 'Basic ' + btoa(this.env.DROPBOX_APP_KEY + ':' + this.env.DROPBOX_APP_SECRET),
        'Content-Type': 'application/x-www-form-urlencoded'
      }, body: new URLSearchParams({grant_type: 'refresh_token', refresh_token: this.env.DROPBOX_REFRESH_TOKEN})
    });
    const data = await response.json();
    if (!response.ok || typeof data.access_token !== 'string' || !data.access_token) {
      throw new PublicError('Dropbox-Verbindung muss vom Kassenwart geprüft werden.', 503);
    }
    this.token = data.access_token;
  }
  async folder(path) {
    const response = await this.request('https://api.dropboxapi.com/2/files/create_folder_v2', {
      method: 'POST', headers: {Authorization: 'Bearer ' + this.token, 'Content-Type': 'application/json'},
      body: JSON.stringify({path, autorename: false})
    });
    const data = await response.json();
    if (response.ok) return;
    if (response.status === 409 && data.error?.['.tag'] === 'path' &&
        data.error.path?.['.tag'] === 'conflict' && data.error.path.conflict?.['.tag'] === 'folder') return;
    throw new PublicError('Dropbox-Ablage konnte nicht geöffnet werden.', 503);
  }
  async file(path, bytes) {
    const hash = await contentHash(bytes);
    const response = await this.request('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST', headers: {
        Authorization: 'Bearer ' + this.token, 'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({path, mode: 'add', autorename: false,
          strict_conflict: false, mute: true, content_hash: hash})
      }, body: bytes
    });
    const data = await response.json();
    // Dropbox liefert bei identischem Inhalt dieselben Dateimetadaten zurück.
    // Abweichender Inhalt wird durch mode:add + autorename:false niemals überschrieben.
    if (response.status === 409 && data.error?.['.tag'] === 'path' && data.error.path?.['.tag'] === 'conflict') {
      throw new PublicError('Unter dieser Vorgangsnummer liegen andere Daten vor. Bitte den Kassenwart kontaktieren; keine neue Abrechnung anlegen.', 409);
    }
    if (!response.ok || data.content_hash !== hash || data.size !== bytes.length ||
        data.path_lower !== path.toLowerCase() || typeof data.rev !== 'string' || !data.rev) {
      throw new PublicError('Datei in Dropbox nicht bestätigt. Bitte dieselbe Abrechnung erneut übermitteln.', 503);
    }
    return {name: path.slice(path.lastIndexOf('/') + 1), hash, rev: data.rev};
  }
}
