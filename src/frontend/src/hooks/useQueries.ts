import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ChatMessage,
  Expense,
  Ingredient,
  InventoryCount,
  MenuItem,
  Recipe,
  RevenueEntry,
  SalesGoal,
  Task,
  TeamNote,
  UserProfile,
} from "../backend.d";
import {
  SEED_EXPENSES,
  SEED_MENU_ITEMS,
  SEED_SALES_GOALS,
  SEED_TASKS,
} from "../data/seedData";
import { useActor } from "./useActor";

// Synthetic IDs for fallback seed data shown before backend confirms
function asSeedTasks(): Task[] {
  return SEED_TASKS.map((t, i) => ({ id: BigInt(i + 1000), ...t }) as Task);
}
function asSeedMenuItems(): MenuItem[] {
  return SEED_MENU_ITEMS.map(
    (m, i) => ({ id: BigInt(i + 1000), ...m }) as MenuItem,
  );
}
function asSeedGoals(): SalesGoal[] {
  return SEED_SALES_GOALS.map(
    (g, i) => ({ id: BigInt(i + 1000), ...g }) as SalesGoal,
  );
}
function asSeedExpenses(): Expense[] {
  return SEED_EXPENSES.map(
    (e, i) => ({ id: BigInt(i + 1000), ...e }) as Expense,
  );
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export function useGetAllTasks() {
  const { actor, isFetching } = useActor();
  return useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: async () => {
      if (!actor) return asSeedTasks();
      const result = await actor.getAllTasks();
      // If backend is empty (canister freshly deployed), show seed data
      // until useSeedData finishes writing it
      return result.length > 0 ? result : asSeedTasks();
    },
    enabled: !!actor && !isFetching,
    // Show seed data immediately while waiting for backend
    placeholderData: asSeedTasks,
    // Refetch periodically until data is confirmed in backend
    refetchInterval: (query) => {
      const data = query.state.data;
      // Stop polling once we have real backend IDs (not our synthetic 1000+ ones)
      if (data && data.length > 0 && data[0].id < BigInt(1000)) return false;
      return 4000;
    },
  });
}

export function useCreateTask() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (task: Task) => {
      if (!actor) throw new Error("No actor");
      return actor.createTask(task);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateTask() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (task: Task) => {
      if (!actor) throw new Error("No actor");
      return actor.updateTask(task);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useDeleteTask() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteTask(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

// ─── Menu Items ───────────────────────────────────────────────────────────────

export function useGetAllMenuItems() {
  const { actor, isFetching } = useActor();
  return useQuery<MenuItem[]>({
    queryKey: ["menuItems"],
    queryFn: async () => {
      if (!actor) return asSeedMenuItems();
      const result = await actor.getAllMenuItems();
      return result.length > 0 ? result : asSeedMenuItems();
    },
    enabled: !!actor && !isFetching,
    // Show seed data immediately while waiting for backend
    placeholderData: asSeedMenuItems,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && data.length > 0 && data[0].id < BigInt(1000)) return false;
      return 4000;
    },
  });
}

export function useCreateMenuItem() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (item: MenuItem) => {
      if (!actor) throw new Error("No actor");
      return actor.createMenuItem(item);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menuItems"] }),
  });
}

export function useUpdateMenuItem() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (item: MenuItem) => {
      if (!actor) throw new Error("No actor");
      return actor.updateMenuItem(item);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menuItems"] }),
  });
}

export function useDeleteMenuItem() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteMenuItem(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menuItems"] }),
  });
}

// ─── Sales Goals ──────────────────────────────────────────────────────────────

export function useGetAllSalesGoals() {
  const { actor, isFetching } = useActor();
  return useQuery<SalesGoal[]>({
    queryKey: ["salesGoals"],
    queryFn: async () => {
      if (!actor) return asSeedGoals();
      const result = await actor.getAllSalesGoals();
      return result.length > 0 ? result : asSeedGoals();
    },
    enabled: !!actor && !isFetching,
    // Show seed data immediately while waiting for backend
    placeholderData: asSeedGoals,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && data.length > 0 && data[0].id < BigInt(1000)) return false;
      return 4000;
    },
  });
}

export function useCreateSalesGoal() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (goal: SalesGoal) => {
      if (!actor) throw new Error("No actor");
      return actor.createSalesGoal(goal);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["salesGoals"] }),
  });
}

export function useUpdateSalesGoal() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (goal: SalesGoal) => {
      if (!actor) throw new Error("No actor");
      return actor.updateSalesGoal(goal);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["salesGoals"] }),
  });
}

export function useDeleteSalesGoal() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteSalesGoal(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["salesGoals"] }),
  });
}

// ─── Team Notes ───────────────────────────────────────────────────────────────

export function useGetAllTeamNotes() {
  const { actor, isFetching } = useActor();
  return useQuery<TeamNote[]>({
    queryKey: ["teamNotes"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllTeamNotes();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateTeamNote() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (note: TeamNote) => {
      if (!actor) throw new Error("No actor");
      return actor.createTeamNote(note);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teamNotes"] }),
  });
}

export function useUpdateTeamNote() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (note: TeamNote) => {
      if (!actor) throw new Error("No actor");
      return actor.updateTeamNote(note);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teamNotes"] }),
  });
}

