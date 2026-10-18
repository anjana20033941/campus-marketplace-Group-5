import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  acceptRentBorrowRequest,
  rejectRentBorrowRequest,
  subscribeToIncomingRentRequests,
} from "../services/rentBorrowService";
import { RentBorrowRequest } from "../types";

export function RentRequestsModal({
  visible,
  sellerId,
  sellerEmail,
  sellerName,
  onClose,
  onListingUpdated,
}: {
  visible: boolean;
  sellerId: string | null;
  sellerEmail?: string | null;
  sellerName?: string | null;
  onClose: () => void;
  onListingUpdated?: (listingId: string) => void;
}) {
  const [requests, setRequests] = useState<RentBorrowRequest[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    const unsubscribe = subscribeToIncomingRentRequests(
      { sellerId, sellerEmail, sellerName },
      (data) => {
        setRequests(data);
      }
    );
    return () => unsubscribe();
  }, [visible, sellerId, sellerEmail, sellerName]);

  const handleAccept = async (req: RentBorrowRequest, deletePost = false) => {
    setActionLoadingId(req.id);
    try {
      await acceptRentBorrowRequest({
        requestId: req.id,
        listingId: req.listingId,
        deleteListingPost: deletePost,
        onListingUpdated,
      });
      // Update local state
      setRequests((prev) =>
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
      setRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, status: "rejected" } : r))
      );
    } catch (err) {
      console.warn("Could not reject request:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>SELLER INBOX</Text>
              <Text style={styles.title}>Rent & Borrow Requests</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>×</Text>
            </Pressable>
          </View>

          <FlatList
            data={requests}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>✉</Text>
                <Text style={styles.emptyText}>No Rent/Borrow requests yet.</Text>
                <Text style={styles.emptySubtext}>
                  When students request to borrow or rent your items, they will appear here.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isPending = item.status === "pending";
              const isLoading = actionLoadingId === item.id;

              return (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {item.listingTitle}
                    </Text>
                    <View
                      style={[
                        styles.badge,
                        item.type === "rent" ? styles.badgeRent : styles.badgeBorrow,
                      ]}
                    >
                      <Text style={styles.badgeText}>
                        {item.type.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.requester}>
                    From: <Text style={styles.bold}>{item.requesterName}</Text>
                  </Text>
                  <Text style={styles.meta}>
                    Duration: <Text style={styles.bold}>{item.duration}</Text>
                    {item.offeredPrice ? ` · Offer: $${item.offeredPrice}` : ""}
                  </Text>
                  <Text style={styles.messageBox}>"{item.message}"</Text>

                  {/* Status Indicator */}
                  {item.status === "accepted" && (
                    <View style={styles.statusBannerAccepted}>
                      <Text style={styles.statusAcceptedText}>
                        ✓ Accepted! Listing removed from active explore feed.
                      </Text>
                    </View>
                  )}
                  {item.status === "rejected" && (
                    <View style={styles.statusBannerRejected}>
                      <Text style={styles.statusRejectedText}>Decline sent to buyer.</Text>
                    </View>
                  )}

                  {/* Action Buttons for Pending */}
                  {isPending && (
                    <View style={styles.actionsCol}>
                      {isLoading ? (
                        <ActivityIndicator color="#1C7057" style={{ marginVertical: 10 }} />
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
            }}
          />
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
    maxHeight: "85%",
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1C7057",
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: "#1B3A33",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F4F2",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    fontSize: 20,
    color: "#2C3E35",
    fontWeight: "700",
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: "#F9FAF9",
    borderWidth: 1,
    borderColor: "#E5ECE7",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  itemTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#1A352F",
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeRent: {
    backgroundColor: "#E3F2FD",
  },
  badgeBorrow: {
    backgroundColor: "#E8F5E9",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1C5B49",
  },
  requester: {
    fontSize: 13,
    color: "#475953",
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
    color: "#6D7E78",
    marginBottom: 8,
  },
  bold: {
    fontWeight: "700",
    color: "#1D3A32",
  },
  messageBox: {
    backgroundColor: "#FFF",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EDF2EF",
    fontSize: 13,
    fontStyle: "italic",
    color: "#374943",
    marginBottom: 10,
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
  },
  btnAccept: {
    backgroundColor: "#1C7057",
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
    fontSize: 12.5,
    fontWeight: "700",
  },
  btnDecline: {
    backgroundColor: "#EFEFEF",
  },
  btnDeclineText: {
    color: "#666",
    fontSize: 13,
    fontWeight: "600",
  },
  statusBannerAccepted: {
    backgroundColor: "#E8F5E9",
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  statusAcceptedText: {
    color: "#1C7057",
    fontSize: 12,
    fontWeight: "700",
  },
  statusBannerRejected: {
    backgroundColor: "#FFEBEE",
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  statusRejectedText: {
    color: "#C62828",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 36,
    color: "#B2BEB8",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#445951",
  },
  emptySubtext: {
    fontSize: 13,
    color: "#83948E",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 20,
  },
});
