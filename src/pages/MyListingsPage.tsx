import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { PageTitle } from "../components/PageTitle";
import { Listing } from "../types";
import {
  deleteMarketplaceListing,
  toggleListingStatus,
} from "../features/rent-borrow";

export function MyListingsPage({
  items,
  onOpen,
  onSell,
  onDeleted,
  onToggled,
}: {
  items: Listing[];
  onOpen: (item: Listing) => void;
  onSell: () => void;
  onDeleted?: (listingId: string) => void;
  onToggled?: (listingId: string, nowAvailable: boolean) => void;
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [removedIds, setRemovedIds] = useState<string[]>([]);

  const executeDelete = (listingId: string) => {
    // 1. Instantly remove visually from screen (0ms latency)
    setRemovedIds((prev) => (prev.includes(listingId) ? prev : [...prev, listingId]));

    // 2. Notify App.tsx to update global state & persistent storage
    if (onDeleted) {
      onDeleted(listingId);
    }

    // 3. Asynchronously request Firestore deletion/soft-deletion
    deleteMarketplaceListing(listingId).catch((err) => {
      console.warn("deleteMarketplaceListing background error:", err);
    });
  };

  const handleDelete = (item: Listing) => {
    if (Platform.OS === "web") {
      const ok =
        typeof window !== "undefined"
          ? window.confirm(`Remove "${item.title}" from the marketplace?`)
          : true;
      if (ok) {
        executeDelete(item.id);
      }
      return;
    }

    Alert.alert(
      "Delete Listing",
      `Are you sure you want to remove "${item.title}" from the marketplace?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            executeDelete(item.id);
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleToggle = async (item: Listing) => {
    setLoadingId(item.id);
    const isAvailable = item.isAvailable !== false;
    try {
      await toggleListingStatus(item.id, isAvailable);
    } catch (err) {
      console.warn("Could not toggle status in Firestore:", err);
    } finally {
      if (onToggled) onToggled(item.id, !isAvailable);
      setLoadingId(null);
    }
  };

  const visibleItems = items.filter((item) => !removedIds.includes(item.id));

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <PageTitle
            title="My Listings"
            subtitle="Manage your posts on University of Jaffna Marketplace"
          />
        </View>
        <Pressable style={styles.sellBtn} onPress={onSell}>
          <Text style={styles.sellBtnText}>+ New Post</Text>
        </Pressable>
      </View>

      {visibleItems.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>You haven't posted any items yet</Text>
          <Text style={styles.emptySubtitle}>
            Sell textbooks, calculators, furniture, or tech to fellow Jaffna students.
          </Text>
          <Pressable style={styles.emptyActionBtn} onPress={onSell}>
            <Text style={styles.emptyActionBtnText}>+ Post Your First Item</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.list}>
          {visibleItems.map((item) => {
            const isAvailable = item.isAvailable !== false;
            const isLoading = loadingId === item.id;

            return (
              <View key={item.id} style={styles.card}>
                <Pressable
                  style={styles.cardTopRow}
                  onPress={() => onOpen(item)}
                >
                  <Image source={{ uri: item.image }} style={styles.cardImage} />
                  <View style={styles.cardInfo}>
                    <View style={styles.titlePriceRow}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.cardPrice}>${item.price}</Text>
                    </View>
                    <Text style={styles.cardMeta}>
                      {item.category} · {item.condition}
                    </Text>

                    {/* Status Pill */}
                    <View style={styles.statusPillWrapper}>
                      <View
                        style={[
                          styles.statusPill,
                          isAvailable
                            ? styles.statusActivePill
                            : styles.statusRentedPill,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            isAvailable
                              ? styles.statusActiveText
                              : styles.statusRentedText,
                          ]}
                        >
                          {isAvailable
                            ? "🟢 Active on Explore Feed"
                            : "🔒 Rented / Hidden from Feed"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>

                {/* Actions row */}
                <View style={styles.cardActionsRow}>
                  {isLoading ? (
                    <ActivityIndicator color="#1C7057" style={{ marginVertical: 6 }} />
                  ) : (
                    <>
                      <Pressable
                        style={[
                          styles.actionBtn,
                          isAvailable ? styles.btnHide : styles.btnShow,
                        ]}
                        onPress={() => handleToggle(item)}
                      >
                        <Text
                          style={[
                            styles.actionBtnText,
                            isAvailable ? styles.btnHideText : styles.btnShowText,
                          ]}
                        >
                          {isAvailable ? "👁 Hide from Feed" : "✓ Make Available"}
                        </Text>
                      </Pressable>

                      <Pressable
                        style={[styles.actionBtn, styles.btnDelete]}
                        onPress={() => handleDelete(item)}
                      >
                        <Text style={styles.btnDeleteText}>🗑 Remove Post</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 130 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  sellBtn: {
    backgroundColor: "#103C31",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  sellBtnText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5ECE7",
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 48,
    color: "#97B3A2",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#163C30",
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#6D8177",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  emptyActionBtn: {
    backgroundColor: "#165943",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyActionBtnText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 14,
  },
  list: {
    gap: 14,
    marginTop: 6,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5ECE7",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: "row",
    gap: 12,
  },
  cardImage: {
    width: 76,
    height: 76,
    borderRadius: 12,
    backgroundColor: "#EDF2EE",
  },
  cardInfo: {
    flex: 1,
    justifyContent: "center",
  },
  titlePriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#123A2F",
    flex: 1,
    marginRight: 8,
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: "900",
    color: "#103C31",
  },
  cardMeta: {
    fontSize: 12,
    color: "#6D8177",
    marginTop: 3,
  },
  statusPillWrapper: {
    marginTop: 6,
    alignSelf: "flex-start",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusActivePill: {
    backgroundColor: "#E2F7EB",
  },
  statusRentedPill: {
    backgroundColor: "#FFF3DC",
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusActiveText: {
    color: "#14694A",
  },
  statusRentedText: {
    color: "#B25E09",
  },
  cardActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEF3F0",
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnHide: {
    backgroundColor: "#F2F6F4",
    borderWidth: 1,
    borderColor: "#D6E3DC",
  },
  btnHideText: {
    color: "#38564B",
    fontSize: 12.5,
    fontWeight: "700",
  },
  btnShow: {
    backgroundColor: "#E3F3EC",
    borderWidth: 1,
    borderColor: "#C5E3D2",
  },
  btnShowText: {
    color: "#165943",
    fontSize: 12.5,
    fontWeight: "700",
  },
  btnDelete: {
    backgroundColor: "#FDF2F2",
    borderWidth: 1,
    borderColor: "#F5C2C7",
  },
  btnDeleteText: {
    color: "#B4232C",
    fontSize: 12.5,
    fontWeight: "700",
  },
  actionBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
});