export function useDeleteTeamNote() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteTeamNote(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teamNotes"] }),
  });
}

// ─── Chat Messages ────────────────────────────────────────────────────────────

export function useGetAllChatMessages() {
  const { actor, isFetching } = useActor();
  return useQuery<ChatMessage[]>({
    queryKey: ["chatMessages"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllChatMessages();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 15000, // Poll every 15s for live-ish feel
  });
}

export function useCreateChatMessage() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      authorName,
      body,
      attachmentUrl,
      attachmentName,
    }: {
      authorName: string;
      body: string;
      attachmentUrl: string | null;
      attachmentName: string | null;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.createChatMessage(
        authorName,
        body,
        attachmentUrl,
        attachmentName,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chatMessages"] }),
  });
}

export function useDeleteChatMessage() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteChatMessage(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chatMessages"] }),
  });
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export function useGetAllExpenses() {
  const { actor, isFetching } = useActor();
  return useQuery<Expense[]>({
    queryKey: ["expenses"],
    queryFn: async () => {
      if (!actor) return asSeedExpenses();
      const result = await actor.getAllExpenses();
      // If canister was wiped and nothing returned, show seed data until
      // useSeedData re-populates the backend
      return result.length > 0 ? result : asSeedExpenses();
    },
    enabled: !!actor && !isFetching,
    // Show seed expense immediately while waiting for backend
    placeholderData: asSeedExpenses,
    // Poll until we have real backend IDs (not our synthetic 1000+ ones)
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && data.length > 0 && data[0].id < BigInt(1000)) return false;
      return 4000;
    },
  });
}

export function useCreateExpense() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (expense: Expense) => {
      if (!actor) throw new Error("No actor");
      return actor.createExpense(expense);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
}

export function useUpdateExpense() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (expense: Expense) => {
      if (!actor) throw new Error("No actor");
      return actor.updateExpense(expense);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
}

export function useDeleteExpense() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteExpense(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
}

// ─── Revenue Entries ──────────────────────────────────────────────────────────

export function useGetAllRevenueEntries() {
  const { actor, isFetching } = useActor();
  return useQuery<RevenueEntry[]>({
    queryKey: ["revenueEntries"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllRevenueEntries();
    },
    enabled: !!actor && !isFetching,
    // Always show empty array while waiting; refetch every 5s to catch
    // entries written by other mutations (Square import, manual add, etc.)
    // Stop once at least one real entry is confirmed.
    refetchInterval: 5000,
    // Keep data fresh across tab focus
    staleTime: 0,
  });
}

export function useCreateRevenueEntry() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entry: RevenueEntry) => {
      if (!actor) throw new Error("No actor");
      return actor.createRevenueEntry(entry);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["revenueEntries"] }),
  });
}

export function useUpdateRevenueEntry() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entry: RevenueEntry) => {
      if (!actor) throw new Error("No actor");
      return actor.updateRevenueEntry(entry);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["revenueEntries"] }),
  });
}

export function useDeleteRevenueEntry() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteRevenueEntry(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["revenueEntries"] }),
  });
}

// ─── Ingredients ──────────────────────────────────────────────────────────────

export function useGetAllIngredients() {
  const { actor, isFetching } = useActor();
  return useQuery<Ingredient[]>({
    queryKey: ["ingredients"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllIngredients();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateIngredient() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ingredient: Ingredient) => {
      if (!actor) throw new Error("No actor");
      return actor.createIngredient(ingredient);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ingredients"] }),
  });
}

export function useUpdateIngredient() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ingredient: Ingredient) => {
      if (!actor) throw new Error("No actor");
      return actor.updateIngredient(ingredient);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ingredients"] }),
  });
}

export function useDeleteIngredient() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteIngredient(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ingredients"] }),
  });
}

// ─── Recipes ──────────────────────────────────────────────────────────────────

export function useGetAllRecipes() {
  const { actor, isFetching } = useActor();
  return useQuery<Recipe[]>({
    queryKey: ["recipes"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllRecipes();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateRecipe() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recipe: Recipe) => {
      if (!actor) throw new Error("No actor");
      return actor.createRecipe(recipe);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
  });
}

export function useUpdateRecipe() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recipe: Recipe) => {
      if (!actor) throw new Error("No actor");
      return actor.updateRecipe(recipe);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
  });
}

export function useDeleteRecipe() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteRecipe(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
  });
}

// ─── Inventory Counts ─────────────────────────────────────────────────────────

export function useGetAllInventoryCounts() {
  const { actor, isFetching } = useActor();
  return useQuery<InventoryCount[]>({
    queryKey: ["inventoryCounts"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllInventoryCounts();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateInventoryCount() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invCount: InventoryCount) => {
      if (!actor) throw new Error("No actor");
      return actor.createInventoryCount(invCount);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventoryCounts"] }),
  });
}

export function useDeleteInventoryCount() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteInventoryCount(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventoryCounts"] }),
  });
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching } = useActor();
  return useQuery<UserProfile | null>({
    queryKey: ["userProfile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (profile: UserProfile) => {
      if (!actor) throw new Error("No actor");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["userProfile"] }),
  });
}
