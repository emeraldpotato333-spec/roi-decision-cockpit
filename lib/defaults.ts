import {
  BarChart3,
  Mail,
  Megaphone,
  MonitorSmartphone,
  Rocket,
  Sparkles,
  Wrench,
  type LucideIcon
} from "lucide-react";
import type { ExecutionBlock, Lane, LaneStatus } from "./types";

export const STORAGE_KEY = "roi-decision-cockpit-v1";

export const PHASE_NOTE =
  "When this block ends, I should have one clear winner, two things I am not touching, and one next step already scheduled.";

export const STATUS_OPTIONS: Array<{ value: LaneStatus; label: string; hint: string }> = [
  { value: "tomorrow", label: "Do Tomorrow", hint: "Prime energy, concrete upside" },
  { value: "pause", label: "Pause 7 Days", hint: "Good idea, wrong moment" },
  { value: "delegate", label: "Low Energy / Delegate", hint: "Useful, but not your best hour" },
  { value: "hold", label: "Hold", hint: "Needs more evidence" }
];

export const laneMeta: Record<
  string,
  {
    icon: LucideIcon;
    accent: string;
    suggestion: string;
  }
> = {
  "HAUS Meta Ads": {
    icon: Megaphone,
    accent: "bg-moss",
    suggestion:
      "Audit the current winner, cut weak spend, and decide whether one proven creative deserves scaling or variation testing."
  },
  "HAUS Google Ads": {
    icon: BarChart3,
    accent: "bg-clay",
    suggestion:
      "Check search terms, wasted spend, and conversion intent. Find one leak, one keeper, and one next test."
  },
  "HAUS Organic / Social": {
    icon: MonitorSmartphone,
    accent: "bg-fern",
    suggestion:
      "Prioritize only if the post directly supports a launch, lead capture, or trust moment that can move revenue soon."
  },
  "BSD Organic / Social": {
    icon: Sparkles,
    accent: "bg-saffron",
    suggestion: "Use this when one asset can strengthen authority, unlock leads, or support a direct sales conversation."
  },
  "Influencer Outreach": {
    icon: Rocket,
    accent: "bg-[#a75b76]",
    suggestion: "Score high only if the offer, target list, and follow-up motion are already specific."
  },
  "Website Fixes": {
    icon: Wrench,
    accent: "bg-dusk",
    suggestion: "This becomes elite ROI when the fix removes friction exactly where people hesitate or abandon."
  },
  "Email / Waitlist / Follow-up": {
    icon: Mail,
    accent: "bg-[#52747a]",
    suggestion: "Often quiet money. Rank high when warm attention can become action quickly."
  }
};

