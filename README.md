# University Verification Using Google Sign-In (`src/features/university-verification`)

This module implements the **University Domain Verification System** using Google OAuth.

## Verification Architecture

- **No Separate Passwords or OTPs**: Uses Google OAuth's authenticated email to verify domain membership.
- **Configurable Institution Database**: `universities.ts` houses universities and their approved domain lists (e.g., University of Jaffna `@univ.jfn.ac.lk`, University of Colombo `@cmb.ac.lk`, University of Moratuwa `@uom.lk`).
- **Domain Mismatch Guard**: Users cannot enter university emails manually; only the domain returned by Google Sign-In is accepted. If there is a mismatch, a clear explanation with allowed domains is shown.
- **Verified Status Badge**: `🟢 University Verified` is displayed across listings, seller profile, and review sections.
- **Persistent Profile & Security**: Upon successful domain verification, the user's Firestore record is updated with `universityVerified: true` and the verified institution name.

## File Structure

- `types.ts`: TypeScript contracts for `University`, `VerificationResult`, `UniversityUserProfile`.
- `universities.ts`: Database of approved universities and their official email domains.
- `services/universityVerificationService.ts`: Domain verification algorithms and profile sync.
- `components/VerifiedBadge.tsx`: Visual badge component for verified campus members.
- `components/UniversitySelectionModal.tsx`: Step 2 modal following Google Sign-In.
- `index.ts`: Barrel export.
