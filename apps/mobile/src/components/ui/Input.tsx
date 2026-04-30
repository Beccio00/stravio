import { Text, TextInput, View, type TextInputProps } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { ICON_SIZE_SM, ICON_STROKE } from "./icons";
import { cx } from "./utils";

type InputProps = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: LucideIcon;
  containerClassName?: string;
  inputClassName?: string;
};

export function Input({
  label,
  hint,
  error,
  leftIcon: Icon,
  containerClassName,
  inputClassName,
  placeholderTextColor = "#7c8aa5",
  multiline,
  ...props
}: InputProps) {
  return (
    <View className={cx("w-full", containerClassName)}>
      {label ? <Text className="text-text-secondary text-sm mb-1.5">{label}</Text> : null}

      <View
        className={cx(
          "flex-row items-start rounded-xl border border-border bg-surface-muted px-3",
          multiline ? "py-2" : "h-12 items-center",
          error ? "border-danger" : "",
        )}
      >
        {Icon ? (
          <Icon
            size={ICON_SIZE_SM}
            strokeWidth={ICON_STROKE}
            color="#7c8aa5"
            style={{ marginRight: 8, marginTop: multiline ? 10 : 0 }}
          />
        ) : null}
        <TextInput
          {...props}
          multiline={multiline}
          placeholderTextColor={placeholderTextColor}
          className={cx(
            "flex-1 text-text-primary text-base",
            multiline ? "min-h-[84px]" : "",
            inputClassName,
          )}
          textAlignVertical={multiline ? "top" : "center"}
        />
      </View>

      {error ? <Text className="text-danger text-xs mt-1.5">{error}</Text> : null}
      {!error && hint ? <Text className="text-text-muted text-xs mt-1.5">{hint}</Text> : null}
    </View>
  );
}
