import { View, Text, ScrollView, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Line, Polyline, Circle, Rect, Text as SvgText, G } from "react-native-svg";
import { useStatsData } from "../../src/api/hooks";
import type { SessionDetailFull } from "@bhmt3wp/shared";

const PRIMARY = "#6c63ff";
const ACCENT = "#00d4aa";
const TEXT_SECONDARY = "#a0a0b0";
const TEXT_MUTED = "#6b6b7b";

// ─── helpers ──────────────────────────────────────────────────────────────────

function sessionVolume(session: SessionDetailFull): number {
  return session.exercises.reduce((total, group) => {
    return (
      total +
      group.sets.reduce((setTotal, set) => setTotal + set.weightKg * set.reps, 0)
    );
  }, 0);
}

function buildMaxWeightMap(sessions: SessionDetailFull[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const session of sessions) {
    for (const group of session.exercises) {
      const maxInGroup = group.sets.reduce(
        (m, set) => Math.max(m, set.weightKg),
        0,
      );
      map.set(group.exerciseName, Math.max(map.get(group.exerciseName) ?? 0, maxInGroup));
    }
  }
  return map;
}

// ─── Volume line chart ─────────────────────────────────────────────────────────

interface VolumeChartProps {
  sessions: SessionDetailFull[];
  width: number;
}

function VolumeChart({ sessions, width }: VolumeChartProps) {
  const PADDING = { top: 20, right: 16, bottom: 36, left: 52 };
  const height = 200;
  const chartW = width - PADDING.left - PADDING.right;
  const chartH = height - PADDING.top - PADDING.bottom;

  const volumes = sessions.map(sessionVolume);
  const maxVol = Math.max(...volumes, 1);
  const n = volumes.length;

  const xScale = (i: number) => (n <= 1 ? chartW / 2 : (i / (n - 1)) * chartW);
  const yScale = (v: number) => chartH - (v / maxVol) * chartH;

  const points = volumes
    .map((v, i) => `${xScale(i)},${yScale(v)}`)
    .join(" ");

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: yScale(maxVol * t),
    label: Math.round(maxVol * t).toString(),
  }));

  return (
    <Svg width={width} height={height}>
      <Line
        x1={PADDING.left}
        y1={PADDING.top}
        x2={PADDING.left}
        y2={PADDING.top + chartH}
        stroke={TEXT_MUTED}
        strokeWidth={1}
      />
      <Line
        x1={PADDING.left}
        y1={PADDING.top + chartH}
        x2={PADDING.left + chartW}
        y2={PADDING.top + chartH}
        stroke={TEXT_MUTED}
        strokeWidth={1}
      />
      {yTicks.map(({ y, label }) => (
        <SvgText
          key={label}
          x={PADDING.left - 6}
          y={PADDING.top + y + 4}
          fill={TEXT_SECONDARY}
          fontSize={10}
          textAnchor="end"
        >
          {label}
        </SvgText>
      ))}
      {volumes.map((_, i) => (
        <SvgText
          key={i}
          x={PADDING.left + xScale(i)}
          y={PADDING.top + chartH + 16}
          fill={TEXT_SECONDARY}
          fontSize={10}
          textAnchor="middle"
        >
          {i + 1}
        </SvgText>
      ))}
      {n > 1 && (
        <Polyline
          points={points}
          fill="none"
          stroke={PRIMARY}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          transform={`translate(${PADDING.left},${PADDING.top})`}
        />
      )}
      {volumes.map((v, i) => (
        <Circle
          key={i}
          cx={PADDING.left + xScale(i)}
          cy={PADDING.top + yScale(v)}
          r={4}
          fill={PRIMARY}
        />
      ))}
    </Svg>
  );
}

// ─── Max weight bar chart ──────────────────────────────────────────────────────

interface BarChartProps {
  sessions: SessionDetailFull[];
  width: number;
}

function MaxWeightChart({ sessions, width }: BarChartProps) {
  const maxWeightMap = buildMaxWeightMap(sessions);
  const sorted = [...maxWeightMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  if (sorted.length === 0) return null;

  const LABEL_WIDTH = 110;
  const VALUE_WIDTH = 36;
  const BAR_AREA = width - LABEL_WIDTH - VALUE_WIDTH - 8;
  const ROW_HEIGHT = 28;
  const BAR_HEIGHT = 16;
  const PADDING_TOP = 8;
  const height = sorted.length * ROW_HEIGHT + PADDING_TOP * 2;

  const maxVal = sorted[0][1];

  return (
    <Svg width={width} height={height}>
      {sorted.map(([name, val], i) => {
        const barW = maxVal > 0 ? (val / maxVal) * BAR_AREA : 0;
        const y = PADDING_TOP + i * ROW_HEIGHT;
        const barY = y + (ROW_HEIGHT - BAR_HEIGHT) / 2;
        const displayName = name.length > 14 ? name.slice(0, 13) + "…" : name;

        return (
          <G key={name}>
            <SvgText
              x={0}
              y={y + ROW_HEIGHT / 2 + 4}
              fill={TEXT_SECONDARY}
              fontSize={11}
              textAnchor="start"
            >
              {displayName}
            </SvgText>
            <Rect
              x={LABEL_WIDTH}
              y={barY}
              width={BAR_AREA}
              height={BAR_HEIGHT}
              rx={4}
              fill="#25253d"
            />
            <Rect
              x={LABEL_WIDTH}
              y={barY}
              width={barW}
              height={BAR_HEIGHT}
              rx={4}
              fill={ACCENT}
            />
            <SvgText
              x={LABEL_WIDTH + BAR_AREA + 6}
              y={y + ROW_HEIGHT / 2 + 4}
              fill={TEXT_SECONDARY}
              fontSize={11}
              textAnchor="start"
            >
              {val}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const { sessions, isLoading } = useStatsData();
  const { width } = useWindowDimensions();
  const chartWidth = Math.min(width - 40, 360);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-text-primary text-2xl font-bold mb-1">
          📊 Statistics
        </Text>
        <Text className="text-text-secondary text-sm mb-6">
          Last {Math.min(sessions.length, 10)} completed sessions
        </Text>

        {isLoading ? (
          <View className="items-center justify-center py-20">
            <Text className="text-text-secondary text-base">Loading stats…</Text>
          </View>
        ) : sessions.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Text className="text-text-muted text-base text-center">
              No completed sessions yet.
            </Text>
          </View>
        ) : (
          <>
            {/* Volume over time */}
            <View className="bg-surface rounded-2xl p-4 mb-5 border border-border">
              <Text className="text-text-primary text-base font-bold mb-1">
                Volume over time
              </Text>
              <Text className="text-text-muted text-xs mb-4">
                Total kg·reps per session
              </Text>
              <VolumeChart sessions={sessions} width={chartWidth} />
            </View>

            {/* Max weight per exercise */}
            <View className="bg-surface rounded-2xl p-4 border border-border">
              <Text className="text-text-primary text-base font-bold mb-1">
                Max weight per exercise
              </Text>
              <Text className="text-text-muted text-xs mb-4">
                Heaviest set logged (kg) · top 8
              </Text>
              <MaxWeightChart sessions={sessions} width={chartWidth} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
