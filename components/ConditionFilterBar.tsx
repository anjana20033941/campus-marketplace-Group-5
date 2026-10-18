import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CONDITIONS } from "../constants";
import { ItemCondition } from "../types";

export function ConditionFilterBar({
  selectedCondition,
  onConditionChange,
}: {
  selectedCondition: ItemCondition;
  onConditionChange: (condition: ItemCondition) => void;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.filterTitle}>Condition:</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {CONDITIONS.map((cond) => {
          const isActive = selectedCondition === cond;
          return (
            <Pressable
              key={cond}
              onPress={() => onConditionChange(cond)}
              style={[
                styles.chip,
                isActive && styles.chipActive,
              ]}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {cond}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  filterTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#687A72",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  scrollList: {
    gap: 8,
  },
  chip: {
    backgroundColor: "#F1F5F3",
    borderWidth: 1,
    borderColor: "#DBE4DF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipActive: {
    backgroundColor: "#1C7057",
    borderColor: "#1C7057",
  },
  chipText: {
    fontSize: 12,
    color: "#465951",
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#FFF",
    fontWeight: "700",
  },
});
