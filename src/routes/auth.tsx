import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Compass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/trips", replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden bg-hero p-12 text-deep-foreground md:flex md:flex-col md:justify-between">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
          <Compass className="h-5 w-5 text-mint" /> Pandas Wanderlust
        </Link>
        <div className="max-w-md">
          <h2 className="font-display text-4xl font-semibold leading-tight">
            Trips you'll<br /><span className="text-gradient-mint">actually remember.</span>
          </h2>
          <p className="mt-4 text-deep-foreground/75">
            Itineraries and expense tracking, side by side. Sign in to pick up where you left off — or start your next adventure in seconds.
          </p>
        </div>
        <span className="text-xs text-deep-foreground/60">© {new Date().getFullYear()} Pandas Wanderlust</span>
      </div>

      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 font-display text-lg font-semibold md:hidden">
            <Compass className="h-5 w-5 text-teal" /> Pandas Wanderlust
          </Link>
          <h1 className="font-display text-3xl font-semibold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your travel log.</p>

          <Button
            variant="outline"
            className="mt-6 w-full"
            onClick={async () => {
              const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: window.location.origin + "/trips" },
              });
              if (error) toast.error(error.message);
            }}
          >
            <GoogleIcon /> Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or email <span className="h-px flex-1 bg-border" />
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin"><EmailForm mode="signin" /></TabsContent>
            <TabsContent value="signup"><EmailForm mode="signup" /></TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function EmailForm({ mode }: { mode: "signin" | "signup" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  return (
    <form
      className="mt-5 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          if (mode === "signup") {
            const { error } = await supabase.auth.signUp({
              email,
              password,
              options: { emailRedirectTo: `${window.location.origin}/trips` },
            });
            if (error) throw error;
            toast.success("Check your inbox to confirm your email.");
          } else {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            navigate({ to: "/trips" });
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Something went wrong");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Just a moment…" : mode === "signup" ? "Create account" : "Sign in"}
      </Button>
    </form>
  );
}

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.1z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.56-2.77c-.99.67-2.26 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.95l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"/>
    </svg>
  );
}
