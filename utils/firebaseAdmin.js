const admin = require('firebase-admin');

let initialized = false;

function ensureFirebaseAdmin() {
  if (initialized) return admin;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    console.warn('[firebase-admin] FIREBASE_SERVICE_ACCOUNT_JSON not set; push disabled');
    return null;
  }
  try {
    const json = JSON.parse(raw);
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(json),
      });
    }
    initialized = true;
    return admin;
  } catch (e) {
    console.error('[firebase-admin] Failed to init admin SDK:', e.message);
    return null;
  }
}

function getMessagingClient() {
  const app = ensureFirebaseAdmin();
  if (!app) return null;
  try {
    return admin.messaging();
  } catch (e) {
    console.error('[firebase-admin] messaging unavailable:', e.message);
    return null;
  }
}

module.exports = { ensureFirebaseAdmin, getMessagingClient };
