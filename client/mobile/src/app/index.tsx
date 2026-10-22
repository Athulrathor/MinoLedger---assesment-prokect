
import { useState } from "react";
import {
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { apiRequest } from "../lib/api";
import { useRouter } from "expo-router";

type AuthResponse = {
  token?: string;
  accessToken?: string;
  message?: string;
};

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [loading, setLoading] = useState(false);

  async function requestOtp() {
    if (!/^\+[1-9]\d{7,14}$/.test(phone.trim())) {
      Alert.alert("Invalid phone", "Enter your phone with country code, e.g. +919876543210.");
      return;
    }

    try {
      setLoading(true);
      await apiRequest("/auth/request/otp", {
        method: "POST",
        body: JSON.stringify({ phone: phone.trim() }),
      });

      setOtpRequested(true);
      Alert.alert("OTP requested", "Check your backend terminal for the mock OTP.");
    } catch (error) {
      Alert.alert("Request failed", error instanceof Error ? error.message : "Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    if (!/^\d{6}$/.test(otp.trim())) {
      Alert.alert("Invalid OTP", "Enter the 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);
      const result = await apiRequest<AuthResponse>("/auth/verify/otp", {
        method: "POST",
        body: JSON.stringify({ phone: phone.trim(), otp: otp.trim() }),
      });

      const token = result.token ?? result.accessToken;

      if (!token) {
        throw new Error("Backend response did not contain a token. Check its response format.");
      }

      await SecureStore.setItemAsync("miniledger_token", token);
      router.replace("/dashboard" as never);
    } catch (error) {
      Alert.alert("Verification failed", error instanceof Error ? error.message : "Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.brand}>MiniLedger</Text>
        <Text style={styles.heading}>Keep your lending organized.</Text>
        <Text style={styles.subtitle}>
          Sign in with your phone to manage loans and repayments.
        </Text>

        <Text style={styles.label}>Phone number</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+919876543210"
          placeholderTextColor="#8490a5"
          keyboardType="phone-pad"
          autoCapitalize="none"
        />

        {otpRequested && (
          <>
            <Text style={styles.label}>One-time password</Text>
            <TextInput
              style={styles.input}
              value={otp}
              onChangeText={setOtp}
              placeholder="Enter 6-digit OTP"
              placeholderTextColor="#8490a5"
              keyboardType="number-pad"
              maxLength={6}
            />
          </>
        )}

        <Pressable
          style={[styles.button, loading && styles.disabled]}
          disabled={loading}
          onPress={otpRequested ? verifyOtp : requestOtp}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>
              {otpRequested ? "Verify & sign in" : "Send OTP"}
            </Text>
          )}
        </Pressable>

        {otpRequested && (
          <Pressable onPress={requestOtp} disabled={loading}>
            <Text style={styles.resend}>Request another OTP</Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0b1020",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#151d31",
    padding: 24,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#29344b",
  },
  brand: {
    color: "#8bafff",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 18,
  },
  heading: {
    color: "#ffffff",
    fontSize: 29,
    fontWeight: "800",
    lineHeight: 36,
  },
  subtitle: {
    color: "#a8b2c7",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
    marginBottom: 28,
  },
  label: {
    color: "#e4e9f3",
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#0d1425",
    color: "#ffffff",
    borderWidth: 1,
    borderColor: "#34415c",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 18,
  },
  button: {
    backgroundColor: "#5278f5",
    minHeight: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  resend: {
    color: "#a9beff",
    textAlign: "center",
    marginTop: 18,
  },
});
