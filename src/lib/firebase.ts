import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  updateProfile,
  ConfirmationResult,
  User as FirebaseUser
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';

// User's provided Firebase Configuration
export const firebaseConfig = {
  apiKey: "AIzaSyCoMmmaild-sOHcfB5bcOyyuGTQ2c2THyA",
  authDomain: "bdc-test-7bb1b.firebaseapp.com",
  projectId: "bdc-test-7bb1b",
  storageBucket: "bdc-test-7bb1b.firebasestorage.app",
  messagingSenderId: "875395492560",
  appId: "1:875395492560:web:658f00fbe812818e068cd5"
};

// Initialize Firebase App singleton
export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const firebaseAuth = getAuth(firebaseApp);
export const firestoreDb = getFirestore(firebaseApp);

export interface FirestoreUserProfile {
  uid: string;
  name: string;
  email: string;
  phoneNumber?: string;
  mobile?: string;
  role: 'student' | 'admin';
  roll_number?: string;
  status: 'active' | 'inactive';
  emailVerified?: boolean;
  created_at: any;
  updated_at?: any;
}

/**
 * Friendly error message parser for Firebase error codes
 */
export function formatFirebaseError(err: any): string {
  if (!err) return 'An unexpected error occurred.';
  const code = err.code || '';
  const message = err.message || '';

  switch (code) {
    case 'auth/invalid-email':
      return 'The email address is improperly formatted.';
    case 'auth/user-disabled':
      return 'This user account has been disabled. Please contact support.';
    case 'auth/user-not-found':
      return 'No account found with this email. Please sign up first.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please verify your credentials.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email. Please log in instead.';
    case 'auth/weak-password':
      return 'The password is too weak. Please use at least 6 characters.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled in Firebase Console. Please enable Email/Password or Phone provider.';
    case 'auth/invalid-phone-number':
      return 'Invalid phone number format. Please include country code, e.g., +91 9876543210.';
    case 'auth/missing-phone-number':
      return 'Phone number cannot be empty.';
    case 'auth/quota-exceeded':
      return 'SMS quota exceeded for Firebase project. Please try again later or use Email login.';
    case 'auth/code-expired':
      return 'The SMS verification code has expired. Please request a new code.';
    case 'auth/invalid-verification-code':
      return 'Incorrect SMS OTP code. Please enter the valid 6-digit verification code.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a few minutes before trying again.';
    case 'auth/captcha-check-failed':
      return 'reCAPTCHA verification failed. Please refresh and try again.';
    default:
      return message || 'Authentication failed. Please check your credentials.';
  }
}

/**
 * Register a user via Firebase Email/Password, trigger native sendEmailVerification(),
 * and store baseline profile document in Firestore.
 */
export async function registerWithFirebaseEmail({
  email,
  password,
  name,
  role = 'student',
  mobile = '',
  roll_number = ''
}: {
  email: string;
  password: string;
  name: string;
  role?: 'student' | 'admin';
  mobile?: string;
  roll_number?: string;
}): Promise<{ profile: FirestoreUserProfile; emailVerified: boolean; verificationEmailSent: boolean }> {
  const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
  const fbUser = userCredential.user;

  // Send native Firebase Email Verification
  let verificationEmailSent = false;
  try {
    await sendEmailVerification(fbUser);
    verificationEmailSent = true;
  } catch (err: any) {
    console.warn('[Firebase Auth] sendEmailVerification note:', err.message);
  }

  // Update Auth Profile Display Name
  if (name) {
    try {
      await updateProfile(fbUser, { displayName: name.trim() });
    } catch (e) {
      console.warn('Could not update display name in Firebase Auth', e);
    }
  }

  const finalRollNumber = roll_number.trim() || (role === 'admin' ? `ADM-${Date.now().toString().slice(-4)}` : `ROLL-${Date.now().toString().slice(-6)}`);

  const profileData: FirestoreUserProfile = {
    uid: fbUser.uid,
    name: name.trim() || email.split('@')[0],
    email: email.trim().toLowerCase(),
    phoneNumber: fbUser.phoneNumber || mobile || undefined,
    mobile: mobile || undefined,
    role,
    roll_number: finalRollNumber,
    status: 'active',
    emailVerified: fbUser.emailVerified,
    created_at: new Date().toISOString()
  };

  // Save to Firestore 'users' collection with server timestamp and verified flag from Auth
  try {
    const userDocRef = doc(firestoreDb, 'users', fbUser.uid);
    await setDoc(userDocRef, {
      ...profileData,
      emailVerified: fbUser.emailVerified,
      firestore_timestamp: serverTimestamp()
    });
  } catch (fsErr) {
    console.warn('Firestore write warning:', fsErr);
  }

  return {
    profile: profileData,
    emailVerified: fbUser.emailVerified,
    verificationEmailSent
  };
}

