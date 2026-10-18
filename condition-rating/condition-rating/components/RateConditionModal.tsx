import { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { addConditionRating } from "../services/conditionRatingService";
import { VerifiedConditionLevel } from "../types";
import { StarRating } from "./StarRating";

const CONDITION_OPTIONS: VerifiedConditionLevel[] = [
  "As Claimed",
  "Better than Expected",
  "Slightly Worn",
  "Heavily Worn",
];

export function RateConditionModal({
  visible,
  listingId,
  listingTitle,
  currentUserName,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  listingId: string;
  listingTitle: string;
  currentUserName?: string;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [condition, setCondition] = useState<VerifiedConditionLevel>("As Claimed");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!comment.trim()) {
      setError("Please write a short review describing the product's condition.");
      return;
    }

    addConditionRating({
      listingId,
      reviewerId: "reviewer-" + Date.now(),
      reviewerName: currentUserName || "Campus Student",
      rating,
      verifiedCondition: condition,
      comment: comment.trim(),
    });

    setComment("");
    setError("");
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.content}>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>×</Text>
          </Pressable>

          <Text style={styles.eyebrow}>BUYER VERIFICATION</Text>
          <Text style={styles.title}>Rate Item Condition</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {listingTitle}
          </Text>

          {/* Star selector */}
          <Text style={styles.label}>Overall Condition Rating</Text>
          <View style={styles.starsWrapper}>
            <StarRating
              rating={rating}
              size={32}
              interactive={true}
              onRatingChange={setRating}
            />
            <Text style={styles.ratingNumber}>{rating} of 5 Stars</Text>
          </View>

          {/* Condition accuracy pill options */}
          <Text style={styles.label}>Was the condition as the seller claimed?</Text>
          <View style={styles.optionsWrap}>
            {CONDITION_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                style={[
                  styles.optionPill,
                  condition === opt && styles.optionPillActive,
                ]}
                onPress={() => setCondition(opt)}
              >
                <Text
                  style={[
                    styles.optionPillText,
                    condition === opt && styles.optionPillTextActive,
                  ]}
                >
                  {opt}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Review comment */}
          <Text style={styles.label}>Your Review & Observations</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Describe the condition, scratches, cleanliness, functionality..."
            placeholderTextColor="#8B9B94"
            multiline
            numberOfLines={3}
            style={styles.textArea}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitBtnText}>Submit Verified Rating</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  content: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  closeBtn: {
    position: "absolute",
    top: 18,
    right: 18,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F2",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  closeBtnText: {
    fontSize: 20,
    color: "#2C3E35",
    fontWeight: "700",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1C7057",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1B3A33",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7C75",
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#243E36",
    marginTop: 10,
    marginBottom: 6,
  },
  starsWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  ratingNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: "#D35400",
  },
  optionsWrap: {
    gap: 6,
    marginBottom: 8,
  },
  optionPill: {
    backgroundColor: "#F4F7F5",
    borderWidth: 1,
    borderColor: "#DEE5E1",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  optionPillActive: {
    backgroundColor: "#EBF7F1",
    borderColor: "#1C7057",
  },
  optionPillText: {
    fontSize: 12,
    color: "#4C6057",
    fontWeight: "500",
  },
  optionPillTextActive: {
    color: "#1C7057",
    fontWeight: "700",
  },
  textArea: {
    backgroundColor: "#F7FAF8",
    borderWidth: 1,
    borderColor: "#DCE5E0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: "#1B3A33",
    height: 70,
    textAlignVertical: "top",
    marginBottom: 10,
  },
  errorText: {
    color: "#C0392B",
    fontSize: 12,
    marginBottom: 8,
  },
  submitBtn: {
    backgroundColor: "#1C7057",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 6,
  },
  submitBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
