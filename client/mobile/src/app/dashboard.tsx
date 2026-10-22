import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

import { apiRequest } from "../lib/api";

type Loan = {
  id: string;
  friend_name: string;
  amount: number | string;
  due_date: string;
  is_repaid: boolean;
};

type LoansResponse = {
  loans: Loan[];
};

type Summary = {
  totalLent: number | string;
  totalRepaid: number | string;
  overdueAmount: number | string;
};

function formatMoney(value: number | string) {
  return `₹${Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function isOverdue(loan: Loan) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(`${loan.due_date.slice(0, 10)}T00:00:00`);
  return !loan.is_repaid && dueDate < today;
}

export default function DashboardScreen() {
  const router = useRouter();

  const [summary, setSummary] = useState<Summary>({
    totalLent: 0,
    totalRepaid: 0,
    overdueAmount: 0,
  });
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setError("");

      const token = await SecureStore.getItemAsync("miniledger_token");

      if (!token) {
        router.replace("/");
        return;
      }

      const [summaryData, loansData] = await Promise.all([
        apiRequest<Summary>("/summary", {}, token),
        apiRequest<LoansResponse[]>("/loans", {}, token),
      ]);

      setSummary(summaryData);
      setLoans(loansData.loans);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load dashboard.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  async function markAsRepaid(loan: Loan) {
    try {
      const token = await SecureStore.getItemAsync("miniledger_token");

      if (!token) {
        router.replace("/");
        return;
      }

      await apiRequest(`/loans/${loan.id}/repay`, { method: "PATCH" }, token);

      Alert.alert(
        "Success",
        `${loan.friend_name}'s loan was marked as repaid.`,
      );
      await loadDashboard();
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Could not update loan.",
      );
    }
  }

  async function logout() {
    await SecureStore.deleteItemAsync("miniledger_token");
    router.replace("/");
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#60A5FA" />
        <Text style={styles.muted}>Loading your loans...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void loadDashboard();
          }}
          tintColor="#60A5FA"
        />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>MINILEDGER</Text>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.muted}>Keep track of money lent to friends.</Text>
        </View>

        <Pressable onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void loadDashboard()}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.summaryCard}>
        <Text style={styles.cardLabel}>TOTAL LENT</Text>
        <Text style={styles.total}>{formatMoney(summary.totalLent)}</Text>

        <View style={styles.divider} />

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.cardLabel}>REPAID</Text>
            <Text style={styles.repaid}>
              {formatMoney(summary.totalRepaid)}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.cardLabel}>OVERDUE</Text>
            <Text style={styles.overdue}>
              {formatMoney(summary.overdueAmount)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>Your loans</Text>
        <Text style={styles.count}>{loans.length} entries</Text>
      </View>

      <Pressable
        style={styles.addButton}
        onPress={() => router.push("/add-loan")}
      >
        <Text style={styles.addButtonText}>+ Add loan</Text>
      </Pressable>

      {loans.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No loans yet</Text>
          <Text style={styles.muted}>
            Your loans will appear here after you add one.
          </Text>
        </View>
      ) : (
        loans?.map((loan) => {
          const overdue = isOverdue(loan);

          return (
            <View
              key={loan?.id}
              style={[styles.loanCard, overdue && styles.overdueCard]}
            >
              <View style={styles.loanTop}>
                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{loan?.friend_name}</Text>
                  <Text style={styles.dueDate}>
                    Due: {loan?.due_date.slice(0, 10)}
                  </Text>
                </View>

                <Text style={styles.amount}>{formatMoney(loan?.amount)}</Text>
              </View>

              <View style={styles.loanBottom}>
                <Text
                  style={[
                    styles.status,
                    loan.is_repaid
                      ? styles.statusRepaid
                      : overdue
                        ? styles.statusOverdue
                        : styles.statusPending,
                  ]}
                >
                  {loan.is_repaid ? "Repaid" : overdue ? "Overdue" : "Pending"}
                </Text>

                {!loan.is_repaid && (
                  <Pressable
                    style={styles.repayButton}
                    onPress={() =>
                      Alert.alert(
                        "Mark as repaid?",
                        `Has ${loan.friend_name} repaid this loan?`,
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Confirm",
                            onPress: () => void markAsRepaid(loan),
                          },
                        ],
                      )
                    }
                  >
                    <Text style={styles.repayText}>Mark repaid</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0B1120" },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  center: {
    flex: 1,
    backgroundColor: "#0B1120",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  eyebrow: {
    color: "#60A5FA",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 30,
    fontWeight: "800",
    marginTop: 8,
  },
  muted: { color: "#94A3B8", fontSize: 14, marginTop: 6 },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#1E293B",
  },
  logoutText: { color: "#CBD5E1", fontWeight: "600" },
  summaryCard: {
    backgroundColor: "#172554",
    padding: 22,
    borderRadius: 20,
    marginBottom: 30,
  },
  cardLabel: {
    color: "#BFDBFE",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  total: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "800",
    marginTop: 8,
  },
  divider: { height: 1, backgroundColor: "#334779", marginVertical: 22 },
  summaryRow: { flexDirection: "row", gap: 20 },
  summaryItem: { flex: 1 },
  repaid: {
    color: "#86EFAC",
    fontSize: 19,
    fontWeight: "700",
    marginTop: 8,
  },
  overdue: {
    color: "#FCA5A5",
    fontSize: 19,
    fontWeight: "700",
    marginTop: 8,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: { color: "#F8FAFC", fontSize: 21, fontWeight: "700" },
  count: { color: "#94A3B8", fontSize: 13 },
  loanCard: {
    backgroundColor: "#111C2E",
    borderColor: "#263449",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  overdueCard: { borderColor: "#B91C1C" },
  loanTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  friendInfo: { flex: 1 },
  friendName: { color: "#F8FAFC", fontSize: 17, fontWeight: "700" },
  dueDate: { color: "#94A3B8", fontSize: 12, marginTop: 6 },
  amount: { color: "#F8FAFC", fontSize: 17, fontWeight: "700" },
  loanBottom: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  status: {
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: "hidden",
  },
  statusRepaid: { color: "#86EFAC", backgroundColor: "#14532D" },
  statusOverdue: { color: "#FCA5A5", backgroundColor: "#7F1D1D" },
  statusPending: { color: "#FDE68A", backgroundColor: "#713F12" },
  repayButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#2563EB",
    borderRadius: 9,
  },
  repayText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  emptyCard: {
    padding: 22,
    backgroundColor: "#111C2E",
    borderRadius: 16,
    alignItems: "center",
  },
  emptyTitle: { color: "#F8FAFC", fontSize: 17, fontWeight: "700" },
  errorBox: {
    backgroundColor: "#451A1A",
    padding: 14,
    borderRadius: 12,
    marginBottom: 18,
  },
  errorText: { color: "#FCA5A5" },
  retryText: { color: "#FFFFFF", fontWeight: "700", marginTop: 8 },

  addButton: {
  backgroundColor: "#2563EB",
  padding: 14,
  borderRadius: 10,
  alignItems: "center",
  marginBottom: 18,
},
addButtonText: {
  color: "#FFFFFF",
  fontWeight: "700",
  fontSize: 15,
},
});
