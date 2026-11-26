import type { ToolCategory, ToolCondition } from "@/convex/lib/constants";
import {
  BoxIcon,
  HammerIcon,
  LadderIcon,
  LeafIcon,
  PackageIcon,
  PaintRollerIcon,
  SparkleIcon,
  TentIcon,
  ZapIcon,
  type IconProps,
} from "./icons";

const TINTS: Record<ToolCategory, string> = {
  "Power tools": "bg-amber-50 text-amber-600 ring-amber-500/20",
  "Hand tools": "bg-orange-50 text-orange-600 ring-orange-500/20",
  Garden: "bg-emerald-50 text-emerald-600 ring-emerald-500/20",
  "Ladders & access": "bg-sky-50 text-sky-600 ring-sky-500/20",
  Cleaning: "bg-cyan-50 text-cyan-600 ring-cyan-500/20",
  "Painting & decorating": "bg-rose-50 text-rose-600 ring-rose-500/20",
  "Outdoor & camping": "bg-lime-50 text-lime-700 ring-lime-600/20",
  Other: "bg-zinc-100 text-zinc-600 ring-zinc-500/15",
};

/** The glyph for a category, rendered as plain SVG (no component lookup at render time). */
export function CategoryGlyph({ category, ...props }: { category: ToolCategory } & IconProps) {
  switch (category) {
    case "Power tools":
      return <ZapIcon {...props} />;
    case "Hand tools":
      return <HammerIcon {...props} />;
    case "Garden":
      return <LeafIcon {...props} />;
    case "Ladders & access":
      return <LadderIcon {...props} />;
    case "Cleaning":
      return <SparkleIcon {...props} />;
    case "Painting & decorating":
      return <PaintRollerIcon {...props} />;
    case "Outdoor & camping":
      return <TentIcon {...props} />;
    default:
      return <BoxIcon {...props} />;
  }
}

const TILE_SIZES = {
  sm: "size-8 rounded-lg [&_svg]:size-4",
  md: "size-10 rounded-xl [&_svg]:size-5",
  lg: "size-12 rounded-xl [&_svg]:size-6",
};

/** Tinted square with the category glyph. Pass no category for a neutral "package" tile. */
export function CategoryIcon({
  category,
  size = "md",
}: {
  category?: ToolCategory;
  size?: keyof typeof TILE_SIZES;
}) {
  const tint = category ? TINTS[category] : "bg-zinc-100 text-zinc-500 ring-zinc-500/15";
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center ring-1 ring-inset ${tint} ${TILE_SIZES[size]}`}>
      {category ? <CategoryGlyph category={category} /> : <PackageIcon />}
    </span>
  );
}

export const CONDITION_TONE: Record<ToolCondition, "green" | "blue" | "amber" | "neutral"> = {
  new: "green",
  good: "blue",
  fair: "amber",
  worn: "neutral",
};
