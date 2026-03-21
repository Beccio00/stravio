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
import { useAuth } from "../../src/contexts/AuthContext";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Please enter email and password.");
      return;
    }
    setError(null);
    setLoading(true);
    const { error: err } = await signIn(email.trim(), password);
    setLoading(false);
    if (err) {
      setError(err);
    }
    // Auth state change in AuthProvider will handle navigation
  };

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
          {/* Logo / Title */}
          <View className="items-center mb-10">
            <Text className="text-5xl mb-2">🏋️</Text>
            <Text className="text-text-primary text-4xl font-bold">Stravio</Text>
            <Text className="text-text-secondary text-base mt-2">
              Track your workouts, anywhere.
            </Text>
          </View>

          {/* Form */}
          <View className="bg-surface rounded-2xl p-5 border border-border">
            <Text className="text-text-primary text-xl font-bold mb-5">Login</Text>

            <Text className="text-text-secondary text-sm mb-1.5">Email</Text>
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

            <Text className="text-text-secondary text-sm mb-1.5">Password</Text>
            <TextInput
              className="bg-background text-text-primary rounded-xl px-4 py-3 text-base border border-border mb-4"
              placeholder="••••••••"
              placeholderTextColor="#6b6b7b"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              textContentType="password"
              onSubmitEditing={handleLogin}
            />

            {error && (
              <View className="bg-danger/10 rounded-xl px-4 py-3 mb-4">
                <Text className="text-danger text-sm">{error}</Text>
              </View>
            )}

            <TouchableOpacity
              className={`rounded-xl py-3.5 items-center ${loading ? "bg-primary/50" : "bg-primary"}`}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-base">Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Link to signup */}
          <View className="flex-row justify-center mt-6">
            <Text className="text-text-secondary text-sm">Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/auth/signup")}>
              <Text className="text-primary text-sm font-bold">Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
