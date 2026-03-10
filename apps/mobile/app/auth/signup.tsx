import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth, type UserRole } from "../../src/contexts/AuthContext";

export default function SignupScreen() {
  const { signUp } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>("allievo");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignup = async () => {
    if (!email.trim() || !password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setError(null);
    setLoading(true);
    const { error: err } = await signUp(
      email.trim(),
      password,
      role,
      displayName.trim() || undefined,
    );
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      setSuccess(true);
    }
  };

  // Success state
  if (success) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center px-6">
        <View className="bg-surface rounded-2xl p-6 border border-border items-center">
          <Text className="text-4xl mb-3">✅</Text>
          <Text className="text-text-primary text-xl font-bold mb-2 text-center">
            Account Created!
          </Text>
          <Text className="text-text-secondary text-center mb-6">
            Check your email to confirm your account, then sign in.
          </Text>
          <TouchableOpacity
            className="bg-primary rounded-xl py-3.5 px-8"
            onPress={() => router.replace("/auth/login")}
          >
            <Text className="text-white font-bold text-base">Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="items-center mb-8">
            <Text className="text-text-primary text-3xl font-bold">Create Account</Text>
            <Text className="text-text-secondary text-base mt-2">
              Join Stravio and start tracking.
            </Text>
          </View>

          {/* Form */}
          <View className="bg-surface rounded-2xl p-5 border border-border">
            {/* Role selector */}
            <Text className="text-text-secondary text-sm mb-2">I am a...</Text>
            <View className="flex-row mb-5 gap-3">
              <TouchableOpacity
                className={`flex-1 py-3 rounded-xl items-center border ${
                  role === "allievo"
                    ? "bg-primary border-primary"
                    : "bg-background border-border"
                }`}
                onPress={() => setRole("allievo")}
              >
                <Text className="text-lg mb-1">💪</Text>
                <Text
                  className={`font-semibold text-sm ${
                    role === "allievo" ? "text-white" : "text-text-secondary"
                  }`}
                >
                  Athlete
                </Text>
                <Text
                  className={`text-xs ${
                    role === "allievo" ? "text-white/70" : "text-text-muted"
                  }`}
                >
                  (Allievo)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 py-3 rounded-xl items-center border ${
                  role === "coach"
                    ? "bg-primary border-primary"
                    : "bg-background border-border"
                }`}
                onPress={() => setRole("coach")}
              >
                <Text className="text-lg mb-1">🎯</Text>
                <Text
                  className={`font-semibold text-sm ${
                    role === "coach" ? "text-white" : "text-text-secondary"
                  }`}
                >
                  Coach
                </Text>
                <Text
                  className={`text-xs ${
                    role === "coach" ? "text-white/70" : "text-text-muted"
                  }`}
                >
                  (Coach)
                </Text>
              </TouchableOpacity>
            </View>

            <Text className="text-text-secondary text-sm mb-1.5">Display Name</Text>
            <TextInput
              className="bg-background text-text-primary rounded-xl px-4 py-3 text-base border border-border mb-4"
              placeholder="Your name (optional)"
              placeholderTextColor="#6b6b7b"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              textContentType="name"
            />

            <Text className="text-text-secondary text-sm mb-1.5">
              Email <Text className="text-danger">*</Text>
            </Text>
            <TextInput
              className="bg-background text-text-primary rounded-xl px-4 py-3 text-base border border-border mb-4"
              placeholder="you@example.com"
              placeholderTextColor="#6b6b7b"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
            />

            <Text className="text-text-secondary text-sm mb-1.5">
              Password <Text className="text-danger">*</Text>
            </Text>
            <TextInput
              className="bg-background text-text-primary rounded-xl px-4 py-3 text-base border border-border mb-4"
              placeholder="Min 6 characters"
              placeholderTextColor="#6b6b7b"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              textContentType="newPassword"
            />

            <Text className="text-text-secondary text-sm mb-1.5">
              Confirm Password <Text className="text-danger">*</Text>
            </Text>
            <TextInput
              className="bg-background text-text-primary rounded-xl px-4 py-3 text-base border border-border mb-4"
              placeholder="Repeat password"
              placeholderTextColor="#6b6b7b"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              textContentType="newPassword"
              onSubmitEditing={handleSignup}
            />

            {error && (
              <View className="bg-danger/10 rounded-xl px-4 py-3 mb-4">
                <Text className="text-danger text-sm">{error}</Text>
              </View>
            )}

            <TouchableOpacity
              className={`rounded-xl py-3.5 items-center ${loading ? "bg-primary/50" : "bg-primary"}`}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-base">Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Link to login */}
          <View className="flex-row justify-center mt-6">
            <Text className="text-text-secondary text-sm">Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace("/auth/login")}>
              <Text className="text-primary text-sm font-bold">Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
