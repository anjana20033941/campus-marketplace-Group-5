# Buyer-Verified Condition Rating Feature (`src/features/condition-rating`)

This module implements the **Buyer-Verified Condition Rating** system for the Campus Marketplace project.

## Feature Overview

Instead of relying solely on the seller's self-reported claim of an item's condition (e.g. "Like new"), campus buyers who inspect or receive products can rate (1 to 5 stars) and review the actual condition.

### Key Highlights
- **1 to 5 Star Rating**: Interactive star picker for reviews and star display badges.
- **Condition Accuracy Verification**: Options for "As Claimed", "Better than Expected", "Slightly Worn", "Heavily Worn".
- **Condition Accuracy Percentage**: Calculates percentage of accuracy (e.g. "100% Condition Accuracy") displayed to other campus students.
- **Card Badges**: Displays rating score and review count directly on `ListingCard` in the Explore feed.
- **Detail View Section**: Shows verified peer reviews and includes a "+ Rate Condition" modal.

## File Structure

- `types.ts`: TypeScript interfaces (`ConditionRating`, `ListingRatingSummary`, `VerifiedConditionLevel`).
- `services/conditionRatingService.ts`: Stores and computes ratings with initial demo campus reviews.
- `components/StarRating.tsx`: Interactive or static 5-star rating renderer.
- `components/ConditionRatingBadge.tsx`: Compact badge for `ListingCard`.
- `components/RateConditionModal.tsx`: Buyer submission modal with star rating and condition selector.
- `components/ConditionReviewsSection.tsx`: Review section embedded in `ListingModal`.
- `index.ts`: Barrel export.
