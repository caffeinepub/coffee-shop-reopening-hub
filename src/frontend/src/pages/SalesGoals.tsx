import { GoalPeriod } from "@/backend.d";
import type { SalesGoal } from "@/backend.d";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateSalesGoal,
  useDeleteSalesGoal,
  useGetAllSalesGoals,
  useUpdateSalesGoal,
} from "@/hooks/useQueries";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

const periodLabels: Record<GoalPeriod, string> = {
  [GoalPeriod.daily]: "Daily",
  [GoalPeriod.weekly]: "Weekly",
  [GoalPeriod.monthly]: "Monthly",
};

const EMPTY_FORM: Partial<SalesGoal> & {
  progressInput: string;
  targetInput: string;
} = {
  name: "",
  targetAmount: BigInt(0),
  currentProgress: BigInt(0),
  period: GoalPeriod.weekly,
  notes: "",
  progressInput: "0",
  targetInput: "0",
};

export default function SalesGoals() {
  const { data: goals, isLoading } = useGetAllSalesGoals();
  const createGoal = useCreateSalesGoal();
  const updateGoal = useUpdateSalesGoal();
  const deleteGoal = useDeleteSalesGoal();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SalesGoal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<bigint | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  function openAdd() {
    setEditingGoal(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(goal: SalesGoal) {
    setEditingGoal(goal);
    setForm({
      ...goal,
      progressInput: Number(goal.currentProgress).toString(),
      targetInput: Number(goal.targetAmount).toString(),
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.name?.trim()) return;
    const goalData: SalesGoal = {
      id: editingGoal?.id ?? BigInt(0),
      name: form.name!,
      targetAmount: BigInt(
        Math.round(Number.parseFloat(form.targetInput || "0") || 0),
      ),
      currentProgress: BigInt(
        Math.round(Number.parseFloat(form.progressInput || "0") || 0),
      ),
      period: form.period ?? GoalPeriod.weekly,
      notes: form.notes ?? "",
    };
    if (editingGoal) {
      await updateGoal.mutateAsync(goalData);
    } else {
      await createGoal.mutateAsync(goalData);
    }
    setDialogOpen(false);
  }

  async function handleDelete() {
    if (deleteTarget !== null) {
      await deleteGoal.mutateAsync(deleteTarget);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="px-8 py-10 max-w-4xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="label-caps mb-1">Tracking</p>
          <h1 className="text-3xl font-normal uppercase tracking-widest text-foreground">
            Financials
          </h1>
        </div>
        <button
          type="button"
          onClick={openAdd}
          data-ocid="goals.add_button"
          className="flex items-center gap-2 bg-foreground text-background text-xs uppercase tracking-widest font-medium py-3 px-5 hover:opacity-80 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Goal
        </button>
      </div>

      {isLoading ? (
        <div className="divide-y divide-border border-t border-b border-border">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-none" />
          ))}
        </div>
      ) : !goals || goals.length === 0 ? (
        <div
          data-ocid="goals.empty_state"
          className="py-16 text-center border border-dashed border-border"
        >
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-light">
            No goals set
          </p>
          <p className="text-xs text-muted-foreground font-light mt-1">
            Add your first goal to track revenue and volume.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border border-t border-b border-border">
          <AnimatePresence mode="popLayout">
            {goals.map((goal, idx) => {
              const target = Number(goal.targetAmount);
              const progress = Number(goal.currentProgress);
              const pct =
                target > 0
                  ? Math.min(100, Math.round((progress / target) * 100))
                  : 0;
              const isMonetary =
                goal.name.toLowerCase().includes("revenue") ||
                goal.name.toLowerCase().includes("sales");

              return (
                <motion.div
                  key={goal.id.toString()}
                  data-ocid={`goals.item.${idx + 1}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="py-7 group"
                >
                  <div className="flex items-start justify-between gap-5">
                    {/* Left: info */}
                    <div className="flex-1 min-w-0 space-y-4">
                      <div className="flex items-baseline gap-4">
                        <p className="text-sm font-normal tracking-wide text-foreground">
                          {goal.name}
                        </p>
                        <span className="label-caps shrink-0">
                          {periodLabels[goal.period]}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1.5">
                        <div className="h-px w-full bg-border overflow-hidden">
                          <motion.div
                            className="h-px progress-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground font-light tabular-nums">
                            {isMonetary
                              ? `$${progress.toLocaleString()} / $${target.toLocaleString()}`
                              : `${progress.toLocaleString()} / ${target.toLocaleString()}`}
                          </p>
                          <p className="text-sm font-light tabular-nums text-foreground">
                            {pct}%
                          </p>
                        </div>
                      </div>

                      {goal.notes && (
                        <p className="text-xs text-muted-foreground font-light leading-relaxed line-clamp-2">
                          {goal.notes}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                      <button
                        type="button"
                        data-ocid={`goals.edit_button.${idx + 1}`}
                        onClick={() => openEdit(goal)}
                        className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        data-ocid={`goals.delete_button.${idx + 1}`}
                        onClick={() => setDeleteTarget(goal.id)}
                        className="p-1.5 text-muted-foreground hover:text-brand-terracotta transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          data-ocid="goals.dialog"
          className="sm:max-w-md rounded-none"
        >
          <DialogHeader>
            <DialogTitle className="uppercase tracking-widest font-normal text-base">
              {editingGoal ? "Edit Goal" : "New Goal"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="label-caps">Goal Name</Label>
              <Input
                data-ocid="goals.name_input"
                value={form.name ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g., Opening Week Revenue"
                className="rounded-none font-light text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="label-caps">Period</Label>
              <Select
                value={form.period}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, period: v as GoalPeriod }))
                }
              >
                <SelectTrigger className="rounded-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem value={GoalPeriod.daily}>Daily</SelectItem>
                  <SelectItem value={GoalPeriod.weekly}>Weekly</SelectItem>
                  <SelectItem value={GoalPeriod.monthly}>Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="label-caps">Target</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.targetInput}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, targetInput: e.target.value }))
                  }
                  placeholder="5000"
                  className="rounded-none font-light text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-caps">Progress</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.progressInput}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, progressInput: e.target.value }))
                  }
                  placeholder="0"
                  className="rounded-none font-light text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="label-caps">Notes (optional)</Label>
              <Textarea
                value={form.notes ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="Context or tracking notes"
                rows={2}
                className="rounded-none font-light text-sm resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="rounded-none text-xs uppercase tracking-widest"
            >
              Cancel
            </Button>
            <Button
              data-ocid="goals.submit_button"
              onClick={handleSubmit}
              disabled={createGoal.isPending || updateGoal.isPending}
              className="rounded-none text-xs uppercase tracking-widest"
            >
              {editingGoal ? "Save Changes" : "Add Goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="uppercase tracking-widest font-normal text-sm">
              Delete this goal?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-light">
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none text-xs uppercase tracking-widest">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-none text-xs uppercase tracking-widest"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
