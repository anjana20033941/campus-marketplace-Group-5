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
import safeStorage from "./utils/safeStorage";
import { extractGoogleProfile } from "./utils/googleAuth";
import { authenticateStudentWithPassword } from "./services/studentAuthService";
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
import {
  RentBorrowModal,
  RentRequestsModal,
  deleteMarketplaceListing,
  subscribeToIncomingRentRequests,
} from "./features/rent-borrow";
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
    safeStorage.getItem("@deleted_listing_ids")
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

  const [incomingRequestsCount, setIncomingRequestsCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setIncomingRequestsCount(0);
      return;
    }
    const unsub = subscribeToIncomingRentRequests(
      {
        sellerId: user.uid,
        sellerEmail: user.email,
        sellerName: user.displayName || user.email?.split("@")[0],
      },
      (reqs) => {
        const pendingCount = reqs.filter((r) => r.status === "pending").length;
        setIncomingRequestsCount(pendingCount);
      }
    );
    return () => unsub();
  }, [user]);

  const googleClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    "337180260271-pich8meps4h51e1doh9thhp19snrmu73.apps.googleusercontent.com";

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: googleClientId,
    webClientId: googleClientId,
    scopes: ["openid", "profile", "email"],
    extraParams: {
      prompt: "select_account",
    },
  });

  const isAuthProcessingRef = useRef(false);

  const handleGoogleAuthResponse = async (authResult: any) => {
    if (!authResult || isAuthProcessingRef.current) return;
    isAuthProcessingRef.current = true;
    setAuthError("");

    try {
      const profile = await extractGoogleProfile(authResult);
      const email = (profile?.email || "").trim().toLowerCase();
      const idToken = profile?.idToken;

      // 1. Strict domain verification: only University of Jaffna emails are permitted
      if (email && !isJaffnaEmail(email)) {
        if (auth) await signOut(auth);
        setUser(null);
        setProfileReady(false);
        setAuthError("Try with university email account");
        Alert.alert("Access Denied", "Try with university email account");
        return;
      }

      // 2. Try Firebase signInWithCredential if idToken is available
      let firebaseUser: User | null = null;
      if (auth && idToken) {
        try {
          const credential = GoogleAuthProvider.credential(idToken);
          const userCredential = await signInWithCredential(auth, credential);
          firebaseUser = userCredential.user;
        } catch (credErr) {
          console.warn("[GoogleAuth] Firebase credential verification bypassed:", credErr);
        }
      }

      // 3. Resolve student email and details
      const resolvedEmail = (firebaseUser?.email || email).trim().toLowerCase();
      if (!resolvedEmail) {
        throw new Error("Could not retrieve email from Google account. Please use the direct email entry below.");
      }

      if (!isJaffnaEmail(resolvedEmail)) {
        if (auth) await signOut(auth);
        setUser(null);
        setProfileReady(false);
        setAuthError("Try with university email account");
        Alert.alert("Access Denied", "Try with university email account");
        return;
      }

      const resolvedDisplayName =
        firebaseUser?.displayName ||
        profile?.name ||
        resolvedEmail.split("@")[0];
      const resolvedPhoto = firebaseUser?.photoURL || profile?.picture || null;

      // 4. Ensure an active Firebase user session exists
      let finalUser: User = firebaseUser as User;
      if (!finalUser) {
        let anonUser = auth?.currentUser;
        if (!anonUser && auth) {
          try {
            const anonRes = await signInAnonymously(auth);
            anonUser = anonRes.user;
          } catch (e) {
            console.warn("[GoogleAuth] Anonymous fallback warning:", e);
          }
        }
        finalUser = {
          ...(anonUser || {
            uid: profile?.sub ? `google_${profile.sub}` : `jfn_${resolvedEmail.split("@")[0]}`,
          }),
          email: resolvedEmail,
          displayName: resolvedDisplayName,
          photoURL: resolvedPhoto,
        } as unknown as User;
      }

      // 5. Save university verification and register student
      try {
        await saveUserUniversityVerification(
          finalUser,
          JAFFNA_UNIVERSITY,
          resolvedEmail.split("@")[1] || "univ.jfn.ac.lk"
        );
        await registerUser(finalUser);
      } catch (dbErr) {
        console.warn("[GoogleAuth] Registration warning:", dbErr);
      }

      await safeStorage.setItem(
        "@campus_user_session",
        JSON.stringify({
          email: resolvedEmail,
          displayName: resolvedDisplayName,
          uid: finalUser.uid,
          photoURL: resolvedPhoto,
        })
      );

      setUser(finalUser);
      setProfileReady(true);
      setAuthOpen(false);
      setAuthError("");
    } catch (err) {
      console.error("[GoogleAuth] handleGoogleAuthResponse error:", err);
      const msg = err instanceof Error ? err.message : "Authentication failed.";
      setAuthError(msg);
      Alert.alert("Google Sign In", msg);
    } finally {
      isAuthProcessingRef.current = false;
    }
  };

  useEffect(() => {
    if (response?.type === "success") {
      handleGoogleAuthResponse(response);
    } else if (response?.type === "error") {
      setAuthError(response.error?.message || "Google sign-in was not completed.");
    }
  }, [response]);

  useEffect(() => {
    const firebaseAuth = auth;
    if (!firebaseAuth) return;
    const handleUser = async (nextUser: User | null) => {
      if (nextUser) {
        let email = nextUser.email || "";
        let displayName = nextUser.displayName || "";

        // If email or displayName is missing (e.g. from anonymous auth or reload), restore from session cache
        if (!email) {
          try {
            const savedRaw = await safeStorage.getItem("@campus_user_session");
            if (savedRaw) {
              const saved = JSON.parse(savedRaw);
              if (saved?.email) {
                email = saved.email;
                displayName = displayName || saved.displayName || email.split("@")[0];
              }
            }
          } catch {}
        }

        const enrichedUser = {
          ...nextUser,
          email: email || nextUser.email,
          displayName: displayName || nextUser.displayName || (email ? email.split("@")[0] : "Jaffna Student"),
        } as unknown as User;

        if (email) {
          if (!isJaffnaEmail(email)) {
            await signOut(firebaseAuth);
            await safeStorage.removeItem("@campus_user_session");
            setUser(null);
            setProfileReady(false);
            setAuthError("Try with university email account");
            return;
          }

          saveUserUniversityVerification(
            enrichedUser,
            JAFFNA_UNIVERSITY,
            email.split("@")[1] || "univ.jfn.ac.lk"
          );
        }

        setUser(enrichedUser);
        setAuthError("");
        registerUser(enrichedUser)
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
    // 1. Immediately track in ref & persistent safeStorage
    const nextList = Array.from(new Set([...deletedIdsRef.current, listingId]));
    deletedIdsRef.current = nextList;
    setDeletedListingIds(nextList);
    safeStorage.setItem("@deleted_listing_ids", JSON.stringify(nextList)).catch(() => {});

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

  const handleStudentPasswordAuth = async (
    email: string,
    pass: string,
    isRegister: boolean
  ) => {
    setAuthError("");
    const res = await authenticateStudentWithPassword(email, pass, isRegister);
    if (!res.success || !res.user) {
      setAuthError(res.error || "Authentication failed.");
      return;
    }

    const student = res.user;

    // Ensure Firebase user session exists for Firestore security rules
    let activeUser = auth?.currentUser;
    if (!activeUser && auth) {
      try {
        const anon = await signInAnonymously(auth);
        activeUser = anon.user;
      } catch (err) {
        console.warn("signInAnonymously warning:", err);
      }
    }

    const finalUser = {
      ...(activeUser || { uid: student.uid }),
      email: student.email,
      displayName: student.displayName,
    } as unknown as User;

    try {
      await saveUserUniversityVerification(
        finalUser,
        JAFFNA_UNIVERSITY,
        student.email.split("@")[1] || "univ.jfn.ac.lk"
      );
      await registerUser(finalUser);
    } catch (e) {
      console.warn("User register warning:", e);
    }

    await safeStorage.setItem(
      "@campus_user_session",
      JSON.stringify({
        email: student.email,
        displayName: student.displayName,
        uid: finalUser.uid,
      })
    );

    setUser(finalUser);
    setProfileReady(true);
    setAuthOpen(false);
    setAuthError("");
  };

  const signInWithGoogle = async () => {
    if (!auth) return;
    setAuthError("");

    // Real Google OAuth trigger with university password verification
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
        await safeStorage.setItem(
          "@campus_user_session",
          JSON.stringify({
            email: result.user.email,
            displayName: result.user.displayName || result.user.email?.split("@")[0],
            uid: result.user.uid,
          })
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
            await handleGoogleAuthResponse(res);
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

  const handleSignOut = async () => {
    try {
      await safeStorage.removeItem("@campus_user_session");
      if (auth) await signOut(auth);
      setUser(null);
      setProfileReady(false);
    } catch (e) {
      console.warn("Sign out error:", e);
    }
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
          incomingRentCount={incomingRequestsCount}
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
          onSignOut={handleSignOut}
        />
      )}
      <BottomNav
        tab={tab}
        savedCount={savedIds.length}
        listingCount={myListings.length}
        incomingRequestsCount={incomingRequestsCount}
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
        onSignInWithPassword={handleStudentPasswordAuth}
        onSignInWithGoogle={signInWithGoogle}
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
  incomingRequestsCount,
  onChange,
  onSell,
}: {
  tab: Tab;
  savedCount: number;
  listingCount: number;
  incomingRequestsCount?: number;
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
        badge={incomingRequestsCount && incomingRequestsCount > 0 ? incomingRequestsCount : undefined}
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
  const isOwner = Boolean(
    user &&
    item && (
      (user.uid && item.sellerId && user.uid === item.sellerId) ||
      (user.email && item.sellerEmail && user.email.trim().toLowerCase() === item.sellerEmail.trim().toLowerCase()) ||
      (user.displayName && item.seller && user.displayName.trim().toLowerCase() === item.seller.trim().toLowerCase()) ||
      (user.email && item.seller && user.email.split("@")[0].toLowerCase() === item.seller.trim().toLowerCase()) ||
      (user.email && item.sellerEmail && user.email.split("@")[0].toLowerCase() === item.sellerEmail.split("@")[0].toLowerCase())
    )
  );

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

                {/* Actions: Disabled for own listing, active for others */}
                {isOwner ? (
                  <View style={styles.ownListingBanner}>
                    <Text style={styles.ownListingBadge}>📦 Your Post</Text>
                    <Text style={styles.ownListingText}>
                      You posted this item. You cannot request to rent or borrow your own item.
                    </Text>
                  </View>
                ) : (
                  <>
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
                  </>
                )}

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
  onSignInWithPassword,
  onSignInWithGoogle,
  error,
}: {
  visible: boolean;
  onClose: () => void;
  onSignInWithPassword: (
    email: string,
    pass: string,
    isRegister: boolean
  ) => Promise<void>;
  onSignInWithGoogle: () => Promise<void>;
  error: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      return;
    }
    setSubmitting(true);
    try {
      await onSignInWithPassword(email.trim(), password.trim(), isRegister);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.authDialog}>
          {/* Header */}
          <View style={styles.googleDialogHeader}>
            <Text style={styles.googleMarkBig}>🎓</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.googleDialogTitle}>University of Jaffna</Text>
              <Text style={styles.googleDialogSubtitle}>
                Protected Student Marketplace Login
              </Text>
            </View>
          </View>

          {/* Mode Switcher */}
          <View style={styles.authTabRow}>
            <Pressable
              style={[styles.authTabBtn, !isRegister && styles.authTabBtnActive]}
              onPress={() => setIsRegister(false)}
            >
              <Text style={[styles.authTabBtnText, !isRegister && styles.authTabBtnTextActive]}>
                Sign In
              </Text>
            </Pressable>
            <Pressable
              style={[styles.authTabBtn, isRegister && styles.authTabBtnActive]}
              onPress={() => setIsRegister(true)}
            >
              <Text style={[styles.authTabBtnText, isRegister && styles.authTabBtnTextActive]}>
                Set Password
              </Text>
            </Pressable>
          </View>

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorAlertPill}>
              <Text style={styles.errorAlertText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {/* Email input */}
          <View style={styles.authFieldGroup}>
            <Text style={styles.authFieldLabel}>University Email:</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="e.g. 2023csc051@univ.jfn.ac.lk"
              placeholderTextColor="#8C9C92"
              style={styles.authTextInput}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password input */}
          <View style={styles.authFieldGroup}>
            <Text style={styles.authFieldLabel}>
              {isRegister ? "Create Account Password (min 6 chars):" : "Account Password:"}
            </Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={isRegister ? "Create a secret password" : "Enter your account password"}
                placeholderTextColor="#8C9C92"
                style={styles.passwordInputField}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                style={styles.showPassBtn}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.showPassIcon}>{showPassword ? "👁️" : "🙈"}</Text>
              </Pressable>
            </View>
          </View>

          {/* Submit Button */}
          <Pressable
            style={[styles.authSubmitButton, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.authSubmitButtonText}>
              {submitting
                ? "Verifying..."
                : isRegister
                ? "✨ Set Password & Register"
                : "🔒 Sign In with Password"}
            </Text>
          </Pressable>

          <View style={styles.authSecurityFootnote}>
            <Text style={styles.authSecurityFootnoteText}>
              🛡️ Password-protected. Nobody can sign into your account without your password.
            </Text>
          </View>

          {/* Or Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Account Sign-In Button */}
          <Pressable
            style={styles.googleOutlineButton}
            onPress={onSignInWithGoogle}
          >
            <Text style={styles.googleMarkButtonDark}>G</Text>
            <Text style={styles.googleOutlineButtonText}>Continue with Google</Text>
          </Pressable>

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
  ownListingBanner: {
    backgroundColor: "#F2F8F5",
    borderWidth: 1,
    borderColor: "#CCE5DA",
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    alignItems: "center",
  },
  ownListingBadge: {
    color: "#165943",
    fontWeight: "800",
    fontSize: 14,
    marginBottom: 4,
  },
  ownListingText: {
    color: "#4A6B5F",
    fontSize: 12.5,
    textAlign: "center",
    lineHeight: 17,
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
  authTabRow: {
    flexDirection: "row",
    backgroundColor: "#EDF4F0",
    borderRadius: 12,
    padding: 3,
    marginTop: 14,
    marginBottom: 8,
  },
  authTabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  authTabBtnActive: {
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  authTabBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#6D8177",
  },
  authTabBtnTextActive: {
    color: "#103C31",
    fontWeight: "800",
  },
  authFieldGroup: {
    marginTop: 8,
    gap: 4,
  },
  authFieldLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#1C4E40",
  },
  authTextInput: {
    height: 42,
    borderWidth: 1,
    borderColor: "#CCE0D5",
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 13,
    color: "#103C31",
    backgroundColor: "#F8FAF8",
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CCE0D5",
    borderRadius: 12,
    backgroundColor: "#F8FAF8",
    height: 42,
    paddingLeft: 12,
  },
  passwordInputField: {
    flex: 1,
    height: 42,
    fontSize: 13,
    color: "#103C31",
  },
  showPassBtn: {
    paddingHorizontal: 12,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
  },
  showPassIcon: {
    fontSize: 14,
  },
  authSubmitButton: {
    height: 46,
    backgroundColor: "#103C31",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  authSubmitButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "800",
  },
  authSecurityFootnote: {
    marginTop: 6,
    alignItems: "center",
  },
  authSecurityFootnoteText: {
    fontSize: 10.5,
    color: "#617A6F",
    textAlign: "center",
    lineHeight: 14,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E4EDE7",
  },
  dividerText: {
    color: "#8B9E93",
    fontSize: 11,
    fontWeight: "600",
  },
  googleOutlineButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#D2E2D8",
    height: 44,
    borderRadius: 14,
    gap: 10,
  },
  googleMarkButtonDark: {
    color: "#4285F4",
    fontSize: 18,
    fontWeight: "900",
  },
  googleOutlineButtonText: {
    color: "#164438",
    fontSize: 13.5,
    fontWeight: "700",
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
