import { useEffect, useState } from "react";
import { Alert, Platform, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Check,
  Copy,
  GripVertical,
  MoreHorizontal,
  PencilLine,
  Trash2,
  Plus,
  SquarePen,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import DraggableFlatList, { ScaleDecorator } from "react-native-draggable-flatlist";
import type { RenderItemParams } from "react-native-draggable-flatlist";
import { TouchableOpacity as GHTouchableOpacity } from "react-native-gesture-handler";
import { cssInterop } from "nativewind";
import type { WorkoutSheet } from "@bhmt3wp/shared";
import {
  useCreateSheet,
  useDeleteSheet,
  useDuplicateSheet,
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
  const { data: sheets, isLoading, error } = useSheets();
  const createSheet = useCreateSheet();
  const deleteSheet = useDeleteSheet();
  const duplicateSheet = useDuplicateSheet();
  const updateSheet = useUpdateSheet();
  const reorderSheets = useReorderSheets();

  const [newSheetName, setNewSheetName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const [menuSheetId, setMenuSheetId] = useState<string | null>(null);
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
    setMenuSheetId(null);
    setEditingSheetId(item.id);
    setRenameDraft(item.name);
  };

  const handleDuplicate = (item: WorkoutSheet) => {
    setMenuSheetId(null);
    duplicateSheet.mutate(item.id, {
      onError: (err) => {
        const msg = err instanceof Error ? err.message : "Could not duplicate sheet";
        if (Platform.OS === "web") {
          window.alert(msg);
        } else {
          Alert.alert("Duplicate failed", msg);
        }
      },
    });
  };

  // Inline action menu (works the same on web and native; long-press on
  // native is just a shortcut to open it).
  const toggleSheetMenu = (item: WorkoutSheet) => {
    setMenuSheetId((current) => (current === item.id ? null : item.id));
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
    const isMenuOpen = menuSheetId === item.id;

    // The "open sheet" touchable wraps only the title block: the drag handle,
    // the options button and the inline menu are siblings, so their presses
    // never reach it (stopPropagation doesn't stop gesture-handler touchables).
    return (
      <ScaleDecorator>
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
              <>
                {/* Fills the row so the whole card area (minus the buttons)
                    opens the sheet, and pushes the actions to the right edge. */}
                <View className="flex-1 min-w-0">
                  <GHTouchableOpacity
                    className="w-full py-1"
                    onPress={() => router.push(`/sheet/${item.id}`)}
                    onLongPress={() => toggleSheetMenu(item)}
                    delayLongPress={350}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${item.name}`}
                  >
                    <Text className="text-text-primary text-lg font-bold" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text className="text-text-muted text-xs mt-1">Tap to open workout plan</Text>
                  </GHTouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={() => toggleSheetMenu(item)}
                  className={`ml-2 h-9 w-9 items-center justify-center rounded-xl border ${
                    isMenuOpen ? "bg-action-primary border-action-primary" : "bg-action-secondary border-border"
                  }`}
                  accessibilityLabel="Sheet options"
                  accessibilityRole="button"
                >
                  <MoreHorizontal
                    size={ICON_SIZE}
                    strokeWidth={ICON_STROKE}
                    color={isMenuOpen ? "#ffffff" : "#c0c9d8"}
                  />
                </TouchableOpacity>
              </>
            )}
          </View>

          {isMenuOpen && !isEditing ? (
            <View className="mt-3 flex-row gap-2 border-t border-border pt-3">
              <SheetAction label="Rename" icon={PencilLine} onPress={() => beginRename(item)} />
              <SheetAction
                label="Duplicate"
                icon={Copy}
                onPress={() => handleDuplicate(item)}
                loading={duplicateSheet.isPending}
              />
              <SheetAction
                label="Delete"
                icon={Trash2}
                tone="danger"
                onPress={() => {
                  setMenuSheetId(null);
                  handleDelete(item.id, item.name);
                }}
              />
            </View>
          ) : null}
        </Card>
      </ScaleDecorator>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-5 pt-3 pb-2">
        <ScreenHeader
          title="My Sheets"
          subtitle="Create your plan, drag to reorder, long-press for options."
          icon={SquarePen}
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
          extraData={[editingSheetId, menuSheetId, renameDraft, updateSheet.isPending, reorderSheets.isPending, duplicateSheet.isPending]}
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

function SheetAction({
  label,
  icon,
  onPress,
  tone = "default",
  loading = false,
}: {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  tone?: "default" | "danger";
  loading?: boolean;
}) {
  return (
    <Button
      label={label}
      icon={icon}
      size="sm"
      variant={tone === "danger" ? "danger" : "secondary"}
      onPress={onPress}
      loading={loading}
      className="flex-1"
    />
  );
}
