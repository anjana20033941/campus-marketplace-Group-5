import { StatusBar } from "expo-status-bar";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import * as ImagePicker from "expo-image-picker";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  User,
} from "firebase/auth";

WebBrowser.maybeCompleteAuthSession();
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Alert,
  Image,
  LogBox,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

LogBox.ignoreLogs([
  "Linking requires a build-time setting",
  "@firebase/firestore: Firestore",
  "WebChannelConnection RPC 'Listen' stream",
  "SafeAreaView has been deprecated",
  "Missing or insufficient permissions",
  "Could not query rentRequests",
]);
import { EmptyState } from "./components/EmptyState";
import { ExplorePage } from "./pages/ExplorePage";
import { MessagesPage } from "./pages/MessagesPage";
import { MyListingsPage } from "./pages/MyListingsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SavedPage } from "./pages/SavedPage";
import { seedListings } from "./data";
import { auth, db, firebaseConfigured } from "./firebase";
import { Listing, Tab } from "./types";
import { SupportChatButton, SupportChatModal } from "./features/support-chatbot";
import { RentBorrowModal, RentRequestsModal, deleteMarketplaceListing } from "./features/rent-borrow";
import { ConditionReviewsSection } from "./features/condition-rating";
import { ItemCondition, filterMarketplaceItems } from "./features/condition-filter";
import {
  VerifiedBadge,
  isUserUniversityVerified,
  isJaffnaEmail,
  JAFFNA_UNIVERSITY,
  saveUserUniversityVerification,
} from "./features/university-verification";

