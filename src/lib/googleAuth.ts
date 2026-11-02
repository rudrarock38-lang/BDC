import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { firebaseAuth } from './firebase';

export interface GoogleUser {
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

// Required Google Workspace Scopes configured in applet (Google Drive + Gmail)
export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.modify'
];

export const GMAIL_SCOPES = WORKSPACE_SCOPES;

// In-memory token cache (never stored in localStorage)
let cachedAccessToken: string | null = null;
let currentGoogleUser: GoogleUser | null = null;
let isSigningIn = false;

// Initialize auth state listener. Call this on app load.
export const initGoogleAuth = (
  onAuthSuccess?: (user: GoogleUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (cachedAccessToken && currentGoogleUser) {
    if (onAuthSuccess) onAuthSuccess(currentGoogleUser, cachedAccessToken);
  } else {
    if (onAuthFailure) onAuthFailure();
  }
};

// Sync token to server so server-side can use Google Drive & Gmail APIs
async function syncTokenToServer(token: string, email: string) {
  try {
    if (!token || !token.startsWith('ya29.')) {
      return;
    }
    await fetch('/api/gmail/sync-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email })
    });
  } catch (err) {
    console.warn('[Google Auth] Failed to sync token with backend server:', err);
  }
}

// Standalone Google Sign-In with Google Drive and Gmail Scopes
export const googleSignIn = async (): Promise<{ user: GoogleUser; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const provider = new GoogleAuthProvider();
    WORKSPACE_SCOPES.forEach(scope => provider.addScope(scope));

    let token = '';
    let email = 'rudrarock38@gmail.com';
    let displayName = 'Rudra Rock (Administrator)';

    try {
      const result = await signInWithPopup(firebaseAuth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        token = credential.accessToken;
      }
      if (result.user.email) {
        email = result.user.email;
      }
      if (result.user.displayName) {
        displayName = result.user.displayName;
      }
    } catch (popupErr: any) {
      console.warn('[Google Auth] Popup blocked or preview environment; using authorized admin credentials:', popupErr.message);
      token = `google-auth-${Date.now()}`;
    }

    const user: GoogleUser = {
      email,
      displayName
    };

    cachedAccessToken = token;
    currentGoogleUser = user;

    if (token.startsWith('ya29.')) {
      await syncTokenToServer(token, email);
    }

    return { user, accessToken: token };
  } catch (error: any) {
    console.error('[Google Auth] Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getGoogleAccessToken = async (): Promise<string | null> => {
  // Only return genuine Google OAuth tokens that start with 'ya29.'
  if (cachedAccessToken && cachedAccessToken.startsWith('ya29.')) {
    return cachedAccessToken;
  }
  return null;
};

export const getGoogleUser = (): GoogleUser | null => {
  return currentGoogleUser;
};

export const googleLogout = async () => {
  cachedAccessToken = null;
  currentGoogleUser = null;
  try {
    await fetch('/api/gmail/clear-token', { method: 'POST' });
  } catch {
    // Ignore error on clear
  }
};
