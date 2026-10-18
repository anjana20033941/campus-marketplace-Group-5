
---

# 🎓 Member 5: University Verification via Google Sign-In
> **Branch Name:** `feature/university-verification`

```markdown
# Campus Marketplace — University Verification via Google Sign-In

> **Branch:** `feature/university-verification`  
> **Team:** Group 5  
> **Framework:** Expo SDK 57 (React Native / TypeScript / Firebase)

A secure campus marketplace accessible exclusively to verified university students through automated **Google OAuth domain validation**.

---

## 🌟 Feature Spotlight: University Verification

To prevent spam, protect students, and build a safe campus-only ecosystem, this feature verifies whether a user belongs to an approved university using their authenticated Google email domain.

### Key Capabilities

- **🔐 100% Automated Google OAuth Verification:**
  - Uses the verified email address returned directly by Google OAuth.
  - **No manual email entry:** Prevents users from manually typing a university email while authenticated with a personal Gmail account.
  - No separate email OTPs or passwords needed.
- **🏛 Configurable University Registry (`universities.ts`):**
  - Configurable database of supported Sri Lankan universities and their approved email domains:
    - *University of Jaffna* (`@univ.jfn.ac.lk`)
    - *University of Colombo* (`@cmb.ac.lk`, `@stu.cmb.ac.lk`)
    - *University of Moratuwa* (`@uom.lk`)
    - *University of Peradeniya* (`@pdn.ac.lk`)
    - *University of Sri Jayewardenepura* (`@sjp.ac.lk`)
    - *University of Kelaniya* (`@kln.ac.lk`)
    - *(Additional institutions can be added with zero changes to authentication logic)*
- **🟢 "University Verified" Badge:**
  - Verified students receive a permanent **`🟢 University Verified`** badge beside their name across item listings, seller profiles, reviews, and chat.
- **🛡 Marketplace Access Control:**
  - Unverified users cannot create listings, contact sellers, or create transactions.
  - Clear error notifications guide students if their Google account does not belong to the selected university.

---

## 🏗 Modular Architecture

```text
src/
├── features/
│   └── university-verification/
│       ├── components/
│       │   ├── UniversitySelectionModal.tsx    # Step 2 university selector modal
│       │   └── VerifiedBadge.tsx               # Reusable "🟢 University Verified" badge
│       ├── services/
│       │   └── universityVerificationService.ts# Email domain matching & verification persistence
│       ├── universities.ts                     # Database of approved universities and email domains
│       ├── types.ts                            # TypeScript types (University, UniversityUserProfile)
│       ├── index.ts                            # Barrel export
│       └── README.md                           # Feature documentation
└── App.tsx                                     # Post-authentication verification gatekeeper & badge integration
