"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronRight,
  Clipboard,
  Copy,
  Download,
  Moon,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Sun,
  Target,
  Trash2,
  Upload,
  X
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PHASE_NOTE, STATUS_OPTIONS, STORAGE_KEY, createId, getDefaultItems, laneMeta, starterFor } from "@/lib/defaults";
import { buildDecisionSummary } from "@/lib/summary";
import { formatScore, rankLanes, scoreLabel } from "@/lib/scoring";
import type { CockpitState, CompletedLane, ExecutionBlock, Lane, LaneStatus, RankedLane, ScoreKey } from "@/lib/types";

type SaveState = "loading" | "saved" | "saving";
type ButtonVariant = "primary" | "quiet" | "danger";

const scoreCopy: Record<ScoreKey, { label: string; weight: string; hint: string; tone: string }> = {
  revenue: {
    label: "Revenue upside",
    weight: "35%",
    hint: "Will this move money, conversion, or leverage?",
    tone: "bg-moss"
  },
  urgency: {
    label: "Urgency",
    weight: "25%",
    hint: "Does waiting cost momentum or money?",
    tone: "bg-clay"
  },
  confidence: {
    label: "Conviction",
    weight: "20%",
    hint: "How strong is the evidence behind this call? 1 = hunch, 5 = proven signal.",
    tone: "bg-[#52747a]"
  },
  speed: {
    label: "Speed to feedback",
    weight: "20%",
    hint: "Will this show a useful signal quickly?",
    tone: "bg-saffron"
  }
};

function reviewStamp() {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date());
}

function completionStamp() {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date());
}

function laneStamp() {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric"
  }).format(new Date());
}

function initialState(): CockpitState {
  const items = getDefaultItems();
  const ranked = rankLanes(items);
  const focus = ranked.find((item) => item.status === "tomorrow") || ranked[0];

  return {
    items,
    completedToday: [],
    selectedId: focus?.id || items[0]?.id || "",
    phaseNote: PHASE_NOTE,
    executionBlock: starterFor(focus?.name || ""),
    theme: "light",
    onboardingDismissed: false,
    lastReviewed: reviewStamp()
  };
}

function isLaneStatus(value: unknown): value is LaneStatus {
  return value === "tomorrow" || value === "pause" || value === "delegate" || value === "hold";
}

function clampScore(value: unknown) {
  const number = typeof value === "number" && Number.isFinite(value) ? value : 3;
  return Math.min(5, Math.max(1, Math.round(number)));
}

function sanitizeLane(value: unknown, fallbackId: string): Lane | null {
  if (!value || typeof value !== "object") return null;
  const lane = value as Partial<Lane>;
  const name = typeof lane.name === "string" ? lane.name : "";
  if (!name.trim()) return null;

  return {
    id: typeof lane.id === "string" && lane.id ? lane.id : fallbackId,
    name,
    evidence: typeof lane.evidence === "string" ? lane.evidence : "",
    laneNote: typeof lane.laneNote === "string" ? lane.laneNote : "",
    timeRequired: typeof lane.timeRequired === "string" ? lane.timeRequired : "",
    nextAction: typeof lane.nextAction === "string" ? lane.nextAction : "",
    revenue: clampScore(lane.revenue),
    urgency: clampScore(lane.urgency),
    confidence: clampScore(lane.confidence),
    speed: clampScore(lane.speed),
    status: isLaneStatus(lane.status) ? lane.status : "hold",
    updatedAt: typeof lane.updatedAt === "string" && lane.updatedAt ? lane.updatedAt : laneStamp(),
    reviewHint: typeof lane.reviewHint === "string" ? lane.reviewHint : ""
  };
}

function sanitizeCompleted(value: unknown, fallbackId: string): CompletedLane | null {
  const lane = sanitizeLane(value, fallbackId);
  if (!lane || !value || typeof value !== "object") return null;
  const completedAt = (value as Partial<CompletedLane>).completedAt;

  return {
    ...lane,
    completedAt: typeof completedAt === "string" && completedAt ? completedAt : completionStamp()
  };
}

function sanitizeSavedState(saved: Partial<CockpitState> | null): CockpitState | null {
  if (!saved || !Array.isArray(saved.items)) return null;
  const fallback = initialState();
  const items = saved.items
    .map((item, index) => sanitizeLane(item, `saved-lane-${index}`))
    .filter((item): item is Lane => Boolean(item));
  const completedToday = Array.isArray(saved.completedToday)
    ? saved.completedToday
        .map((item, index) => sanitizeCompleted(item, `completed-lane-${index}`))
        .filter((item): item is CompletedLane => Boolean(item))
    : [];
  const selectedId = typeof saved.selectedId === "string" && items.some((item) => item.id === saved.selectedId)
    ? saved.selectedId
    : items[0]?.id || "";

  if (saved.items.length > 0 && items.length === 0) {
    return { ...fallback, completedToday };
  }

  return {
    items,
    completedToday,
    selectedId,
    phaseNote: saved.phaseNote || PHASE_NOTE,
    executionBlock: saved.executionBlock || fallback.executionBlock,
    theme: saved.theme === "dark" ? "dark" : "light",
    onboardingDismissed: Boolean(saved.onboardingDismissed),
    lastReviewed: saved.lastReviewed || reviewStamp()
  };
}

