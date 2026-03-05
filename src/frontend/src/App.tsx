import { Toaster } from "@/components/ui/sonner";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useSeedData } from "@/hooks/useSeedData";
import Chat from "@/pages/Chat";
import Dashboard from "@/pages/Dashboard";
import InventoryPage from "@/pages/Inventory";
import Login from "@/pages/Login";
import MenuPage from "@/pages/Menu";
import PnL from "@/pages/PnL";
import Tasks from "@/pages/Tasks";
import {
  CheckSquare,
  Coffee,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  TrendingUp,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

const TEAM_MEMBERS = ["Camila", "Juan", "Chris", "Valeria"] as const;
type TeamMember = (typeof TEAM_MEMBERS)[number];
const STORAGE_KEY = "alldaymia_user_name";

const MEMBER_OCIDS: Record<TeamMember, string> = {
  Camila: "profile.camila_button",
  Juan: "profile.juan_button",
  Chris: "profile.chris_button",
  Valeria: "profile.valeria_button",
};

function WhoAreYou({ onSelect }: { onSelect: (name: TeamMember) => void }) {
  return (
    <motion.div
      data-ocid="profile.modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-sidebar"
    >
      {/* Subtle grain texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none [background-image:url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center px-8 max-w-xs w-full"
      >
        {/* Wordmark */}
        <p className="text-sidebar-foreground/30 text-xs uppercase tracking-widest mb-10 font-light">
          ALL DAY · Pop-Up Manager
        </p>

        {/* Heading */}
        <h1 className="text-sidebar-foreground text-2xl uppercase tracking-widest font-light mb-2 text-center">
          Who are you?
        </h1>
        <p className="text-sidebar-foreground/40 text-xs uppercase tracking-widest mb-10 text-center font-light">
          Select your name to continue
        </p>

        {/* Name buttons */}
        <div className="flex flex-col gap-3 w-full">
          {TEAM_MEMBERS.map((name) => (
            <motion.button
              key={name}
              type="button"
              data-ocid={MEMBER_OCIDS[name]}
              onClick={() => onSelect(name)}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="w-full py-4 px-6 border border-sidebar-foreground/20 text-sidebar-foreground text-xs uppercase tracking-widest font-medium text-left hover:border-sidebar-foreground/60 hover:bg-sidebar-foreground/5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-foreground/50"
            >
              {name}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

type Page = "dashboard" | "tasks" | "menu" | "inventory" | "goals" | "chat";

const navItems: {
  id: Page;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  ocid: string;
}[] = [
  {
    id: "dashboard",
    label: "Overview",
    icon: LayoutDashboard,
    ocid: "nav.dashboard_link",
  },
  { id: "tasks", label: "Tasks", icon: CheckSquare, ocid: "nav.tasks_link" },
  { id: "menu", label: "Menu", icon: Coffee, ocid: "nav.menu_link" },
  {
    id: "inventory",
    label: "Inventory",
    icon: Package,
    ocid: "nav.inventory_link",
  },
  {
    id: "goals",
    label: "Financials",
    icon: TrendingUp,
    ocid: "nav.goals_link",
  },
  {
    id: "chat",
    label: "Team Chat",
    icon: MessageSquare,
    ocid: "nav.chat_link",
  },
];

function AppShell() {
  const { clear, isInitializing } = useInternetIdentity();
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY),
  );

  useSeedData();

  const handleSelectName = (name: TeamMember) => {
    localStorage.setItem(STORAGE_KEY, name);
    setUserName(name);
  };

  const handleResetName = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUserName(null);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-5 h-5 border border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pageComponents: Record<Page, React.ReactNode> = {
    dashboard: <Dashboard />,
    tasks: <Tasks />,
    menu: <MenuPage />,
    inventory: <InventoryPage />,
    goals: <PnL />,
    chat: <Chat />,
  };

  const SidebarContent = () => (
    <>
      {/* Wordmark */}
      <div className="px-7 pt-8 pb-6 border-b border-sidebar-border">
        <p className="text-sidebar-foreground text-xl font-normal uppercase tracking-widest leading-none">
          ALL DAY
        </p>
        <p className="text-sidebar-foreground/30 text-xs uppercase tracking-widest mt-1.5 font-light">
          Pop-Up Manager
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 flex flex-col gap-0.5">
        {navItems.map(({ id, label, ocid }) => {
          const isActive = activePage === id;
          return (
            <button
              type="button"
              key={id}
              data-ocid={ocid}
              onClick={() => {
                setActivePage(id);
                setMobileNavOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 text-xs uppercase tracking-widest font-medium transition-all duration-150 rounded-none relative ${
                isActive
                  ? "text-sidebar-foreground"
                  : "text-sidebar-foreground/50 hover:text-sidebar-foreground/80"
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-sidebar-primary rounded-full" />
              )}
              {label}
            </button>
          );
        })}
      </nav>

      {/* User / logout */}
      <div className="px-4 py-5 border-t border-sidebar-border">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <p className="text-sidebar-foreground text-xs uppercase tracking-widest font-medium truncate">
              {userName || "—"}
            </p>
            {userName && (
              <button
                type="button"
                data-ocid="profile.reset_button"
                onClick={handleResetName}
                className="text-sidebar-foreground/30 hover:text-sidebar-foreground/60 transition-colors text-[10px] uppercase tracking-wider shrink-0 leading-none"
                title="Not you? Switch name"
              >
                ↩
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => clear()}
            className="text-sidebar-foreground/30 hover:text-sidebar-foreground/70 transition-colors p-1 shrink-0"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <AnimatePresence>
        {!userName && <WhoAreYou onSelect={handleSelectName} />}
      </AnimatePresence>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Sidebar — desktop */}
        <aside className="hidden lg:flex flex-col w-56 shrink-0 bg-sidebar">
          <SidebarContent />
        </aside>

        {/* Mobile nav overlay */}
        <AnimatePresence>
          {mobileNavOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/40 lg:hidden"
                onClick={() => setMobileNavOpen(false)}
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed inset-y-0 left-0 z-50 w-56 bg-sidebar flex flex-col lg:hidden"
              >
                <SidebarContent />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile header */}
          <header className="lg:hidden flex items-center justify-between px-5 py-4 bg-background border-b border-border">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="text-foreground/60 hover:text-foreground transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <p className="text-foreground text-sm uppercase tracking-widest font-normal">
              ALL DAY
            </p>
            <div className="w-5" />
          </header>

          {/* Page */}
          <main className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePage}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="min-h-full"
              >
                {pageComponents[activePage]}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Footer */}
          <footer className="border-t border-border px-6 py-3 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-light">
              © {new Date().getFullYear()} · Built with{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                caffeine.ai
              </a>
            </p>
          </footer>
        </div>
      </div>
    </>
  );
}

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-5 h-5 border border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {identity ? <AppShell /> : <Login />}
      <Toaster position="top-right" />
    </>
  );
}
