import { formatScore } from "./scoring";
import type { CompletedLane, ExecutionBlock, RankedLane } from "./types";

function section(title: string, items: RankedLane[]) {
  if (!items.length) return `${title}\n- None`;
  return `${title}\n${items.map((item) => `- ${item.name} (${formatScore(item.score)})`).join("\n")}`;
}

export function buildDecisionSummary(params: {
  topFocus?: RankedLane;
  ranked: RankedLane[];
  completedToday: CompletedLane[];
  executionBlock: ExecutionBlock;
  phaseNote: string;
  lastReviewed: string;
}) {
  const { topFocus, ranked, completedToday, executionBlock, phaseNote, lastReviewed } = params;

  return [
    "ROI DECISION COCKPIT",
    `Reviewed: ${lastReviewed}`,
    "",
    `Top focus: ${topFocus?.name || "None selected"}`,
    `Score: ${topFocus ? `${formatScore(topFocus.score)} / 5` : "0.00 / 5"}`,
    topFocus?.nextAction ? `Next action: ${topFocus.nextAction}` : "",
    "",
    section(
      "Today / DO ASAP",
      ranked.filter((item) => item.status === "tomorrow")
    ),
    "",
    section(
      "Later",
      ranked.filter((item) => item.status !== "tomorrow")
    ),
    "",
    completedToday.length
      ? `Completed Today\n${completedToday.map((item) => `- ${item.name} (${item.completedAt})`).join("\n")}`
      : "Completed Today\n- None yet",
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
