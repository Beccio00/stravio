import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useSheets,
  useCreateSheet,
  useDeleteSheet,
  useUpdateSheet,
  useReorderSheets,
} from "../src/api/hooks";
import { useEffect, useState } from "react";
import type { WorkoutSheet } from "@bhmt3wp/shared";
import { useAuth } from "../src/contexts/AuthContext";
import DraggableFlatList, { ScaleDecorator } from "react-native-draggable-flatlist";
import type { RenderItemParams } from "react-native-draggable-flatlist";
import { TouchableOpacity as GHTouchableOpacity } from "react-native-gesture-handler";

export default function HomeScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { data: sheets, isLoading, error } = useSheets();
  const createSheet = useCreateSheet();
  const deleteSheet = useDeleteSheet();
  const updateSheet = useUpdateSheet();
  const reorderSheets = useReorderSheets();
  const [newSheetName, setNewSheetName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [listData, setListData] = useState<WorkoutSheet[]>([]);

  useEffect(() => {
    if (sheets) setListData(sheets);
    else setListData([]);
  }, [sheets]);

  const handleCreate = () => {
    if (!newSheetName.trim()) return;
    createSheet.mutate(
      { name: newSheetName.trim() },
      {
        onSuccess: () => {
          setNewSheetName("");
          setShowCreate(false);
        },
      },
    );
  };

  const handleDelete = (id: string, name: string) => {
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

  const beginRename = (item: WorkoutSheet) => {
    setEditingSheetId(item.id);
    setRenameDraft(item.name);
  };

  const applyRename = () => {
    if (!editingSheetId) return;
    const trimmed = renameDraft.trim();
    if (!trimmed) return;
    const currentName = sheets?.find((s) => s.id === editingSheetId)?.name;
    if (trimmed === currentName) {
      setEditingSheetId(null);
      return;
    }
    updateSheet.mutate(
      { id: editingSheetId, name: trimmed },
      {
        onSuccess: () => setEditingSheetId(null),
        onError: (err) => {
          const msg = err instanceof Error ? err.message : "Could not rename sheet";
          if (Platform.OS === "web") {
            window.alert(msg);
          } else {
            Alert.alert("Rename failed", msg);
          }
        },
      },
    );
  };

  const renderSheet = ({ item, drag, isActive }: RenderItemParams<WorkoutSheet>) => {
    const isEditing = editingSheetId === item.id;
    return (
      <ScaleDecorator>
        <View
          className={`bg-surface rounded-2xl p-5 mb-3 border border-border ${isActive ? "opacity-95" : ""}`}
        >
          <View className="flex-row items-center gap-2">
            {!isEditing && (
              <GHTouchableOpacity
                onLongPress={drag}
                delayLongPress={180}
                disabled={reorderSheets.isPending}
                className="py-2 pr-1"
                accessibilityLabel="Hold and drag to reorder sheets"
                accessibilityRole="button"
              >
                <Text className="text-text-muted text-lg">☰</Text>
              </GHTouchableOpacity>
            )}
            {isEditing ? (
              <>
                <TextInput
                  className="flex-1 min-w-0 bg-background text-text-primary text-lg font-bold rounded-xl px-3 py-2 border border-border"
                  value={renameDraft}
                  onChangeText={setRenameDraft}
                  placeholder="Sheet name..."
                  placeholderTextColor="#6b6b7b"
                  autoFocus
                  editable={!updateSheet.isPending}
                  onSubmitEditing={applyRename}
                />
                <GHTouchableOpacity
                  onPress={applyRename}
                  disabled={updateSheet.isPending}
                  className="px-2 py-2"
                  accessibilityLabel="Save sheet name"
                >
                  <Text className="text-accent font-extrabold text-xl">✓</Text>
                </GHTouchableOpacity>
              </>
            ) : (
              <>
                <GHTouchableOpacity
                  className="flex-1 shrink min-w-0"
                  onPress={() => router.push(`/sheet/${item.id}`)}
                  onLongPress={() => handleDelete(item.id, item.name)}
                  activeOpacity={0.7}
                >
                  <Text className="text-text-primary text-lg font-bold">{item.name}</Text>
                </GHTouchableOpacity>
                <GHTouchableOpacity
                  onPress={() => beginRename(item)}
                  className="px-2 py-2"
                  accessibilityLabel="Edit sheet name"
                >
                  <Text className="text-text-secondary text-lg">✎</Text>
                </GHTouchableOpacity>
              </>
            )}
          </View>
        </View>
      </ScaleDecorator>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row justify-end mb-3">
          <TouchableOpacity onPress={signOut}>
            <Text className="text-danger text-sm">Logout</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-2">
            <Text className="text-text-primary text-3xl font-bold">🏋️ My Sheets</Text>
            <Text className="text-text-secondary text-base mt-1">
              Tap a sheet to open · Long press the name to delete · Hold ☰ then drag to reorder
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
            Data loading error.{"\n"}Check internet and Supabase configuration.
          </Text>
        </View>
      ) : (
        <DraggableFlatList
          data={listData}
          keyExtractor={(item) => item.id}
          renderItem={renderSheet}
          onDragEnd={({ data, from, to }) => {
            setListData(data);
            if (from !== to) {
              reorderSheets.mutate(data.map((s) => s.id));
            }
          }}
          extraData={[editingSheetId, renameDraft, updateSheet.isPending, reorderSheets.isPending]}
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
