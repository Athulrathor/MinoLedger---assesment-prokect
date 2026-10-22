
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

import { apiRequest } from "../lib/api";

export default function AddLoanScreen() {
  const router = useRouter();

  const [friendName, setFriendName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const name = friendName.trim();
    const numericAmount = Number(amount);
    const date = dueDate.trim();

    if (!name) {
      Alert.alert("Validation", "Please enter your friend's name.");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      Alert.alert("Validation", "Enter an amount greater than zero.");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert("Validation", "Use the date format YYYY-MM-DD.");
      return;
    }

    const parsedDate = new Date(`${date}T00:00:00Z`);
    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== date
    ) {
      Alert.alert("Validation", "Please enter a valid calendar date.");
      return;
    }

    try {
      setLoading(true);

      const token = await SecureStore.getItemAsync("miniledger_token");

      if (!token) {
        Alert.alert("Session expired", "Please log in again.");
        router.replace("/");
        return;
      }

      await apiRequest("/loans", {
        method: "POST",
        body: JSON.stringify({
          friendName: name,
          amount: numericAmount,
          dueDate: date,
        }),
      }, token);

      Alert.alert("Success", "Loan added successfully.", [
        {
          text: "OK",
          onPress: () => router.replace("/dashboard"),
        },
      ]);
    } catch (error) {
      Alert.alert(
        "Could not add loan",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back to dashboard</Text>
        </Pressable>

        <Text style={styles.eyebrow}>MINILEDGER</Text>
        <Text style={styles.title}>Add a loan</Text>
        <Text style={styles.subtitle}>
          Record money you've lent to a friend.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Friend's name</Text>
          <TextInput
            value={friendName}
            onChangeText={setFriendName}
            placeholder="e.g. Rahul"
            placeholderTextColor="#64748B"
            maxLength={100}
            autoCapitalize="words"
            style={styles.input}
          />

          <Text style={styles.label}>Amount (₹)</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="e.g. 1500"
            placeholderTextColor="#64748B"
            keyboardType="decimal-pad"
            style={styles.input}
          />

          <Text style={styles.label}>Due date</Text>
          <TextInput
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#64748B"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            style={styles.input}
          />
          <Text style={styles.hint}>Example: 2026-10-30</Text>

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={[styles.submitButton, loading && styles.disabled]}
          >
            <Text style={styles.submitText}>
              {loading ? "Saving..." : "Save loan"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0B1120" },
  content: { padding: 22, paddingTop: 55, paddingBottom: 40 },
  backButton: { marginBottom: 32, alignSelf: "flex-start" },
  backText: { color: "#93C5FD", fontSize: 14 },
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
  subtitle: { color: "#94A3B8", fontSize: 14, marginTop: 8 },
  form: {
    backgroundColor: "#111C2E",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#263449",
    padding: 18,
    marginTop: 28,
  },
  label: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 9,
    marginTop: 16,
  },
  input: {
    backgroundColor: "#0B1120",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 13,
    color: "#F8FAFC",
    fontSize: 15,
  },
  hint: { color: "#64748B", fontSize: 12, marginTop: 7 },
  submitButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 15,
    alignItems: "center",
    borderRadius: 11,
    marginTop: 28,
  },
  disabled: { opacity: 0.6 },
  submitText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
