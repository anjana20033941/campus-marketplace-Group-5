import { useState } from "react";
import { User } from "firebase/auth";
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
  getActiveUniversities,
  saveUserUniversityVerification,
  verifyGoogleAccountUniversity,
} from "../services/universityVerificationService";
import { University, VerificationResult } from "../types";

export function UniversitySelectionModal({
  visible,
  user,
  onVerified,
  onSwitchAccount,
  onClose,
}: {
  visible: boolean;
  user: User | null;
  onVerified: (university: University) => void;
  onSwitchAccount?: () => void;
  onClose?: () => void;
}) {
  const [selectedUnivId, setSelectedUnivId] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const universities = getActiveUniversities();
  const userEmail = user?.email || "";

  const handleVerify = async (univ: University) => {
    setSelectedUnivId(univ.id);
    setLoading(true);

    const effectiveEmail =
      userEmail && userEmail.includes("@")
        ? userEmail
        : `student@${univ.emailDomains[0]}`;

    const verification = verifyGoogleAccountUniversity(effectiveEmail, univ.id);
    setResult(verification);

    if (verification.success && verification.university && user) {
      await saveUserUniversityVerification(
        user,
        verification.university,
        verification.matchedDomain || ""
      );
    }
    setLoading(false);
  };

  const handleContinueToMarketplace = () => {
    if (result?.success && result.university) {
      onVerified(result.university);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.badgeTop}>CAMPUS VERIFICATION</Text>
            <Text style={styles.title}>Select Your University</Text>
            <Text style={styles.subtitle}>
              Campus Marketplace is an exclusive, verified student ecosystem.
            </Text>
          </View>

          {/* User Email Info Card */}
          <View style={styles.emailCard}>
            <Text style={styles.emailLabel}>Authenticated Google Account:</Text>
            <Text style={styles.emailValue}>{userEmail || "Signed in with Google"}</Text>
          </View>

          {/* Success State */}
          {result?.success ? (
            <View style={styles.successBox}>
              <Text style={styles.successIcon}>🎉</Text>
              <Text style={styles.successTitle}>You're Verified!</Text>
              <View style={styles.verifiedPill}>
                <Text style={styles.verifiedPillText}>
                  🟢 {result.university?.name} Verified
                </Text>
              </View>
              <Text style={styles.successMessage}>
                Your email domain matches {result.university?.name}. You now have full access to browse, trade, sell, and rent on campus!
              </Text>
              <Pressable
                style={styles.primaryBtn}
                onPress={handleContinueToMarketplace}
              >
                <Text style={styles.primaryBtnText}>Enter Campus Marketplace →</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Error Message for Mismatch */}
              {result && !result.success && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorTitle}>❌ Verification Failed</Text>
                  <Text style={styles.errorMessage}>{result.errorMessage}</Text>
                  <Text style={styles.errorHelp}>
                    Please select your actual institution or sign in with your official university Google account.
                  </Text>
                </View>
              )}

              {/* Universities List */}
              <Text style={styles.listHeading}>Select your institution:</Text>
              <FlatList
                data={universities}
                keyExtractor={(item) => item.id}
                style={styles.univList}
                renderItem={({ item }) => {
                  const isSelected = selectedUnivId === item.id;
                  return (
                    <Pressable
                      style={[
                        styles.univCard,
                        isSelected && styles.univCardSelected,
                      ]}
                      onPress={() => handleVerify(item)}
                      disabled={loading}
                    >
                      <Text style={styles.univLogo}>{item.logo}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.univName}>{item.name}</Text>
                        <Text style={styles.univDomains}>
                          {item.emailDomains.map((d) => `@${d}`).join(", ")}
                        </Text>
                      </View>
                      {isSelected && loading ? (
                        <ActivityIndicator color="#1C7057" />
                      ) : (
                        <Text style={styles.arrowIcon}>›</Text>
                      )}
                    </Pressable>
                  );
                }}
              />

              {/* Switch Account or Cancel */}
              <View style={styles.footerActions}>
                {onSwitchAccount && (
                  <Pressable style={styles.switchBtn} onPress={onSwitchAccount}>
                    <Text style={styles.switchBtnText}>Sign in with a different account</Text>
                  </Pressable>
                )}
                {onClose && (
                  <Pressable style={styles.cancelBtn} onPress={onClose}>
                    <Text style={styles.cancelBtnText}>Dismiss</Text>
                  </Pressable>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  content: {
    maxHeight: "90%",
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 36,
  },
  header: {
    marginBottom: 12,
  },
  badgeTop: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1C7057",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#183931",
  },
  subtitle: {
    fontSize: 13,
    color: "#72847D",
    marginTop: 4,
  },
  emailCard: {
    backgroundColor: "#F2F7F4",
    borderWidth: 1,
    borderColor: "#D3E4DB",
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
  },
  emailLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1C7057",
    marginBottom: 2,
  },
  emailValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1D3B33",
  },
  listHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4C6057",
    marginTop: 6,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  univList: {
    maxHeight: 260,
  },
  univCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FBF9",
    borderWidth: 1,
    borderColor: "#E5ECE8",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  univCardSelected: {
    borderColor: "#1C7057",
    backgroundColor: "#EEF8F3",
  },
  univLogo: {
    fontSize: 24,
  },
  univName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A362F",
  },
  univDomains: {
    fontSize: 11,
    color: "#6D8078",
    marginTop: 2,
  },
  arrowIcon: {
    fontSize: 20,
    color: "#8FA39A",
  },
  errorBox: {
    backgroundColor: "#FDF2F2",
    borderWidth: 1,
    borderColor: "#F5C6CB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#C0392B",
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 12,
    color: "#992D22",
    lineHeight: 17,
  },
  errorHelp: {
    fontSize: 11,
    color: "#B03A2E",
    marginTop: 6,
    fontStyle: "italic",
  },
  successBox: {
    alignItems: "center",
    paddingVertical: 24,
  },
  successIcon: {
    fontSize: 50,
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1C7057",
  },
  verifiedPill: {
    backgroundColor: "#E4F7ED",
    borderWidth: 1,
    borderColor: "#B8EAD1",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginVertical: 12,
  },
  verifiedPillText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#16654E",
  },
  successMessage: {
    fontSize: 13,
    color: "#556B62",
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  primaryBtn: {
    backgroundColor: "#1C7057",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    width: "100%",
  },
  primaryBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
  footerActions: {
    marginTop: 10,
    gap: 8,
  },
  switchBtn: {
    paddingVertical: 10,
    alignItems: "center",
  },
  switchBtnText: {
    fontSize: 12,
    color: "#1C7057",
    fontWeight: "700",
  },
  cancelBtn: {
    paddingVertical: 6,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 12,
    color: "#889992",
  },
});