/**
 * Resend native Firebase verification email to currently signed in user
 */
export async function resendFirebaseEmailVerification(): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!user) {
    throw new Error('No active registration session found. Please sign in or register again.');
  }
  await user.reload();
  if (user.emailVerified) {
    throw new Error('Your email is already verified! You can proceed to login.');
  }
  await sendEmailVerification(user);
}

/**
 * Reloads the current Firebase user and checks user.emailVerified as source of truth
 */
export async function checkFirebaseEmailVerificationStatus(): Promise<{ verified: boolean; email: string }> {
  const user = firebaseAuth.currentUser;
  if (!user) {
    return { verified: false, email: '' };
  }
  await user.reload();

  if (user.emailVerified) {
    // Update Firestore profile document
    try {
      const userDocRef = doc(firestoreDb, 'users', user.uid);
      await updateDoc(userDocRef, {
        emailVerified: true,
        _verified_at: serverTimestamp()
      });
    } catch (e) {
      console.warn('[Firestore] Profile verification update note:', e);
    }
  }

  return { verified: user.emailVerified, email: user.email || '' };
}

/**
 * Send password reset email using Firebase Auth native email service.
 * Emits safe diagnostic logs for Firebase status/error codes without logging emails, tokens, or secrets.
 */
export async function sendFirebasePasswordReset(
  email: string,
  continueUrl?: string
): Promise<{ success: boolean; mode: 'continue_url' | 'default_action' }> {
  const cleanEmail = email.trim();
  console.log('[Firebase Auth] sendPasswordResetEmail initiated');

  // Attempt with continueUrl if provided (e.g. current app origin)
  if (continueUrl && (continueUrl.startsWith('https://') || continueUrl.startsWith('http://localhost'))) {
    try {
      await sendPasswordResetEmail(firebaseAuth, cleanEmail, {
        url: continueUrl,
        handleCodeInApp: false
      });
      console.log('[Firebase Auth] sendPasswordResetEmail succeeded (status: 200/OK, mode: continue_url, email delivered via Firebase Auth template)');
      return { success: true, mode: 'continue_url' };
    } catch (uriErr: any) {
      const errCode = uriErr?.code || 'unknown_code';
      console.warn('[Firebase Auth] continue URL attempt notice with error code:', errCode);
      if (errCode === 'auth/unauthorized-continue-uri') {
        console.log('[Firebase Auth] Falling back to default Firebase Action handler URL');
      } else {
        throw uriErr;
      }
    }
  }

  // Fallback to default Firebase action handler (bdc-test-7bb1b.firebaseapp.com/__/auth/action)
  try {
    await sendPasswordResetEmail(firebaseAuth, cleanEmail);
    console.log('[Firebase Auth] sendPasswordResetEmail succeeded (status: 200/OK, mode: default_action, email delivered via Firebase Auth template)');
    return { success: true, mode: 'default_action' };
  } catch (err: any) {
    // Safe diagnostic logging: log only the error code, NEVER the email address, OTP, token, or secret
    console.warn('[Firebase Auth] sendPasswordResetEmail failed with error code:', err?.code || 'unknown_error');
    throw err;
  }
}

/**
 * Login via Firebase Email/Password and retrieve profile from Firestore.
 * Reloads user to check freshest user.emailVerified status.
 */
