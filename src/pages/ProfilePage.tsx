import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { User } from "firebase/auth";
import { PageTitle } from "../components/PageTitle";
import {
  VerifiedBadge,
  isUserUniversityVerified,
} from "../features/university-verification";

export function ProfilePage({
  user,
  savedCount,
  listingCount,
  firebaseConfigured,
  profileReady,
  error,
  onMyListings,
  onSaved,
  onSignIn,
  onSignOut,
}: {
  user: User | null;
  savedCount: number;
  listingCount: number;
  firebaseConfigured: boolean;
  profileReady: boolean;
  error: string;
  onMyListings: () => void;
  onSaved: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  const name =
    user?.displayName || user?.email?.split("@")[0] || "Campus guest";
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const isVerified = isUserUniversityVerified(user);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <PageTitle title="Profile" subtitle="Your campus marketplace account" />
      <View style={styles.hero}>
        {user?.photoURL ? (
          <Image source={{ uri: user.photoURL }} style={styles.avatar} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.initials}>{user ? initials : "?"}</Text>
          </View>
        )}
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.muted}>
          {user?.email || "Sign in to sell and message"}
        </Text>
        {user && isVerified && (
          <View style={styles.badgeWrapper}>
            <VerifiedBadge universityName="University of Jaffna" />
          </View>
        )}
      </View>
      <View style={styles.menu}>
        <Row
          label="Verification status"
          value={isVerified ? "🟢 Verified (univ.jfn.ac.lk)" : "Unverified"}
        />
        <Row
          label="My listings"
          value={String(listingCount)}
          onPress={onMyListings}
        />
        <Row label="Saved items" value={String(savedCount)} onPress={onSaved} />
        <Row label="Campus / Location" value="University of Jaffna" />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {user && profileReady ? (
        <Text style={styles.success}>Profile verified & saved to Firebase</Text>
      ) : null}
      {user ? (
        <Pressable style={styles.outline} onPress={onSignOut}>
          <Text style={styles.outlineText}>Sign out</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.primary} onPress={onSignIn}>
          <Text style={styles.primaryText}>Sign in with University Google Account</Text>
        </Pressable>
      )}
      <Text style={styles.backend}>
        {firebaseConfigured
          ? "Connected to Firebase · University of Jaffna"
          : "Demo mode · Add Firebase keys to connect"}
      </Text>
    </ScrollView>
  );
}

function Row({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.muted}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 110 },
  hero: { alignItems: "center", paddingBottom: 28 },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#D6E5D7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  initials: { fontSize: 22, color: "#225347", fontWeight: "800" },
  name: { color: "#173C34", fontSize: 24, fontWeight: "800", marginBottom: 6 },
  muted: { color: "#87918C", fontSize: 12 },
  badgeWrapper: { marginTop: 10 },
  menu: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#E9ECE6",
  },
  row: {
    height: 58,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1EC",
  },
  label: { color: "#24483D", fontWeight: "700", fontSize: 14 },
  primary: {
    height: 50,
    backgroundColor: "#1F5D4C",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  primaryText: { color: "#FFF", fontWeight: "800" },
  outline: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BCD0C3",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  outlineText: { color: "#1F5D4C", fontWeight: "800" },
  success: { color: "#23775D", fontSize: 12, fontWeight: "700", marginTop: 16 },
  error: {
    color: "#B64950",
    backgroundColor: "#FBECEE",
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 16,
  },
  backend: {
    textAlign: "center",
    color: "#9BA59F",
    fontSize: 11,
    marginTop: 22,
  },
});
