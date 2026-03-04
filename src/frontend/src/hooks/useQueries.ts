import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ChatMessage,
  Expense,
  MenuItem,
  RevenueEntry,
  SalesGoal,
  Task,
  TeamNote,
  UserProfile,
} from "../backend.d";
import {
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
      if (!actor) return [];
      return actor.getAllExpenses();
    },
    enabled: !!actor && !isFetching,
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
