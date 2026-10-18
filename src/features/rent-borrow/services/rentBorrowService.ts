import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { Listing } from "../../../types";
import { RentBorrowRequest, RentBorrowType } from "../types";

// In-memory mock storage for demo / offline mode
let localRequests: RentBorrowRequest[] = [];

/**
 * Send a new Rent or Borrow request to the seller
 */
export async function sendRentBorrowRequest(params: {
  listing: Listing;
  requesterId: string;
  requesterName: string;
  requesterEmail?: string;
  type: RentBorrowType;
  duration: string;
  offeredPrice?: number;
  message: string;
}): Promise<RentBorrowRequest> {
  const { listing, requesterId, requesterName, requesterEmail, type, duration, offeredPrice, message } = params;

  const newRequest: Omit<RentBorrowRequest, "id"> = {
    listingId: listing.id,
    listingTitle: listing.title,
    listingImage: listing.image,
    requesterId,
    requesterName,
    requesterEmail: requesterEmail || "",
    sellerId: listing.sellerId || "demo-seller",
    sellerName: listing.seller || "Jaffna Student",
    sellerEmail: listing.sellerEmail || "",
    type,
    status: "pending",
    duration,
    offeredPrice: offeredPrice || 0,
    message,
    createdAt: Date.now(),
  };

  if (db) {
    const docRef = await addDoc(collection(db, "rentRequests"), {
      ...newRequest,
      createdAt: serverTimestamp(),
    });
    return { id: docRef.id, ...newRequest };
  } else {
    // Offline / Demo fallback
    const mockRequest: RentBorrowRequest = {
      id: "req_" + Date.now(),
      ...newRequest,
    };
    localRequests.unshift(mockRequest);
    return mockRequest;
  }
}

/**
 * Seller accepts the Rent/Borrow request.
 * Crucial step: Updates the request status to 'accepted' AND
 * updates the listing to `isAvailable: false` (or removes it from active exploration list).
 */
