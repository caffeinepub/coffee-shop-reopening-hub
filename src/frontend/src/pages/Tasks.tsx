import { TaskCategory, TaskPriority, TaskStatus } from "@/backend.d";
import type { Task } from "@/backend.d";
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
import {
  useCreateTask,
  useDeleteTask,
  useGetAllTasks,
  useUpdateTask,
} from "@/hooks/useQueries";
import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";

type FilterStatus = "all" | TaskStatus;
type FilterAssignee = "all" | "Camila" | "Juan" | "Chris" | "Valeria";

const TEAMMATES: Exclude<FilterAssignee, "all">[] = [
  "Camila",
  "Juan",
  "Chris",
  "Valeria",
];

const statusLabels: Record<TaskStatus, string> = {
  [TaskStatus.todo]: "To Do",
  [TaskStatus.inProgress]: "In Progress",
  [TaskStatus.done]: "Done",
};

const nextStatus: Record<TaskStatus, TaskStatus> = {
  [TaskStatus.todo]: TaskStatus.inProgress,
  [TaskStatus.inProgress]: TaskStatus.done,
  [TaskStatus.done]: TaskStatus.todo,
};

const statusBadgeClass: Record<TaskStatus, string> = {
  [TaskStatus.todo]: "badge-todo",
  [TaskStatus.inProgress]: "badge-inprogress",
  [TaskStatus.done]: "badge-done",
};

const categoryLabels: Record<TaskCategory, string> = {
  [TaskCategory.equipment]: "Equipment",
  [TaskCategory.staffing]: "Staffing",
  [TaskCategory.marketing]: "Marketing",
  [TaskCategory.cleaning]: "Cleaning",
  [TaskCategory.permits]: "Permits",
};

const priorityLabels: Record<TaskPriority, string> = {
  [TaskPriority.high]: "High",
  [TaskPriority.medium]: "Medium",
  [TaskPriority.low]: "Low",
};

const priorityBadgeClass: Record<TaskPriority, string> = {
  [TaskPriority.high]: "badge-high",
  [TaskPriority.medium]: "badge-medium",
  [TaskPriority.low]: "badge-low",
};

// Muted category colors in ALL DAY palette
const categoryStyle: Record<TaskCategory, string> = {
  [TaskCategory.equipment]: "text-foreground/50 border-border",
  [TaskCategory.staffing]: "text-foreground/50 border-border",
  [TaskCategory.marketing]: "text-foreground/50 border-border",
  [TaskCategory.cleaning]: "text-foreground/50 border-border",
  [TaskCategory.permits]: "text-foreground/50 border-border",
};

const EMPTY_FORM: Partial<Task> = {
  title: "",
  category: TaskCategory.equipment,
  assignee: "",
  dueDate: "",
  status: TaskStatus.todo,
  priority: TaskPriority.medium,
};

const statusFilters: { value: FilterStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: TaskStatus.todo, label: "To Do" },
  { value: TaskStatus.inProgress, label: "In Progress" },
  { value: TaskStatus.done, label: "Done" },
];

// Items with id >= 1000 are "preview" seed items shown before backend confirms
function isPreviewItem(id: bigint) {
  return id >= BigInt(1000);
}