export function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `lane-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getDefaultItems(): Lane[] {
  return [
    {
      id: "haus-meta-ads",
      name: "HAUS Meta Ads",
      evidence: "Some proven UGC/process winners exist, but spend allocation and scaling decisions are still foggy.",
      timeRequired: "60-90 min",
      nextAction: "Decide whether the strongest current winner gets scaled or split into 3 focused test variations.",
      revenue: 5,
      urgency: 5,
      confidence: 4,
      speed: 4,
      status: "tomorrow"
    },
    {
      id: "haus-google-ads",
      name: "HAUS Google Ads",
      evidence: "Traffic exists, but there may be wasted spend or intent mismatch after several days without a close read.",
      timeRequired: "45-75 min",
      nextAction: "Audit search terms and identify 1 leak, 1 keep, and 1 next test.",
      revenue: 4,
      urgency: 5,
      confidence: 3,
      speed: 4,
      status: "hold"
    },
    {
      id: "haus-organic-social",
      name: "HAUS Organic / Social",
      evidence: "Important for brand and launch support, but can become a beautiful detour if not tied to conversion.",
      timeRequired: "90-180 min",
      nextAction: "Only prioritize the next post if it supports a launch, offer, or lead capture.",
      revenue: 3,
      urgency: 3,
      confidence: 3,
      speed: 2,
      status: "pause"
    },
    {
      id: "bsd-organic-social",
      name: "BSD Organic / Social",
      evidence: "Useful for authority and pipeline, but less immediate than fixing paid acquisition or conversion friction.",
      timeRequired: "60-120 min",
      nextAction: "Create one authority-building post only if it supports active deals or lead quality.",
      revenue: 3,
      urgency: 2,
      confidence: 3,
      speed: 2,
      status: "delegate"
    },
    {
      id: "influencer-outreach",
      name: "Influencer Outreach",
      evidence: "High upside near launches, but can sprawl if the offer, target list, and follow-up system are not tight.",
      timeRequired: "60-150 min",
      nextAction: "Refine one outreach template and shortlist only the top fits.",
      revenue: 4,
      urgency: 3,
      confidence: 3,
      speed: 3,
      status: "hold"
    },
    {
      id: "website-fixes",
      name: "Website Fixes",
      evidence: "If friction exists at product pages, pricing, or shipping clarity, one fix can quietly lift conversion.",
      timeRequired: "30-120 min",
      nextAction: "Identify the one conversion bottleneck most likely costing trust or checkout progression.",
      revenue: 5,
      urgency: 4,
      confidence: 4,
      speed: 4,
      status: "tomorrow"
    },
    {
      id: "email-waitlist-follow-up",
      name: "Email / Waitlist / Follow-up",
      evidence: "Warm audiences already exist. This can monetize attention faster than cold creative work if the message is strong.",
      timeRequired: "30-90 min",
      nextAction: "Send the highest-leverage email or follow-up tied to launch demand or sample-to-order conversion.",
      revenue: 4,
      urgency: 4,
      confidence: 4,
      speed: 5,
      status: "tomorrow"
    }
  ];
}

export function starterFor(itemName: string): ExecutionBlock {
  const map: Record<string, Omit<ExecutionBlock, "when">> = {
    "HAUS Meta Ads": {
      task: "Audit the live winner campaign and make one clean scaling decision.",
      success: "One yes/no scaling call, one cut decision, and three test variations briefed.",
      start: "Open Ads Manager, sort by spend and purchases, review the last 7 days first.",
      stop: "Stop when the winner, leak, and next test are each named in one sentence."
    },
    "HAUS Google Ads": {
      task: "Run a fast search-term and wasted-spend triage.",
      success: "At least one negative keyword opportunity, one keeper cluster, and one message mismatch identified.",
      start: "Open search terms, filter by spend, then sort for non-buying queries.",
      stop: "Stop once the account is cleaner and one next ad or keyword action is defined."
    },
    "HAUS Organic / Social": {
      task: "Choose the single post that most directly supports demand right now.",
      success: "One post concept, one hook, one CTA, and one publish window.",
      start: "Start from current launch or offer priorities, not from what would look nice on the feed.",
      stop: "Stop once one post is ready. Do not drift into feed redesign."
    },
    "BSD Organic / Social": {
      task: "Create one authority asset that supports active pipeline.",
      success: "One sharp educational or trust-building piece that can be posted or sent immediately.",
      start: "Open the strongest project angle or founder insight you already have.",
      stop: "Stop when it is useful enough to publish, not perfect enough to admire."
    },
    "Influencer Outreach": {
      task: "Build a focused outreach sprint around top-fit collaborators only.",
      success: "A clean template plus a shortlist of best-fit names with personalized first lines.",
      start: "Start with product-launch fit and audience overlap, not vanity metrics.",
      stop: "Stop after the top tier list is built and messages are ready to send."
    },
    "Website Fixes": {
      task: "Fix the one conversion bottleneck most likely costing trust or orders.",
      success: "One friction point identified, one fix proposed, and one implementation owner or next step assigned.",
      start: "Open analytics, product pages, and checkout friction notes. Look for hesitation, not aesthetics.",
      stop: "Stop when the biggest leak is named and a specific fix is queued."
    },
    "Email / Waitlist / Follow-up": {
      task: "Send the warmest money email in the room.",
      success: "One email or follow-up ready to send with a clear target segment and CTA.",
      start: "Start from who is already warm: waitlist, sample buyers, engaged leads, or past inquiries.",
      stop: "Stop when the message is sent or fully queued with segment and subject line."
    }
  };

  const seed = map[itemName] || {
    task: "Pick one move with real upside and define it clearly.",
    success: "A clear task, metric, start point, and stop point.",
    start: "Begin with the evidence already in front of you.",
    stop: "Stop when the next move is concrete and scheduled."
  };

  return { ...seed, when: "Tomorrow, first high-focus hour" };
}