async function registerUser(user: User) {
  if (!db) return;
  await setDoc(
    doc(db, "users", user.uid),
    {
      uid: user.uid,
      displayName:
        user.displayName || user.email?.split("@")[0] || "Jaffna Student",
      email: user.email || "",
      photoURL: user.photoURL || null,
      campus: "University of Jaffna",
      universityVerified: true,
      universityName: "University of Jaffna",
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>("Explore");
  const [items, setItems] = useState(seedListings);
  const [queryText, setQueryText] = useState("");
  const [category, setCategory] = useState("All items");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [user, setUser] = useState<User | null>(auth?.currentUser || null);
  const [authOpen, setAuthOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [authError, setAuthError] = useState("");
  const [profileReady, setProfileReady] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [rentModalOpen, setRentModalOpen] = useState(false);
  const [rentRequestsOpen, setRentRequestsOpen] = useState(false);
  const [selectedCondition, setSelectedCondition] =
    useState<ItemCondition>("All conditions");
  const [deletedListingIds, setDeletedListingIds] = useState<string[]>([]);
  const deletedIdsRef = useRef<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem("@deleted_listing_ids")
      .then((stored) => {
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setDeletedListingIds(parsed);
              deletedIdsRef.current = parsed;
              setItems((current) => current.filter((it) => !parsed.includes(it.id)));
            }
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const googleClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    "337180260271-pich8meps4h51e1doh9thhp19snrmu73.apps.googleusercontent.com";

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: googleClientId,
    webClientId: googleClientId,
    scopes: ["profile", "email"],
    responseType: "id_token",
  });

  const handleGoogleIdToken = async (idToken: string) => {
    if (!auth) return;
    setAuthError("");
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const realUser = userCredential.user;
      const email = realUser.email || "";

      // Strict domain verification: only University of Jaffna emails are permitted
      if (!isJaffnaEmail(email)) {
        await signOut(auth);
        setUser(null);
        setProfileReady(false);
        setAuthError("Try with university email account");
        Alert.alert("Access Denied", "Try with university email account");
        return;
      }

      await saveUserUniversityVerification(
        realUser,
        JAFFNA_UNIVERSITY,
        email.split("@")[1] || "univ.jfn.ac.lk"
      );
      await registerUser(realUser);
      setUser(realUser);
      setProfileReady(true);
      setAuthOpen(false);
      setAuthError("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed.";
      setAuthError(msg);
      Alert.alert("Google Sign In", msg);
    }
  };

  useEffect(() => {
    if (response?.type === "success") {
      const idToken =
        response.params?.id_token || (response as any)?.authentication?.idToken;
      if (idToken) {
        handleGoogleIdToken(idToken);
      }
    } else if (response?.type === "error") {
      setAuthError(response.error?.message || "Google sign-in was not completed.");
    }
  }, [response]);

  useEffect(() => {
    const firebaseAuth = auth;
    if (!firebaseAuth) return;
    const handleUser = async (nextUser: User | null) => {
      if (nextUser) {
        const email = nextUser.email;
        // Verify only if an email is present on the user object
        if (email) {
          if (!isJaffnaEmail(email)) {
            await signOut(firebaseAuth);
            setUser(null);
            setProfileReady(false);
            setAuthError("Try with university email account");
            return;
          }

          saveUserUniversityVerification(
            nextUser,
            JAFFNA_UNIVERSITY,
            email.split("@")[1] || "univ.jfn.ac.lk"
          );
        }
        setUser(nextUser);
        setAuthError("");
        registerUser(nextUser)
          .then(() => setProfileReady(true))
          .catch((error) =>
            setAuthError(
              error instanceof Error
                ? error.message
                : "Could not create profile.",
            ),
          );
      } else {
        setUser(null);
        setProfileReady(false);
      }
    };
    const unsubscribe = onAuthStateChanged(firebaseAuth, (u) => {
      handleUser(u);
    });
    if (Platform.OS === "web") {
      setPersistence(firebaseAuth, browserLocalPersistence)
        .then(() => getRedirectResult(firebaseAuth))
        .then((result) => {
          if (result?.user) handleUser(result.user);
        })
        .catch(() => {});
    }
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!db) return;
    const listingsQuery = query(
      collection(db, "listings"),
      orderBy("createdAt", "desc"),
    );
    return onSnapshot(
      listingsQuery,
      (snapshot) => {
        const rawDocs = snapshot.empty
          ? seedListings
          : snapshot.docs.map(
              (entry) => ({ id: entry.id, ...entry.data() }) as Listing,
            );
        const filteredDocs = rawDocs.filter(
          (entry: any) =>
            !entry.isDeleted &&
            !entry.deleted &&
            entry.status !== "deleted" &&
            !deletedIdsRef.current.includes(entry.id)
        );
        setItems(filteredDocs);
      },
      () => {
        setItems(seedListings.filter((it) => !deletedIdsRef.current.includes(it.id)));
      },
    );
  }, []);

  const filteredItems = useMemo(
    () =>
      filterMarketplaceItems({
        items,
        category,
        condition: selectedCondition,
        query: queryText,
      }),
    [items, category, selectedCondition, queryText]
  );

  const handleListingUpdated = (listingId: string) => {
    setItems((current) =>
      current.map((item) =>
        item.id === listingId ? ({ ...item, isAvailable: false } as Listing) : item
      )
    );
  };

  const handleListingDeleted = (listingId: string) => {
    // 1. Immediately track in ref & persistent AsyncStorage
    const nextList = Array.from(new Set([...deletedIdsRef.current, listingId]));
    deletedIdsRef.current = nextList;
    setDeletedListingIds(nextList);
    AsyncStorage.setItem("@deleted_listing_ids", JSON.stringify(nextList)).catch(() => {});

    // 2. Immediately remove from active state
    setItems((current) => current.filter((x) => x.id !== listingId));
    if (selected?.id === listingId) {
      setSelected(null);
    }

    // 3. Delete / Soft-delete in Firestore
    deleteMarketplaceListing(listingId).catch((err) => {
      console.warn("deleteMarketplaceListing error:", err);
    });
  };
  const myListings = useMemo(() => {
    if (!user) return [];
    const uid = user.uid;
    const userEmail = (user.email || "").trim().toLowerCase();
    const userDisplayName = (user.displayName || user.email?.split("@")[0] || "").trim().toLowerCase();

    return items.filter((item) => {
      if (item.sellerId && item.sellerId === uid) return true;
      if (userEmail && item.sellerEmail && item.sellerEmail.trim().toLowerCase() === userEmail) return true;
      if (userDisplayName && item.seller && item.seller.trim().toLowerCase() === userDisplayName) return true;
      return false;
    });
  }, [items, user]);
  const toggleSaved = (id: string) =>
    setSavedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  const openAuth = () => {
    setAuthError("");
    setAuthOpen(true);
  };

  const signInWithGoogle = async (enteredEmail?: string) => {
    if (!auth) return;
    setAuthError("");

    // If manual Jaffna email was provided
    if (enteredEmail && enteredEmail.trim()) {
      const inputTrimmed = enteredEmail.trim().toLowerCase();

      // Strict domain verification: reject non-Jaffna domain immediately
      if (!isJaffnaEmail(inputTrimmed)) {
        setAuthError("Try with university email account");
        Alert.alert("Access Denied", "Try with university email account");
        return;
      }

      const resolvedEmail = inputTrimmed;
      const resolvedName = resolvedEmail.split("@")[0];

      try {
        const anonResult = await signInAnonymously(auth);
        const customUser = {
          ...anonResult.user,
          email: resolvedEmail,
          displayName: resolvedName,
        } as unknown as User;

        await saveUserUniversityVerification(
          customUser,
          JAFFNA_UNIVERSITY,
          resolvedEmail.split("@")[1] || "univ.jfn.ac.lk"
        );
        await registerUser(customUser);
        setUser(customUser);
        setProfileReady(true);
        setAuthOpen(false);
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to sign in";
        setAuthError(msg);
        return;
      }
    }

    // Real Google OAuth trigger
    try {
      if (Platform.OS === "web") {
        try {
          await setPersistence(auth, browserLocalPersistence);
        } catch {
          // Ignore persistence errors on unsupported web environments
        }
        const result = await signInWithPopup(auth, new GoogleAuthProvider());
        const email = result.user.email || "";

        // Check if the Google account belongs to University of Jaffna
        if (!isJaffnaEmail(email)) {
          await signOut(auth);
          setUser(null);
          setProfileReady(false);
          setAuthError("Try with university email account");
          Alert.alert("Access Denied", "Try with university email account");
          return;
        }

        await saveUserUniversityVerification(
          result.user,
          JAFFNA_UNIVERSITY,
          email.split("@")[1] || "univ.jfn.ac.lk"
        );
        await registerUser(result.user);
        setUser(result.user);
        setProfileReady(true);
        setAuthOpen(false);
      } else {
        // Mobile (Expo Go) Real Google OAuth prompt
        if (promptAsync) {
          const res = await promptAsync();
          if (res?.type === "success") {
            const token =
              res.params?.id_token || (res as any)?.authentication?.idToken;
            if (token) {
              await handleGoogleIdToken(token);
            }
          } else if (res?.type === "error") {
            setAuthError(
              res.error?.message || "Google sign-in was cancelled or encountered an error."
            );
          }
        }
      }
    } catch (error) {
      const code =
        error instanceof Error ? error.message : "Google sign-in failed.";
      if (
        Platform.OS === "web" &&
        /popup|cancelled-popup-request/i.test(code)
      ) {
        await signInWithRedirect(auth, new GoogleAuthProvider());
        return;
      }
      setAuthError(code);
    }
  };
  const publish = async (
    title: string,
    price: string,
    listingCategory: string,
    imageUrl?: string,
    itemCondition?: string,
  ) => {
    if (!user) {
      setSellOpen(false);
      openAuth();
      return;
    }
    const finalImage =
      imageUrl && imageUrl.trim().length > 0
        ? imageUrl.trim()
        : SAMPLE_SELL_IMAGES[0].url;

    const newListing: Listing = {
      id: "listing-" + Date.now(),
      title,
      price: Number(price) || 0,
      category: listingCategory || "Textbooks",
      seller: user.displayName || user.email?.split("@")[0] || "Jaffna Student",
      sellerId: user.uid,
      sellerEmail: user.email || "",
      campus: "University of Jaffna",
      condition: (itemCondition as any) || "Good condition",
      image: finalImage,
      description: "Listed by student on University of Jaffna Marketplace.",
      isAvailable: true,
      rentalStatus: "available",
    };

    if (db) {
      try {
        const docRef = await addDoc(collection(db, "listings"), {
          title: newListing.title,
          price: newListing.price,
          category: newListing.category,
          seller: newListing.seller,
          sellerId: newListing.sellerId,
          sellerEmail: newListing.sellerEmail,
          campus: newListing.campus,
          condition: newListing.condition,
          image: newListing.image,
          description: newListing.description,
          isAvailable: true,
          rentalStatus: "available",
          createdAt: serverTimestamp(),
        });
        newListing.id = docRef.id;
      } catch (e) {
        console.warn("Could not write to firestore, updating locally:", e);
      }
    }

    setItems((current) => [newListing, ...current]);
    setSellOpen(false);
  };
  const contactSeller = () => {
    if (!user) {
      openAuth();
      return;
    }
    setSelected(null);
    setTab("Messages");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      {tab === "Explore" && (
        <ExplorePage
          user={user}
          onSignIn={openAuth}
          items={filteredItems}
          query={queryText}
          category={category}
          selectedCondition={selectedCondition}
          savedIds={savedIds}
          onQueryChange={setQueryText}
          onCategoryChange={setCategory}
          onConditionChange={setSelectedCondition}
          onSave={toggleSaved}
          onOpen={setSelected}
          onProfile={() => setTab("Profile")}
          onOpenRentRequests={() => setRentRequestsOpen(true)}
          onOpenMyPosts={() => (user ? setTab("MyListings") : openAuth())}
        />
      )}
      {tab === "Saved" && (
        <SavedPage
          items={items.filter((item) => savedIds.includes(item.id))}
          onSave={toggleSaved}
          onOpen={setSelected}
        />
      )}
      {tab === "Messages" && (
        <MessagesPage
          user={user}
          onBrowse={() => setTab("Explore")}
          onListingUpdated={handleListingUpdated}
        />
      )}
      {tab === "MyListings" && (
        <MyListingsPage
          items={myListings}
          onOpen={setSelected}
          onSell={() => setSellOpen(true)}
          onDeleted={handleListingDeleted}
          onToggled={(id, nowAvailable) =>
            setItems((current) =>
              current.map((x) => (x.id === id ? { ...x, isAvailable: nowAvailable } : x))
            )
          }
        />
      )}
      {tab === "Profile" && (
        <ProfilePage
          user={user}
          savedCount={savedIds.length}
          listingCount={myListings.length}
          firebaseConfigured={firebaseConfigured}
          profileReady={profileReady}
          error={authError}
          onMyListings={() => (user ? setTab("MyListings") : openAuth())}
          onSaved={() => setTab("Saved")}
          onSignIn={openAuth}
          onSignOut={() => auth && signOut(auth)}
        />
      )}
      <BottomNav
        tab={tab}
        savedCount={savedIds.length}
        listingCount={myListings.length}
        onChange={setTab}
        onSell={() => setSellOpen(true)}
      />
      <ListingModal
        item={selected}
        user={user}
        onClose={() => setSelected(null)}
        onContact={contactSeller}
        onRentBorrow={() => setRentModalOpen(true)}
      />
      <RentBorrowModal
        visible={rentModalOpen}
        item={selected}
        currentUserId={user?.uid || null}
        currentUserName={user?.displayName || "Campus Student"}
        currentUserEmail={user?.email || undefined}
        onClose={() => setRentModalOpen(false)}
      />
      <RentRequestsModal
        visible={rentRequestsOpen}
        sellerId={user?.uid || null}
        sellerEmail={user?.email || null}
        sellerName={user?.displayName || user?.email?.split("@")[0] || null}
        onClose={() => setRentRequestsOpen(false)}
        onListingUpdated={handleListingUpdated}
      />
      <AuthModal
        visible={authOpen}
        onClose={() => setAuthOpen(false)}
        onSignIn={signInWithGoogle}
        error={authError}
      />
      <SellModal
        visible={sellOpen}
        onClose={() => setSellOpen(false)}
        onSubmit={publish}
      />
      <SupportChatButton onPress={() => setSupportOpen(true)} />
      <SupportChatModal
        visible={supportOpen}
        onClose={() => setSupportOpen(false)}
      />
    </SafeAreaView>
  );
}

function BottomNav({
  tab,
  savedCount,
  listingCount,
  onChange,
  onSell,
}: {
  tab: Tab;
  savedCount: number;
  listingCount: number;
  onChange: (tab: Tab) => void;
  onSell: () => void;
}) {
  return (
    <View style={styles.nav}>
      <NavItem
        label="Explore"
        icon="⌂"
        active={tab === "Explore"}
        onPress={() => onChange("Explore")}
      />
      <NavItem
        label="Saved"
        icon="♡"
        active={tab === "Saved"}
        badge={savedCount}
        onPress={() => onChange("Saved")}
      />
      <NavItem
        label="My Posts"
        icon="📦"
        active={tab === "MyListings"}
        badge={listingCount}
        onPress={() => onChange("MyListings")}
      />
      <NavItem
        label="Messages"
        icon="💬"
        active={tab === "Messages"}
        onPress={() => onChange("Messages")}
      />
      <Pressable style={styles.sellButton} onPress={onSell}>
        <Text style={styles.sellText}>+ Sell</Text>
      </Pressable>
    </View>
  );
}
function NavItem({
  label,
  icon,
  active,
  badge,
  onPress,
}: {
  label: string;
  icon: string;
  active: boolean;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.navItem} onPress={onPress}>
      <View style={styles.iconContainer}>
        <Text style={[styles.navIcon, active && styles.navActive]}>{icon}</Text>
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.navLabel, active && styles.navActiveText]}>{label}</Text>
      {active ? <View style={styles.activeBar} /> : <View style={styles.activeBarPlaceholder} />}
    </Pressable>
  );
}
function ListingModal({
  item,
  user,
  onClose,
  onContact,
  onRentBorrow,
}: {
  item: Listing | null;
  user: User | null;
  onClose: () => void;
  onContact: () => void;
  onRentBorrow: () => void;
}) {
  return (
    <Modal
      visible={item !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {item && (
        <View style={styles.backdrop}>
          <View style={styles.detail}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 28 }}
            >
              <Image source={{ uri: item.image }} style={styles.detailImage} />
              <Pressable style={styles.close} onPress={onClose}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
              <View style={styles.detailBody}>
                <Text style={styles.detailCategory}>
                  {item.category.toUpperCase()}
                </Text>
                <Text style={styles.detailTitle}>{item.title}</Text>
                <Text style={styles.detailPrice}>${item.price}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginVertical: 4 }}>
                  <Text style={styles.muted}>
                    {item.condition} · {item.campus} · {item.seller}
                  </Text>
                  <VerifiedBadge compact />
                </View>
                <Text style={styles.description}>{item.description}</Text>

                {/* Member 1: Rent or Borrow Action */}
                <Pressable
                  style={styles.rentBorrowBtn}
                  onPress={user ? onRentBorrow : onContact}
                >
                  <Text style={styles.rentBorrowBtnText}>
                    {user
                      ? "🤝 Request Rent or Borrow"
                      : "Sign in to rent or borrow"}
                  </Text>
                </Pressable>

                {/* Message Seller Action */}
                <Pressable style={styles.primary} onPress={onContact}>
                  <Text style={styles.primaryText}>
                    {user
                      ? `Message ${item.seller}`
                      : "Sign in to contact seller"}
                  </Text>
                </Pressable>

                {/* Member 3: Buyer-Verified Condition Rating */}
                <ConditionReviewsSection
                  listingId={item.id}
                  listingTitle={item.title}
                  currentUserName={user?.displayName || "Campus Student"}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </Modal>
  );
}
function AuthModal({
  visible,
  onClose,
  onSignIn,
  error,
}: {
  visible: boolean;
  onClose: () => void;
  onSignIn: (email?: string) => Promise<void>;
  error: string;
}) {
  const [manualOpen, setManualOpen] = useState(false);
  const [manualEmail, setManualEmail] = useState("");

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.authDialog}>
          {/* Header */}
          <View style={styles.googleDialogHeader}>
            <Text style={styles.googleMarkBig}>G</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.googleDialogTitle}>University of Jaffna</Text>
              <Text style={styles.googleDialogSubtitle}>
                Sign in with your official university Google account
              </Text>
            </View>
          </View>

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorAlertPill}>
              <Text style={styles.errorAlertText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {/* Real Google Account Sign-In Button */}
          <Pressable
            style={styles.realGoogleButton}
            onPress={() => onSignIn()}
          >
            <Text style={styles.googleMarkButton}>G</Text>
            <Text style={styles.realGoogleButtonText}>Continue with Google</Text>
          </Pressable>

          {/* Or Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Alternative direct entry */}
          {!manualOpen ? (
            <Pressable
              style={styles.manualToggleBtn}
              onPress={() => setManualOpen(true)}
            >
              <Text style={styles.manualToggleText}>
                ✍️ Enter Jaffna Student Email (@univ.jfn.ac.lk)
              </Text>
            </Pressable>
          ) : (
            <View style={styles.manualInputWrapper}>
              <Text style={styles.manualInputLabel}>University Google Email:</Text>
              <TextInput
                value={manualEmail}
                onChangeText={setManualEmail}
                placeholder="e.g. 2023csc068@univ.jfn.ac.lk"
                placeholderTextColor="#8C9C92"
                style={styles.manualInputField}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Pressable
                style={styles.manualSubmitBtn}
                onPress={() => manualEmail.trim() && onSignIn(manualEmail.trim())}
              >
                <Text style={styles.manualSubmitText}>Verify & Sign In</Text>
              </Pressable>
            </View>
          )}

          <Pressable style={styles.cancelOutline} onPress={onClose}>
            <Text style={styles.cancelOutlineText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
const SAMPLE_SELL_IMAGES = [
  { label: "📚 Book", url: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800" },
  { label: "💻 Tech", url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800" },
  { label: "🪑 Desk", url: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800" },
  { label: "👕 Fashion", url: "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=800" },
  { label: "🎒 Backpack", url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800" },
];

function SellModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (
    title: string,
    price: string,
    category: string,
    imageUrl?: string,
    condition?: string,
  ) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Textbooks");
  const [condition, setCondition] = useState("Good condition");
  const [imageUrl, setImageUrl] = useState(SAMPLE_SELL_IMAGES[0].url);
  const [submitting, setSubmitting] = useState(false);

  const handleTakeWithCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Camera Permission",
          "Please grant camera access to take a picture of your item."
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          setImageUrl(`data:image/jpeg;base64,${asset.base64}`);
        } else {
          setImageUrl(asset.uri);
        }
      }
    } catch {
      Alert.alert("Camera Error", "Could not open camera.");
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Gallery Permission",
          "Please grant photo library access to upload a picture of your item."
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          setImageUrl(`data:image/jpeg;base64,${asset.base64}`);
        } else {
          setImageUrl(asset.uri);
        }
      }
    } catch {
      Alert.alert("Gallery Error", "Could not choose photo from gallery.");
    }
  };

  const handleSubmit = async () => {
    if (!title || !price || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(title, price, category, imageUrl, condition);
      setTitle("");
      setPrice("");
      setImageUrl(SAMPLE_SELL_IMAGES[0].url);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={[styles.form, { maxHeight: "90%" }]}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Sell an item</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <Text style={styles.label}>What are you selling?</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Calculus: Early Transcendentals"
              style={styles.field}
            />

            <Text style={styles.label}>Price ($)</Text>
            <TextInput
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              placeholder="$ 0"
              style={styles.field}
            />

            <Text style={styles.label}>Category</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {["Textbooks", "Furniture", "Tech", "Fashion"].map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 16,
                    backgroundColor: category === cat ? "#103C31" : "#E2EFE7",
                  }}
                >
                  <Text
                    style={{
                      color: category === cat ? "#FFF" : "#163C30",
                      fontWeight: "700",
                      fontSize: 12,
                    }}
                  >
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Condition</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {["Brand new", "Like new", "Good condition", "Fair condition"].map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setCondition(c)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 16,
                    backgroundColor: condition === c ? "#103C31" : "#E2EFE7",
                  }}
                >
                  <Text
                    style={{
                      color: condition === c ? "#FFF" : "#163C30",
                      fontWeight: "700",
                      fontSize: 12,
                    }}
                  >
                    {c}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Item Photo</Text>
            {/* Take Photo and Upload from Gallery Buttons */}
            <View style={styles.photoActionsRow}>
              <Pressable style={styles.photoActionBtn} onPress={handleTakeWithCamera}>
                <Text style={styles.photoActionIcon}>📷</Text>
                <Text style={styles.photoActionText}>Take Photo</Text>
              </Pressable>
              <Pressable style={styles.photoActionBtn} onPress={handlePickFromGallery}>
                <Text style={styles.photoActionIcon}>🖼️</Text>
                <Text style={styles.photoActionText}>Upload Gallery</Text>
              </Pressable>
            </View>

            {/* Selected Image Preview Box */}
            {imageUrl ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.imagePreview}
                />
                <View style={styles.imagePreviewMeta}>
                  <Text style={styles.imagePreviewStatus}>✓ Photo selected</Text>
                  <Text style={styles.imagePreviewSubtext}>Ready to show on campus marketplace</Text>
                  <Pressable
                    style={styles.removePhotoBtn}
                    onPress={() => setImageUrl("")}
                  >
                    <Text style={styles.removePhotoText}>✕ Change photo</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {/* Quick Sample Presets */}
            <View style={{ marginTop: 6, marginBottom: 8 }}>
              <Text style={{ fontSize: 11, color: "#66736D", marginBottom: 5 }}>
                Or select a sample icon:
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
                {SAMPLE_SELL_IMAGES.map((img) => (
                  <Pressable
                    key={img.label}
                    onPress={() => setImageUrl(img.url)}
                    style={{
                      paddingHorizontal: 9,
                      paddingVertical: 5,
                      borderRadius: 12,
                      backgroundColor: imageUrl === img.url ? "#D2EBE0" : "#F0F4F1",
                      borderWidth: 1,
                      borderColor: imageUrl === img.url ? "#103C31" : "#E0E6E2",
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#103C31" }}>
                      {img.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              disabled={!title || !price || submitting}
              style={[
                styles.primary,
                (!title || !price || submitting) && styles.disabled,
                { marginTop: 18 },
              ]}
              onPress={handleSubmit}
            >
              <Text style={styles.primaryText}>
                {submitting ? "Publishing..." : "Publish listing"}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAF4" },
  nav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === "android" ? 104 : 84,
    paddingTop: 8,
    paddingBottom: Platform.OS === "android" ? 38 : 14,
    backgroundColor: "#FDFEF9",
    borderTopWidth: 1,
    borderTopColor: "#EBF1EC",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 10,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 48,
    paddingTop: 2,
  },
  iconContainer: {
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  navIcon: {
    color: "#6D8177",
    fontSize: 21,
  },
  navLabel: {
    color: "#6D8177",
    fontSize: 10.5,
    fontWeight: "600",
    marginTop: 2,
  },
  navActive: {
    color: "#103C31",
  },
  navActiveText: {
    color: "#103C31",
    fontWeight: "800",
  },
  activeBar: {
    width: 22,
    height: 3,
    backgroundColor: "#103C31",
    borderRadius: 2,
    marginTop: 4,
  },
  activeBarPlaceholder: {
    width: 22,
    height: 3,
    marginTop: 4,
  },
  badge: {
    position: "absolute",
    right: -10,
    top: -3,
    backgroundColor: "#C3535B",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#FFF",
    fontSize: 9,
    fontWeight: "800",
  },
  sellButton: {
    height: 36,
    borderRadius: 18,
    backgroundColor: "#D6F1E4",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  sellText: {
    color: "#103C31",
    fontWeight: "800",
    fontSize: 13.5,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,40,33,.45)",
    justifyContent: "flex-end",
  },
  detail: {
    maxHeight: "88%",
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  detailImage: { width: "100%", height: 230 },
  close: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { color: "#173C34", fontSize: 26 },
  detailBody: { padding: 24 },
  detailCategory: {
    color: "#23775D",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  detailTitle: {
    color: "#173C34",
    fontSize: 25,
    fontWeight: "800",
    marginTop: 8,
  },
  detailPrice: {
    color: "#1C7057",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 8,
  },
  muted: { color: "#87918C", fontSize: 12 },
  description: {
    color: "#66736D",
    fontSize: 14,
    lineHeight: 21,
    marginVertical: 20,
  },
  rentBorrowBtn: {
    height: 50,
    backgroundColor: "#E2F0EA",
    borderWidth: 1.5,
    borderColor: "#1C7057",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  rentBorrowBtnText: {
    color: "#1C7057",
    fontWeight: "800",
    fontSize: 14,
  },
  primary: {
    height: 50,
    backgroundColor: "#1F5D4C",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  primaryText: { color: "#FFF", fontWeight: "800" },
  authDialog: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: Platform.OS === "android" ? 38 : 26,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 12,
  },
  googleDialogHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF3F0",
  },
  googleMarkBig: {
    fontSize: 26,
    fontWeight: "900",
    color: "#4285F4",
  },
  googleDialogTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#173C34",
  },
  googleDialogSubtitle: {
    fontSize: 12,
    color: "#6D8177",
    marginTop: 2,
  },
  errorAlertPill: {
    backgroundColor: "#FBECEE",
    borderWidth: 1,
    borderColor: "#F3C8CD",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 14,
  },
  errorAlertText: {
    color: "#B64950",
    fontSize: 12.5,
    fontWeight: "700",
  },
  realGoogleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#103C31",
    height: 52,
    borderRadius: 16,
    marginTop: 18,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  googleMarkButton: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "900",
  },
  realGoogleButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 14,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E4EDE7",
  },
  dividerText: {
    color: "#8B9E93",
    fontSize: 12,
    fontWeight: "600",
  },
  manualToggleBtn: {
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F7F4",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D6E5DC",
  },
  manualToggleText: {
    color: "#164E3F",
    fontSize: 12.5,
    fontWeight: "700",
  },
  manualInputWrapper: {
    gap: 8,
  },
  manualInputLabel: {
    color: "#173C34",
    fontSize: 12,
    fontWeight: "700",
  },
  manualInputField: {
    height: 46,
    borderWidth: 1,
    borderColor: "#C5D8CD",
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 13,
    color: "#173C34",
    backgroundColor: "#FFF",
  },
  manualSubmitBtn: {
    height: 44,
    backgroundColor: "#185A46",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  manualSubmitText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "800",
  },
  cancelOutline: {
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  cancelOutlineText: {
    color: "#6D8177",
    fontSize: 13,
    fontWeight: "700",
  },
  googleMark: { color: "#4285F4", fontSize: 18, fontWeight: "800" },
  outline: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BCD0C3",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  outlineText: { color: "#1F5D4C", fontWeight: "800" },
  label: {
    color: "#365B4C",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 18,
    marginBottom: 7,
  },
  field: {
    height: 50,
    borderWidth: 1,
    borderColor: "#DDE4DC",
    borderRadius: 12,
    paddingHorizontal: 14,
    color: "#173C34",
  },
  form: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  formTitle: { color: "#173C34", fontSize: 22, fontWeight: "800" },
  disabled: { opacity: 0.45 },
  photoActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F6F2",
    borderWidth: 1.5,
    borderColor: "#C5DED0",
    borderStyle: "dashed",
    borderRadius: 14,
    paddingVertical: 12,
    gap: 6,
  },
  photoActionIcon: {
    fontSize: 16,
  },
  photoActionText: {
    color: "#124235",
    fontWeight: "700",
    fontSize: 12.5,
  },
  imagePreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F4F8F5",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#DCEAE1",
    marginTop: 4,
    marginBottom: 8,
  },
  imagePreview: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: "#E2EBE5",
  },
  imagePreviewMeta: {
    flex: 1,
  },
  imagePreviewStatus: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#166848",
  },
  imagePreviewSubtext: {
    fontSize: 11,
    color: "#6D8177",
    marginTop: 2,
    marginBottom: 6,
  },
  removePhotoBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#FDF0F0",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F7CECE",
  },
  removePhotoText: {
    color: "#B4232C",
    fontSize: 11,
    fontWeight: "700",
  },
});
