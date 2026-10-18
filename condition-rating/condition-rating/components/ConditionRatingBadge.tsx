import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  getConditionRatingSummary,
  subscribeToRatingChanges,
} from "../services/conditionRatingService";
import { ListingRatingSummary } from "../types";

export function ConditionRatingBadge({ listingId }: { listingId: string }) {
  const [summary, setSummary] = useState<ListingRatingSummary>(() =>
    getConditionRatingSummary(listingId)
  );

  useEffect(() => {
    const unsubscribe = subscribeToRatingChanges((updatedListingId) => {
      if (updatedListingId === listingId) {
        setSummary(getConditionRatingSummary(listingId));
      }
    });
    return () => unsubscribe();
  }, [listingId]);

  if (summary.totalReviews === 0) {
    return (
      <View style={styles.badgeNew}>
        <Text style={styles.badgeNewText}>Verified Seller</Text>
      </View>
    );
  }

  return (
    <View style={styles.badge}>
      <Text style={styles.starIcon}>★</Text>
      <Text style={styles.ratingText}>{summary.averageRating.toFixed(1)}</Text>
      <Text style={styles.countText}>({summary.totalReviews})</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDF6E9",
    borderWidth: 1,
    borderColor: "#FCE5B8",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
    alignSelf: "flex-start",
  },
  starIcon: {
    color: "#E67E22",
    fontSize: 11,
    fontWeight: "700",
  },
  ratingText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#B76518",
  },
  countText: {
    fontSize: 10,
    color: "#8C6D48",
  },
  badgeNew: {
    backgroundColor: "#EFF8F3",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  badgeNewText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1C7057",
  },
});
