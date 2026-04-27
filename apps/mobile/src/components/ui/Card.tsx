import { View, type ViewProps } from "react-native";
import { cx } from "./utils";

type CardVariant = "default" | "muted" | "outline";
type CardPadding = "none" | "sm" | "md" | "lg";

const VARIANT_CLASS: Record<CardVariant, string> = {
  default: "bg-surface border border-border",
  muted: "bg-surface-muted border border-border",
  outline: "bg-transparent border border-border",
};

const PADDING_CLASS: Record<CardPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

type CardProps = ViewProps & {
  className?: string;
  variant?: CardVariant;
  padding?: CardPadding;
};

export function Card({ className, variant = "default", padding = "md", ...props }: CardProps) {
  return (
    <View
      {...props}
      className={cx("rounded-2xl", VARIANT_CLASS[variant], PADDING_CLASS[padding], className)}
    />
  );
}
