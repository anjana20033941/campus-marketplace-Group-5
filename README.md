# Campus Marketplace — Buyer-Verified Condition Rating System

> **Branch:** `feature/condition--rating`  
> **Team:** Group 5  
> **Framework:** Expo SDK 57 (React Native / TypeScript / Firebase)

An interactive campus marketplace application equipped with a **Buyer-Verified Condition Rating** system to promote transparency and trust in peer-to-peer campus trades.

---

## 🌟 Feature Spotlight: Buyer-Verified Condition Rating

Rather than relying solely on a seller's self-reported claim (e.g. claiming an item is "Like new"), campus buyers who inspect or receive products can submit ratings (1 to 5 stars) and detailed condition feedback based on actual received quality.

### Key Capabilities

- **⭐ 1 to 5 Star Rating System:** Interactive star picker for reviews and weighted average rating calculation.
- **🏷️ Received Condition Accuracy Assessment:**
  - Evaluates whether the product received was:
    - *As Claimed*
    - *Better than Expected*
    - *Slightly Worn*
    - *Heavily Worn*
- **📈 Condition Accuracy Percentage:** Displays transparency metrics (e.g., *"100% Condition Accuracy"*) to build student trust.
- **🟡 Listing Card Rating Pills:** Clean amber badge (`⭐ 4.5 (2)`) displayed directly on the Explore feed cards.
- **📝 Community Reviews Section:** Embedded verified reviews section inside product details with a **"+ Rate Condition"** modal.

---

## 🏗 Modular Architecture

```text
src/
├── features/
│   └── condition-rating/
│       ├── components/
│       │   ├── ConditionRatingBadge.tsx    # Compact rating pill (⭐ 4.5 (2)) on ListingCard
│       │   ├── ConditionReviewsSection.tsx # Review feed & condition accuracy progress bar
│       │   ├── RateConditionModal.tsx      # Buyer review submission modal
│       │   └── StarRating.tsx              # Reusable interactive & display star component
│       ├── services/
│       │   └── conditionRatingService.ts   # Firestore review persistence & rating calculations
│       ├── types.ts                        # TypeScript interfaces (ConditionRating, ListingRatingSummary)
│       ├── index.ts                        # Barrel export
│       └── README.md                       # Technical documentation
├── components/
│   └── ListingCard.tsx                     # Integrated rating badge on feed cards
└── App.tsx                                 # Integrated reviews inside listing details modal
