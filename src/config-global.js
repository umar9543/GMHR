import { paths } from 'src/routes/paths';

// API
// ----------------------------------------------------------------------
export const APP_API = import.meta.env.VITE_APP_API;
export const APP_API_STORAGE = import.meta.env.VITE_APP_API_STORAGE;
export const APP_URL = import.meta.env.VITE_APP_URL;

export const MAP_API = import.meta.env.VITE_MAPS_API_KEY;

export const HOST_API = import.meta.env.VITE_HOST_API;
export const ASSETS_API = import.meta.env.VITE_ASSETS_API;

// Secret Keys
export const Crypto_Key = import.meta.env.VITE_ENCRYPTION_CHABI;

export const FIREBASE_API = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APPID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const AMPLIFY_API = {
  userPoolId: import.meta.env.VITE_AWS_AMPLIFY_USER_POOL_ID,
  userPoolWebClientId: import.meta.env.VITE_AWS_AMPLIFY_USER_POOL_WEB_CLIENT_ID,
  region: import.meta.env.VITE_AWS_AMPLIFY_REGION,
};

export const AUTH0_API = {
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
  domain: import.meta.env.VITE_AUTH0_DOMAIN,
  callbackUrl: import.meta.env.VITE_AUTH0_CALLBACK_URL,
};

export const SUPABASE_API = {
  url: import.meta.env.VITE_SUPABASE_URL,
  key: import.meta.env.VITE_SUPABASE_ANON_KEY,
};

export const MAPBOX_API = import.meta.env.VITE_MAPBOX_API;

/** Base URL for Cyclo AI chat / plan APIs (Vite: set `VITE_AI_CHAT_API` in `.env`). */
export const AI_CHAT_API = import.meta.env.VITE_AI_CHAT_API;

// ROOT PATH AFTER LOGIN SUCCESSFUL
export const PATH_AFTER_LOGIN = paths.dashboard.root; // as '/dashboard'
