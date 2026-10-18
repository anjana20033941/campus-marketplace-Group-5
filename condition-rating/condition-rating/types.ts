export type VerifiedConditionLevel =
  | "As Claimed"
  | "Better than Expected"
  | "Slightly Worn"
  | "Heavily Worn";

export interface ConditionRating {
  id: string;
  listingId: string;
  reviewerId: string;
  reviewerName: string;
  rating: number; // 1 to 5 stars
  verifiedCondition: VerifiedConditionLevel;
  comment: string;
  createdAt: number;
}

export interface ListingRatingSummary {
  averageRating: number;
  totalReviews: number;
  accuracyRate: string; // e.g. "98% Condition Accuracy"
}
