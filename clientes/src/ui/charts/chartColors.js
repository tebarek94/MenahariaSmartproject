/** Distinct hues for status / category charts */
export const CHART_PALETTE = [
  "#4A90E2",
  "#F5A623",
  "#7ED321",
  "#9B59B6",
  "#E74C3C",
  "#1ABC9C",
  "#34495E",
  "#E67E22",
];

export function colorAt(i) {
  return CHART_PALETTE[i % CHART_PALETTE.length];
}
