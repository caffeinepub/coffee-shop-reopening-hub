import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { motion } from "motion/react";

export default function Login() {
  const { login, isLoggingIn } = useInternetIdentity();

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel — brand block */}
      <div className="hidden lg:flex flex-col justify-between w-96 bg-sidebar px-10 py-12 shrink-0">
        <div>
          <p className="text-sidebar-foreground text-2xl font-normal uppercase tracking-widest">
            ALL DAY
          </p>
          <p className="text-sidebar-foreground/30 text-xs uppercase tracking-widest mt-2 font-light">
            Reopening Manager
          </p>
        </div>
        <div className="space-y-6">
          {["Tasks", "Menu", "Sales Goals", "Team Notes"].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <span className="w-px h-4 bg-sidebar-foreground/20 block" />
              <p className="text-sidebar-foreground/40 text-xs uppercase tracking-widest font-light">
                {item}
              </p>
            </div>
          ))}
        </div>
        <p className="text-sidebar-foreground/20 text-xs font-light tracking-wide">
          Your reopening, organized.
        </p>
      </div>

      {/* Right panel — sign in */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="w-full max-w-sm space-y-10"
        >
          {/* Mobile wordmark */}
          <div className="lg:hidden">
            <p className="text-foreground text-xl font-normal uppercase tracking-widest">
              ALL DAY
            </p>
            <p className="text-muted-foreground text-xs uppercase tracking-widest mt-1 font-light">
              Reopening Manager
            </p>
          </div>

          <div>
            <h1 className="text-2xl font-normal uppercase tracking-widest text-foreground">
              Sign In
            </h1>
            <p className="text-muted-foreground text-sm font-light mt-3 leading-relaxed tracking-wide">
              Access your reopening dashboard with a secure, passwordless
              sign-in.
            </p>
          </div>

          <div className="space-y-4">
            <button
              type="button"
              data-ocid="auth.primary_button"
              onClick={() => login()}
              disabled={isLoggingIn}
              className="w-full bg-foreground text-background text-xs uppercase tracking-widest font-medium py-4 px-6 transition-opacity duration-150 hover:opacity-80 disabled:opacity-40"
            >
              {isLoggingIn ? "Signing in..." : "Sign In"}
            </button>
            <p className="text-xs text-muted-foreground font-light tracking-wide text-center">
              Access restricted to @alldaymia.com team members
            </p>
          </div>

          <div className="pt-8 border-t border-border">
            <p className="text-xs text-muted-foreground font-light uppercase tracking-widest">
              © {new Date().getFullYear()} ·{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                caffeine.ai
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
