import { ConditionRating, ListingRatingSummary } from "../types";

// Seeded real-campus initial reviews to demonstrate the feature immediately
const initialRatings: ConditionRating[] = [
  {
    id: "cr-1",
    listingId: "1", // Calculus textbook
    reviewerId: "user-101",
    reviewerName: "Nimesh P.",
    rating: 5,
    verifiedCondition: "As Claimed",
    comment: "Pages are clean, no pencil marks. Binding is solid. Highly recommend!",
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: "cr-2",
    listingId: "1",
    reviewerId: "user-102",
    reviewerName: "Shanika K.",
    rating: 4,
    verifiedCondition: "As Claimed",
    comment: "Cover has slight edge wear but contents are in crisp, perfect condition.",
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: "cr-3",
    listingId: "2", // Walnut study desk
    reviewerId: "user-103",
    reviewerName: "Dulshan A.",
    rating: 5,
    verifiedCondition: "Better than Expected",
    comment: "Wood finish is pristine and sturdy. Looks even better than in photos.",
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: "cr-4",
    listingId: "3", // Noise-cancelling headphones
    reviewerId: "user-104",
    reviewerName: "Kavindi M.",
    rating: 5,
    verifiedCondition: "As Claimed",
    comment: "Battery lasts all day, ANC works flawlessly. Great seller!",
    createdAt: Date.now() - 86400000 * 1,
  },
];

let localRatings: ConditionRating[] = [...initialRatings];
type RatingListener = (listingId: string) => void;
const listeners: RatingListener[] = [];

export function getConditionRatings(listingId: string): ConditionRating[] {
  return localRatings.filter((r) => r.listingId === listingId);
}

export function getConditionRatingSummary(listingId: string): ListingRatingSummary {
  const ratings = getConditionRatings(listingId);
  if (ratings.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      accuracyRate: "New listing",
    };
  }

  const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
  const avg = Math.round((sum / ratings.length) * 10) / 10;
  const accurateCount = ratings.filter(
    (r) =>
      r.verifiedCondition === "As Claimed" ||
      r.verifiedCondition === "Better than Expected"
  ).length;
  const accuracyPct = Math.round((accurateCount / ratings.length) * 100);

  return {
    averageRating: avg,
    totalReviews: ratings.length,
    accuracyRate: `${accuracyPct}% Accurate Condition`,
  };
}

export function addConditionRating(
  newRatingData: Omit<ConditionRating, "id" | "createdAt">
): ConditionRating {
  const newRating: ConditionRating = {
    ...newRatingData,
    id: "cr-" + Date.now(),
    createdAt: Date.now(),
  };

  localRatings.unshift(newRating);
  listeners.forEach((listener) => listener(newRating.listingId));
  return newRating;
}

export function subscribeToRatingChanges(listener: RatingListener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}
