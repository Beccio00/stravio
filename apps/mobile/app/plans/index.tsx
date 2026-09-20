import { useMemo, useState } from "react";
import { Alert, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight, Plus, Trash2 } from "lucide-react-native";
import { useCreateSheet, useDeleteSheet, useSheets } from "../../src/api/hooks";
import {
  Button,
  Card,
  ICON_SIZE,
  ICON_STROKE,
  Input,
  StateBlock,
} from "../../src/components/ui";
import { isFreestyleSheetName } from "../../src/lib/ensureFreestyleSheet";

export default function PlansScreen() {
  const router = useRouter();
  const { data: sheets, isLoading, error } = useSheets();
  const createSheet = useCreateSheet();
  const deleteSheet = useDeleteSheet();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  const plans = useMemo(
    () => (sheets ?? []).filter((sheet) => !isFreestyleSheetName(sheet.name)),
    [sheets],
  );

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    if (isFreestyleSheetName(name)) {
      const msg = "Nazwa „Freestyle” jest zarezerwowana. Wybierz inną.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Nie można utworzyć", msg);
      return;
    }

    createSheet.mutate(
      { name, description: "Plan układany z katalogu ćwiczeń." },
      {
        onSuccess: (created) => {
          setNewName("");
          setShowCreate(false);
          router.push(`/sheet/${created.id}`);
        },
        onError: (err) => {
          const msg = err instanceof Error ? err.message : "Nie można utworzyć planu";
          if (Platform.OS === "web") window.alert(msg);
          else Alert.alert("Błąd", msg);
        },
      },
    );
  };

  const handleDelete = (id: string, name: string) => {
    const title = "Usuń plan";
    const message = `Usunąć „${name}”? Historia treningów zostaje, sam układ zniknie.`;
    const run = () => deleteSheet.mutate(id);
    if (Platform.OS === "web") {
      if (window.confirm(`${title}\n\n${message}`)) run();
    } else {
      Alert.alert(title, message, [
        { text: "Anuluj", style: "cancel" },
        { text: "Usuń", style: "destructive", onPress: run },
      ]);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-text-secondary text-sm leading-5 mb-4">
          Ułóż plan z katalogu, potem odpal go z tej listy. Freestyle zostaje na Głównej.
        </Text>

        {isLoading ? (
          <StateBlock title="Wczytywanie planów" description="Pobieranie Twoich układów." />
        ) : error ? (
          <StateBlock
            title="Nie można wczytać planów"
            description="Sprawdź połączenie i spróbuj ponownie."
            tone="danger"
          />
        ) : plans.length === 0 ? (
          <StateBlock
            title="Brak planów"
            description="Zrób pierwszy układ z bazy ćwiczeń — Push, Pull, nogi albo własna mieszanka."
            actionLabel="Nowy plan"
            onAction={() => setShowCreate(true)}
          />
        ) : (
          plans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              onPress={() => router.push(`/sheet/${plan.id}`)}
              activeOpacity={0.8}
              className="mb-3"
            >
              <Card padding="md">
                <View className="flex-row items-center">
                  <View className="flex-1 min-w-0 pr-3">
                    <Text className="text-text-primary text-lg font-bold" numberOfLines={1}>
                      {plan.name}
                    </Text>
                    <Text className="text-text-muted text-xs mt-1">
                      Dotknij, żeby dodać ćwiczenia albo zacząć trening
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={(event) => {
                      event.stopPropagation();
                      handleDelete(plan.id, plan.name);
                    }}
                    className="mr-2 h-9 w-9 items-center justify-center rounded-xl bg-action-secondary border border-border"
                    accessibilityLabel={`Usuń plan ${plan.name}`}
                  >
                    <Trash2 size={16} strokeWidth={ICON_STROKE} color="#ef4444" />
                  </TouchableOpacity>
                  <ChevronRight size={ICON_SIZE} strokeWidth={ICON_STROKE} color="#7c8aa5" />
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <View className="absolute bottom-6 left-5 right-5">
        {showCreate ? (
          <Card padding="lg" className="border border-border">
            <Text className="text-text-primary text-lg font-bold">Nowy plan</Text>
            <Text className="text-text-secondary text-sm mt-1">
              Samej nazwy. Ćwiczenia dopiszesz z katalogu w następnym kroku.
            </Text>
            <Input
              value={newName}
              onChangeText={setNewName}
              placeholder="Np. Push A, Pull siłowy"
              onSubmitEditing={handleCreate}
              containerClassName="mt-4"
              autoFocus
              returnKeyType="done"
            />
            <View className="mt-4 flex-row gap-3">
              <Button
                label="Anuluj"
                variant="secondary"
                onPress={() => setShowCreate(false)}
                className="flex-1"
              />
              <Button
                label="Utwórz"
                icon={Plus}
                onPress={handleCreate}
                className="flex-1"
                loading={createSheet.isPending}
                disabled={!newName.trim()}
              />
            </View>
          </Card>
        ) : (
          <Button label="Nowy plan" icon={Plus} onPress={() => setShowCreate(true)} />
        )}
      </View>
    </View>
  );
}
