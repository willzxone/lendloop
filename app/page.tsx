import { PublicToolList } from "@/components/PublicToolList";
import { PublicHero } from "@/components/PublicHero";

export default function HomePage() {
  return (
    <div className="space-y-10">
      <PublicHero />
      <section aria-labelledby="available-heading">
        <h2 id="available-heading" className="mb-3 text-lg font-semibold text-stone-900">
          Tools on the board
        </h2>
        <PublicToolList />
      </section>
    </div>
  );
}
