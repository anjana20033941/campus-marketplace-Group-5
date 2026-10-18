import { ItemCondition } from "./types";

export const CONDITIONS: ItemCondition[] = [
  "All conditions",
  "Brand new",
  "Like new",
  "Good condition",
  "Fair condition",
];

export const CONDITION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Brand new": { bg: "#E8F8F2", text: "#167954", border: "#B7E7D4" },
  "Like new": { bg: "#EBF5FB", text: "#2471A3", border: "#AED6F1" },
  "Good condition": { bg: "#FEF9E7", text: "#B7950B", border: "#F9E79F" },
  "Fair condition": { bg: "#FBEEE6", text: "#BA4A00", border: "#EDBB99" },
  default: { bg: "#F2F4F3", text: "#5D6D66", border: "#D5DCD8" },
};
