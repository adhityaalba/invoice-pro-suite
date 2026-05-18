import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, FilePlus2, Settings, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/invoice/new", icon: FilePlus2, label: "Buat Invoice" },
  { to: "/settings", icon: Settings, label: "Pengaturan" },
];

export default function AppLayout() {
  const loc = useLocation();
  const isEditor = loc.pathname.startsWith("/invoice/");
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="no-print sticky top-0 z-30 border-b bg-card/80 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4 md:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Smartphone className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold">Circle Pair</div>
              <div className="text-[10px] text-muted-foreground -mt-0.5">Invoice & Service Order</div>
            </div>
          </div>
          <nav className="ml-6 hidden md:flex items-center gap-1">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )
                }
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
        {/* mobile nav */}
        <nav className="md:hidden flex border-t">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px]",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className={cn("mx-auto", isEditor ? "max-w-[1600px]" : "max-w-6xl px-4 md:px-6 py-6")}>
        <Outlet />
      </main>
    </div>
  );
}
