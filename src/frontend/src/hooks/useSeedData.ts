import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import type {
  Expense,
  MenuItem,
  SalesGoal,
  Task,
  TeamNote,
} from "../backend.d";
import {
  SEED_EXPENSES,
  SEED_MENU_ITEMS,
  SEED_SALES_GOALS,
  SEED_TASKS,
  SEED_TEAM_NOTES,
} from "../data/seedData";
import { useActor } from "./useActor";

export function useSeedData() {
  const { actor, isFetching } = useActor();
  const qc = useQueryClient();
  const runningRef = useRef(false);
  // Track which actor principal we last seeded so we re-run when actor changes
  const seededForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!actor || isFetching) return;
    // Allow re-run if actor identity changed (e.g. new login)
    const actorKey = actor.toString?.() ?? "actor";
    if (runningRef.current) return;
    if (seededForRef.current === actorKey) return;

    runningRef.current = true;

    async function trySeed() {
      if (!actor) return;

      const MAX_ATTEMPTS = 8;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const [
            existingTasks,
            existingMenuItems,
            existingGoals,
            existingNotes,
            existingExpenses,
          ] = await Promise.all([
            actor.getAllTasks(),
            actor.getAllMenuItems(),
            actor.getAllSalesGoals(),
            actor.getAllTeamNotes(),
            actor.getAllExpenses(),
          ]);

          let didSeed = false;

          // ── Tasks ────────────────────────────────────────────────────────
          // Always check by title to detect missing tasks (handles canister wipes)
          const existingTaskTitles = new Set(existingTasks.map((t) => t.title));
          const missingTasks = SEED_TASKS.filter(
            (t) => !existingTaskTitles.has(t.title),
          );
          if (missingTasks.length > 0) {
            didSeed = true;
            // Wipe all and re-seed cleanly
            for (const t of existingTasks) {
              try {
                await actor.deleteTask(t.id);
              } catch (_) {
                /* ignore */
              }
            }
            for (const t of SEED_TASKS) {
              await actor.createTask({ id: BigInt(0), ...t } as Task);
            }
          }

          // ── Menu Items ───────────────────────────────────────────────────
          const existingNames = new Set(existingMenuItems.map((m) => m.name));
          const missingItems = SEED_MENU_ITEMS.filter(
            (m) => !existingNames.has(m.name),
          );
          if (missingItems.length > 0) {
            didSeed = true;
            for (const m of existingMenuItems) {
              try {
                await actor.deleteMenuItem(m.id);
              } catch (_) {
                /* ignore */
              }
            }
            for (const m of SEED_MENU_ITEMS) {
              await actor.createMenuItem({ id: BigInt(0), ...m } as MenuItem);
            }
          }

          // ── Sales Goals ──────────────────────────────────────────────────
          if (existingGoals.length === 0 && SEED_SALES_GOALS.length > 0) {
            didSeed = true;
            for (const g of SEED_SALES_GOALS) {
              await actor.createSalesGoal({ id: BigInt(0), ...g } as SalesGoal);
            }
          }

          // ── Team Notes ───────────────────────────────────────────────────
          if (existingNotes.length === 0 && SEED_TEAM_NOTES.length > 0) {
            didSeed = true;
            for (const n of SEED_TEAM_NOTES) {
              await actor.createTeamNote({ id: BigInt(0), ...n } as TeamNote);
            }
          }

          // ── Expenses ─────────────────────────────────────────────────────
          // Only seed when the backend is completely empty (canister wipe).
          // This avoids overwriting user-entered expenses with seed data.
          if (SEED_EXPENSES.length > 0 && existingExpenses.length === 0) {
            didSeed = true;
            for (const e of SEED_EXPENSES) {
              await actor.createExpense({
                id: BigInt(0),
                ...e,
              } as Expense);
            }
          }

          if (didSeed) {
            await Promise.all([
              qc.invalidateQueries({ queryKey: ["tasks"] }),
              qc.invalidateQueries({ queryKey: ["menuItems"] }),
              qc.invalidateQueries({ queryKey: ["salesGoals"] }),
              qc.invalidateQueries({ queryKey: ["teamNotes"] }),
              qc.invalidateQueries({ queryKey: ["expenses"] }),
            ]);
          }

          // Done
          seededForRef.current = actorKey;
          break;
        } catch (err) {
          console.error(
            `[seed] attempt ${attempt}/${MAX_ATTEMPTS} failed:`,
            err,
          );
          if (attempt < MAX_ATTEMPTS) {
            await new Promise((r) => setTimeout(r, 1500 * attempt));
          }
        }
      }

      runningRef.current = false;
    }

    trySeed();
  }, [actor, isFetching, qc]);
}