export default function Tasks() {
  const { data: tasks, isLoading } = useGetAllTasks();
  const isSyncing =
    !isLoading && tasks && tasks.length > 0 && isPreviewItem(tasks[0].id);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterCategory, setFilterCategory] = useState<TaskCategory | "all">(
    "all",
  );
  const [filterAssignee, setFilterAssignee] = useState<FilterAssignee>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<bigint | null>(null);
  const [form, setForm] = useState<Partial<Task>>(EMPTY_FORM);

  const filtered = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((t) => {
      const statusMatch = filterStatus === "all" || t.status === filterStatus;
      const categoryMatch =
        filterCategory === "all" || t.category === filterCategory;
      const assigneeMatch =
        filterAssignee === "all" || t.assignee === filterAssignee;
      return statusMatch && categoryMatch && assigneeMatch;
    });
  }, [tasks, filterStatus, filterCategory, filterAssignee]);

  function openAdd() {
    setEditingTask(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setForm({ ...task });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.title?.trim()) return;
    const taskData: Task = {
      id: editingTask?.id ?? BigInt(0),
      title: form.title!,
      category: form.category ?? TaskCategory.equipment,
      assignee: form.assignee ?? "",
      dueDate: form.dueDate ?? "",
      status: form.status ?? TaskStatus.todo,
      priority: form.priority ?? TaskPriority.medium,
    };
    if (editingTask) {
      await updateTask.mutateAsync(taskData);
    } else {
      await createTask.mutateAsync(taskData);
    }
    setDialogOpen(false);
  }

  async function handleStatusToggle(task: Task) {
    await updateTask.mutateAsync({ ...task, status: nextStatus[task.status] });
  }

  async function handleDelete() {
    if (deleteTarget !== null) {
      await deleteTask.mutateAsync(deleteTarget);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="px-8 py-10 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="label-caps mb-1">Management</p>
          <h1 className="text-3xl font-normal uppercase tracking-widest text-foreground">
            Tasks
          </h1>
        </div>
        <button
          type="button"
          onClick={openAdd}
          data-ocid="tasks.add_button"
          className="flex items-center gap-2 bg-foreground text-background text-xs uppercase tracking-widest font-medium py-3 px-5 hover:opacity-80 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Task
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-3 border-b border-border pb-6">
        {/* Status pills */}
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex gap-0" data-ocid="tasks.filter.tab">
            {statusFilters.map(({ value, label }) => (
              <button
                type="button"
                key={value}
                onClick={() => setFilterStatus(value)}
                className={`text-xs uppercase tracking-widest font-medium px-4 py-2 border-b-2 transition-all duration-150 ${
                  filterStatus === value
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Category select */}
          <Select
            value={filterCategory}
            onValueChange={(v) => setFilterCategory(v as TaskCategory | "all")}
          >
            <SelectTrigger className="w-[160px] h-8 text-xs uppercase tracking-widest border-border rounded-none bg-transparent">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem
                value="all"
                className="text-xs uppercase tracking-widest"
              >
                All Categories
              </SelectItem>
              {Object.entries(categoryLabels).map(([val, label]) => (
                <SelectItem
                  key={val}
                  value={val}
                  className="text-xs uppercase tracking-widest"
                >
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <p className="text-xs text-muted-foreground font-light ml-auto">
            {filtered.length} task{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Teammate filter */}
        <div
          className="flex flex-wrap items-center gap-2"
          data-ocid="tasks.assignee.tab"
        >
          <span className="text-xs uppercase tracking-widest text-muted-foreground font-light">
            Teammate:
          </span>
          <button
            type="button"
            onClick={() => setFilterAssignee("all")}
            className={`text-xs uppercase tracking-widest font-medium px-3 py-1.5 border transition-all duration-150 rounded-none ${
              filterAssignee === "all"
                ? "border-foreground text-foreground bg-foreground/5"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
            }`}
          >
            All
          </button>
          {TEAMMATES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setFilterAssignee(name)}
              className={`text-xs uppercase tracking-widest font-medium px-3 py-1.5 border transition-all duration-150 rounded-none ${
                filterAssignee === name
                  ? "border-foreground text-foreground bg-foreground/5"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Syncing banner */}
      {isSyncing && (
        <div className="flex items-center gap-2 px-4 py-2.5 border border-border bg-background text-xs text-muted-foreground font-light uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-sand animate-pulse shrink-0" />
          Syncing data — edits will be available in a moment
        </div>
      )}

      {/* Task List */}
      {isLoading ? (
        <div className="space-y-px bg-border">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-none" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          data-ocid="tasks.empty_state"
          className="py-16 text-center border border-dashed border-border"
        >
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-light">
            No tasks
          </p>
          <p className="text-xs text-muted-foreground font-light mt-1">
            Adjust filters or add a new task.
          </p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="divide-y divide-border">
            {filtered.map((task, idx) => (
              <motion.div
                key={task.id.toString()}
                data-ocid={`tasks.item.${idx + 1}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-5 py-4 group"
              >
                {/* Status toggle */}
                <button
                  type="button"
                  data-ocid={`tasks.status_toggle.${idx + 1}`}
                  onClick={() =>
                    !isPreviewItem(task.id) && handleStatusToggle(task)
                  }
                  disabled={isPreviewItem(task.id)}
                  className={`shrink-0 text-xs px-2.5 py-1 font-medium tracking-wide transition-opacity rounded-none ${isPreviewItem(task.id) ? "opacity-40 cursor-not-allowed" : "hover:opacity-70"} ${statusBadgeClass[task.status]}`}
                  title={
                    isPreviewItem(task.id)
                      ? "Syncing..."
                      : "Click to advance status"
                  }
                >
                  <span className="flex items-center gap-1">
                    {statusLabels[task.status]}
                    <ChevronRight className="w-2.5 h-2.5" />
                  </span>
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-light tracking-wide ${task.status === TaskStatus.done ? "line-through text-muted-foreground" : "text-foreground"}`}
                  >
                    {task.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <span
                      className={`text-xs uppercase tracking-widest font-light border px-1.5 py-0.5 ${categoryStyle[task.category]}`}
                    >
                      {categoryLabels[task.category]}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 font-medium tracking-wide rounded-none ${priorityBadgeClass[task.priority]}`}
                    >
                      {priorityLabels[task.priority]}
                    </span>
                    {task.assignee && (
                      <span className="text-xs text-muted-foreground font-light">
                        {task.assignee}
                      </span>
                    )}
                    {task.dueDate && (
                      <span
                        className={`text-xs font-light tabular-nums ${
                          task.dueDate <
                            new Date().toISOString().split("T")[0] &&
                          task.status !== TaskStatus.done
                            ? "text-brand-terracotta"
                            : "text-muted-foreground"
                        }`}
                      >
                        Due {task.dueDate}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {!isPreviewItem(task.id) && (
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      data-ocid={`tasks.edit_button.${idx + 1}`}
                      onClick={() => openEdit(task)}
                      className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      data-ocid={`tasks.delete_button.${idx + 1}`}
                      onClick={() => setDeleteTarget(task.id)}
                      className="p-1.5 text-muted-foreground hover:text-brand-terracotta transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          data-ocid="tasks.dialog"
          className="sm:max-w-md rounded-none"
        >
          <DialogHeader>
            <DialogTitle className="uppercase tracking-widest font-normal text-base">
              {editingTask ? "Edit Task" : "New Task"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="label-caps">Title</Label>
              <Input
                data-ocid="tasks.title_input"
                value={form.title ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="What needs to be done?"
                className="rounded-none border-border font-light text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="label-caps">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, category: v as TaskCategory }))
                  }
                >
                  <SelectTrigger className="rounded-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none">
                    {Object.entries(categoryLabels).map(([val, label]) => (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="label-caps">Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, priority: v as TaskPriority }))
                  }
                >
                  <SelectTrigger className="rounded-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none">
                    <SelectItem value={TaskPriority.high}>High</SelectItem>
                    <SelectItem value={TaskPriority.medium}>Medium</SelectItem>
                    <SelectItem value={TaskPriority.low}>Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="label-caps">Assignee</Label>
              <Select
                value={form.assignee ?? ""}
                onValueChange={(v) => setForm((p) => ({ ...p, assignee: v }))}
              >
                <SelectTrigger
                  data-ocid="tasks.assignee_input"
                  className="rounded-none"
                >
                  <SelectValue placeholder="Select teammate" />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  {TEAMMATES.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="label-caps">Due Date</Label>
                <Input
                  type="date"
                  value={form.dueDate ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, dueDate: e.target.value }))
                  }
                  className="rounded-none border-border font-light text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-caps">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, status: v as TaskStatus }))
                  }
                >
                  <SelectTrigger className="rounded-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none">
                    <SelectItem value={TaskStatus.todo}>To Do</SelectItem>
                    <SelectItem value={TaskStatus.inProgress}>
                      In Progress
                    </SelectItem>
                    <SelectItem value={TaskStatus.done}>Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              data-ocid="tasks.submit_button"
              onClick={handleSubmit}
              disabled={createTask.isPending || updateTask.isPending}
              className="rounded-none text-xs uppercase tracking-widest"
            >
              {editingTask ? "Save Changes" : "Add Task"}
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
              Delete this task?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-light">
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid="tasks.cancel_button"
              className="rounded-none text-xs uppercase tracking-widest"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="tasks.confirm_button"
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
