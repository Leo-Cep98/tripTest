import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Wallet, CalendarDays, Compass } from "lucide-react";
import heroImg from "@/assets/hero-coast.jpg";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pandas Wanderlust — Itineraries & expense tracking for real travelers" },
      { name: "description", content: "Plan day-by-day trips, log expenses on the go, stay on budget. Beautiful, simple, built for the road." },
      { property: "og:title", content: "Pandas Wanderlust — Plan trips, track every dollar" },
      { property: "og:description", content: "Day-by-day itineraries and live expense tracking for travelers." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="absolute top-0 z-20 w-full">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold text-deep-foreground">
            <Compass className="h-5 w-5 text-mint" />
            Pandas Wanderlust
          </Link>
          <nav className="flex items-center gap-2">
            <ThemeToggle className="text-deep-foreground hover:bg-white/10" />
            <Link to="/auth" className="text-sm font-medium text-deep-foreground/80 hover:text-deep-foreground">Sign in</Link>
            <Link to="/auth">
              <Button size="sm" className="bg-mint text-deep hover:bg-mint/90">Start planning</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={heroImg} alt="Aerial view of a tropical coastline at dusk" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-hero opacity-85" />
        </div>
        <div className="mx-auto grid max-w-7xl gap-12 px-6 pt-40 pb-32 text-deep-foreground md:pt-48 md:pb-40">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-widest text-mint backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-mint" /> New · v1
            </span>
            <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] md:text-7xl">
              Plan the trip.<br />
              <span className="text-gradient-mint">Track every dollar.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-deep-foreground/75">
              Pandas Wanderlust turns scattered notes and receipts into a single, beautiful travel log — day-by-day itineraries on one side, live expense tracking on the other.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/auth">
                <Button size="lg" className="bg-mint text-deep hover:bg-mint/90">
                  Start your first trip <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline" className="border-white/25 bg-white/5 text-deep-foreground hover:bg-white/10">
                  How it works
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-14 max-w-2xl">
          <p className="text-sm uppercase tracking-widest text-teal">Built for the road</p>
          <h2 className="mt-3 font-display text-4xl font-semibold">Everything a trip needs. Nothing it doesn't.</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="group rounded-2xl border bg-card p-7 shadow-card transition hover:-translate-y-1 hover:shadow-elegant">
              <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-deep text-mint">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA strip */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-hero p-12 text-deep-foreground shadow-elegant md:p-16">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div>
              <h3 className="font-display text-3xl font-semibold md:text-4xl">Your next trip starts here.</h3>
              <p className="mt-2 max-w-md text-deep-foreground/75">Free to start. No credit card. Just open the map.</p>
            </div>
            <Link to="/auth">
              <Button size="lg" className="bg-mint text-deep hover:bg-mint/90">
                Create free account <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8 text-sm text-muted-foreground">
          <span className="font-display font-semibold">Pandas Wanderlust</span>
          <span>© {new Date().getFullYear()} · Made for travelers</span>
        </div>
      </footer>
    </div>
  );
}

const features = [
  { icon: CalendarDays, title: "Day-by-day itinerary", desc: "Drop activities onto a clean timeline. Mornings, afternoons, evenings — never out of order again." },
  { icon: Wallet, title: "Live expense tracking", desc: "Log spending the moment it happens. Categories, multi-currency, running totals against your budget." },
  { icon: MapPin, title: "Everything in one place", desc: "Bookings, addresses, costs, and notes — all on the trip page. Open it on the plane, the train, or the cab." },
];
