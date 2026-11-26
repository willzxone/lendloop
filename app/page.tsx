import type { ReactNode } from "react";
import { BellIcon, CalendarIcon, PackageIcon } from "@/components/icons";
import { PublicHero } from "@/components/PublicHero";
import { PublicToolList } from "@/components/PublicToolList";

const STEPS: { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: <PackageIcon />,
    title: "List what you own",
    body: "Add the drill, ladder or pressure washer you only use twice a year. It takes about thirty seconds.",
  },
  {
    icon: <CalendarIcon />,
    title: "Request the dates you need",
    body: "Pick a start and end date. The owner gets an email and approves or declines in one click.",
  },
  {
    icon: <BellIcon />,
    title: "Get reminded, give it back",
    body: "Requests and answers arrive by email, and overdue tools get a friendly reminder once a day.",
  },
];

export default function HomePage() {
  return (
    <>
      <PublicHero />

      <section id="available" aria-labelledby="available-heading" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[13px] font-medium text-emerald-700">Live from the board</p>
              <h2 id="available-heading" className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
                Available now
              </h2>
            </div>
            <p className="max-w-sm text-sm text-zinc-500">
              Sign in to see who&apos;s lending, check booked dates and send a request.
            </p>
          </div>
          <PublicToolList />
        </div>
      </section>

      <section aria-labelledby="how-heading" className="border-t border-zinc-950/[0.06] bg-zinc-50/70">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p className="text-[13px] font-medium text-emerald-700">How it works</p>
          <h2 id="how-heading" className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
            Three steps, no awkward knocking on doors
          </h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative rounded-2xl bg-white p-6 shadow-card ring-1 ring-zinc-950/[0.07]">
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-600/15 [&_svg]:size-5">
                    {step.icon}
                  </span>
                  <span className="font-mono text-xs text-zinc-300">0{index + 1}</span>
                </div>
                <h3 className="mt-5 text-[15px] font-semibold text-zinc-950">{step.title}</h3>
                <p className="mt-1.5 text-sm text-zinc-500">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
