export interface MemberColor {
  name: string;
  primary: string;
  badgeBg: string;
  border: string;
  text: string;
}

export const MEMBER_COLOR_PALETTE: MemberColor[] = [
  {
    name: "Leader Slate",
    primary: "#6366f1",
    badgeBg: "rgba(99, 102, 241, 0.15)",
    border: "#6366f1",
    text: "#818cf8",
  },
  {
    name: "Emerald Coder",
    primary: "#10b981",
    badgeBg: "rgba(16, 185, 129, 0.15)",
    border: "#10b981",
    text: "#34d399",
  },
  {
    name: "Amber Reviewer",
    primary: "#f59e0b",
    badgeBg: "rgba(245, 158, 11, 0.15)",
    border: "#f59e0b",
    text: "#fbbf24",
  },
  {
    name: "Sky Architect",
    primary: "#0ea5e9",
    badgeBg: "rgba(14, 165, 233, 0.15)",
    border: "#0ea5e9",
    text: "#38bdf8",
  },
  {
    name: "Rose Tester",
    primary: "#f43f5e",
    badgeBg: "rgba(244, 63, 94, 0.15)",
    border: "#f43f5e",
    text: "#fb7185",
  },
  {
    name: "Purple Specialist",
    primary: "#a855f7",
    badgeBg: "rgba(168, 85, 247, 0.15)",
    border: "#a855f7",
    text: "#c084fc",
  },
];

export function getSlotColor(index: number): MemberColor {
  return MEMBER_COLOR_PALETTE[index % MEMBER_COLOR_PALETTE.length]!;
}
