import { ActivityIndicator, Text, TouchableOpacity, View, type TouchableOpacityProps } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { ICON_SIZE, ICON_STROKE } from "./icons";
import { cx } from "./utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "bg-action-primary",
  secondary: "bg-action-secondary border border-border",
  ghost: "bg-transparent border border-border",
  danger: "bg-danger",
};

const TEXT_CLASS: Record<ButtonVariant, string> = {
  primary: "text-white",
  secondary: "text-text-primary",
  ghost: "text-text-secondary",
  danger: "text-white",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "h-10 px-3",
  md: "h-12 px-4",
};

const TEXT_SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "text-sm",
  md: "text-base",
};

const ICON_COLOR: Record<ButtonVariant, string> = {
  primary: "#ffffff",
  secondary: "#f8fafc",
  ghost: "#c0c9d8",
  danger: "#ffffff",
};

type ButtonProps = Omit<TouchableOpacityProps, "children"> & {
  label: string;
  icon?: LucideIcon;
  className?: string;
  textClassName?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export function Button({
  label,
  icon: Icon,
  className,
  textClassName,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  activeOpacity = 0.85,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      {...props}
      disabled={isDisabled}
      activeOpacity={activeOpacity}
      className={cx(
        "flex-row items-center justify-center rounded-2xl",
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        isDisabled && "opacity-60",
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator color={ICON_COLOR[variant]} />
      ) : (
        <View className="flex-row items-center">
          {Icon ? (
            <Icon
              size={ICON_SIZE}
              strokeWidth={ICON_STROKE}
              color={ICON_COLOR[variant]}
              style={{ marginRight: 8 }}
            />
          ) : null}
          <Text
            className={cx(
              "font-semibold",
              TEXT_CLASS[variant],
              TEXT_SIZE_CLASS[size],
              textClassName,
            )}
          >
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
