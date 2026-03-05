import { View, Text, TouchableOpacity, FlatList, TextInput, Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSheets, useCreateSheet, useDeleteSheet } from "../src/api/hooks";
import { useState } from "react";
import type { WorkoutSheet } from "@bhmt3wp/shared";

export default function HomeScreen() {
  const router = useRouter();
  const { data: sheets, isLoading, error } = useSheets();
  const createSheet = useCreateSheet();
  const deleteSheet = useDeleteSheet();
  const [newSheetName, setNewSheetName] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const handleCreate = () => {
    if (!newSheetName.trim()) return;
    createSheet.mutate(
      { name: newSheetName.trim() },
      {
        onSuccess: () => {
          setNewSheetName("");
          setShowCreate(false);
        },
      }
    );
  };

  const handleDelete = (id: number, name: string) => {
    if (Platform.OS === "web") {
      if (window.confirm(`Delete "${name}"?`)) {
        deleteSheet.mutate(id);
      }
    } else {
      Alert.alert("Delete sheet", `Delete "${name}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteSheet.mutate(id),
        },
      ]);
    }
  };

  const renderSheet = ({ item }: { item: WorkoutSheet }) => (
    <TouchableOpacity
      className="bg-surface rounded-2xl p-5 mb-3 border border-border"
      onPress={() => router.push(`/sheet/${item.id}`)}
      onLongPress={() => handleDelete(item.id, item.name)}
      activeOpacity={0.7}
    >
      <Text className="text-text-primary text-lg font-bold">{item.name}</Text>
      {item.description && (
        <Text className="text-text-secondary text-sm mt-1">{item.description}</Text>
      )}
      <Text className="text-text-muted text-xs mt-2">
        {new Date(item.createdAt).toLocaleDateString("en-US")}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-text-primary text-3xl font-bold">🏋️ My Sheets</Text>
            <Text className="text-text-secondary text-base mt-1">
              Tap a sheet to view it, long press to delete
            </Text>
          </View>
          <TouchableOpacity
            className="bg-surface rounded-xl px-4 py-2 border border-border"
            onPress={() => router.push("/history")}
          >
            <Text className="text-primary text-sm font-bold">📅 History</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-text-secondary text-lg">Loading...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-danger text-lg text-center">
            Server connection error.{"\n"}Make sure the backend is running.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sheets}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderSheet}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="items-center justify-center pt-20">
              <Text className="text-text-muted text-lg text-center">
                No sheets yet.{"\n"}Create a new one!
              </Text>
            </View>
          }
        />
      )}

      {/* Create sheet modal/inline */}
      {showCreate && (
        <View className="absolute bottom-24 left-5 right-5 bg-surface-light rounded-2xl p-5 border border-border">
          <Text className="text-text-primary text-lg font-bold mb-3">New Sheet</Text>
          <TextInput
            className="bg-background text-text-primary rounded-xl px-4 py-3 text-base border border-border mb-3"
            placeholder="Sheet name..."
            placeholderTextColor="#6b6b7b"
            value={newSheetName}
            onChangeText={setNewSheetName}
            autoFocus
            onSubmitEditing={handleCreate}
          />
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 bg-background rounded-xl py-3 items-center"
              onPress={() => setShowCreate(false)}
            >
              <Text className="text-text-secondary font-semibold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-primary rounded-xl py-3 items-center"
              onPress={handleCreate}
            >
              <Text className="text-white font-semibold">Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* FAB */}
      <TouchableOpacity
        className="absolute bottom-8 right-5 bg-primary w-16 h-16 rounded-full items-center justify-center shadow-lg"
        onPress={() => setShowCreate(true)}
        activeOpacity={0.8}
      >
        <Text className="text-white text-3xl font-light">+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
