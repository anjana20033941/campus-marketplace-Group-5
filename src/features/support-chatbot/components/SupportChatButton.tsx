import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

export function SupportChatButton({
  onPress,
}: {
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.floatingButton} onPress={onPress}>
      <View style={styles.botIconWrapper}>
        <Text style={styles.icon}>🤖</Text>
      </View>
      <View style={styles.textCol}>
        <Text style={styles.text}>Need Help?</Text>
        <Text style={styles.subtext}>Chat with Bot</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: "absolute",
    bottom: Platform.OS === "android" ? 116 : 96,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#083F31",
    borderRadius: 24,
    paddingVertical: 7,
    paddingHorizontal: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  botIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#DDF3EB",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 16,
  },
  textCol: {
    justifyContent: "center",
  },
  text: {
    color: "#FFF",
    fontSize: 11.5,
    fontWeight: "800",
    lineHeight: 14,
  },
  subtext: {
    color: "#9AD6C2",
    fontSize: 9.5,
    fontWeight: "500",
    lineHeight: 12,
  },
  chevron: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 2,
    marginRight: 2,
  },
});
