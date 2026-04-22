import { formatScore } from "./scoring";
import type { ExecutionBlock, RankedLane } from "./types";

function section(title: string, items: RankedLane[]) {
  if (!items.length) return `${title}\n- None`;
  return `${title}\n${items.map((item) => `- ${item.name} (${formatScore(item.score)})`).join("\n")}`;
}

export function buildDecisionSummary(params: {
  topFocus?: RankedLane;
  ranked: RankedLane[];
  executionBlock: ExecutionBlock;
  phaseNote: string;
  lastReviewed: string;
}) {
  const { topFocus, ranked, executionBlock, phaseNote, lastReviewed } = params;

  return [
    "ROI DECISION COCKPIT",
    `Reviewed: ${lastReviewed}`,
    "",
    `Top focus: ${topFocus?.name || "None selected"}`,
    `Score: ${topFocus ? `${formatScore(topFocus.score)} / 5` : "0.00 / 5"}`,
    topFocus?.nextAction ? `Next action: ${topFocus.nextAction}` : "",
    "",
    section(
      "Do Tomorrow",
      ranked.filter((item) => item.status === "tomorrow")
    ),
    "",
    section(
      "Pause 7 Days",
      ranked.filter((item) => item.status === "pause")
    ),
    "",
    section(
      "Low Energy / Delegate",
      ranked.filter((item) => item.status === "delegate")
    ),
    "",
    "Execution Block",
    `Task: ${executionBlock.task}`,
    `Success metric: ${executionBlock.success}`,
    `Start point: ${executionBlock.start}`,
    `Stop point: ${executionBlock.stop}`,
    `When: ${executionBlock.when}`,
    "",
    `Phase promise: ${phaseNote}`
  ]
    .filter(Boolean)
    .join("\n");
}
