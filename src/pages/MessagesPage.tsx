import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
  acceptRentBorrowRequest,
  rejectRentBorrowRequest,
  subscribeToIncomingRentRequests,
  subscribeToMyRentRequests,
} from "../features/rent-borrow";
import { RentBorrowRequest } from "../features/rent-borrow/types";

export function MessagesPage({
  user,
  onBrowse,
  onListingUpdated,
}: {
  user: User | null;
  onBrowse: () => void;
  onListingUpdated?: (listingId: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");
  const [receivedRequests, setReceivedRequests] = useState<RentBorrowRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<RentBorrowRequest[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setReceivedRequests([]);
      setSentRequests([]);
      return;
    }

    const unsubIncoming = subscribeToIncomingRentRequests(
      {
        sellerId: user.uid,
        sellerEmail: user.email,
        sellerName: user.displayName || user.email?.split("@")[0],
      },
      (data) => setReceivedRequests(data)
    );

    const unsubOutgoing = subscribeToMyRentRequests(
      user.uid,
      user.email || undefined,
      (data) => setSentRequests(data)
    );

    return () => {
      unsubIncoming();
      unsubOutgoing();
    };
  }, [user]);

  const handleAccept = async (req: RentBorrowRequest, deletePost = false) => {
    setActionLoadingId(req.id);
    try {
      await acceptRentBorrowRequest({
        requestId: req.id,
        listingId: req.listingId,
        deleteListingPost: deletePost,
        onListingUpdated,
      });
      setReceivedRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, status: "accepted" } : r))
      );
    } catch (err) {
      console.warn("Could not accept request:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (req: RentBorrowRequest) => {
    setActionLoadingId(req.id);
    try {
      await rejectRentBorrowRequest(req.id);
      setReceivedRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, status: "rejected" } : r))
      );
    } catch (err) {
      console.warn("Could not reject request:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const listToDisplay = activeTab === "received" ? receivedRequests : sentRequests;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <PageTitle
        title="Messages & Requests"
        subtitle="Inquiries and rental requests for your campus items"
      />

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tabBtn, activeTab === "received" && styles.tabBtnActive]}
          onPress={() => setActiveTab("received")}
        >
          <Text
            style={[
              styles.tabBtnText,
              activeTab === "received" && styles.tabBtnTextActive,
            ]}
          >
            📥 Received Requests ({receivedRequests.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, activeTab === "sent" && styles.tabBtnActive]}
          onPress={() => setActiveTab("sent")}
        >
          <Text
            style={[
              styles.tabBtnText,
              activeTab === "sent" && styles.tabBtnTextActive,
            ]}
          >
            📤 My Sent ({sentRequests.length})
          </Text>
        </Pressable>
      </View>

      {!user ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🔒</Text>
          <Text style={styles.emptyTitle}>Sign in to view messages</Text>
          <Text style={styles.emptyText}>
            Connect with your University of Jaffna email to view rental requests and messages from other students.
          </Text>
        </View>
      ) : listToDisplay.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>✉</Text>
          <Text style={styles.emptyTitle}>
            {activeTab === "received"
              ? "No incoming requests yet"
              : "No sent requests yet"}
          </Text>
          <Text style={styles.emptyText}>
            {activeTab === "received"
              ? "When other students ask to rent or borrow your items, their requests will appear here."
              : "Items you have requested to borrow or rent from other students will appear here."}
          </Text>
          <Pressable style={styles.browseButton} onPress={onBrowse}>
            <Text style={styles.browseButtonText}>Browse Marketplace</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.list}>
          {listToDisplay.map((item) => {
            const isPending = item.status === "pending";
            const isLoading = actionLoadingId === item.id;
            const isReceived = activeTab === "received";

            return (
              <View key={item.id} style={styles.card}>
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.itemHeaderLeft}>
                    {item.listingImage ? (
                      <Image source={{ uri: item.listingImage }} style={styles.thumb} />
                    ) : null}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {item.listingTitle}
                      </Text>
                      <Text style={styles.userSubtext}>
                        {isReceived
                          ? `From: ${item.requesterName}${
                              item.requesterEmail ? ` (${item.requesterEmail})` : ""
                            }`
                          : `To: ${item.sellerName}`}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.typeBadge,
                      item.type === "rent" ? styles.badgeRent : styles.badgeBorrow,
                    ]}
                  >
                    <Text style={styles.typeBadgeText}>
                      {item.type.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Details */}
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>
                    ⏱ Duration: <Text style={styles.bold}>{item.duration}</Text>
                  </Text>
                  {item.offeredPrice ? (
                    <Text style={styles.metaText}>
                      💵 Offer: <Text style={styles.bold}>${item.offeredPrice}</Text>
                    </Text>
                  ) : null}
                </View>

                {/* Buyer Message */}
                <View style={styles.messageBubble}>
                  <Text style={styles.messageBubbleText}>"{item.message}"</Text>
                </View>

                {/* Status Banners */}
                {item.status === "accepted" && (
                  <View style={styles.statusBannerAccepted}>
                    <Text style={styles.statusAcceptedText}>
                      ✓ Accepted · Item marked as rented & hidden from feed
                    </Text>
                  </View>
                )}
                {item.status === "rejected" && (
                  <View style={styles.statusBannerRejected}>
                    <Text style={styles.statusRejectedText}>
                      ✕ Request declined
                    </Text>
                  </View>
                )}

                {/* Action Buttons (Only for Seller on Incoming Pending Requests) */}
                {isReceived && isPending && (
                  <View style={styles.actionsCol}>
                    {isLoading ? (
                      <ActivityIndicator color="#1C7057" style={{ marginVertical: 8 }} />
                    ) : (
                      <>
                        <Pressable
                          style={[styles.btn, styles.btnAccept]}
                          onPress={() => handleAccept(item, false)}
                        >
                          <Text style={styles.btnAcceptText}>
                            ✓ Accept & Mark Rented (Hide from feed)
                          </Text>
                        </Pressable>
                        <View style={styles.actionsRow}>
                          <Pressable
                            style={[styles.btn, styles.btnAcceptDelete]}
                            onPress={() => handleAccept(item, true)}
                          >
                            <Text style={styles.btnAcceptDeleteText}>
                              🗑 Accept & Remove Post
                            </Text>
                          </Pressable>
                          <Pressable
                            style={[styles.btn, styles.btnDecline]}
                            onPress={() => handleReject(item)}
                          >
                            <Text style={styles.btnDeclineText}>Decline</Text>
                          </Pressable>
                        </View>
                      </>
                    )}
                  </View>
                )}
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
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#EEF3F0",
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#5C7164",
  },
  tabBtnTextActive: {
    color: "#103C31",
  },
  emptyCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5ECE7",
    marginTop: 10,
  },
  emptyIcon: {
    fontSize: 40,
    color: "#9BB4A6",
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#163C30",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: "#6D8177",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 18,
  },
  browseButton: {
    backgroundColor: "#165943",
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
  },
  browseButtonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 13.5,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E4EDE7",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  itemHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
    marginRight: 8,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#F0F4F2",
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#123A2F",
  },
  userSubtext: {
    fontSize: 12,
    color: "#5D7366",
    marginTop: 2,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeRent: {
    backgroundColor: "#E2F0FD",
  },
  badgeBorrow: {
    backgroundColor: "#E2F7EB",
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#134B3B",
  },
  metaRow: {
    flexDirection: "row",
    gap: 16,
    marginVertical: 4,
  },
  metaText: {
    fontSize: 12.5,
    color: "#5A6E63",
  },
  bold: {
    fontWeight: "700",
    color: "#123A2F",
  },
  messageBubble: {
    backgroundColor: "#F4F8F5",
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#E6EFEA",
  },
  messageBubbleText: {
    fontSize: 13,
    color: "#2C453B",
    fontStyle: "italic",
    lineHeight: 18,
  },
  statusBannerAccepted: {
    backgroundColor: "#E7F7ED",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  statusAcceptedText: {
    color: "#14694A",
    fontSize: 12,
    fontWeight: "700",
  },
  statusBannerRejected: {
    backgroundColor: "#FDF0F0",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  statusRejectedText: {
    color: "#C53030",
    fontSize: 12,
    fontWeight: "700",
  },
  actionsCol: {
    marginTop: 8,
    gap: 8,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnAccept: {
    backgroundColor: "#165943",
  },
  btnAcceptText: {
    color: "#FFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
  btnAcceptDelete: {
    backgroundColor: "#FDF2F2",
    borderWidth: 1,
    borderColor: "#F5C2C7",
  },
  btnAcceptDeleteText: {
    color: "#B4232C",
    fontSize: 12,
    fontWeight: "700",
  },
  btnDecline: {
    backgroundColor: "#EFEFEF",
  },
  btnDeclineText: {
    color: "#555",
    fontSize: 12,
    fontWeight: "600",
  },
});