function statusStyle(status: LaneStatus) {
  switch (status) {
    case "tomorrow":
      return "border border-moss/35 bg-moss/10 text-moss dark:text-[#a7c69b]";
    case "pause":
      return "border border-clay/30 bg-clay/10 text-clay dark:text-[#f1ad90]";
    case "delegate":
      return "border border-saffron/35 bg-saffron/10 text-[#765820] dark:text-[#f2d28d]";
    default:
      return "border border-ink/10 bg-white/50 text-ink/70 dark:border-white/10 dark:bg-white/[0.05] dark:text-paper/70";
  }
}

function statusLabel(status: LaneStatus) {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label || "Hold";
}

function copyLane(item: Lane): Lane {
  return {
    ...item,
    id: createId(),
    name: `${item.name} Copy`
  };
}

function TooltipButton({
  children,
  description,
  onClick,
  variant = "quiet",
  type = "button"
}: {
  children: ReactNode;
  description: string;
  onClick?: () => void;
  variant?: ButtonVariant;
  type?: "button" | "submit";
}) {
  const variants = {
    primary: "bg-ink text-paper hover:opacity-90 dark:bg-paper dark:text-ink",
    quiet:
      "border border-ink/10 bg-white/60 text-ink/70 hover:bg-white dark:border-white/10 dark:bg-white/[0.05] dark:text-paper/70",
    danger: "border border-clay/35 bg-clay/10 text-clay hover:bg-clay/15 dark:text-[#f1ad90]"
  };

  return (
    <span className="group relative inline-flex">
      <button
        className={`inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition ${variants[variant]}`}
        onClick={onClick}
        title={description}
        type={type}
      >
        {children}
      </button>
      <span className="pointer-events-none absolute right-0 top-full z-20 mt-2 hidden w-56 rounded-lg border border-ink/10 bg-ink px-3 py-2 text-xs font-medium leading-5 text-paper shadow-soft group-hover:block group-focus-within:block dark:border-white/10 dark:bg-paper dark:text-ink">
        {description}
      </span>
    </span>
  );
}

function SliderRow({
  scoreKey,
  value,
  onChange
}: {
  scoreKey: ScoreKey;
  value: number;
  onChange: (value: number) => void;
}) {
  const copy = scoreCopy[scoreKey];
  const width = `${((value - 1) / 4) * 100}%`;

  return (
    <div className="rounded-lg border border-ink/10 bg-paper/70 p-4 dark:border-white/10 dark:bg-ink/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-ink dark:text-paper">{copy.label}</span>
            <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-xs text-ink/55 dark:bg-white/10 dark:text-paper/60">
              {copy.weight}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-ink/55 dark:text-paper/55">{copy.hint}</p>
        </div>
        <span className="min-w-12 rounded-full border border-ink/10 px-2 py-1 text-center text-sm font-semibold text-ink dark:border-white/10 dark:text-paper">
          {value}/5
        </span>
      </div>
      <div className="relative mt-3 h-8">
        <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-ink/10 dark:bg-white/10" />
        <div className={`absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full ${copy.tone}`} style={{ width }} />
        <input
          aria-label={copy.label}
          className="absolute inset-0 h-8 w-full cursor-pointer appearance-none bg-transparent"
          max={5}
          min={1}
          onChange={(event) => onChange(Number(event.target.value))}
          step={1}
          type="range"
          value={value}
        />
      </div>
    </div>
  );
}

function RankedLaneButton({
  item,
  index,
  selected,
  onSelect,
  onDone
}: {
  item: RankedLane;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onDone: () => void;
}) {
  const meta = laneMeta[item.name];
  const Icon = meta?.icon || Target;
  const label = scoreLabel(item.score);
  const isLater = item.status !== "tomorrow";

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <div
        className={`group rounded-lg border bg-white/60 transition dark:bg-white/[0.045] ${
          selected
            ? "border-ink/25 shadow-cockpit dark:border-white/20 dark:bg-white/[0.09]"
            : "border-ink/10 hover:border-ink/20 hover:bg-white dark:border-white/10 dark:hover:bg-white/[0.075]"
        }`}
      >
        <div className="flex items-start gap-3 p-4">
          <button
            aria-label={`Select ${item.name}`}
            className={`mt-1 rounded-lg p-2.5 text-white ${meta?.accent || "bg-dusk"}`}
            onClick={onSelect}
            title={`Edit ${item.name}`}
            type="button"
          >
            <Icon className="h-4 w-4" />
          </button>
          <button className="min-w-0 flex-1 text-left" onClick={onSelect} type="button">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-ink/10 px-2 py-0.5 text-xs font-medium text-ink/55 dark:border-white/10 dark:text-paper/55">
                #{index + 1}
              </span>
              {index === 0 ? (
                <span className="rounded-full border border-saffron/45 bg-saffron/10 px-2 py-0.5 text-xs font-semibold text-[#765820] dark:text-[#f2d28d]">
                  Top move
                </span>
              ) : null}
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle(item.status)}`}>
                {statusLabel(item.status)}
              </span>
            </div>
            <div className="mt-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-ink dark:text-paper">{item.name || "Untitled lane"}</h3>
                <p className="mt-1 line-clamp-2 text-sm leading-5 text-ink/55 dark:text-paper/55">
                  {item.nextAction || meta?.suggestion || "Add the next move to make this lane executable."}
                </p>
                <p className="mt-2 text-xs text-ink/40 dark:text-paper/40">
                  Updated {item.updatedAt || "today"}
                  {isLater && item.reviewHint ? ` · ${item.reviewHint}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xl font-semibold tabular-nums text-ink dark:text-paper">{formatScore(item.score)}</div>
                <div className="text-xs text-ink/50 dark:text-paper/50">{label}</div>
              </div>
            </div>
          </button>
          <ChevronRight className="mt-8 h-4 w-4 shrink-0 text-ink/30 transition group-hover:translate-x-0.5 dark:text-paper/30" />
        </div>
        <div className="flex items-center justify-between border-t border-ink/10 px-4 py-3 dark:border-white/10">
          <div className="text-xs text-ink/45 dark:text-paper/45">{isLater ? "Bring it forward when ready" : "Finished this?"}</div>
          <button
            className="inline-flex items-center gap-1.5 rounded-full bg-moss px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
            onClick={onDone}
            title="Move this lane out of active work and into Completed today."
            type="button"
          >
            <Check className="h-3.5 w-3.5" />
            Done
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  multiline = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const className =
    "w-full rounded-lg border border-ink/10 bg-white/75 px-4 py-3 text-sm leading-6 text-ink shadow-sm outline-none transition placeholder:text-ink/35 focus:border-saffron dark:border-white/10 dark:bg-white/[0.055] dark:text-paper dark:placeholder:text-paper/35";

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-ink/70 dark:text-paper/70">{label}</span>
      {multiline ? (
        <textarea className={`${className} min-h-[96px]`} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} />
      ) : (
        <input className={className} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} />
      )}
    </label>
  );
}

