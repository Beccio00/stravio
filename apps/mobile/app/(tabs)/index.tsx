import { useEffect, useState } from "react";
import { Alert, Platform, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Check,
  ChevronRight,
  GripVertical,
  LogOut,
  PencilLine,
  Plus,
  SquarePen,
} from "lucide-react-native";
import DraggableFlatList, { ScaleDecorator } from "react-native-draggable-flatlist";
import type { RenderItemParams } from "react-native-draggable-flatlist";
import { TouchableOpacity as GHTouchableOpacity } from "react-native-gesture-handler";
import { cssInterop } from "nativewind";
import type { WorkoutSheet } from "@bhmt3wp/shared";
import { useAuth } from "../../src/contexts/AuthContext";
import {
  useCreateSheet,
  useDeleteSheet,
  useReorderSheets,
  useSheets,
  useUpdateSheet,
} from "../../src/api/hooks";
import {
  Button,
  Card,
  ICON_SIZE,
  ICON_STROKE,
  Input,
  ScreenHeader,
  StateBlock,
} from "../../src/components/ui";

cssInterop(GHTouchableOpacity, { className: "style" });

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
    const title = "Delete sheet";
    const message = `Delete \"${name}\"? This cannot be undone.`;

    if (Platform.OS === "web") {
      if (window.confirm(`${title}\n\n${message}`)) {
        deleteSheet.mutate(id);
      }
    } else {
      Alert.alert(title, message, [
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
        <GHTouchableOpacity
          className="w-full"
          onPress={() => router.push(`/sheet/${item.id}`)}
          onLongPress={() => handleDelete(item.id, item.name)}
          delayLongPress={350}
          disabled={isEditing}
          activeOpacity={0.75}
        >
          <Card className={`w-full mb-3 ${isActive ? "opacity-90" : ""}`}>
            <View className="flex-row items-center">
              {!isEditing ? (
                <GHTouchableOpacity
                  onLongPress={drag}
                  delayLongPress={180}
                  disabled={reorderSheets.isPending}
                  className="mr-1 h-9 w-8 items-center justify-center"
                  accessibilityLabel="Hold and drag to reorder sheet"
                  accessibilityRole="button"
                >
                  <GripVertical size={ICON_SIZE} strokeWidth={ICON_STROKE} color="#7c8aa5" />
                </GHTouchableOpacity>
              ) : null}

              {isEditing ? (
                <View className="flex-1 flex-row items-center">
                  <Input
                    value={renameDraft}
                    onChangeText={setRenameDraft}
                    placeholder="Sheet name"
                    editable={!updateSheet.isPending}
                    onSubmitEditing={applyRename}
                    containerClassName="flex-1"
                    inputClassName="text-lg font-semibold"
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    onPress={applyRename}
                    disabled={updateSheet.isPending}
                    className="ml-2 h-10 w-10 items-center justify-center rounded-xl bg-action-secondary border border-border"
                    accessibilityLabel="Save sheet name"
                  >
                    <Check size={ICON_SIZE} strokeWidth={ICON_STROKE} color="#22c55e" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="relative flex-1 min-w-0">
                  <View className="min-w-0 pr-20">
                    <Text className="text-text-primary text-lg font-bold" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text className="text-text-muted text-xs mt-1">Tap to open workout plan</Text>
                  </View>

                  <View
                    className="absolute inset-y-0 right-0 w-16 flex-row items-center justify-end"
                    pointerEvents="box-none"
                  >
                    <TouchableOpacity
                      onPress={(event) => {
                        event.stopPropagation();
                        beginRename(item);
                      }}
                      className="mr-2 h-9 w-9 items-center justify-center rounded-xl bg-action-secondary border border-border"
                      accessibilityLabel="Rename sheet"
                    >
                      <PencilLine size={ICON_SIZE} strokeWidth={ICON_STROKE} color="#c0c9d8" />
                    </TouchableOpacity>
                    <View className="w-4 items-center">
                      <ChevronRight size={ICON_SIZE} strokeWidth={ICON_STROKE} color="#7c8aa5" />
                    </View>
                  </View>
                </View>
              )}
            </View>
          </Card>
        </GHTouchableOpacity>
      </ScaleDecorator>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-5 pt-3 pb-2">
        <ScreenHeader
          title="My Sheets"
          subtitle="Create your plan, drag to reorder, long press a title to delete."
          icon={SquarePen}
          rightAction={<Button label="Sign out" icon={LogOut} size="sm" variant="ghost" onPress={signOut} />}
        />

        <Button
          label="Create sheet"
          icon={Plus}
          onPress={() => setShowCreate(true)}
          className="mt-4"
        />
      </View>

      {isLoading ? (
        <View className="flex-1 px-5 pt-8">
          <StateBlock title="Loading your sheets" description="Syncing your latest workout plans." />
        </View>
      ) : error ? (
        <View className="flex-1 px-5 pt-8">
          <StateBlock
            title="Could not load sheets"
            description="Check your connection and Supabase configuration."
            tone="danger"
          />
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
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 140 }}
          ListEmptyComponent={
            <StateBlock
              title="No sheets yet"
              description="Create your first sheet to start planning workouts."
              actionLabel="Create sheet"
              onAction={() => setShowCreate(true)}
              className="mt-8"
            />
          }
        />
      )}

      {showCreate ? (
        <View className="absolute bottom-24 left-5 right-5">
          <Card padding="lg" className="border border-border">
            <Text className="text-text-primary text-lg font-bold">Create a new sheet</Text>
            <Text className="text-text-secondary text-sm mt-1">
              Give it a clear name so you can find it fast before training.
            </Text>

            <Input
              value={newSheetName}
              onChangeText={setNewSheetName}
              placeholder="Example: Push Day"
              onSubmitEditing={handleCreate}
              containerClassName="mt-4"
              autoFocus
              returnKeyType="done"
            />

            <View className="mt-4 flex-row gap-3">
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setShowCreate(false)}
                className="flex-1"
              />
              <Button
                label="Create"
                icon={Plus}
                onPress={handleCreate}
                className="flex-1"
                loading={createSheet.isPending}
              />
            </View>
          </Card>
        </View>
      ) : null}

      <TouchableOpacity
        className="absolute bottom-24 right-5 h-14 w-14 items-center justify-center rounded-full bg-action-primary border border-action-primary-press"
        onPress={() => setShowCreate(true)}
        accessibilityRole="button"
        accessibilityLabel="Create a new sheet"
        activeOpacity={0.85}
      >
        <Plus size={22} strokeWidth={2.4} color="#ffffff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
