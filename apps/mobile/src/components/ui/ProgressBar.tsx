import { View } from "react-native";
import { cx } from "./utils";

type ProgressTone = "progress" | "done" | "error";

type ProgressBarProps = {
  /** 0..1, clamped. */
  ratio: number;
  tone?: ProgressTone;
  className?: string;
};

const FILL_CLASS: Record<ProgressTone, string> = {
  progress: "bg-action-primary",
  done: "bg-emphasis",
  error: "bg-danger",
};

/**
 * Determinate progress bar. Deliberately a plain percentage width: the values
 * arrive in coarse steps (one per round-trip), so there is nothing here that
 * would justify pulling in Reanimated.
 */
export function ProgressBar({ ratio, tone = "progress", className }: ProgressBarProps) {
  const safe = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
  const percent = Math.round(safe * 100);

  return (
    <View
      className={cx("h-2 rounded-full bg-surface-muted overflow-hidden", className)}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent, text: `${percent}%` }}
    >
      <View className={cx("h-full rounded-full", FILL_CLASS[tone])} style={{ width: `${percent}%` }} />
    </View>
  );
}