function LaneEditor({
  item,
  onUpdate,
  onDuplicate,
  onDone,
  onDelete
}: {
  item: RankedLane;
  onUpdate: (patch: Partial<Lane>) => void;
  onDuplicate: () => void;
  onDone: () => void;
  onDelete: () => void;
}) {
  return (
    <section className="rounded-lg border border-ink/10 bg-white/70 p-5 shadow-cockpit backdrop-blur dark:border-white/10 dark:bg-white/[0.055]">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-ink/45 dark:text-paper/45">Tune this lane</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink dark:text-paper">{item.name || "Untitled lane"}</h2>
          <p className="mt-2 text-sm leading-6 text-ink/55 dark:text-paper/55">
            Only edit what changes the call. Good enough beats complete.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex items-center justify-center gap-2 rounded-full bg-moss px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            onClick={onDone}
            title="Mark this lane complete and move it to Completed today."
            type="button"
          >
            <Check className="h-4 w-4" />
            Done
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-full border border-ink/10 bg-white/70 px-3 py-2 text-sm text-ink/70 transition hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-paper/70"
            onClick={onDuplicate}
            title="Create a copy of this lane in the active list."
            type="button"
          >
            <Copy className="h-4 w-4" />
            Duplicate
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-full border border-clay/30 bg-clay/10 px-3 py-2 text-sm font-semibold text-clay transition hover:bg-clay/15 dark:text-[#f1ad90]"
            onClick={onDelete}
            title="Delete only this lane from the active list."
            type="button"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        <TextField label="Lane name" onChange={(name) => onUpdate({ name })} placeholder="Ex: Partner outreach" value={item.name} />
        <TextField
          label="Why now"
          multiline
          onChange={(evidence) => onUpdate({ evidence })}
          placeholder="Context, timing, or the reason this is worth doing now."
          value={item.evidence}
        />
        <TextField
          label="Lane memory"
          multiline
          onChange={(laneNote) => onUpdate({ laneNote })}
          placeholder="Tiny note for later: what changed, why parked, or what to check next."
          value={item.laneNote || ""}
        />
        <div className="grid gap-4 md:grid-cols-[0.55fr_1fr]">
          <TextField
            label="Time"
            onChange={(timeRequired) => onUpdate({ timeRequired })}
            placeholder="45-75 min"
            value={item.timeRequired}
          />
          <TextField
            label="Move"
            onChange={(nextAction) => onUpdate({ nextAction })}
            placeholder="One move only"
            value={item.nextAction}
          />
        </div>

        <div className="rounded-lg border border-saffron/35 bg-saffron/15 p-4 text-sm leading-6 text-ink/70 dark:text-paper/70">
          <strong className="text-ink dark:text-paper">Conviction check:</strong> 1 is a hunch. 3 has some signal. 5 has
          hard evidence or a pattern you trust.
        </div>

        <div className="grid gap-3">
          {(["revenue", "urgency", "confidence", "speed"] as ScoreKey[]).map((scoreKey) => (
            <SliderRow
              key={scoreKey}
              scoreKey={scoreKey}
              value={item[scoreKey]}
              onChange={(value) => onUpdate({ [scoreKey]: value })}
            />
          ))}
        </div>

        <div>
          <div className="mb-2 text-sm font-medium text-ink/70 dark:text-paper/70">Call</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {STATUS_OPTIONS.map((option) => (
              <button
                className={`rounded-lg border px-4 py-3 text-left transition ${
                  item.status === option.value
                    ? "border-ink bg-ink text-paper dark:border-paper dark:bg-paper dark:text-ink"
                    : "border-ink/10 bg-white/60 text-ink/70 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-paper/70"
                }`}
                key={option.value}
                onClick={() => onUpdate({ status: option.value })}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">{option.label}</span>
                  {item.status === option.value ? <Check className="h-4 w-4" /> : null}
                </div>
                <div className="mt-1 text-xs opacity-70">{option.hint}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ExecutionBuilder({
  focus,
  block,
  onChange
}: {
  focus?: RankedLane;
  block: ExecutionBlock;
  onChange: (patch: Partial<ExecutionBlock>) => void;
}) {
  return (
    <section className="rounded-lg border border-ink/10 bg-ink p-5 text-paper shadow-cockpit dark:border-white/10 dark:bg-paper dark:text-ink">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-paper/50 dark:text-ink/50">Next block</p>
          <h2 className="mt-1 text-2xl font-semibold">Make it startable</h2>
          <p className="mt-2 text-sm leading-6 text-paper/62 dark:text-ink/62">
            This should be clear enough to begin without re-deciding.
          </p>
        </div>
        <span className="rounded-full bg-saffron px-3 py-1 text-xs font-semibold text-ink">
          {focus?.name || "No lane"}
        </span>
      </div>
      <div className="grid gap-3">
        <DarkField label="The move" onChange={(task) => onChange({ task })} value={block.task} />
        <DarkField label="Done when" onChange={(success) => onChange({ success })} value={block.success} />
        <DarkField label="Open with" onChange={(start) => onChange({ start })} value={block.start} />
        <DarkField label="Stop at" onChange={(stop) => onChange({ stop })} value={block.stop} />
        <DarkField label="Time" onChange={(when) => onChange({ when })} singleLine value={block.when} />
      </div>
    </section>
  );
}

function DarkField({
  label,
  value,
  onChange,
  singleLine = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  singleLine?: boolean;
}) {
  const className =
    "w-full rounded-lg border border-paper/10 bg-paper/[0.07] px-4 py-3 text-sm leading-6 text-paper outline-none transition placeholder:text-paper/30 focus:border-saffron dark:border-ink/10 dark:bg-ink/[0.06] dark:text-ink dark:placeholder:text-ink/30";

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-paper/65 dark:text-ink/65">{label}</span>
      {singleLine ? (
        <input className={className} onChange={(event) => onChange(event.target.value)} value={value} />
      ) : (
        <textarea className={`${className} min-h-[78px]`} onChange={(event) => onChange(event.target.value)} value={value} />
      )}
    </label>
  );
}

function OnboardingModal({
  open,
  onClose,
  onStart
}: {
  open: boolean;
  onClose: () => void;
  onStart: () => void;
}) {
  const steps = [
    {
      title: "Pick a lane",
      body: "Start with the ranked list. The highest lane is only a suggestion; choose the one you actually need to decide."
    },
    {
      title: "Score it honestly",
      body: "Use the sliders as a quick gut-check. A 5 should have proof, not just pressure."
    },
    {
      title: "Leave with one block",
      body: "The app turns the top DO ASAP lane into a startable work block. Edit it until future-you can begin."
    }
  ];

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 px-4 py-4 backdrop-blur-sm sm:items-center"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
        >
          <motion.section
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-2xl rounded-lg border border-ink/10 bg-paper p-5 shadow-cockpit dark:border-white/10 dark:bg-ink"
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.22 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-saffron px-3 py-1 text-xs font-semibold text-ink">
                  <Sparkles className="h-3.5 w-3.5" />
                  Start here
                </div>
                <h2 className="text-3xl font-semibold text-ink dark:text-paper">Make one clean call.</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-ink/62 dark:text-paper/62">
                  This is a 10-minute ritual for protecting your best hour. You do not need to fill in every field.
                </p>
              </div>
              <button
                aria-label="Close onboarding"
                className="rounded-full border border-ink/10 p-2 text-ink/55 transition hover:bg-white dark:border-white/10 dark:text-paper/55 dark:hover:bg-white/[0.06]"
                onClick={onClose}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {steps.map((step, index) => (
                <div className="rounded-lg border border-ink/10 bg-white/62 p-4 dark:border-white/10 dark:bg-white/[0.055]" key={step.title}>
                  <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-ink text-sm font-semibold text-paper dark:bg-paper dark:text-ink">
                    {index + 1}
                  </div>
                  <h3 className="text-base font-semibold text-ink dark:text-paper">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink/58 dark:text-paper/58">{step.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                className="rounded-full px-4 py-3 text-sm font-semibold text-ink/58 transition hover:text-ink dark:text-paper/58 dark:hover:text-paper"
                onClick={onClose}
                type="button"
              >
                Skip
              </button>
              <button
                className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper transition hover:opacity-90 dark:bg-paper dark:text-ink"
                onClick={onStart}
                type="button"
              >
                Start the pass
              </button>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function TopDecision({
  focus,
  block,
  todayCount,
  notNowCount,
  savedLabel,
  lastReviewed
}: {
  focus?: RankedLane;
  block: ExecutionBlock;
  todayCount: number;
  notNowCount: number;
  savedLabel: string;
  lastReviewed: string;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-ink/10 bg-ink text-paper shadow-cockpit dark:border-white/10 dark:bg-paper dark:text-ink">
      <div className="grid gap-0 lg:grid-cols-[1fr_340px]">
        <div className="p-5 sm:p-7">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-paper/15 px-3 py-1 text-xs font-semibold text-paper/75 dark:border-ink/15 dark:text-ink/75">
              Today&apos;s call
            </span>
            <span className="rounded-full border border-paper/15 px-3 py-1 text-xs text-paper/65 dark:border-ink/15 dark:text-ink/65">
              {savedLabel}
            </span>
            <span className="rounded-full border border-paper/15 px-3 py-1 text-xs text-paper/65 dark:border-ink/15 dark:text-ink/65">
              {lastReviewed}
            </span>
          </div>
          <p className="text-sm font-medium uppercase text-paper/46 dark:text-ink/46">Work on this first</p>
          <h2 className="mt-2 max-w-3xl text-4xl font-semibold sm:text-5xl">
            {focus?.name || "Choose one lane"}
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-paper/70 dark:text-ink/70">
            {focus?.nextAction || "Pick the lane with the clearest upside, then define the next move tightly enough to begin."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <div className="rounded-lg border border-paper/12 bg-paper/[0.07] px-4 py-3 dark:border-ink/10 dark:bg-ink/[0.055]">
              <div className="text-xs uppercase text-paper/45 dark:text-ink/45">Score</div>
              <div className="mt-1 text-3xl font-semibold tabular-nums">{focus ? formatScore(focus.score) : "0.00"}</div>
            </div>
            <div className="rounded-lg border border-paper/12 bg-paper/[0.07] px-4 py-3 dark:border-ink/10 dark:bg-ink/[0.055]">
              <div className="text-xs uppercase text-paper/45 dark:text-ink/45">Read</div>
              <div className="mt-1 text-3xl font-semibold">{focus ? scoreLabel(focus.score) : "None"}</div>
            </div>
            <div className="rounded-lg border border-paper/12 bg-paper/[0.07] px-4 py-3 dark:border-ink/10 dark:bg-ink/[0.055]">
              <div className="text-xs uppercase text-paper/45 dark:text-ink/45">Today</div>
              <div className="mt-1 text-3xl font-semibold">{todayCount}</div>
              <div className="mt-1 text-xs text-paper/48 dark:text-ink/48">
                {todayCount > 2 ? "Trim to 1-2" : "Active list"}
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-paper/10 bg-paper/[0.06] p-5 dark:border-ink/10 dark:bg-ink/[0.05] lg:border-l lg:border-t-0">
          <p className="text-xs font-semibold uppercase text-paper/50 dark:text-ink/50">Next block</p>
          <h3 className="mt-3 text-xl font-semibold leading-7">{block.task}</h3>
          <div className="mt-4 space-y-3 text-sm leading-6 text-paper/68 dark:text-ink/68">
            <p>
              <span className="font-semibold text-paper dark:text-ink">Start:</span> {block.start}
            </p>
            <p>
              <span className="font-semibold text-paper dark:text-ink">Stop:</span> {block.stop}
            </p>
          </div>
          <div className="mt-5 rounded-lg border border-paper/10 bg-paper/[0.07] px-4 py-3 text-sm font-semibold leading-6 text-paper/80 dark:border-ink/10 dark:bg-ink/[0.055] dark:text-ink/80">
            {notNowCount > 0
              ? `${notNowCount} lane${notNowCount === 1 ? "" : "s"} intentionally out of prime time`
              : "Cut at least one lane before you call it done"}
          </div>
        </div>
      </div>
    </section>
  );
}

function CompletedToday({
  items,
  onRestore
}: {
  items: CompletedLane[];
  onRestore: (id: string) => void;
}) {
  return (
    <section className="rounded-lg border border-moss/25 bg-moss/10 p-5 shadow-soft dark:border-moss/35 dark:bg-moss/10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-moss dark:text-[#a7c69b]">Progress</p>
          <h2 className="mt-1 text-2xl font-semibold">Completed today</h2>
        </div>
        <span className="rounded-full border border-moss/25 px-3 py-1 text-sm font-semibold text-moss dark:text-[#a7c69b]">
          {items.length}
        </span>
      </div>
      <div className="space-y-2">
        {items.length ? (
          items.map((item) => (
            <div
              className="flex items-start justify-between gap-3 rounded-lg border border-moss/20 bg-white/65 px-3 py-3 text-sm dark:bg-white/[0.045]"
              key={`${item.id}-${item.completedAt}`}
            >
              <div className="min-w-0">
                <div className="truncate font-semibold text-ink dark:text-paper">{item.name}</div>
                <div className="mt-1 text-xs text-ink/50 dark:text-paper/50">Done {item.completedAt}</div>
              </div>
              <button
                className="shrink-0 rounded-full border border-ink/10 px-3 py-1.5 text-xs font-semibold text-ink/60 transition hover:bg-white dark:border-white/10 dark:text-paper/60 dark:hover:bg-white/[0.06]"
                onClick={() => onRestore(item.id)}
                title="Move this item back into the active list."
                type="button"
              >
                Undo
              </button>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-moss/25 px-3 py-3 text-sm leading-6 text-ink/55 dark:text-paper/55">
            Mark a lane Done and it will land here.
          </div>
        )}
      </div>
    </section>
  );
}

function LaneSection({
  title,
  eyebrow,
  helper,
  items,
  selectedId,
  onSelect,
  onDone
}: {
  title: string;
  eyebrow: string;
  helper: string;
  items: RankedLane[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onDone: (id: string) => void;
}) {
  return (
    <section className="rounded-lg border border-ink/10 bg-white/60 p-5 shadow-cockpit backdrop-blur dark:border-white/10 dark:bg-white/[0.045]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-saffron">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-semibold">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-ink/55 dark:text-paper/55">{helper}</p>
        </div>
        <span className="rounded-full border border-ink/10 px-3 py-1 text-sm text-ink/60 dark:border-white/10 dark:text-paper/60">
          {items.length}
        </span>
      </div>
      <div className="space-y-4">
        {items.length ? (
          items.map((item, index) => (
            <RankedLaneButton
              index={index}
              item={item}
              key={item.id}
              onDone={() => onDone(item.id)}
              onSelect={() => onSelect(item.id)}
              selected={selectedId === item.id}
            />
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-ink/10 bg-white/50 p-6 text-sm leading-6 text-ink/55 dark:border-white/10 dark:bg-white/[0.035] dark:text-paper/55">
            {title === "Today" ? "No DO ASAP lanes. Move one forward when you are ready to work." : "No parked lanes."}
          </div>
        )}
      </div>
    </section>
  );
}

export default function CockpitApp() {
  const [state, setState] = useState<CockpitState>(() => initialState());
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const hydrated = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionFocusId = useRef<string | null>(state.selectedId);
  const importInputRef = useRef<HTMLInputElement>(null);

  const ranked = useMemo(() => rankLanes(state.items), [state.items]);
  const selected = ranked.find((item) => item.id === state.selectedId) || ranked[0];
  const topFocus = ranked.find((item) => item.status === "tomorrow") || ranked[0];
  const tomorrowItems = ranked.filter((item) => item.status === "tomorrow");
  const laterItems = ranked.filter((item) => item.status !== "tomorrow");
  const pausedItems = ranked.filter((item) => item.status === "pause");
  const delegatedItems = ranked.filter((item) => item.status === "delegate");
  const hotBoard = ranked.filter((item) => item.score >= 4.25).length >= 4;
  const summary = buildDecisionSummary({
    topFocus,
    ranked,
    completedToday: state.completedToday,
    executionBlock: state.executionBlock,
    phaseNote: state.phaseNote,
    lastReviewed: state.lastReviewed
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = sanitizeSavedState(JSON.parse(saved));
        if (parsed) {
          setState(parsed);
          const savedRanked = rankLanes(parsed.items);
          suggestionFocusId.current = (savedRanked.find((item) => item.status === "tomorrow") || savedRanked[0])?.id || null;
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    hydrated.current = true;
    setSaveState("saved");
  }, []);

  useEffect(() => {
    if (saveState === "loading") return;
    setOnboardingOpen(!state.onboardingDismissed);
  }, [saveState, state.onboardingDismissed]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", state.theme === "dark");
  }, [state.theme]);

  useEffect(() => {
    if (!hydrated.current) return;
    setSaveState("saving");

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setSaveState("saved");
    }, 260);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state]);

  useEffect(() => {
    if (!topFocus?.id || suggestionFocusId.current === topFocus.id) return;
    suggestionFocusId.current = topFocus.id;
    const seed = starterFor(topFocus.name);
    setState((current) => ({
      ...current,
      executionBlock: {
        ...seed,
        when: current.executionBlock.when || seed.when
      }
    }));
  }, [topFocus?.id, topFocus?.name]);

  function commit(patch: Partial<CockpitState>) {
    setState((current) => ({ ...current, ...patch, lastReviewed: reviewStamp() }));
  }

  function updateLane(id: string, patch: Partial<Lane>) {
    setState((current) => ({
      ...current,
      lastReviewed: reviewStamp(),
      items: current.items.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
              updatedAt: laneStamp(),
              reviewHint:
                patch.status === "pause"
                  ? "Review later"
                  : patch.status === "hold"
                    ? "Waiting for a clearer reason"
                    : patch.status === "delegate"
                      ? "Save for low-energy time"
                      : patch.status === "tomorrow"
                        ? ""
                        : item.reviewHint
            }
          : item
      )
    }));
  }

  function addLane() {
    const newLane: Lane = {
      id: createId(),
      name: "New Lane",
      evidence: "",
      laneNote: "",
      timeRequired: "45-60 min",
      nextAction: "",
      revenue: 3,
      urgency: 3,
      confidence: 3,
      speed: 3,
      status: "hold",
      updatedAt: laneStamp(),
      reviewHint: "New"
    };
    setState((current) => ({
      ...current,
      items: [newLane, ...current.items],
      selectedId: newLane.id,
      lastReviewed: reviewStamp()
    }));
  }

  function duplicateSelected() {
    if (!selected) return;
    const duplicate = { ...copyLane(selected), updatedAt: laneStamp(), reviewHint: "Copied" };
    setState((current) => ({
      ...current,
      items: [duplicate, ...current.items],
      selectedId: duplicate.id,
      lastReviewed: reviewStamp()
    }));
  }

  function nextSelectedId(items: Lane[], removedId: string) {
    return items.find((item) => item.id !== removedId)?.id || "";
  }

  function completeLane(id: string) {
    setState((current) => {
      const lane = current.items.find((item) => item.id === id);
      if (!lane) return current;
      const remaining = current.items.filter((item) => item.id !== id);

      return {
        ...current,
        items: remaining,
        completedToday: [{ ...lane, completedAt: completionStamp() }, ...current.completedToday],
        selectedId: current.selectedId === id ? nextSelectedId(remaining, id) : current.selectedId,
        lastReviewed: reviewStamp()
      };
    });
  }

  function deleteLane(id: string) {
    const lane = state.items.find((item) => item.id === id);
    if (!lane) return;
    const confirmed = window.confirm(`Delete "${lane.name}" from the active list? This does not add it to Completed today.`);
    if (!confirmed) return;

    setState((current) => {
      const remaining = current.items.filter((item) => item.id !== id);

      return {
        ...current,
        items: remaining,
        selectedId: current.selectedId === id ? nextSelectedId(remaining, id) : current.selectedId,
        lastReviewed: reviewStamp()
      };
    });
  }

  function restoreCompleted(id: string) {
    setState((current) => {
      const completed = current.completedToday.find((item) => item.id === id);
      if (!completed) return current;
      const { completedAt: _completedAt, ...lane } = completed;
      const restored = { ...lane, status: "hold" as LaneStatus, updatedAt: laneStamp(), reviewHint: "Restored from completed" };

      return {
        ...current,
        items: [restored, ...current.items],
        completedToday: current.completedToday.filter((item) => item.id !== id),
        selectedId: restored.id,
        lastReviewed: reviewStamp()
      };
    });
  }

  function resetDefaults() {
    const confirmed = window.confirm("Restore the starter lane set? This replaces active lanes but keeps Completed today.");
    if (!confirmed) return;
    const fresh = initialState();
    suggestionFocusId.current = fresh.selectedId;
    setState({ ...fresh, completedToday: state.completedToday, theme: state.theme, onboardingDismissed: true });
  }

  function clearSavedData() {
    const confirmed = window.confirm("Clear all active lanes and Completed today history? This cannot be undone unless you exported a backup.");
    if (!confirmed) return;
    const blankState: CockpitState = {
      items: [],
      completedToday: [],
      selectedId: "",
      phaseNote: PHASE_NOTE,
      executionBlock: starterFor(""),
      theme: state.theme,
      onboardingDismissed: true,
      lastReviewed: reviewStamp()
    };
    suggestionFocusId.current = null;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blankState));
    setState(blankState);
  }

  function exportBackup() {
    const payload = JSON.stringify(state, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `roi-decision-cockpit-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function importBackup(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = sanitizeSavedState(JSON.parse(String(reader.result)));
        if (!parsed) {
          window.alert("That backup could not be read. Your current data was not changed.");
          return;
        }

        const confirmed = window.confirm("Import this backup and replace the current cockpit data?");
        if (!confirmed) return;
        suggestionFocusId.current = (rankLanes(parsed.items).find((item) => item.status === "tomorrow") || parsed.items[0])?.id || null;
        setState(parsed);
      } catch {
        window.alert("That backup file looks malformed. Your current data was not changed.");
      }
    };
    reader.readAsText(file);
  }

  function closeOnboarding() {
    setOnboardingOpen(false);
    setState((current) => ({ ...current, onboardingDismissed: true }));
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1600);
    } catch {
      setCopyState("idle");
    }
  }

  return (
    <main className="min-h-screen bg-paper text-ink dark:bg-ink dark:text-paper">
      <OnboardingModal open={onboardingOpen} onClose={closeOnboarding} onStart={closeOnboarding} />
      <div className="no-print mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <motion.header
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-ink/10 bg-white/65 p-4 shadow-soft backdrop-blur dark:border-white/10 dark:bg-white/[0.055]"
          initial={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.35 }}
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-paper">
                <Target className="h-4 w-4 text-saffron" />
                ROI Decision Cockpit
              </div>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/55 dark:text-paper/55">
                Pick one move, protect the hour, leave the rest alone.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <TooltipButton
                description="Reopen the quick three-step guide."
                onClick={() => setOnboardingOpen(true)}
              >
                <Sparkles className="h-4 w-4" />
                How it works
              </TooltipButton>
              <TooltipButton description="Add a new active lane to score and work." onClick={addLane} variant="primary">
                <Plus className="h-4 w-4" />
                Add lane
              </TooltipButton>
              <TooltipButton
                description="Switch between light and dark mode. Your tasks are unchanged."
                onClick={() => commit({ theme: state.theme === "dark" ? "light" : "dark" })}
              >
                {state.theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {state.theme === "dark" ? "Light" : "Dark"}
              </TooltipButton>
              <TooltipButton description="Download a JSON backup of active and completed lanes." onClick={exportBackup}>
                <Download className="h-4 w-4" />
                Backup
              </TooltipButton>
              <TooltipButton description="Import a JSON backup. You will confirm before it replaces current data." onClick={() => importInputRef.current?.click()}>
                <Upload className="h-4 w-4" />
                Import
              </TooltipButton>
              <input
                accept="application/json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) importBackup(file);
                  event.target.value = "";
                }}
                ref={importInputRef}
                type="file"
              />
              <TooltipButton description="Replace active lanes with the starter template. Completed today is kept." onClick={resetDefaults}>
                <RefreshCw className="h-4 w-4" />
                Restore starters
              </TooltipButton>
              <TooltipButton description="Danger: clears active lanes and completed history after confirmation." onClick={clearSavedData} variant="danger">
                <Trash2 className="h-4 w-4" />
                Clear
              </TooltipButton>
            </div>
          </div>
        </motion.header>

        <TopDecision
          block={state.executionBlock}
          focus={topFocus}
          lastReviewed={state.lastReviewed}
          notNowCount={pausedItems.length + delegatedItems.length}
          savedLabel={saveState === "saving" ? "Saving..." : "Saved"}
          todayCount={tomorrowItems.length}
        />

        <section className="grid gap-5 xl:grid-cols-[0.82fr_1.05fr_0.88fr]">
          <div className="space-y-5">
            <LaneSection
              eyebrow="Start here"
              helper="Active work for today. Keep this short."
              items={tomorrowItems}
              onDone={completeLane}
              onSelect={(id) => commit({ selectedId: id })}
              selectedId={selected?.id}
              title="Today"
            />
            <LaneSection
              eyebrow="Review later"
              helper="Parked lanes stay visible without crowding today."
              items={laterItems}
              onDone={completeLane}
              onSelect={(id) => commit({ selectedId: id })}
              selectedId={selected?.id}
              title="Later"
            />
          </div>

          <div className="space-y-5">
            {selected ? (
              <LaneEditor
                item={selected}
                onDelete={() => deleteLane(selected.id)}
                onDone={() => completeLane(selected.id)}
                onDuplicate={duplicateSelected}
                onUpdate={(patch) => updateLane(selected.id, patch)}
              />
            ) : null}
          </div>

          <aside className="space-y-5">
            <ExecutionBuilder
              block={state.executionBlock}
              focus={topFocus}
              onChange={(patch) => commit({ executionBlock: { ...state.executionBlock, ...patch } })}
            />

            <CompletedToday items={state.completedToday} onRestore={restoreCompleted} />

            <details className="group rounded-lg border border-ink/10 bg-white/55 shadow-soft backdrop-blur dark:border-white/10 dark:bg-white/[0.045]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-ink/45 dark:text-paper/45">The cuts</p>
                  <h2 className="mt-1 text-lg font-semibold">Review queue</h2>
                </div>
                <span className="rounded-full bg-ink/[0.06] px-3 py-1 text-sm text-ink/60 dark:bg-white/10 dark:text-paper/60">
                  {pausedItems.length + delegatedItems.length}
                </span>
              </summary>
              <div className="px-4 pb-4">
                <p className="mb-3 text-sm leading-6 text-ink/55 dark:text-paper/55">
                  A quick check on parked work so old lanes do not go stale.
                </p>
                <DecisionGroup title="Pause" items={pausedItems} />
                <DecisionGroup title="Low Energy / Delegate" items={delegatedItems} />
                <DecisionGroup title="Hold" items={ranked.filter((item) => item.status === "hold")} />
                {hotBoard ? (
                  <div className="mt-4 rounded-lg border border-clay/25 bg-clay/10 p-4 text-sm leading-6 text-clay dark:text-[#f1ad90]">
                    Too many hot lanes. Downgrade one unless the proof is strong.
                  </div>
                ) : null}
              </div>
            </details>

            <details className="group rounded-lg border border-ink/10 bg-white/55 shadow-soft backdrop-blur dark:border-white/10 dark:bg-white/[0.045]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-ink/45 dark:text-paper/45">Carry forward</p>
                  <h2 className="mt-1 text-lg font-semibold">Session note</h2>
                </div>
                <Clipboard className="h-4 w-4 text-ink/40 dark:text-paper/40" />
              </summary>
              <div className="px-4 pb-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink/70 dark:text-paper/70">Promise</span>
                  <textarea
                    className="min-h-[92px] w-full rounded-lg border border-ink/10 bg-white/75 px-4 py-3 text-sm leading-6 text-ink outline-none transition focus:border-saffron dark:border-white/10 dark:bg-white/[0.055] dark:text-paper"
                    onChange={(event) => commit({ phaseNote: event.target.value })}
                    value={state.phaseNote}
                  />
                </label>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-semibold text-paper transition hover:opacity-90 dark:bg-paper dark:text-ink"
                    onClick={copySummary}
                    type="button"
                  >
                    {copyState === "copied" ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                    {copyState === "copied" ? "Copied" : "Copy note"}
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/60 px-4 py-3 text-sm text-ink/70 transition hover:bg-white dark:border-white/10 dark:bg-white/[0.05] dark:text-paper/70"
                    onClick={() => window.print()}
                    type="button"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/60 px-4 py-3 text-sm text-ink/70 transition hover:bg-white dark:border-white/10 dark:bg-white/[0.05] dark:text-paper/70"
                    onClick={resetDefaults}
                    type="button"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </button>
                </div>
              </div>
            </details>
          </aside>
        </section>
      </div>
      <pre className="print-summary hidden whitespace-pre-wrap p-10 text-sm leading-7">{summary}</pre>
    </main>
  );
}

function DecisionGroup({ title, items }: { title: string; items: RankedLane[] }) {
  return (
    <div className="border-t border-ink/10 py-4 first:border-t-0 first:pt-0 dark:border-white/10">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink dark:text-paper">{title}</h3>
        <span className="text-xs text-ink/45 dark:text-paper/45">{items.length}</span>
      </div>
      <div className="space-y-2">
        {items.length ? (
          items.map((item) => (
            <div
              className="flex items-center justify-between gap-3 rounded-lg border border-ink/10 bg-paper/60 px-3 py-2 text-sm dark:border-white/10 dark:bg-ink/40"
              key={item.id}
            >
              <span className="truncate text-ink/70 dark:text-paper/70">{item.name}</span>
              <span className="font-semibold tabular-nums text-ink dark:text-paper">{formatScore(item.score)}</span>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-ink/10 px-3 py-3 text-sm text-ink/45 dark:border-white/10 dark:text-paper/45">
            Clear.
          </div>
        )}
      </div>
    </div>
  );
}
