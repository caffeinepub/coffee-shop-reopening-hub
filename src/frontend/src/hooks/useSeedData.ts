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

// Bump this key when seed data changes to force a re-seed
const SEED_VERSION = "v3";
const SESSION_SEED_KEY = `alldaymia_seeded_${SEED_VERSION}`;

export function useSeedData() {
  const { actor, isFetching } = useActor();
  const qc = useQueryClient();
  const runningRef = useRef(false);

  useEffect(() => {
    if (!actor || isFetching) return;
    if (runningRef.current) return;

    runningRef.current = true;

    async function trySeed() {
      if (!actor) return;

      const MAX_ATTEMPTS = 6;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const [
            existingTasks,
            existingMenuItems,
            existingGoals,
            existingNotes,
          ] = await Promise.all([
            actor.getAllTasks(),
            actor.getAllMenuItems(),
            actor.getAllSalesGoals(),
            actor.getAllTeamNotes(),
          ]);

          let didSeed = false;

          // ── Tasks ────────────────────────────────────────────────────────
          if (existingTasks.length < SEED_TASKS.length) {
            didSeed = true;
            // Wipe any partial set first
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

          // Mark seeded this session
          sessionStorage.setItem(SESSION_SEED_KEY, "1");

          if (didSeed) {
            await Promise.all([
              qc.invalidateQueries({ queryKey: ["tasks"] }),
              qc.invalidateQueries({ queryKey: ["menuItems"] }),
              qc.invalidateQueries({ queryKey: ["salesGoals"] }),
              qc.invalidateQueries({ queryKey: ["teamNotes"] }),
            ]);
          }

          // Done
          break;
        } catch (err) {
          console.error(
            `[seed] attempt ${attempt}/${MAX_ATTEMPTS} failed:`,
            err,
          );
          if (attempt < MAX_ATTEMPTS) {
            await new Promise((r) => setTimeout(r, 2000 * attempt));
          }
        }
      }

      runningRef.current = false;
    }

    trySeed();
  }, [actor, isFetching, qc]);
}
