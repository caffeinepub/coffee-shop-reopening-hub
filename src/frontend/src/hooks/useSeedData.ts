import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
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
  const running = useRef(false);
  const retryCount = useRef(0);
  const maxRetries = 8;

  useEffect(() => {
    if (!actor || isFetching || running.current) return;

    running.current = true;

    async function seed() {
      if (!actor) return;
      try {
        const [tasks, menuItems, goals, notes] = await Promise.all([
          actor.getAllTasks(),
          actor.getAllMenuItems(),
          actor.getAllSalesGoals(),
          actor.getAllTeamNotes(),
        ]);

        let didSeed = false;

        // ── Tasks ─────────────────────────────────────────────────────────────
        if (tasks.length < SEED_TASKS.length) {
          didSeed = true;
          if (tasks.length > 0) {
            await Promise.allSettled(tasks.map((t) => actor.deleteTask(t.id)));
          }
          await Promise.all(
            SEED_TASKS.map((t) =>
              actor.createTask({ id: BigInt(0), ...t } as Task),
            ),
          );
        }

        // ── Menu Items ────────────────────────────────────────────────────────
        const existingNames = new Set(menuItems.map((m) => m.name));
        const missingMenuItems = SEED_MENU_ITEMS.filter(
          (m) => !existingNames.has(m.name),
        );

        if (missingMenuItems.length > 0) {
          didSeed = true;
          // Full reseed whenever anything is missing (wipe + reinsert for clean state)
          if (menuItems.length > 0) {
            await Promise.allSettled(
              menuItems.map((m) => actor.deleteMenuItem(m.id)),
            );
          }
          await Promise.all(
            SEED_MENU_ITEMS.map((m) =>
              actor.createMenuItem({ id: BigInt(0), ...m } as MenuItem),
            ),
          );
        }

        // ── Sales Goals ───────────────────────────────────────────────────────
        if (goals.length === 0) {
          didSeed = true;
          await Promise.all(
            SEED_SALES_GOALS.map((g) =>
              actor.createSalesGoal({ id: BigInt(0), ...g } as SalesGoal),
            ),
          );
        }

        // ── Team Notes ────────────────────────────────────────────────────────
        if (notes.length === 0 && SEED_TEAM_NOTES.length > 0) {
          didSeed = true;
          await Promise.all(
            SEED_TEAM_NOTES.map((n) =>
              actor.createTeamNote({ id: BigInt(0), ...n } as TeamNote),
            ),
          );
        }

        if (didSeed) {
          await qc.invalidateQueries({ queryKey: ["tasks"] });
          await qc.invalidateQueries({ queryKey: ["menuItems"] });
          await qc.invalidateQueries({ queryKey: ["salesGoals"] });
          await qc.invalidateQueries({ queryKey: ["teamNotes"] });
        }

        // Seed completed successfully — reset retry counter
        retryCount.current = 0;
        running.current = false;
      } catch (err) {
        console.error("Seed data error:", err);
        running.current = false;
        retryCount.current += 1;
        if (retryCount.current < maxRetries) {
          const delay = Math.min(1000 * 2 ** retryCount.current, 15000);
          setTimeout(() => {
            qc.invalidateQueries({ queryKey: ["actor"] });
          }, delay);
        }
      }
    }

    seed();
  }, [actor, isFetching, qc]);
}
