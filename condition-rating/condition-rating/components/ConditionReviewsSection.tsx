import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import {
  getConditionRatings,
  getConditionRatingSummary,
  subscribeToRatingChanges,
} from "../services/conditionRatingService";
import { ConditionRating, ListingRatingSummary } from "../types";
import { RateConditionModal } from "./RateConditionModal";
import { StarRating } from "./StarRating";

export function ConditionReviewsSection({
  listingId,
  listingTitle,
  currentUserName,
}: {
  listingId: string;
  listingTitle: string;
  currentUserName?: string;
}) {
  const [summary, setSummary] = useState<ListingRatingSummary>(() =>
    getConditionRatingSummary(listingId)
  );
  const [reviews, setReviews] = useState<ConditionRating[]>(() =>
    getConditionRatings(listingId)
  );
  const [rateModalOpen, setRateModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToRatingChanges((updatedListingId) => {
      if (updatedListingId === listingId) {
        setSummary(getConditionRatingSummary(listingId));
        setReviews(getConditionRatings(listingId));
      }
    });
    return () => unsubscribe();
  }, [listingId]);

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Buyer-Verified Condition</Text>
          <Text style={styles.sectionSubtitle}>Peer reviews on actual item condition</Text>
        </View>
        <Pressable
          style={styles.rateButton}
          onPress={() => setRateModalOpen(true)}
        >
          <Text style={styles.rateButtonText}>+ Rate Condition</Text>
        </Pressable>
      </View>

      {/* Summary Box */}
      <View style={styles.summaryCard}>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreNumber}>
            {summary.totalReviews > 0 ? summary.averageRating.toFixed(1) : "—"}
          </Text>
          <View>
            <StarRating rating={summary.averageRating} size={15} />
            <Text style={styles.reviewCount}>
              {summary.totalReviews > 0
                ? `${summary.totalReviews} verified review${summary.totalReviews > 1 ? "s" : ""}`
                : "No reviews yet"}
            </Text>
          </View>
        </View>
        <View style={styles.accuracyBadge}>
          <Text style={styles.accuracyText}>{summary.accuracyRate}</Text>
        </View>
      </View>

      {/* Reviews list */}
      {reviews.length > 0 ? (
        <View style={styles.reviewsList}>
          {reviews.slice(0, 3).map((item) => (
            <View key={item.id} style={styles.reviewItem}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewerName}>{item.reviewerName}</Text>
                <StarRating rating={item.rating} size={12} />
              </View>
              <Text style={styles.conditionTag}>
                Verified: <Text style={styles.bold}>{item.verifiedCondition}</Text>
              </Text>
              <Text style={styles.reviewComment}>"{item.comment}"</Text>
            </View>
          ))}
        </View>
      ) : null}

      <RateConditionModal
        visible={rateModalOpen}
        listingId={listingId}
        listingTitle={listingTitle}
        currentUserName={currentUserName}
        onClose={() => setRateModalOpen(false)}
        onSuccess={() => {
          setSummary(getConditionRatingSummary(listingId));
          setReviews(getConditionRatings(listingId));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#EBF0ED",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#183931",
  },
  sectionSubtitle: {
    fontSize: 11,
    color: "#7B8C85",
  },
  rateButton: {
    backgroundColor: "#EEF5F1",
    borderWidth: 1,
    borderColor: "#CFE3D8",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  rateButtonText: {
    color: "#1C7057",
    fontSize: 11,
    fontWeight: "700",
  },
  summaryCard: {
    backgroundColor: "#F7FAF8",
    borderWidth: 1,
    borderColor: "#E5ECE8",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  scoreNumber: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1C7057",
  },
  reviewCount: {
    fontSize: 11,
    color: "#6F8079",
    marginTop: 2,
  },
  accuracyBadge: {
    backgroundColor: "#E4F4EC",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  accuracyText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16654E",
  },
  reviewsList: {
    gap: 8,
  },
  reviewItem: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#EDF2EF",
    borderRadius: 10,
    padding: 10,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  reviewerName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2C4039",
  },
  conditionTag: {
    fontSize: 11,
    color: "#64776F",
    marginBottom: 4,
  },
  bold: {
    fontWeight: "700",
    color: "#244C3F",
  },
  reviewComment: {
    fontSize: 12,
    color: "#475952",
    lineHeight: 16,
    fontStyle: "italic",
  },
});
