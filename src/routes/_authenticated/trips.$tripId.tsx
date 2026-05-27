import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Plus,
  MapPin,
  Clock,
  Trash2,
  Wallet,
  TrendingUp,
  CalendarDays,
  ImagePlus,
  Link2 as LinkIcon,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Camera,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { buildNotes, parseMeta, type ItineraryMeta, type TripMeta } from "@/lib/meta";

export const Route = createFileRoute("/_authenticated/trips/$tripId")({
  component: TripDetail,
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
  notes: string | null;
}
interface Item {
  id: string;
  day_date: string;
  start_time: string | null;
  title: string;
  location: string | null;
  category: string | null;
  notes: string | null;
}
interface Expense {
  id: string;
  spent_on: string;
  amount: number;
  currency: string;
  category: string;
  description: string | null;
}

const EXP_CATEGORIES = ["food", "transport", "lodging", "activities", "shopping", "other"];
const ITEM_CATEGORIES = ["activity", "lodging", "transport", "food", "other"];
const CAT_COLOR: Record<string, string> = {
  food: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  transport: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  lodging: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  activity: "bg-mint/30 text-teal",
  activities: "bg-mint/30 text-teal",
  shopping: "bg-pink-500/15 text-pink-600 dark:text-pink-400",
  other: "bg-muted text-muted-foreground",
};

function TripDetail() {
  const { tripId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeDay, setActiveDay] = useState<string | "all">("all");

  async function loadAll() {
    const [t, i, e] = await Promise.all([
      supabase.from("trips").select("*").eq("id", tripId).maybeSingle(),
      supabase
        .from("itinerary_items")
        .select("*")
        .eq("trip_id", tripId)
        .order("day_date")
        .order("start_time"),
      supabase
        .from("expenses")
        .select("*")
        .eq("trip_id", tripId)
        .order("spent_on", { ascending: false }),
    ]);
    if (t.error) toast.error(t.error.message);
    else setTrip(t.data as Trip);
    if (!i.error) setItems((i.data ?? []) as Item[]);
    if (!e.error) setExpenses((e.data ?? []) as Expense[]);
  }

  useEffect(() => {
    if (user) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tripId]);

  // Parse trip metadata (photos)
  const tripParsed = useMemo(() => {
    if (!trip) return { text: "", meta: {} as TripMeta };
    return parseMeta<TripMeta>(trip.notes);
  }, [trip]);

  // Parse each item's metadata (price, link) once
  const itemsWithMeta = useMemo(
    () =>
      items.map((it) => {
        const parsed = parseMeta<ItineraryMeta>(it.notes);
        return { ...it, noteText: parsed.text, price: parsed.meta.price ?? 0, link: parsed.meta.link ?? "" };
      }),
    [items],
  );

  const itemsByDay = useMemo(() => {
    return itemsWithMeta.reduce<Record<string, typeof itemsWithMeta>>((acc, it) => {
      (acc[it.day_date] ||= []).push(it);
      return acc;
    }, {});
  }, [itemsWithMeta]);

  const dayKeys = useMemo(() => Object.keys(itemsByDay).sort(), [itemsByDay]);

  // Reset active day if it disappears
  useEffect(() => {
    if (activeDay !== "all" && !dayKeys.includes(activeDay)) {
      setActiveDay(dayKeys[0] ?? "all");
    }
  }, [dayKeys, activeDay]);

  if (!trip) {
    return <div className="mx-auto max-w-5xl px-6 py-16 text-muted-foreground">Loading trip…</div>;
  }

  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalPlanned = itemsWithMeta.reduce((s, it) => s + Number(it.price || 0), 0);
  const budget = Number(trip.budget ?? 0);
  const budgetPct = budget > 0 ? Math.min(100, (totalSpent / budget) * 100) : 0;
  const plannedPct = budget > 0 ? Math.min(100, (totalPlanned / budget) * 100) : 0;
  const plannedDelta = budget - totalPlanned;
  const plannedAligned = budget === 0 ? null : totalPlanned <= budget;

  const photos: string[] = Array.isArray(tripParsed.meta.photos) ? tripParsed.meta.photos : [];

  async function updateTripPhotos(next: string[]) {
    if (!trip) return;
    const newNotes = buildNotes(tripParsed.text, { ...tripParsed.meta, photos: next });
    const { error } = await supabase
      .from("trips")
      .update({ notes: newNotes })
      .eq("id", trip.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    loadAll();
  }

  const dayIndex = activeDay === "all" ? -1 : dayKeys.indexOf(activeDay);

  function navigateDay(direction: 1 | -1) {
    if (activeDay === "all" || dayIndex < 0) return;
    const next = dayIndex + direction;
    if (next < 0 || next >= dayKeys.length) return;
    setActiveDay(dayKeys[next]);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <Link
        to="/trips"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All trips
      </Link>

      {/* Header */}
      <div className="mt-4 overflow-hidden rounded-3xl bg-hero p-8 text-deep-foreground shadow-elegant md:p-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="text-5xl">{trip.cover_emoji || "✈️"}</div>
            <h1 className="mt-3 font-display text-4xl font-semibold md:text-5xl">{trip.title}</h1>
            <p className="mt-2 flex items-center gap-1.5 text-deep-foreground/80">
              <MapPin className="h-4 w-4" /> {trip.destination}
            </p>
            {trip.start_date && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-deep-foreground/70">
                <CalendarDays className="h-4 w-4" />
                {format(new Date(trip.start_date), "MMM d, yyyy")}
                {trip.end_date && ` → ${format(new Date(trip.end_date), "MMM d, yyyy")}`}
              </p>
            )}
          </div>
          <div className="min-w-[260px] space-y-3 rounded-2xl bg-white/10 p-5 backdrop-blur">
            <div>
              <p className="text-xs uppercase tracking-widest text-mint">Spent so far</p>
              <p className="mt-1 font-display text-2xl font-semibold">
                {trip.currency} {totalSpent.toFixed(2)}
                <span className="ml-1 text-base text-deep-foreground/60">
                  / {budget.toLocaleString()}
                </span>
              </p>
              <Progress value={budgetPct} className="mt-2 h-1.5 bg-white/20" />
              <p className="mt-1 text-xs text-deep-foreground/70">
                {budgetPct.toFixed(0)}% used · {expenses.length} expense
                {expenses.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="border-t border-white/15 pt-3">
              <p className="text-xs uppercase tracking-widest text-mint">Planned (itinerary)</p>
              <p className="mt-1 font-display text-xl font-semibold">
                {trip.currency} {totalPlanned.toFixed(2)}
              </p>
              <Progress value={plannedPct} className="mt-2 h-1.5 bg-white/20" />
              {plannedAligned === null ? (
                <p className="mt-1 text-xs text-deep-foreground/70">Set a budget to see alignment.</p>
              ) : plannedAligned ? (
                <p className="mt-1 text-xs text-mint">
                  ✓ Aligned — {trip.currency} {Math.abs(plannedDelta).toFixed(2)} headroom
                </p>
              ) : (
                <p className="mt-1 text-xs text-orange-300">
                  ⚠ Over budget by {trip.currency} {Math.abs(plannedDelta).toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="itinerary" className="mt-8">
        <TabsList>
          <TabsTrigger value="itinerary">
            <CalendarDays className="mr-1.5 h-4 w-4" /> Itinerary
          </TabsTrigger>
          <TabsTrigger value="photos">
            <Camera className="mr-1.5 h-4 w-4" /> Photos
          </TabsTrigger>
          <TabsTrigger value="expenses">
            <Wallet className="mr-1.5 h-4 w-4" /> Expenses
          </TabsTrigger>
        </TabsList>

        {/* ITINERARY */}
        <TabsContent value="itinerary" className="mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              Total planned:{" "}
              <span className="font-medium text-foreground">
                {trip.currency} {totalPlanned.toFixed(2)}
              </span>
              {budget > 0 && (
                <>
                  {" · "}
                  Budget:{" "}
                  <span className="font-medium text-foreground">
                    {trip.currency} {budget.toLocaleString()}
                  </span>
                  {" · "}
                  {plannedAligned ? (
                    <span className="font-medium text-teal">on budget</span>
                  ) : (
                    <span className="font-medium text-destructive">
                      over by {trip.currency} {Math.abs(plannedDelta).toFixed(2)}
                    </span>
                  )}
                </>
              )}
            </div>
            <AddItineraryDialog tripId={tripId} userId={user!.id} currency={trip.currency} onAdded={loadAll} />
          </div>

          {/* Day navigation */}
          {dayKeys.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2 shadow-card">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => navigateDay(-1)}
                disabled={activeDay === "all" || dayIndex <= 0}
                aria-label="Previous day"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex flex-1 flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveDay("all")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    activeDay === "all"
                      ? "bg-deep text-deep-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  All days
                </button>
                {dayKeys.map((d, idx) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setActiveDay(d)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      activeDay === d
                        ? "bg-deep text-deep-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    Day {idx + 1} · {format(new Date(d), "MMM d")}
                  </button>
                ))}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => navigateDay(1)}
                disabled={activeDay === "all" || dayIndex >= dayKeys.length - 1}
                aria-label="Next day"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {dayKeys.length === 0 ? (
            <EmptyMini icon="🗓️" title="No plans yet" desc="Drop in your first activity or reservation." />
          ) : (
            <div className="space-y-8">
              {(activeDay === "all" ? dayKeys : [activeDay]).map((day, _i) => {
                const dayItems = itemsByDay[day] ?? [];
                const dayTotal = dayItems.reduce((s, it) => s + Number(it.price || 0), 0);
                const realIdx = dayKeys.indexOf(day);
                return (
                  <div key={day} id={`day-${day}`}>
                    <div className="mb-3 flex items-baseline justify-between">
                      <h3 className="font-display text-lg font-semibold text-teal">
                        Day {realIdx + 1} · {format(new Date(day), "EEEE · MMM d")}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {dayItems.length} item{dayItems.length === 1 ? "" : "s"} · {trip.currency}{" "}
                        {dayTotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[90px]">Time</TableHead>
                            <TableHead>Activity / Stay</TableHead>
                            <TableHead className="hidden md:table-cell">Location</TableHead>
                            <TableHead className="w-[120px] text-right">Price</TableHead>
                            <TableHead className="w-[70px] text-center">Link</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dayItems.map((it) => (
                            <TableRow key={it.id}>
                              <TableCell className="font-medium text-teal">
                                <span className="inline-flex items-center gap-1 text-sm">
                                  <Clock className="h-3.5 w-3.5" />
                                  {it.start_time ? it.start_time.slice(0, 5) : "—"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-medium">{it.title}</span>
                                    {it.category && (
                                      <span
                                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                                          CAT_COLOR[it.category] || CAT_COLOR.other
                                        }`}
                                      >
                                        {it.category}
                                      </span>
                                    )}
                                  </div>
                                  {it.noteText && (
                                    <p className="mt-1 text-xs text-muted-foreground">{it.noteText}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                                {it.location || "—"}
                              </TableCell>
                              <TableCell className="text-right font-medium tabular-nums">
                                {it.price > 0 ? `${trip.currency} ${Number(it.price).toFixed(2)}` : "—"}
                              </TableCell>
                              <TableCell className="text-center">
                                {it.link ? (
                                  <a
                                    href={it.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center rounded-md p-1.5 text-teal hover:bg-muted"
                                    title={it.link}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={async () => {
                                    if (!confirm("Remove this item?")) return;
                                    await supabase.from("itinerary_items").delete().eq("id", it.id);
                                    loadAll();
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {dayItems.length > 0 && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-right text-xs uppercase tracking-wider text-muted-foreground">
                                Day total
                              </TableCell>
                              <TableCell className="text-right font-display font-semibold tabular-nums">
                                {trip.currency} {dayTotal.toFixed(2)}
                              </TableCell>
                              <TableCell colSpan={2} />
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* PHOTOS */}
        <TabsContent value="photos" className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {photos.length} photo{photos.length === 1 ? "" : "s"} on this trip
            </div>
            <AddPhotoDialog
              onAdd={async (url) => {
                const next = [...photos, url];
                await updateTripPhotos(next);
              }}
            />
          </div>
          {photos.length === 0 ? (
            <EmptyMini
              icon="📷"
              title="No photos yet"
              desc="Paste image URLs (from Google Photos, Imgur, your hosting, etc.) to build a visual log."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((url, idx) => (
                <div key={`${url}-${idx}`} className="group relative aspect-square overflow-hidden rounded-xl border bg-muted shadow-card">
                  <img
                    src={url}
                    alt={`Trip photo ${idx + 1}`}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                    onError={(e) => {
                      const tgt = e.currentTarget;
                      tgt.style.display = "none";
                      const sibling = tgt.nextElementSibling as HTMLElement | null;
                      if (sibling) sibling.style.display = "flex";
                    }}
                  />
                  <div className="hidden h-full w-full items-center justify-center text-xs text-muted-foreground">
                    Image failed to load
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm("Remove this photo?")) return;
                      const next = photos.filter((_, i) => i !== idx);
                      await updateTripPhotos(next);
                    }}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                    aria-label="Remove photo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* EXPENSES */}
        <TabsContent value="expenses" className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-teal" /> Running total:{" "}
              <span className="font-medium text-foreground">
                {trip.currency} {totalSpent.toFixed(2)}
              </span>
            </div>
            <AddExpenseDialog
              tripId={tripId}
              userId={user!.id}
              currency={trip.currency}
              onAdded={loadAll}
            />
          </div>
          {expenses.length === 0 ? (
            <EmptyMini icon="💸" title="Nothing logged yet" desc="Log expenses as you go to stay on budget." />
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
              {expenses.map((e, idx) => (
                <div
                  key={e.id}
                  className={`group flex items-center gap-4 px-5 py-4 ${idx > 0 ? "border-t" : ""}`}
                >
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-medium capitalize ${
                      CAT_COLOR[e.category] || CAT_COLOR.other
                    }`}
                  >
                    {e.category}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium">
                      {e.description || (
                        <span className="italic text-muted-foreground">No description</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(e.spent_on), "MMM d, yyyy")}
                    </p>
                  </div>
                  <p className="font-display font-semibold tabular-nums">
                    {e.currency} {Number(e.amount).toFixed(2)}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 transition group-hover:opacity-100"
                    onClick={async () => {
                      await supabase.from("expenses").delete().eq("id", e.id);
                      loadAll();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="mt-12 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={async () => {
            if (!confirm("Delete this trip and all its data?")) return;
            const { error } = await supabase.from("trips").delete().eq("id", tripId);
            if (error) toast.error(error.message);
            else {
              toast.success("Trip deleted");
              navigate({ to: "/trips" });
            }
          }}
        >
          <Trash2 className="mr-1.5 h-4 w-4" /> Delete trip
        </Button>
      </div>
    </main>
  );
}

function EmptyMini({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-card p-12 text-center">
      <div className="mb-2 text-4xl">{icon}</div>
      <h4 className="font-display text-lg font-semibold">{title}</h4>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function AddItineraryDialog({
  tripId,
  userId,
  currency,
  onAdded,
}: {
  tripId: string;
  userId: string;
  currency: string;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    day_date: "",
    start_time: "",
    title: "",
    location: "",
    category: "activity",
    notes: "",
    price: "",
    link: "",
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-deep text-deep-foreground hover:bg-deep/90">
          <Plus className="mr-1.5 h-4 w-4" /> Add activity / stay
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Add to itinerary</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const notesPayload = buildNotes(form.notes, {
              price: form.price ? Number(form.price) : undefined,
              link: form.link || undefined,
            });
            const { error } = await supabase.from("itinerary_items").insert({
              trip_id: tripId,
              user_id: userId,
              day_date: form.day_date,
              start_time: form.start_time || null,
              title: form.title,
              location: form.location || null,
              category: form.category,
              notes: notesPayload,
            });
            if (error) return toast.error(error.message);
            setOpen(false);
            setForm({
              day_date: "",
              start_time: "",
              title: "",
              location: "",
              category: "activity",
              notes: "",
              price: "",
              link: "",
            });
            onAdded();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                required
                value={form.day_date}
                onChange={(e) => setForm({ ...form, day_date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Time</Label>
              <Input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              required
              placeholder="Sushi at Tsukiji"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Price ({currency})</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input
              placeholder="Tsukiji Outer Market"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="inline-flex items-center gap-1.5">
              <LinkIcon className="h-3.5 w-3.5" /> Booking / Info link
            </Label>
            <Input
              type="url"
              placeholder="https://booking.com/…"
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="submit" className="bg-deep text-deep-foreground hover:bg-deep/90">
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddExpenseDialog({
  tripId,
  userId,
  currency,
  onAdded,
}: {
  tripId: string;
  userId: string;
  currency: string;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    spent_on: new Date().toISOString().slice(0, 10),
    amount: "",
    category: "food",
    description: "",
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-deep text-deep-foreground hover:bg-deep/90">
          <Plus className="mr-1.5 h-4 w-4" /> Log expense
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Log expense</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const { error } = await supabase.from("expenses").insert({
              trip_id: tripId,
              user_id: userId,
              spent_on: form.spent_on,
              amount: Number(form.amount),
              currency,
              category: form.category,
              description: form.description || null,
            });
            if (error) return toast.error(error.message);
            setOpen(false);
            setForm({ ...form, amount: "", description: "" });
            onAdded();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                required
                value={form.spent_on}
                onChange={(e) => setForm({ ...form, spent_on: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Amount ({currency})</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXP_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input
              placeholder="Ramen for two"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="submit" className="bg-deep text-deep-foreground hover:bg-deep/90">
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddPhotoDialog({ onAdd }: { onAdd: (url: string) => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-deep text-deep-foreground hover:bg-deep/90">
          <ImagePlus className="mr-1.5 h-4 w-4" /> Add photo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Add a photo</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!url.trim()) return;
            setBusy(true);
            try {
              await onAdd(url.trim());
              setUrl("");
              setOpen(false);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="space-y-1.5">
            <Label>Image URL</Label>
            <Input
              type="url"
              required
              placeholder="https://…/photo.jpg"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Paste a direct link to a JPG/PNG/WEBP. Hosts like Imgur, Cloudinary, or Google Photos
              (with sharing on) all work.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={busy}
              className="bg-deep text-deep-foreground hover:bg-deep/90"
            >
              {busy ? "Adding…" : "Add photo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
