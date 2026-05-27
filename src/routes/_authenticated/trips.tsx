import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, MapPin, CalendarDays, Wallet, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/trips")({
  head: () => ({ meta: [{ title: "Your trips — Pandas Wanderlust" }] }),
  component: TripsPage,
});

interface Trip {
  id: string;
  title: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  currency: string;
  cover_emoji: string | null;
}

function TripsPage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [open, setOpen] = useState(false);

  async function load() {
    const { data, error } = await supabase
      .from("trips")
      .select("id,title,destination,start_date,end_date,budget,currency,cover_emoji")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setTrips(data ?? []);
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-10 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-teal">Your travel log</p>
          <h1 className="mt-2 font-display text-4xl font-semibold">Trips</h1>
          <p className="mt-1 text-muted-foreground">Plan a new one or jump back into something brewing.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="bg-deep text-deep-foreground hover:bg-deep/90">
              <Plus className="mr-1.5 h-4 w-4" /> New trip
            </Button>
          </DialogTrigger>
          <NewTripDialog onCreated={() => { setOpen(false); load(); }} />
        </Dialog>
      </div>

      {trips === null ? (
        <SkeletonGrid />
      ) : trips.length === 0 ? (
        <EmptyState onNew={() => setOpen(true)} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((t) => <TripCard key={t.id} trip={t} />)}
        </div>
      )}
    </main>
  );
}

function TripCard({ trip }: { trip: Trip }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-card transition hover:-translate-y-1 hover:shadow-elegant">
      <Link
        to="/trips/$tripId"
        params={{ tripId: trip.id }}
        className="flex h-32 items-center justify-center bg-hero text-5xl"
        aria-label={`Open ${trip.title}`}
      >
        <span className="drop-shadow">{trip.cover_emoji || "✈️"}</span>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-semibold leading-tight">{trip.title}</h3>
        <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" /> {trip.destination}
        </p>
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {trip.start_date ? format(new Date(trip.start_date), "MMM d") : "—"}
            {trip.end_date ? ` → ${format(new Date(trip.end_date), "MMM d")}` : ""}
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <Wallet className="h-3.5 w-3.5" /> {trip.currency} {Number(trip.budget || 0).toLocaleString()}
          </span>
        </div>
        <Link
          to="/trips/$tripId"
          params={{ tripId: trip.id }}
          className="mt-5"
        >
          <Button
            size="sm"
            className="w-full bg-deep text-deep-foreground hover:bg-deep/90"
          >
            Open trip <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed bg-card p-16 text-center">
      <div className="mx-auto mb-4 text-6xl">🗺️</div>
      <h3 className="font-display text-2xl font-semibold">No trips yet</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        Your travel log is empty. Pin your next destination and start mapping it out.
      </p>
      <Button onClick={onNew} className="mt-6 bg-deep text-deep-foreground hover:bg-deep/90">
        <Plus className="mr-1.5 h-4 w-4" /> Create your first trip
      </Button>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-56 animate-pulse rounded-2xl border bg-muted/40" />
      ))}
    </div>
  );
}

function NewTripDialog({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: "", destination: "", start_date: "", end_date: "",
    budget: "", currency: "USD", cover_emoji: "✈️",
  });
  const [busy, setBusy] = useState(false);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="font-display text-2xl">New trip</DialogTitle>
      </DialogHeader>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!user) return;
          setBusy(true);
          const { error } = await supabase.from("trips").insert({
            user_id: user.id,
            title: form.title,
            destination: form.destination,
            start_date: form.start_date || null,
            end_date: form.end_date || null,
            budget: form.budget ? Number(form.budget) : 0,
            currency: form.currency,
            cover_emoji: form.cover_emoji || "✈️",
          });
          setBusy(false);
          if (error) { toast.error(error.message); return; }
          toast.success("Trip created");
          onCreated();
        }}
      >
        <div className="grid grid-cols-[80px_1fr] gap-3">
          <div className="space-y-1.5">
            <Label>Emoji</Label>
            <Input value={form.cover_emoji} maxLength={2} onChange={(e) => setForm({ ...form, cover_emoji: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input required placeholder="Tokyo cherry blossoms" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Destination</Label>
          <Input required placeholder="Tokyo, Japan" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Start date</Label>
            <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <div className="space-y-1.5"><Label>End date</Label>
            <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-[1fr_100px] gap-3">
          <div className="space-y-1.5"><Label>Budget</Label>
            <Input type="number" min="0" step="0.01" placeholder="2500" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
          </div>
          <div className="space-y-1.5"><Label>Currency</Label>
            <Input value={form.currency} maxLength={3} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={busy} className="bg-deep text-deep-foreground hover:bg-deep/90">
            {busy ? "Creating…" : "Create trip"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
