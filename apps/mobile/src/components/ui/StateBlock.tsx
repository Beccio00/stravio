import { CircleAlert, Info } from "lucide-react-native";
import { Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { Button } from "./Button";
import { ICON_SIZE_LG, ICON_STROKE } from "./icons";
import { cx } from "./utils";

type StateTone = "default" | "danger";

type StateBlockProps = {
  title: string;
  description?: string;
  tone?: StateTone;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

const TONE_CLASS: Record<StateTone, string> = {
  default: "border-border bg-surface-muted",
  danger: "border-danger/40 bg-danger/10",
};

const ICON_COLOR: Record<StateTone, string> = {
  default: "#7c8aa5",
  danger: "#ef4444",
};

export function StateBlock({
  title,
  description,
  tone = "default",
  icon,
  actionLabel,
  onAction,
  className,
}: StateBlockProps) {
  const Icon = icon ?? (tone === "danger" ? CircleAlert : Info);

  return (
    <View className={cx("items-center rounded-2xl border px-4 py-8", TONE_CLASS[tone], className)}>
      <Icon size={ICON_SIZE_LG} strokeWidth={ICON_STROKE} color={ICON_COLOR[tone]} />
      <Text className="text-text-primary text-base font-semibold mt-3 text-center">{title}</Text>
      {description ? (
        <Text className="text-text-secondary text-sm mt-1 text-center">{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          variant="secondary"
          size="sm"
          onPress={onAction}
          className="mt-4"
        />
      ) : null}
    </View>
  );
}
