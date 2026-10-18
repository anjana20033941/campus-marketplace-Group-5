import { StyleSheet, Text, View } from "react-native";
import { CONDITION_COLORS } from "../constants";

export function ConditionTag({
  condition,
  size = "small",
}: {
  condition: string;
  size?: "small" | "medium";
}) {
  const colors = CONDITION_COLORS[condition] || CONDITION_COLORS.default;

  return (
    <View
      style={[
        styles.tag,
        size === "medium" ? styles.tagMedium : styles.tagSmall,
        { backgroundColor: colors.bg, borderColor: colors.border },
      ]}
    >
      <Text
        style={[
          styles.text,
          size === "medium" ? styles.textMedium : styles.textSmall,
          { color: colors.text },
        ]}
      >
        {condition}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    borderWidth: 1,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  tagSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagMedium: {
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  text: {
    fontWeight: "700",
  },
  textSmall: {
    fontSize: 10,
  },
  textMedium: {
    fontSize: 12,
  },
});
