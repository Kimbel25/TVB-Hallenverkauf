
export function onRequestGet({ env }) {
  const configured = {
    appKey: Boolean(env.DROPBOX_APP_KEY),
    appSecret: Boolean(env.DROPBOX_APP_SECRET),
    setupKey: Boolean(env.TVB_SETUP_KEY),
    vereinscode: Boolean(env.TVB_VEREINSCODE),
    refreshToken: Boolean(env.DROPBOX_REFRESH_TOKEN)
  };

  return Response.json({
    app: "TVB Hallenverkauf",
    version: "6.0",
    server: "online",
    dropbox: {
      credentialsConfigured:
        configured.appKey && configured.appSecret,
      authorized: configured.refreshToken
    },
    setupConfigured:
      configured.setupKey && configured.vereinscode
  }, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