export async function loginWithFirebaseEmail(
  email: string,
  pass: string,
  expectedRole?: 'student' | 'admin'
): Promise<{ profile: FirestoreUserProfile; emailVerified: boolean }> {
  const userCredential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), pass);
  const fbUser = userCredential.user;
  await fbUser.reload();

  let profileData: FirestoreUserProfile | null = null;

  try {
    const userDocRef = doc(firestoreDb, 'users', fbUser.uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      profileData = snap.data() as FirestoreUserProfile;
    }
  } catch (e) {
    console.warn('Could not fetch Firestore user doc:', e);
  }

  // Fallback profile if Firestore document doesn't exist yet
  if (!profileData) {
    const isRudrarockAdmin = fbUser.email?.toLowerCase() === 'rudrarock38@gmail.com' || fbUser.email?.toLowerCase() === 'admin@cbt.com';
    const computedRole: 'student' | 'admin' = isRudrarockAdmin || expectedRole === 'admin' ? 'admin' : (expectedRole || 'student');

    profileData = {
      uid: fbUser.uid,
      name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
      email: fbUser.email || email,
      phoneNumber: fbUser.phoneNumber || undefined,
      role: computedRole,
      roll_number: computedRole === 'admin' ? `ADM-${Date.now().toString().slice(-4)}` : `ROLL-${Date.now().toString().slice(-6)}`,
      status: 'active',
      emailVerified: fbUser.emailVerified,
      created_at: new Date().toISOString()
    };

    // Create document in Firestore
    try {
      await setDoc(doc(firestoreDb, 'users', fbUser.uid), {
        ...profileData,
        emailVerified: fbUser.emailVerified,
        firestore_timestamp: serverTimestamp()
      });
    } catch (e) {
      console.warn('Could not save initial profile in Firestore:', e);
    }
  }

  return { profile: profileData, emailVerified: fbUser.emailVerified };
}

/**
 * Prepare reCAPTCHA Verifier for Firebase Phone Authentication
 */
export function setupRecaptcha(containerId: string): RecaptchaVerifier {
  // Clear any existing instance
  if ((window as any).recaptchaVerifier) {
    try {
      (window as any).recaptchaVerifier.clear();
    } catch {}
  }

  const verifier = new RecaptchaVerifier(firebaseAuth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved
    },
    'expired-callback': () => {
      console.warn('reCAPTCHA expired');
    }
  });

  (window as any).recaptchaVerifier = verifier;
  return verifier;
}

/**
 * Send Phone Verification OTP using Firebase Auth
 */
export async function sendFirebasePhoneOtp(
  rawPhoneNumber: string,
  verifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  let formatted = rawPhoneNumber.trim();
  // Ensure formatted starts with + if missing (default to +91 for India if 10 digits)
  if (!formatted.startsWith('+')) {
    if (formatted.length === 10) {
      formatted = `+91${formatted}`;
    } else {
      formatted = `+${formatted}`;
    }
  }

  const confirmationResult = await signInWithPhoneNumber(firebaseAuth, formatted, verifier);
  return confirmationResult;
}

/**
 * Verify Phone OTP code and sync user document to Firestore
 */
export async function verifyFirebasePhoneOtp({
  confirmationResult,
  otpCode,
  role = 'student',
  name = '',
  email = '',
  rollNumber = ''
}: {
  confirmationResult: ConfirmationResult;
  otpCode: string;
  role?: 'student' | 'admin';
  name?: string;
  email?: string;
  rollNumber?: string;
}): Promise<FirestoreUserProfile> {
  const userCredential = await confirmationResult.confirm(otpCode.trim());
  const fbUser = userCredential.user;

  let profileData: FirestoreUserProfile | null = null;
  const userDocRef = doc(firestoreDb, 'users', fbUser.uid);

  try {
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      profileData = snap.data() as FirestoreUserProfile;
    }
  } catch (e) {
    console.warn('Could not read user doc from Firestore:', e);
  }

  if (!profileData) {
    const cleanPhone = fbUser.phoneNumber || '';
    const assignedRole = role || 'student';
    const finalRoll = rollNumber || (assignedRole === 'admin' ? `ADM-${Date.now().toString().slice(-4)}` : `ROLL-${Date.now().toString().slice(-6)}`);
    const fallbackEmail = email.trim() || `phone_${cleanPhone.replace(/[^0-9]/g, '')}@bdc.edu`;

    profileData = {
      uid: fbUser.uid,
      name: name.trim() || `Candidate (${cleanPhone.slice(-4)})`,
      email: fallbackEmail,
      phoneNumber: cleanPhone,
      mobile: cleanPhone,
      role: assignedRole,
      roll_number: finalRoll,
      status: 'active',
      created_at: new Date().toISOString()
    };

    try {
      await setDoc(userDocRef, {
        ...profileData,
        firestore_timestamp: serverTimestamp()
      });
    } catch (e) {
      console.warn('Could not persist phone user to Firestore:', e);
    }
  } else if (name && !profileData.name) {
    try {
      await updateDoc(userDocRef, { name: name.trim() });
      profileData.name = name.trim();
    } catch {}
  }

  return profileData;
}

/**
 * Firebase Sign Out
 */
export async function logoutFirebase(): Promise<void> {
  try {
    await signOut(firebaseAuth);
  } catch (err) {
    console.warn('Error signing out of Firebase:', err);
  }
}
