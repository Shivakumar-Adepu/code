import { Outlet, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { isAuthenticated, getCurrentUser, getInitials } from "@/lib/auth";

export default function AppLayout() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const user = getCurrentUser();
  const displayName = user?.name || "Guest";
  const initials = getInitials(displayName);
  const plan = user?.plan || "Pro plan";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="relative ml-2 hidden md:block">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search analyses, repos, issues..." className="h-9 w-80 pl-8 bg-secondary/50" />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <ThemeToggle />
              <button className="relative rounded-md p-2 hover:bg-secondary">
                <Bell className="h-4 w-4" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--cyan)]" />
              </button>
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-[var(--gradient-primary)] text-xs font-semibold text-primary-foreground">{initials}</div>
                <div className="hidden text-xs leading-tight md:block">
                  <div className="font-medium">{displayName}</div>
                  <div className="text-muted-foreground">{plan}</div>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 p-6"><Outlet /></main>
        </div>
      </div>
    </SidebarProvider>
  );
}
