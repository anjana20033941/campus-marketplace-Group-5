# Campus Marketplace — Rent & Borrow Feature

> **Branch:** `feature/rent-borrow`  
> **Team:** Group 5  
> **Framework:** Expo SDK 57 (React Native / TypeScript / Firebase)

An interactive campus marketplace application designed for university students to buy, sell, **rent, and borrow** items within a trusted campus community.

---

## 🌟 Feature Spotlight: Rent & Borrow System

In addition to traditional marketplace buying and selling, university students often need essential items (textbooks, lab equipment, graphing calculators, display dongles, camera gear, and tools) only for temporary periods. 

The **Rent & Borrow feature** introduces a flexible peer-to-peer sharing economy directly into the campus marketplace.

### Key Capabilities

- **🤝 Dual Transaction Types**:
  - **Borrow (Free Peer Sharing):** Borrow items for short-term academic or daily needs with zero cost.
  - **Rent (Paid Rental):** Rent out higher-value equipment with a custom proposed rental price.
- **⏱ Flexible Duration Selection:**
  - Choose between 1–3 Days, 1 Week, 2 Weeks, 1 Month, or specify a custom duration.
- **💬 Direct Negotiation & Notes:**
  - Requesters can attach a personalized note explaining their purpose and proposed return timeframe.
- **🔒 Authenticated & Secure:**
  - Only authenticated university students can submit rent/borrow requests, protecting sellers from untrusted queries.
- **📥 Seller Dashboard (`🤝 Rent Requests`):**
  - Dedicated top navigation button on the Explore screen with real-time access to incoming requests.
  - Sellers can review requester name, item title, duration, offered rental fee, and message.
- **⚡ One-Click Acceptance & Inventory Sync:**
  - When a seller clicks **"Accept & Rent Out"**, the request status becomes `accepted`.
  - The listing availability is automatically updated (`isAvailable: false`), seamlessly removing it from the public active feed to prevent duplicate requests.
  - Sellers also have the flexibility to decline or clear completed requests.

---

## 🏗 Modular Architecture

The feature is implemented under a modular folder structure (`src/features/rent-borrow/`) to maintain clean separation of concerns and avoid coupling with unrelated features:

```text
src/
├── features/
│   └── rent-borrow/
│       ├── components/
│       │   ├── RentBorrowModal.tsx     # Buyer dialog with Borrow/Rent tabs, duration, & pricing
│       │   └── RentRequestsModal.tsx   # Seller inbox to view, accept, or decline incoming requests
│       ├── services/
│       │   └── rentBorrowService.ts    # Firebase Firestore CRUD + in-memory demo fallback
│       ├── types.ts                    # TypeScript types (RentBorrowRequest, RentBorrowType, etc.)
│       ├── index.ts                    # Barrel export for clean imports across the project
│       └── README.md                   # Module-specific technical reference
├── pages/
│   └── ExplorePage.tsx                 # Header "🤝 Rent Requests" action button
└── App.tsx                             # Global state binding, modal triggers, & listing syncing
```

---

## 🚀 Step-by-Step Testing Guide

To test the Rent & Borrow flow in less than 2 minutes:

1. **Launch the Web App:**
   ```bash
   npm run web
   ```
2. **Submit a Rent / Borrow Request (Buyer Flow):**
   - Click on any item on the Explore feed (e.g., *Calculus: Early Transcendentals*).
   - In the listing details modal, tap **"Request to Rent / Borrow"**.
   - Toggle between **"Borrow (Free)"** or **"Rent (Paid)"**.
   - Pick a duration (e.g., *3 Days* or *1 Week*).
   - Add a brief note and tap **"Send Request"**.
3. **Manage the Request (Seller Flow):**
   - Click the **"🤝 Rent Requests"** pill button located at the top-right of the Explore screen header.
   - Review the incoming request details.
   - Tap **"Accept & Rent Out"** to approve the request.
   - The request marks as accepted, and the listing availability is automatically synced.

---

## 💻 Run Locally

**Requirements:** Node.js 22.13 or newer.

```bash
# 1. Clone repository & switch to this feature branch
git checkout feature/rent-borrow

# 2. Copy environment configuration
cp .env.example .env

# 3. Install dependencies
npm install

# 4. Start the application on Web
npm run web

# Or start on Android / iOS via Expo Go
npx expo start
```

> **Note:** The app automatically runs in **demo mode** with in-memory state fallback if Firebase environment variables are not configured in `.env`.

---

## 🔥 Firebase Setup

1. Create a Firebase project and register a Web app at [console.firebase.google.com](https://console.firebase.google.com/).
2. Under **Authentication > Sign-in method**, enable **Google Authentication**. (Anonymous Authentication remains enabled as native fallback).
3. Create a **Cloud Firestore** database.
4. Copy your Firebase Web app keys into `.env` (using `.env.example` as a template).
5. Deploy `firestore.rules` or paste them into the Firestore Rules tab in the console:

```text
- listings: public read, authenticated seller-owned creates and edits.
- users/{uid}: owner-only access.
- rentBorrowRequests: authenticated reads/writes for involved parties.
- conversations: participant-only access for buyer-seller messaging.
```

---

## 📱 Summary of All Core Product Flows

- **Rent & Borrow**: Request to borrow or rent items, custom duration, seller acceptance dashboard, auto inventory lock.
- **Explore & Search**: Live search bar, category filtering pills, condition filter tags.
- **Listing Cards**: Campus location tags (`📍 North Campus`), buyer-verified condition rating pill (`⭐ 4.5`).
- **Support Chatbot**: Quick-access floating bot (`🤖 Need Help? Chat with Bot ›`) with instant answers.
- **Peer-to-Peer Messaging**: Connect with campus buyers and sellers.
- **Sell Flow**: Easily create new listings for textbooks, tech, furniture, and dorm essentials.
