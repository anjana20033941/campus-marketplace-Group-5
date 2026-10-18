export interface University {
  id: string;
  name: string;
  emailDomains: string[]; // e.g. ["univ.jfn.ac.lk", "jfn.ac.lk"]
  logo: string;
  isActive: boolean;
  campusLocations?: string[];
}

export interface VerificationResult {
  success: boolean;
  university?: University;
  userEmail: string;
  matchedDomain?: string;
  errorMessage?: string;
}

export interface UniversityUserProfile {
  uid: string;
  displayName: string;
  email: string;
  universityVerified: boolean;
  universityId?: string;
  universityName?: string;
  verifiedDomain?: string;
  verifiedAt?: number;
}
