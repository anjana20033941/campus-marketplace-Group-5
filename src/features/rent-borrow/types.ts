export type RentBorrowType = "rent" | "borrow";

export type RentBorrowStatus = "pending" | "accepted" | "rejected" | "returned";

export interface RentBorrowRequest {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImage: string;
  requesterId: string;
  requesterName: string;
  requesterEmail?: string;
  sellerId: string;
  sellerName: string;
  sellerEmail?: string;
  type: RentBorrowType; // "rent" or "borrow"
  status: RentBorrowStatus; // "pending", "accepted", "rejected", "returned"
  duration: string; // e.g. "3 days", "1 week"
  offeredPrice?: number;
  message: string;
  createdAt: number;
  updatedAt?: number;
}

export interface RentBorrowListingExtension {
  allowRent?: boolean;
  allowBorrow?: boolean;
  rentPricePerDay?: number;
  isAvailable?: boolean; // false when accepted/rented -> hidden from explore list
  currentRenterId?: string;
}
