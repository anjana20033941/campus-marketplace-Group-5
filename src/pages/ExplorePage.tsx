import {
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { User } from "firebase/auth";
import { ListingCard } from "../components/ListingCard";
import { categories } from "../data";
import { Listing } from "../types";
import { ConditionFilterBar, ItemCondition } from "../features/condition-filter";

export function ExplorePage({
  user,
  onSignIn,
  items,
  query,
  category,
  selectedCondition = "All conditions",
  savedIds,
  onQueryChange,
  onCategoryChange,
  onConditionChange,
  onSave,
  onOpen,
  onProfile,
  onOpenRentRequests,
  onOpenMyPosts,
}: {
  user?: User | null;
  onSignIn?: () => void;
  items: Listing[];
  query: string;
  category: string;
  selectedCondition?: ItemCondition;
  savedIds: string[];
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onConditionChange?: (condition: ItemCondition) => void;
  onSave: (id: string) => void;
  onOpen: (item: Listing) => void;
  onProfile: () => void;
  onOpenRentRequests?: () => void;
  onOpenMyPosts?: () => void;
}) {
  const userName =
    user?.displayName || user?.email?.split("@")[0] || "Student";
  const userInitial = (user?.displayName || user?.email || "U")[0].toUpperCase();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.topRow}>
          <View style={styles.brandBox}>
            <Text style={styles.eyebrow}>CAMPUS MARKETPLACE</Text>
            <View style={styles.verifiedRow}>
              <View style={styles.liveDot} />
              <Text style={styles.verifiedText}>Univ. of Jaffna</Text>
            </View>
          </View>

          <View style={styles.topActions}>
            {onOpenRentRequests && (
              <Pressable style={styles.rentReqBtn} onPress={onOpenRentRequests}>
                <Text style={styles.rentReqIcon}>🤝</Text>
                <Text style={styles.rentReqText}>Rent</Text>
              </Pressable>
            )}

            {user && onOpenMyPosts && (
              <Pressable style={styles.myPostsBtn} onPress={onOpenMyPosts}>
                <Text style={styles.myPostsIcon}>📦</Text>
                <Text style={styles.myPostsText}>Posts</Text>
              </Pressable>
            )}

            {user ? (
              <Pressable style={styles.avatarBtn} onPress={onProfile}>
                {user.photoURL ? (
                  <Image source={{ uri: user.photoURL }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitial}>{userInitial}</Text>
                  </View>
                )}
                <View style={styles.onlineStatusRing} />
              </Pressable>
            ) : (
              <Pressable style={styles.topSignInBtn} onPress={onSignIn}>
                <Text style={styles.topSignInGoogleMark}>G</Text>
                <Text style={styles.topSignInBtnText}>Sign In</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.heroRow}>
          <View style={styles.headlineCol}>
            {user ? (
              <View style={styles.welcomeBox}>
                <Text style={styles.welcomeGreeting}>Welcome back,</Text>
                <Text style={styles.welcomeName} numberOfLines={1}>
                  {userName}
                </Text>
                <View style={styles.verifiedBadgeRow}>
                  <Text style={styles.verifiedBadgeCheck}>✓</Text>
                  <Text style={styles.verifiedBadgeLabel}>Verified Student</Text>
                </View>
              </View>
            ) : (
              <View style={styles.guestHeadline}>
                <Text style={styles.heading}>
                  Find your{"\n"}next{"\n"}favorite{"\n"}thing.
                </Text>
                <Text style={styles.guestSubtitle}>
                  Exclusively for Jaffna University
                </Text>
              </View>
            )}
          </View>
          <View style={styles.illustrationCol}>
            <Image
              source={require("../../assets/header-illustration.png")}
              style={styles.heroImage}
              resizeMode="contain"
            />
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.search}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder="Search textbooks, desks, tech..."
          placeholderTextColor="#86998F"
          style={styles.input}
        />
      </View>

      {/* Browse Near You Section Header */}
      <View style={styles.section}>
        <View>
          <Text style={styles.sectionTitle}>Browse near you</Text>
          <Text style={styles.muted}>Good finds, close by</Text>
        </View>
        <View style={styles.itemsCountBadge}>
          <Text style={styles.itemsCount}>{items.length} items</Text>
        </View>
      </View>

      {/* Category Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categories}
      >
        {categories.map((value) => (
          <Pressable
            key={value}
            onPress={() => onCategoryChange(value)}
            style={[
              styles.category,
              category === value && styles.activeCategory,
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                category === value && styles.activeText,
              ]}
            >
              {value}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Member 2: Condition Filter Bar Component */}
      {onConditionChange && (
        <ConditionFilterBar
          selectedCondition={selectedCondition}
          onConditionChange={onConditionChange}
        />
      )}

      {/* 2-Column Product Grid */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        scrollEnabled={false}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.columns}
        ListEmptyComponent={
          <Text style={styles.empty}>No items found for this search.</Text>
        }
        renderItem={({ item }) => (
          <ListingCard
            item={item}
            saved={savedIds.includes(item.id)}
            onSave={() => onSave(item.id)}
            onOpen={() => onOpen(item)}
          />
        )}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: Platform.OS === "android" ? 140 : 120,
    backgroundColor: "#F9FAF4",
  },
  header: {
    paddingTop: 12,
    paddingBottom: 4,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandBox: {
    justifyContent: "center",
  },
  eyebrow: {
    color: "#4C6B5C",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
  },
  verifiedText: {
    color: "#167954",
    fontSize: 11,
    fontWeight: "700",
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topSignInBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#103C31",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  topSignInGoogleMark: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "900",
  },
  topSignInBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "800",
  },
  avatarBtn: {
    position: "relative",
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E2EFE7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#C5E3D2",
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#103C31",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  avatarInitial: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "800",
  },
  onlineStatusRing: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#16A34A",
    borderWidth: 1.5,
    borderColor: "#F9FAF4",
  },
  rentReqBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D6F1E4",
    paddingHorizontal: 11,
    paddingVertical: 6.5,
    borderRadius: 18,
    gap: 4,
    borderWidth: 1,
    borderColor: "#BBE5D0",
  },
  rentReqIcon: {
    fontSize: 13,
  },
  rentReqText: {
    color: "#134638",
    fontSize: 12,
    fontWeight: "700",
  },
  myPostsBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F5F2",
    paddingHorizontal: 10,
    paddingVertical: 6.5,
    borderRadius: 18,
    gap: 4,
    borderWidth: 1,
    borderColor: "#D2E2D8",
  },
  myPostsIcon: {
    fontSize: 12,
  },
  myPostsText: {
    color: "#18493B",
    fontSize: 11.5,
    fontWeight: "700",
  },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },
  headlineCol: {
    flex: 1,
    paddingRight: 8,
  },
  welcomeBox: {
    paddingVertical: 2,
  },
  welcomeGreeting: {
    color: "#5C7164",
    fontSize: 13.5,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  welcomeName: {
    color: "#103C31",
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "900",
    marginTop: 2,
    marginBottom: 6,
  },
  verifiedBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#D8EFE3",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 10,
    gap: 4,
  },
  verifiedBadgeCheck: {
    color: "#0F5B40",
    fontSize: 11,
    fontWeight: "900",
  },
  verifiedBadgeLabel: {
    color: "#0F5B40",
    fontSize: 11,
    fontWeight: "700",
  },
  guestHeadline: {
    paddingVertical: 2,
  },
  guestSubtitle: {
    color: "#6B8275",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
  },
  heading: {
    color: "#103C31",
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  illustrationCol: {
    width: 140,
    alignItems: "flex-end",
  },
  heroImage: {
    width: 140,
    height: 94,
  },
  search: {
    height: 48,
    backgroundColor: "#FFF",
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E3ECE6",
    marginTop: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 9,
    opacity: 0.75,
  },
  input: {
    flex: 1,
    color: "#103C31",
    fontSize: 13.5,
    fontWeight: "500",
  },
  section: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    color: "#103C31",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  muted: {
    color: "#6B8275",
    fontSize: 12.5,
    marginTop: 2,
  },
  itemsCountBadge: {
    backgroundColor: "#E2ECE6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemsCount: {
    color: "#17523F",
    fontWeight: "700",
    fontSize: 12,
  },
  categories: {
    gap: 8,
    paddingBottom: 16,
  },
  category: {
    height: 38,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#E2EFE7",
  },
  activeCategory: {
    backgroundColor: "#134638",
  },
  categoryText: {
    color: "#163C30",
    fontSize: 13,
    fontWeight: "600",
  },
  activeText: {
    color: "#FFF",
    fontWeight: "700",
  },
  grid: {
    gap: 14,
  },
  columns: {
    gap: 14,
  },
  empty: {
    textAlign: "center",
    color: "#87918C",
    padding: 30,
  },
});
