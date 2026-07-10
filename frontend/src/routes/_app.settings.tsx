import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function Settings() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>

      <section className="glass space-y-4 rounded-2xl p-6">
        <h2 className="font-semibold">Profile</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div><Label>Name</Label><Input defaultValue="Ada Lovelace" className="mt-1.5" /></div>
          <div><Label>Email</Label><Input defaultValue="ada@codeguard.ai" className="mt-1.5" /></div>
        </div>
        <Button className="bg-[var(--gradient-primary)] text-primary-foreground glow">Save changes</Button>
      </section>

      <section className="glass space-y-4 rounded-2xl p-6">
        <h2 className="font-semibold">Preferences</h2>
        {[
          { label: "Email notifications", desc: "Get alerts when a critical issue is found." },
          { label: "Auto-analyze PRs", desc: "Run CodeGuard on every new pull request." },
          { label: "Predictive forecasts", desc: "Show future-bug probability charts in dashboards." },
        ].map((p) => (
          <div key={p.label} className="flex items-center justify-between border-t border-border/40 pt-4 first:border-0 first:pt-0">
            <div>
              <div className="font-medium">{p.label}</div>
              <div className="text-xs text-muted-foreground">{p.desc}</div>
            </div>
            <Switch defaultChecked />
          </div>
        ))}
      </section>
    </div>
  );
}
