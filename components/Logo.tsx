import { LoopIcon } from "./icons";

export function LogoMark({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden
      className={`relative grid shrink-0 place-items-center bg-linear-to-br from-emerald-400 via-emerald-600 to-teal-700 text-white shadow-sm shadow-emerald-900/25 ring-1 ring-inset ring-white/20 ${
        size === "lg" ? "size-11 rounded-[14px] [&_svg]:size-5.5" : "size-8 rounded-[10px] [&_svg]:size-4"
      }`}
    >
      <span className="absolute inset-px rounded-[inherit] bg-linear-to-b from-white/25 to-transparent" />
      <LoopIcon strokeWidth={2.25} className="relative" />
    </span>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-tight text-zinc-950">LendLoop</span>
    </span>
  );
}
