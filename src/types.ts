export type Listing = {
  id: string;
  title: string;
  price: number;
  category: string;
  seller: string;
  sellerId?: string;
  sellerEmail?: string;
  campus: string;
  condition: string;
  image: string;
  description?: string;
  isAvailable?: boolean;
  rentalStatus?: "available" | "rented" | "borrowed";
  isDeleted?: boolean;
  deleted?: boolean;
  status?: string;
  createdAt?: any;
};

export type Tab = "Explore" | "Saved" | "Messages" | "Profile" | "MyListings";
