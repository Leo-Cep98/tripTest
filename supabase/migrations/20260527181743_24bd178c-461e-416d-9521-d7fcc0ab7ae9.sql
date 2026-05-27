
CREATE TABLE public.trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  budget NUMERIC(12,2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  cover_emoji TEXT DEFAULT '✈️',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO authenticated;
GRANT ALL ON public.trips TO service_role;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trips_select_own" ON public.trips FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "trips_insert_own" ON public.trips FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "trips_update_own" ON public.trips FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "trips_delete_own" ON public.trips FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.itinerary_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  day_date DATE NOT NULL,
  start_time TIME,
  title TEXT NOT NULL,
  location TEXT,
  category TEXT DEFAULT 'activity',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX itinerary_items_trip_idx ON public.itinerary_items(trip_id, day_date, start_time);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itinerary_items TO authenticated;
GRANT ALL ON public.itinerary_items TO service_role;
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "itin_select_own" ON public.itinerary_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "itin_insert_own" ON public.itinerary_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "itin_update_own" ON public.itinerary_items FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "itin_delete_own" ON public.itinerary_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  spent_on DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  category TEXT NOT NULL DEFAULT 'other',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX expenses_trip_idx ON public.expenses(trip_id, spent_on);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exp_select_own" ON public.expenses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "exp_insert_own" ON public.expenses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exp_update_own" ON public.expenses FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "exp_delete_own" ON public.expenses FOR DELETE TO authenticated USING (auth.uid() = user_id);
