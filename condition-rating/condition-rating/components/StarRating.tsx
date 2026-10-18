import { Pressable, StyleSheet, Text, View } from "react-native";

export function StarRating({
  rating,
  maxStars = 5,
  size = 16,
  interactive = false,
  onRatingChange,
}: {
  rating: number;
  maxStars?: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}) {
  const stars = [];

  for (let i = 1; i <= maxStars; i++) {
    const isFilled = i <= Math.round(rating);
    const starNode = (
      <Text
        key={i}
        style={[
          styles.star,
          { fontSize: size },
          isFilled ? styles.starFilled : styles.starEmpty,
        ]}
      >
        ★
      </Text>
    );

    if (interactive && onRatingChange) {
      stars.push(
        <Pressable key={i} onPress={() => onRatingChange(i)} hitSlop={6}>
          {starNode}
        </Pressable>
      );
    } else {
      stars.push(starNode);
    }
  }

  return <View style={styles.container}>{stars}</View>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  star: {
    lineHeight: 18,
  },
  starFilled: {
    color: "#F39C12",
  },
  starEmpty: {
    color: "#D0D7D3",
  },
});
