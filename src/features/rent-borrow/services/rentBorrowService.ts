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
  where,
} from "firebase/firestore";
import safeStorage from "../../../utils/safeStorage";
import { db } from "../../../firebase";
import { Listing } from "../../../types";
import { RentBorrowRequest, RentBorrowType } from "../types";

const CACHE_KEY = "@rent_requests_cache";

// In-memory mock storage for demo / offline mode
let localRequests: RentBorrowRequest[] = [];
let cacheLoaded = false;

async function loadCache(): Promise<RentBorrowRequest[]> {
  if (cacheLoaded && localRequests.length > 0) return localRequests;
  try {
    const raw = await safeStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const existingIds = new Set(localRequests.map((r) => r.id));
        for (const item of parsed) {
          if (!existingIds.has(item.id)) {
            localRequests.push(item);
          }
        }
      }
    }
  } catch {}
  cacheLoaded = true;
  return localRequests;
}

async function persistCache(list: RentBorrowRequest[]): Promise<void> {
  try {
    await safeStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch {}
}

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

  await loadCache();

  // Normalize strings
  const cleanRequesterEmail = (requesterEmail || "").trim().toLowerCase();
  const cleanRequesterName = requesterName || (cleanRequesterEmail ? cleanRequesterEmail.split("@")[0] : "Jaffna Student");

  const cleanSellerEmail = (listing.sellerEmail || "").trim().toLowerCase();
  const cleanSellerName = listing.seller || (cleanSellerEmail ? cleanSellerEmail.split("@")[0] : "Jaffna Student");
  const cleanSellerId = listing.sellerId || "demo-seller";

  const newRequest: Omit<RentBorrowRequest, "id"> = {
    listingId: listing.id,
    listingTitle: listing.title,
    listingImage: listing.image,
    requesterId,
    requesterName: cleanRequesterName,
    requesterEmail: cleanRequesterEmail,
    sellerId: cleanSellerId,
    sellerName: cleanSellerName,
    sellerEmail: cleanSellerEmail,
    type,
    status: "pending",
    duration,
    offeredPrice: offeredPrice || 0,
    message,
    createdAt: Date.now(),
  };

  let savedRequest: RentBorrowRequest;

  if (db) {
    try {
      const docRef = await addDoc(collection(db, "rentRequests"), {
        ...newRequest,
        createdAt: serverTimestamp(),
      });
      savedRequest = { id: docRef.id, ...newRequest };
    } catch (err) {
      console.warn("Firestore addDoc error for rentRequests, falling back to local:", err);
      savedRequest = { id: "req_" + Date.now(), ...newRequest };
    }
  } else {
    savedRequest = { id: "req_" + Date.now(), ...newRequest };
  }

  // Always update in-memory and local cache
  localRequests = [savedRequest, ...localRequests.filter((r) => r.id !== savedRequest.id)];
  await persistCache(localRequests);

  return savedRequest;
}

/**
 * Seller accepts the Rent/Borrow request.
 */
