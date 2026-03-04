import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { MenuItem, SalesGoal, Task, TeamNote } from "../backend.d";
import {
  SEED_MENU_ITEMS,
  SEED_SALES_GOALS,
  SEED_TASKS,
  SEED_TEAM_NOTES,
} from "../data/seedData";
import { useActor } from "./useActor";

export function useSeedData() {
  const { actor, isFetching } = useActor();
  const qc = useQueryClient();
  // Track whether seeding is done so we don't run it multiple times
  const seededRef = useRef(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    // Wait until actor is ready and we haven't seeded yet
    if (!actor || isFetching || seededRef.current) return;

    let cancelled = false;

    async function seed() {
      if (!actor) return;

      try {
        const [tasks, menuItems, goals, notes] = await Promise.all([
          actor.getAllTasks(),
          actor.getAllMenuItems(),
          actor.getAllSalesGoals(),
          actor.getAllTeamNotes(),
        ]);

        if (cancelled) return;

        let didSeed = false;

        // ── Tasks ─────────────────────────────────────────────────────────────
        if (tasks.length < SEED_TASKS.length) {
          didSeed = true;
          // Wipe existing tasks if any partial set present
          if (tasks.length > 0) {
            await Promise.allSettled(tasks.map((t) => actor.deleteTask(t.id)));
          }
          // Insert all seed tasks sequentially to avoid canister overload
          for (const t of SEED_TASKS) {
            await actor.createTask({ id: BigInt(0), ...t } as Task);
          }
        }

        if (cancelled) return;

        // ── Menu Items ────────────────────────────────────────────────────────
        const existingNames = new Set(menuItems.map((m) => m.name));
        const missingMenuItems = SEED_MENU_ITEMS.filter(
          (m) => !existingNames.has(m.name),
        );

        if (missingMenuItems.length > 0) {
          didSeed = true;
          // Full reseed — wipe first for clean state
          if (menuItems.length > 0) {
            await Promise.allSettled(
              menuItems.map((m) => actor.deleteMenuItem(m.id)),
            );
          }
          for (const m of SEED_MENU_ITEMS) {
            await actor.createMenuItem({ id: BigInt(0), ...m } as MenuItem);
          }
        }

        if (cancelled) return;

        // ── Sales Goals ───────────────────────────────────────────────────────
        if (goals.length === 0) {
          didSeed = true;
          for (const g of SEED_SALES_GOALS) {
            await actor.createSalesGoal({ id: BigInt(0), ...g } as SalesGoal);
          }
        }

        if (cancelled) return;

        // ── Team Notes ────────────────────────────────────────────────────────
        if (notes.length === 0 && SEED_TEAM_NOTES.length > 0) {
          didSeed = true;
          for (const n of SEED_TEAM_NOTES) {
            await actor.createTeamNote({ id: BigInt(0), ...n } as TeamNote);
          }
        }

        if (cancelled) return;

        // Mark seeded so we never re-run
        seededRef.current = true;

        if (didSeed) {
          await Promise.all([
            qc.invalidateQueries({ queryKey: ["tasks"] }),
            qc.invalidateQueries({ queryKey: ["menuItems"] }),
            qc.invalidateQueries({ queryKey: ["salesGoals"] }),
            qc.invalidateQueries({ queryKey: ["teamNotes"] }),
          ]);
        }
      } catch (err) {
        console.error("Seed error:", err);
        // On failure, wait 3 seconds and trigger a retry by bumping tick
        if (!cancelled) {
          setTimeout(() => {
            if (!cancelled) setTick((n) => n + 1);
          }, 3000);
        }
      }
    }

    seed();

    return () => {
      cancelled = true;
    };
  }, [actor, isFetching, qc]);
}
