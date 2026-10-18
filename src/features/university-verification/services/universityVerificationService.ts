import { User } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { APPROVED_UNIVERSITIES, JAFFNA_UNIVERSITY } from "../universities";
import { University, VerificationResult } from "../types";

// In-memory cache for verified users in offline/demo mode
const verifiedUserIds = new Set<string>();
const userUniversityMap = new Map<string, { universityId: string; universityName: string }>();

/**
 * Approved domain suffixes for University of Jaffna
 */
export const JAFFNA_DOMAINS = ["univ.jfn.ac.lk", "jfn.ac.lk", "student.jfn.ac.lk"];

/**
 * Returns all active universities from the database configuration
 */
export function getActiveUniversities(): University[] {
  return APPROVED_UNIVERSITIES.filter((u) => u.isActive);
}

/**
 * Validates whether an email belongs to University of Jaffna
 * Supported patterns: @univ.jfn.ac.lk, @jfn.ac.lk, @student.jfn.ac.lk, or any *.jfn.ac.lk
 */
export function isJaffnaEmail(email: string | null | undefined): boolean {
  if (!email || !email.includes("@")) return false;
  const domain = email.split("@")[1].toLowerCase().trim();
  return (
    domain === "univ.jfn.ac.lk" ||
    domain === "jfn.ac.lk" ||
    domain === "student.jfn.ac.lk" ||
    domain.endsWith(".jfn.ac.lk") ||
    domain.endsWith(".univ.jfn.ac.lk")
  );
}

/**
 * Verifies if an email address qualifies for University of Jaffna marketplace access.
 * Returns success: true if matched, or success: false with errorMessage: "Try with university email account"
 */
export function verifyJaffnaEmail(email: string): VerificationResult {
  if (!email || !email.includes("@")) {
    return {
      success: false,
      userEmail: email,
      errorMessage: "Try with university email account",
    };
  }

  const emailDomain = email.split("@")[1].toLowerCase().trim();

  if (isJaffnaEmail(email)) {
    return {
      success: true,
      university: JAFFNA_UNIVERSITY,
      userEmail: email,
      matchedDomain: emailDomain,
    };
  }

  return {
    success: false,
    university: JAFFNA_UNIVERSITY,
    userEmail: email,
    errorMessage: "Try with university email account",
  };
}

/**
 * Direct Google account verification logic.
 * Automatically checks against University of Jaffna domain requirements.
 */
export function verifyGoogleAccountUniversity(
  email: string,
  _universityId?: string
): VerificationResult {
  return verifyJaffnaEmail(email);
}

/**
 * Saves university verification state to Firestore and local session
 */
export async function saveUserUniversityVerification(
  user: User,
  university: University = JAFFNA_UNIVERSITY,
  matchedDomain?: string
): Promise<void> {
  const domain = matchedDomain || user.email?.split("@")[1] || "univ.jfn.ac.lk";
  verifiedUserIds.add(user.uid);
  userUniversityMap.set(user.uid, {
    universityId: university.id,
    universityName: university.name,
  });

  if (db) {
    const userRef = doc(db, "users", user.uid);
    await setDoc(
      userRef,
      {
        universityVerified: true,
        universityId: university.id,
        universityName: university.name,
        verifiedDomain: domain,
        verifiedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

/**
 * Checks if a user has completed university verification
 */
export function isUserUniversityVerified(user: User | null): boolean {
  if (!user) return false;
  if (verifiedUserIds.has(user.uid)) return true;
  return isJaffnaEmail(user.email);
}

/**
 * Gets the verified university name for a given user
 */
export function getUserUniversityName(user: User | null): string | undefined {
  if (!user) return undefined;
  if (isUserUniversityVerified(user)) {
    return "University of Jaffna";
  }
  return userUniversityMap.get(user.uid)?.universityName;
}