export async function acceptRentBorrowRequest(params: {
  requestId: string;
  listingId: string;
  deleteListingPost?: boolean;
  onListingUpdated?: (listingId: string) => void;
}): Promise<void> {
  const { requestId, listingId, deleteListingPost, onListingUpdated } = params;

  // 1. Update in-memory & persistent cache
  localRequests = localRequests.map((r) =>
    r.id === requestId ? { ...r, status: "accepted", updatedAt: Date.now() } : r
  );
  await persistCache(localRequests);

  if (db) {
    // 2. Mark request as accepted in Firestore
    try {
      const reqRef = doc(db, "rentRequests", requestId);
      await updateDoc(reqRef, {
        status: "accepted",
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn("Firestore update error on accept rentRequest:", err);
    }

    // 3. Update listing status or delete
    if (listingId && !["1", "2", "3", "4"].includes(listingId)) {
      const listingRef = doc(db, "listings", listingId);
      if (deleteListingPost) {
        try {
          await updateDoc(listingRef, {
            isDeleted: true,
            status: "deleted",
            isAvailable: false,
            updatedAt: serverTimestamp(),
          });
          await deleteDoc(listingRef);
        } catch {}
      } else {
        try {
          await updateDoc(listingRef, {
            isAvailable: false,
            rentalStatus: "rented",
            updatedAt: serverTimestamp(),
          });
        } catch {}
      }
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
  localRequests = localRequests.map((r) =>
    r.id === requestId ? { ...r, status: "rejected", updatedAt: Date.now() } : r
  );
  await persistCache(localRequests);

  if (db) {
    try {
      const reqRef = doc(db, "rentRequests", requestId);
      await updateDoc(reqRef, {
        status: "rejected",
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn("Firestore update error on reject rentRequest:", err);
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
 * Matches a request against the target seller (matches by UID, Email, Email Prefix, or Display Name)
 */
function isMatchingSeller(r: RentBorrowRequest, target: { id: string; email: string; name: string; prefix: string }): boolean {
  const { id: targetId, email: targetEmail, name: targetName, prefix: targetPrefix } = target;

  // 1. Direct UID match
  if (targetId && r.sellerId && r.sellerId === targetId) return true;

  // 2. Direct Email match (case-insensitive)
  if (targetEmail && r.sellerEmail && r.sellerEmail.trim().toLowerCase() === targetEmail) return true;

  // 3. Username / Email prefix match (e.g. "2023csc051")
  if (targetPrefix) {
    const rSellerEmail = (r.sellerEmail || "").trim().toLowerCase();
    const rSellerEmailPrefix = rSellerEmail ? rSellerEmail.split("@")[0] : "";
    if (rSellerEmailPrefix && rSellerEmailPrefix === targetPrefix) return true;

    const rSellerName = (r.sellerName || "").trim().toLowerCase();
    if (rSellerName && (rSellerName === targetPrefix || rSellerName.includes(targetPrefix))) return true;
  }

  // 4. Direct Name match
  if (targetName && r.sellerName && r.sellerName.trim().toLowerCase() === targetName) return true;

  // 5. Demo fallback: If item had default seller and request was sent by someone else
  if (
    (r.sellerId === "demo-seller" || !r.sellerId) &&
    (!targetEmail || (r.requesterEmail && r.requesterEmail.toLowerCase() !== targetEmail)) &&
    (!targetId || r.requesterId !== targetId)
  ) {
    return true;
  }

  return false;
}

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
  const targetPrefix = targetEmail ? targetEmail.split("@")[0] : targetName;

  const targetCriteria = { id: targetId, email: targetEmail, name: targetName, prefix: targetPrefix };

  const filterRequests = (list: RentBorrowRequest[]) => {
    return list.filter((r) => isMatchingSeller(r, targetCriteria));
  };

  // If no user is logged in, don't query
  if (!targetId && !targetEmail && !targetName) {
    loadCache().then((cached) => callback(filterRequests(cached)));
    return () => undefined;
  }

  const combinedMap = new Map<string, RentBorrowRequest>();
  const unsubs: (() => void)[] = [];
  let isSubscribed = true;

  const emit = () => {
    if (!isSubscribed) return;
    const merged = Array.from(combinedMap.values());
    merged.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(filterRequests(merged));
  };

  // 1. Immediately emit from local cache
  loadCache().then((cached) => {
    if (!isSubscribed) return;
    for (const r of cached) {
      if (!combinedMap.has(r.id)) combinedMap.set(r.id, r);
    }
    emit();
  });

  if (!db) {
    return () => {
      isSubscribed = false;
    };
  }

  // 2. Set up Firestore snapshot listeners that comply with security rules
  const handleSnapshot = (snapshot: any) => {
    if (!isSubscribed) return;
    let hasNew = false;
    for (const docSnap of snapshot.docs) {
      const data = { id: docSnap.id, ...docSnap.data() } as RentBorrowRequest;
      combinedMap.set(data.id, data);
      hasNew = true;
    }
    if (hasNew) {
      const currentList = Array.from(combinedMap.values());
      localRequests = currentList;
      persistCache(currentList);
      emit();
    }
  };

  // Query A: by sellerId (matches UID rule in security rules)
  if (targetId) {
    try {
      const qId = query(collection(db, "rentRequests"), where("sellerId", "==", targetId));
      const unsub = onSnapshot(qId, handleSnapshot, () => {});
      unsubs.push(unsub);
    } catch {}
  }

  // Query B: by sellerEmail
  if (targetEmail) {
    try {
      const qEmail = query(collection(db, "rentRequests"), where("sellerEmail", "==", targetEmail));
      const unsub = onSnapshot(qEmail, handleSnapshot, () => {});
      unsubs.push(unsub);
    } catch {}
  }

  // Query C: by sellerName
  if (targetName) {
    try {
      const qName = query(collection(db, "rentRequests"), where("sellerName", "==", targetName));
      const unsub = onSnapshot(qName, handleSnapshot, () => {});
      unsubs.push(unsub);
    } catch {}
  }

  // Fallback Query D: general query (in case open rules are active)
  try {
    const qGeneral = query(collection(db, "rentRequests"));
    const unsub = onSnapshot(qGeneral, handleSnapshot, () => {});
    unsubs.push(unsub);
  } catch {}

  return () => {
    isSubscribed = false;
    unsubs.forEach((u) => u());
  };
}

/**
 * Matches outgoing requests sent by a student
 */
function isMatchingRequester(r: RentBorrowRequest, target: { id: string; email: string; prefix: string }): boolean {
  const { id: requesterId, email: reqEmailLower, prefix: reqPrefix } = target;

  if (requesterId && r.requesterId === requesterId) return true;
  if (reqEmailLower && r.requesterEmail && r.requesterEmail.trim().toLowerCase() === reqEmailLower) return true;
  if (reqPrefix) {
    const rEmail = (r.requesterEmail || "").trim().toLowerCase();
    if (rEmail && rEmail.split("@")[0] === reqPrefix) return true;
    const rName = (r.requesterName || "").trim().toLowerCase();
    if (rName && (rName === reqPrefix || rName.includes(reqPrefix))) return true;
  }
  return false;
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
  const reqPrefix = reqEmailLower ? reqEmailLower.split("@")[0] : "";
  const target = { id: requesterId, email: reqEmailLower, prefix: reqPrefix };

  const filterMyRequests = (list: RentBorrowRequest[]) => {
    return list.filter((r) => isMatchingRequester(r, target));
  };

  // If not logged in, don't query
  if (!requesterId && !reqEmailLower) {
    loadCache().then((cached) => callback(filterMyRequests(cached)));
    return () => undefined;
  }

  const combinedMap = new Map<string, RentBorrowRequest>();
  const unsubs: (() => void)[] = [];
  let isSubscribed = true;

  const emit = () => {
    if (!isSubscribed) return;
    const merged = Array.from(combinedMap.values());
    merged.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(filterMyRequests(merged));
  };

  // 1. Immediately emit from local cache
  loadCache().then((cached) => {
    if (!isSubscribed) return;
    for (const r of cached) {
      if (!combinedMap.has(r.id)) combinedMap.set(r.id, r);
    }
    emit();
  });

  if (!db) {
    return () => {
      isSubscribed = false;
    };
  }

  // 2. Set up Firestore snapshot listeners that comply with security rules
  const handleSnapshot = (snapshot: any) => {
    if (!isSubscribed) return;
    let hasNew = false;
    for (const docSnap of snapshot.docs) {
      const data = { id: docSnap.id, ...docSnap.data() } as RentBorrowRequest;
      combinedMap.set(data.id, data);
      hasNew = true;
    }
    if (hasNew) {
      const currentList = Array.from(combinedMap.values());
      localRequests = currentList;
      persistCache(currentList);
      emit();
    }
  };

  // Query A: by requesterId
  if (requesterId) {
    try {
      const qId = query(collection(db, "rentRequests"), where("requesterId", "==", requesterId));
      const unsub = onSnapshot(qId, handleSnapshot, () => {});
      unsubs.push(unsub);
    } catch {}
  }

  // Query B: by requesterEmail
  if (reqEmailLower) {
    try {
      const qEmail = query(collection(db, "rentRequests"), where("requesterEmail", "==", reqEmailLower));
      const unsub = onSnapshot(qEmail, handleSnapshot, () => {});
      unsubs.push(unsub);
    } catch {}
  }

  // Fallback Query C: general
  try {
    const qGeneral = query(collection(db, "rentRequests"));
    const unsub = onSnapshot(qGeneral, handleSnapshot, () => {});
    unsubs.push(unsub);
  } catch {}

  return () => {
    isSubscribed = false;
    unsubs.forEach((u) => u());
  };
}
