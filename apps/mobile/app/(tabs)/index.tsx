import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Check,
  CheckSquare,
  Copy,
  Flame,
  GripVertical,
  ListChecks,
  MoreHorizontal,
  PencilLine,
  Play,
  Plus,
  Search,
  Square,
  SquarePen,
  Trash2,
  X,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import DraggableFlatList, { ScaleDecorator } from "react-native-draggable-flatlist";
import type { RenderItemParams } from "react-native-draggable-flatlist";
import { TouchableOpacity as GHTouchableOpacity } from "react-native-gesture-handler";
import { cssInterop } from "nativewind";
import type { WorkoutSheet } from "@bhmt3wp/shared";
import {
  useActiveSessions,
  useCloseSession,
  useCreateSheet,
  useDeleteSheet,
  useDeleteSheets,
  useDuplicateSheet,
  useReorderSheets,
  useSheets,
  useUpdateSheet,
} from "../../src/api/hooks";
import { confirm } from "../../src/lib/confirm";
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

/** Below this many sheets the whole list fits on screen and search is noise. */
const SEARCH_MIN_SHEETS = 5;

export default function HomeScreen() {
  const router = useRouter();
  const { data: sheets, isLoading, error } = useSheets();
  const createSheet = useCreateSheet();
  const deleteSheet = useDeleteSheet();
  const deleteSheets = useDeleteSheets();
  const duplicateSheet = useDuplicateSheet();
  const updateSheet = useUpdateSheet();
  const reorderSheets = useReorderSheets();
  const { data: activeSessions } = useActiveSessions();
  const closeSession = useCloseSession();
  const activeSession = activeSessions?.[0];

  const [newSheetName, setNewSheetName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const [menuSheetId, setMenuSheetId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [listData, setListData] = useState<WorkoutSheet[]>([]);
  // Kept separate from selectedIds so selection mode can start empty.
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (sheets) setListData(sheets);
    else setListData([]);
  }, [sheets]);

  const isSearching = query.trim().length > 0;

  // Derived from listData, not from sheets: a drag mutates listData first and
  // the list would snap back to the server order on every keystroke.
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return listData;
    return listData.filter(
      (s) =>
        s.name.toLowerCase().includes(needle) ||
        (s.description ?? "").toLowerCase().includes(needle),
    );
  }, [listData, query]);

  const allSelected = filtered.length > 0 && filtered.every((s) => selectedIds.has(s.id));

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

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: "Delete sheet",
      message: `Delete "${name}"? This cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (ok) deleteSheet.mutate(id);
  };

  const enterSelection = () => {
    setMenuSheetId(null);
    setEditingSheetId(null);
    setSelectionMode(true);
  };

  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allSelected) filtered.forEach((s) => next.delete(s.id));
      else filtered.forEach((s) => next.add(s.id));
      return next;
    });
  };

  const handleBulkDelete = async () => {
    // Resolve against the full list: a sheet can be selected and then hidden.
    const targets = listData.filter((s) => selectedIds.has(s.id));
    if (targets.length === 0) return;

    const ok = await confirm({
      title: `Delete ${targets.length} ${targets.length === 1 ? "sheet" : "sheets"}`,
      message:
        targets.length <= 5
          ? `Delete ${targets.map((s) => `"${s.name}"`).join(", ")}? This cannot be undone.`
          : `Delete ${targets.length} sheets? This cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;

    deleteSheets.mutate(
      targets.map((s) => s.id),
      { onSuccess: exitSelection },
    );
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
    const isEditing = !selectionMode && editingSheetId === item.id;
    const isMenuOpen = !selectionMode && menuSheetId === item.id;
    const isSelected = selectedIds.has(item.id);
    // Reorder rewrites order_index for the ids it is given, so a drag on a
    // filtered list would reindex the whole collection.
    const canDrag = !selectionMode && !isSearching;

    // The "open sheet" touchable wraps only the title block: the drag handle,
    // the checkbox, the options button and the inline menu are siblings, so
    // their presses never reach it (stopPropagation doesn't stop
    // gesture-handler touchables).
    return (
      <ScaleDecorator>
        <Card className={`w-full mb-3 ${isActive ? "opacity-90" : ""}`}>
          <View className="flex-row items-center">
            {selectionMode ? (
              // Same footprint as the drag handle so the row does not shift.
              <GHTouchableOpacity
                onPress={() => toggleSelected(item.id)}
                className="mr-1 h-9 w-8 items-center justify-center"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={`${isSelected ? "Deselect" : "Select"} ${item.name}`}
              >
                {isSelected ? (
                  <CheckSquare size={ICON_SIZE} strokeWidth={ICON_STROKE} color="#22c55e" />
                ) : (
                  <Square size={ICON_SIZE} strokeWidth={ICON_STROKE} color="#7c8aa5" />
                )}
              </GHTouchableOpacity>
            ) : canDrag && !isEditing ? (
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
                    onPress={
                      selectionMode
                        ? () => toggleSelected(item.id)
                        : () => router.push(`/sheet/${item.id}`)
                    }
                    onLongPress={selectionMode ? undefined : () => toggleSheetMenu(item)}
                    delayLongPress={350}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={
                      selectionMode
                        ? `${isSelected ? "Deselect" : "Select"} ${item.name}`
                        : `Open ${item.name}`
                    }
                  >
                    <Text className="text-text-primary text-lg font-bold" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text className="text-text-muted text-xs mt-1">
                      {selectionMode ? "Tap to select" : "Tap to open workout plan"}
                    </Text>
                  </GHTouchableOpacity>
                </View>

                {!selectionMode ? (
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
                ) : null}
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
          subtitle={
            selectionMode
              ? "Pick the sheets you want to delete."
              : isSearching
                ? "Showing matches only — clear the search to reorder."
                : "Create your plan, drag to reorder, long-press for options."
          }
          icon={SquarePen}
          rightAction={
            listData.length > 0 ? (
              <TouchableOpacity
                onPress={selectionMode ? exitSelection : enterSelection}
                className={`h-9 w-9 items-center justify-center rounded-xl border ${
                  selectionMode ? "bg-action-primary border-action-primary" : "bg-action-secondary border-border"
                }`}
                accessibilityLabel={selectionMode ? "Cancel selection" : "Select sheets"}
                accessibilityRole="button"
              >
                {selectionMode ? (
                  <X size={ICON_SIZE} strokeWidth={ICON_STROKE} color="#ffffff" />
                ) : (
                  <ListChecks size={ICON_SIZE} strokeWidth={ICON_STROKE} color="#c0c9d8" />
                )}
              </TouchableOpacity>
            ) : null
          }
        />

        {listData.length > SEARCH_MIN_SHEETS ? (
          <View className="mt-4 flex-row items-center">
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder="Search sheets"
              leftIcon={Search}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              containerClassName="flex-1"
            />
            {isSearching ? (
              <TouchableOpacity
                onPress={() => setQuery("")}
                className="ml-2 h-9 w-9 items-center justify-center rounded-xl bg-action-secondary border border-border"
                accessibilityLabel="Clear search"
                accessibilityRole="button"
              >
                <X size={ICON_SIZE} strokeWidth={ICON_STROKE} color="#c0c9d8" />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {activeSession ? (
          <Card className="mt-4" padding="md">
            <View className="flex-row items-center">
              <Flame size={16} strokeWidth={ICON_STROKE} color="#22c55e" />
              <Text className="ml-1.5 text-emphasis text-xs font-semibold uppercase">
                Workout in progress
              </Text>
            </View>
            <Text className="text-text-primary text-base font-bold mt-1" numberOfLines={1}>
              {activeSession.sheetName}
            </Text>
            <Text className="text-text-muted text-xs mt-1">
              Started {formatStartedAt(activeSession.startedAt)}
            </Text>

            <View className="mt-3 flex-row gap-2">
              <Button
                label="Resume"
                icon={Play}
                size="sm"
                className="flex-1"
                onPress={() =>
                  router.push(`/workout/${activeSession.id}?sheetId=${activeSession.sheetId}`)
                }
              />
              <Button
                label="Discard"
                icon={Trash2}
                size="sm"
                variant="secondary"
                className="flex-1"
                loading={closeSession.isPending}
                onPress={() =>
                  confirmDiscard(activeSession.sheetName, () =>
                    closeSession.mutate(activeSession.id),
                  )
                }
              />
            </View>
          </Card>
        ) : null}

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
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderSheet}
          onDragEnd={({ data, from, to }) => {
            setListData(data);
            if (from !== to) {
              reorderSheets.mutate(data.map((s) => s.id));
            }
          }}
          extraData={[editingSheetId, menuSheetId, renameDraft, updateSheet.isPending, reorderSheets.isPending, duplicateSheet.isPending, selectionMode, selectedIds, query]}
          // Without flex the wrapper takes its intrinsic height and the list
          // cannot scroll on web.
          containerStyle={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: selectionMode ? 200 : 140,
          }}
          ListEmptyComponent={
            isSearching ? (
              <StateBlock
                title="No sheets match"
                description={`Nothing found for "${query.trim()}".`}
                actionLabel="Clear search"
                onAction={() => setQuery("")}
                className="mt-8"
              />
            ) : (
              <StateBlock
                title="No sheets yet"
                description="Create your first sheet to start planning workouts."
                actionLabel="Create sheet"
                onAction={() => setShowCreate(true)}
                className="mt-8"
              />
            )
          }
        />
      )}

      {showCreate && !selectionMode ? (
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

      {!selectionMode ? (
        <TouchableOpacity
          className="absolute bottom-24 right-5 h-14 w-14 items-center justify-center rounded-full bg-action-primary border border-action-primary-press"
          onPress={() => setShowCreate(true)}
          accessibilityRole="button"
          accessibilityLabel="Create a new sheet"
          activeOpacity={0.85}
        >
          <Plus size={22} strokeWidth={2.4} color="#ffffff" />
        </TouchableOpacity>
      ) : null}

      {/* The bar owns the bottom edge while selecting: the FAB and the create
          popover sit at bottom-24 and are hidden for the duration. */}
      {selectionMode ? (
        <SafeAreaView className="absolute bottom-0 left-0 right-0" edges={["bottom"]}>
          <Card variant="muted" className="rounded-b-none border-t border-border">
            <View className="flex-row items-center">
              <Text className="flex-1 text-text-primary text-sm font-semibold">
                {selectedIds.size} selected
              </Text>
              <Button
                label={allSelected ? "Deselect all" : "Select all"}
                variant="ghost"
                size="sm"
                onPress={toggleSelectAll}
              />
              <Button
                label="Delete"
                icon={Trash2}
                variant="danger"
                size="sm"
                className="ml-2"
                disabled={selectedIds.size === 0}
                loading={deleteSheets.isPending}
                onPress={handleBulkDelete}
              />
            </View>
          </Card>
        </SafeAreaView>
      ) : null}
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

/** "12 min ago" / "2 hours ago" — sessions older than 6h are closed automatically. */
function formatStartedAt(startedAt: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
}

async function confirmDiscard(sheetName: string, onConfirm: () => void) {
  const ok = await confirm({
    title: "Discard workout",
    message: `Stop the workout in progress on "${sheetName}"? Sets you already marked as done are kept in your history.`,
    confirmLabel: "Discard",
    destructive: true,
  });
  if (ok) onConfirm();
}