export async function acceptRentBorrowRequest(params: {
  requestId: string;
  listingId: string;
  deleteListingPost?: boolean;
  onListingUpdated?: (listingId: string) => void;
}): Promise<void> {
  const { requestId, listingId, deleteListingPost, onListingUpdated } = params;

  if (db) {
    // 1. Mark request as accepted
    const reqRef = doc(db, "rentRequests", requestId);
    await updateDoc(reqRef, {
      status: "accepted",
      updatedAt: serverTimestamp(),
    });

    // 2. Either delete or hide listing status
    if (listingId) {
      const listingRef = doc(db, "listings", listingId);
      if (deleteListingPost) {
        await deleteDoc(listingRef).catch(() => {});
      } else {
        await updateDoc(listingRef, {
          isAvailable: false,
          rentalStatus: "rented",
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }
    }
  } else {
    // Offline demo
    const req = localRequests.find((r) => r.id === requestId);
    if (req) {
      req.status = "accepted";
      req.updatedAt = Date.now();
    }
  }

  if (onListingUpdated) {
    onListingUpdated(listingId);
  }
}

/**
 * Seller rejects the Rent/Borrow request.
 */
export async function rejectRentBorrowRequest(requestId: string): Promise<void> {
  if (db) {
    const reqRef = doc(db, "rentRequests", requestId);
    await updateDoc(reqRef, {
      status: "rejected",
      updatedAt: serverTimestamp(),
    });
  } else {
    const req = localRequests.find((r) => r.id === requestId);
    if (req) {
      req.status = "rejected";
      req.updatedAt = Date.now();
    }
  }
}

/**
 * Delete a post from marketplace permanently
 */
export async function deleteMarketplaceListing(listingId: string): Promise<void> {
  if (!listingId) return;

  if (db && !["1", "2", "3", "4"].includes(listingId)) {
    const ref = doc(db, "listings", listingId);

    // 1. Soft-delete first: updateDoc often succeeds even when deleteDoc rules are restricted
    try {
      await updateDoc(ref, {
        isDeleted: true,
        deleted: true,
        status: "deleted",
        isAvailable: false,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn("Firestore soft delete error (handled):", err);
    }

    // 2. Hard-delete: attempt to remove document completely
    try {
      await deleteDoc(ref);
    } catch (err) {
      console.warn("Firestore hard delete error (handled):", err);
    }
  }
}

/**
 * Toggle listing active / rented status
 */
export async function toggleListingStatus(
  listingId: string,
  isCurrentlyAvailable: boolean
): Promise<void> {
  if (db && listingId) {
    if (!["1", "2", "3", "4"].includes(listingId)) {
      try {
        const ref = doc(db, "listings", listingId);
        await updateDoc(ref, {
          isAvailable: !isCurrentlyAvailable,
          rentalStatus: !isCurrentlyAvailable ? "available" : "rented",
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn("Firestore toggle listing status error (will update locally):", err);
      }
    }
  }
}

export type SellerQueryTarget =
  | string
  | {
      sellerId?: string | null;
      sellerEmail?: string | null;
      sellerName?: string | null;
    };

/**
 * Subscribe to incoming requests for a seller (matches by UID, Email, or Name)
 */
export function subscribeToIncomingRentRequests(
  target: SellerQueryTarget,
  callback: (requests: RentBorrowRequest[]) => void
): () => void {
  const targetId = typeof target === "string" ? target : target?.sellerId || "";
  const targetEmail =
    typeof target === "string" ? "" : (target?.sellerEmail || "").trim().toLowerCase();
  const targetName =
    typeof target === "string" ? "" : (target?.sellerName || "").trim().toLowerCase();

  const filterRequests = (list: RentBorrowRequest[]) => {
    return list.filter((r) => {
      // 1. Direct UID match
      if (targetId && r.sellerId && r.sellerId === targetId) return true;
      // 2. Direct email match
      if (targetEmail && r.sellerEmail && r.sellerEmail.trim().toLowerCase() === targetEmail) return true;
      // 3. Direct name match
      if (targetName && r.sellerName && r.sellerName.trim().toLowerCase() === targetName) return true;
      // 4. Demo fallback: If item had default seller and request was sent by someone else
      if (
        (r.sellerId === "demo-seller" || !r.sellerId) &&
        (!targetEmail || (r.requesterEmail && r.requesterEmail.toLowerCase() !== targetEmail))
      ) {
        return true;
      }
      return false;
    });
  };

  // If no user / seller is logged in, don't query Firestore
  if (!targetId && !targetEmail && !targetName) {
    callback(filterRequests(localRequests));
    return () => undefined;
  }

  if (!db) {
    callback(filterRequests(localRequests));
    return () => undefined;
  }

  const q = query(collection(db, "rentRequests"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map(
        (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as RentBorrowRequest)
      );
      callback(filterRequests(items));
    },
    (err) => {
      // Handle permission-denied or offline silently without triggering LogBox alert
      if (err?.code === "permission-denied" || err?.message?.includes("permissions")) {
        callback(filterRequests(localRequests));
        return;
      }
      // Fallback: try querying without order if index is pending
      if (db) {
        try {
          const fallbackQuery = query(collection(db, "rentRequests"));
          onSnapshot(
            fallbackQuery,
            (snapshot) => {
              const items = snapshot.docs.map(
                (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as RentBorrowRequest)
              );
              callback(filterRequests(items));
            },
            () => callback(filterRequests(localRequests))
          );
        } catch {
          callback(filterRequests(localRequests));
        }
      }
    }
  );
}

/**
 * Subscribe to outgoing requests sent by a student
 */
export function subscribeToMyRentRequests(
  requesterId: string,
  requesterEmail: string | undefined,
  callback: (requests: RentBorrowRequest[]) => void
): () => void {
  const reqEmailLower = (requesterEmail || "").trim().toLowerCase();

  const filterMyRequests = (list: RentBorrowRequest[]) => {
    return list.filter((r) => {
      if (requesterId && r.requesterId === requesterId) return true;
      if (reqEmailLower && r.requesterEmail && r.requesterEmail.toLowerCase() === reqEmailLower) return true;
      return false;
    });
  };

  // If not logged in, don't query Firestore
  if (!requesterId && !reqEmailLower) {
    callback(filterMyRequests(localRequests));
    return () => undefined;
  }

  if (!db) {
    callback(filterMyRequests(localRequests));
    return () => undefined;
  }

  const q = query(collection(db, "rentRequests"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map(
        (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as RentBorrowRequest)
      );
      callback(filterMyRequests(items));
    },
    () => callback(filterMyRequests(localRequests))
  );
}
