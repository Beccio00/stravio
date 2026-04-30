import { Text, View, type ViewProps } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { ICON_SIZE_LG, ICON_STROKE } from "./icons";
import { cx } from "./utils";

type ScreenHeaderProps = ViewProps & {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  rightAction?: React.ReactNode;
  className?: string;
};

export function ScreenHeader({
  title,
  subtitle,
  icon: Icon,
  rightAction,
  className,
  ...props
}: ScreenHeaderProps) {
  return (
    <View {...props} className={cx("flex-row items-start justify-between", className)}>
      <View className="flex-1 pr-3">
        <View className="flex-row items-center">
          {Icon ? (
            <View className="mr-2 h-8 w-8 items-center justify-center rounded-xl bg-action-secondary border border-border">
              <Icon size={ICON_SIZE_LG} strokeWidth={ICON_STROKE} color="#60a5fa" />
            </View>
          ) : null}
          <Text className="text-text-primary text-3xl font-bold shrink">{title}</Text>
        </View>
        {subtitle ? <Text className="text-text-secondary text-sm mt-2">{subtitle}</Text> : null}
      </View>
      {rightAction}
    </View>
  );
}
