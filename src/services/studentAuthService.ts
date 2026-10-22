import * as Crypto from "expo-crypto";
import safeStorage from "../utils/safeStorage";
import { isJaffnaEmail } from "../features/university-verification";

export interface StudentAccount {
  uid: string;
  email: string;
  displayName: string;
  passwordHash: string;
  createdAt: number;
}

const ACCOUNTS_STORAGE_KEY = "@campus_student_accounts";

async function hashPassword(email: string, pass: string): Promise<string> {
  const input = `jfn_salt_${email.trim().toLowerCase()}_${pass}`;
  try {
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
  } catch {
    let h = 0;
    for (let i = 0; i < input.length; i++) {
      h = Math.imul(31, h) + input.charCodeAt(i) | 0;
    }
    return `hash_${Math.abs(h)}`;
  }
}

async function getStoredAccounts(): Promise<Record<string, StudentAccount>> {
  try {
    const raw = await safeStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("Failed to load student accounts:", err);
  }
  return {};
}

async function saveStoredAccounts(accounts: Record<string, StudentAccount>): Promise<void> {
  try {
    await safeStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.warn("Failed to save student accounts:", err);
  }
}

export async function authenticateStudentWithPassword(
  email: string,
  pass: string,
  isRegistering: boolean = false
): Promise<{ success: boolean; error?: string; user?: StudentAccount }> {
  const trimmedEmail = (email || "").trim().toLowerCase();
  const password = (pass || "").trim();

  // 1. Strict university email domain check
  if (!isJaffnaEmail(trimmedEmail)) {
    return {
      success: false,
      error: "Access Denied: Try with official university email account (@univ.jfn.ac.lk)",
    };
  }

  // 2. Validate password length
  if (!password || password.length < 6) {
    return {
      success: false,
      error: "Password must be at least 6 characters.",
    };
  }

  const pHash = await hashPassword(trimmedEmail, password);
  const accounts = await getStoredAccounts();
  const existing = accounts[trimmedEmail];

  if (existing) {
    // Account exists, verify password
    if (existing.passwordHash !== pHash) {
      return {
        success: false,
        error: "Incorrect password. If you are the account owner, please enter your correct password.",
      };
    }
    return { success: true, user: existing };
  }

  // If account doesn't exist yet, create and secure it with this password
  const username = trimmedEmail.split("@")[0];
  const newAccount: StudentAccount = {
    uid: `jfn_${username}`,
    email: trimmedEmail,
    displayName: username,
    passwordHash: pHash,
    createdAt: Date.now(),
  };

  accounts[trimmedEmail] = newAccount;
  await saveStoredAccounts(accounts);

  return { success: true, user: newAccount };
}
