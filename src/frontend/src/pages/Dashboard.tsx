import { GoalPeriod, TaskStatus } from "@/backend.d";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetAllMenuItems,
  useGetAllSalesGoals,
  useGetAllTasks,
} from "@/hooks/useQueries";
import { motion } from "motion/react";
import { useMemo } from "react";

const periodLabel: Record<GoalPeriod, string> = {
  [GoalPeriod.daily]: "Daily",
  [GoalPeriod.weekly]: "Weekly",
  [GoalPeriod.monthly]: "Monthly",
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function Dashboard() {
  const { data: tasks, isLoading: tasksLoading } = useGetAllTasks();
  const { data: menuItems, isLoading: menuLoading } = useGetAllMenuItems();
  const { data: goals, isLoading: goalsLoading } = useGetAllSalesGoals();

  const taskStats = useMemo(() => {
    if (!tasks)
      return { total: 0, done: 0, inProgress: 0, todo: 0, overdue: 0 };
    const now = new Date().toISOString().split("T")[0];
    return {
      total: tasks.length,
      done: tasks.filter((t) => t.status === TaskStatus.done).length,
      inProgress: tasks.filter((t) => t.status === TaskStatus.inProgress)
        .length,
      todo: tasks.filter((t) => t.status === TaskStatus.todo).length,
      overdue: tasks.filter(
        (t) => t.dueDate < now && t.status !== TaskStatus.done,
      ).length,
    };
  }, [tasks]);

  const activeGoals = useMemo(() => goals ?? [], [goals]);

  const completePct =
    taskStats.total > 0
      ? Math.round((taskStats.done / taskStats.total) * 100)
      : 0;

  return (
    <div className="px-8 py-10 max-w-5xl mx-auto space-y-12">
      {/* Page heading */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="label-caps mb-1">Overview</p>
        <h1 className="text-3xl font-normal uppercase tracking-widest text-foreground">
          Reopening Status
        </h1>
      </motion.div>

      {/* Stat strip */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border"
      >
        {[
          {
            label: "Complete",
            value: tasksLoading ? null : `${taskStats.done}/${taskStats.total}`,
            sub: tasksLoading ? null : `${completePct}% done`,
          },
          {
            label: "Overdue",
            value: tasksLoading ? null : taskStats.overdue,
            sub: tasksLoading ? null : `${taskStats.inProgress} in progress`,
            alert: taskStats.overdue > 0,
          },
          {
            label: "Menu Items",
            value: menuLoading ? null : (menuItems?.length ?? 0),
            sub: menuLoading
              ? null
              : `${menuItems?.filter((m) => m.available).length ?? 0} available`,
          },
          {
            label: "Goals",
            value: goalsLoading ? null : (goals?.length ?? 0),
            sub: goalsLoading ? null : "Active targets",
          },
        ].map(({ label, value, sub, alert }) => (
          <motion.div
            key={label}
            variants={fadeUp}
            className="bg-background px-6 py-7"
          >
            <p className="label-caps mb-3">{label}</p>
            {value === null ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <p
                className={`text-4xl font-light tabular-nums tracking-tight ${alert ? "text-brand-terracotta" : "text-foreground"}`}
              >
                {value}
              </p>
            )}
            {sub !== null && (
              <p className="text-xs text-muted-foreground font-light mt-2 tracking-wide">
                {sub}
              </p>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Task breakdown + Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Task status bars */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35 }}
        >
          <p className="label-caps mb-5">Task Status</p>
          {tasksLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <div className="space-y-5">
              {[
                {
                  label: "To Do",
                  count: taskStats.todo,
                  color: "bg-foreground/20",
                },
                {
                  label: "In Progress",
                  count: taskStats.inProgress,
                  color: "bg-brand-sand",
                },
                {
                  label: "Done",
                  count: taskStats.done,
                  color: "bg-brand-sand",
                },
              ].map(({ label, count, color }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase tracking-widest font-light text-muted-foreground">
                      {label}
                    </span>
                    <span className="text-sm font-light text-foreground tabular-nums">
                      {count}
                    </span>
                  </div>
                  <div className="h-px w-full bg-border overflow-hidden">
                    <motion.div
                      className={`h-px ${color}`}
                      initial={{ width: 0 }}
                      animate={{
                        width:
                          taskStats.total > 0
                            ? `${(count / taskStats.total) * 100}%`
                            : "0%",
                      }}
                      transition={{ duration: 0.7, ease: "easeOut" }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t border-border flex justify-between">
                <span className="text-xs text-muted-foreground font-light uppercase tracking-widest">
                  {taskStats.total} tasks total
                </span>
                <span className="text-xs text-muted-foreground font-light uppercase tracking-widest">
                  {completePct}% complete
                </span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Sales goals */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.35 }}
        >
          <p className="label-caps mb-5">Sales Goals</p>
          {goalsLoading ? (
            <div className="space-y-5">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : activeGoals.length === 0 ? (
            <p className="text-sm text-muted-foreground font-light tracking-wide">
              No goals set yet.
            </p>
          ) : (
            <div className="space-y-6">
              {activeGoals.slice(0, 4).map((goal) => {
                const pct =
                  Number(goal.targetAmount) > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (Number(goal.currentProgress) /
                            Number(goal.targetAmount)) *
                            100,
                        ),
                      )
                    : 0;
                return (
                  <div key={goal.id.toString()}>
                    <div className="flex items-baseline justify-between mb-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-light text-foreground truncate tracking-wide">
                          {goal.name}
                        </span>
                        <span className="label-caps shrink-0">
                          {periodLabel[goal.period]}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground font-light tabular-nums shrink-0 ml-3">
                        {pct}%
                      </span>
                    </div>
                    <div className="h-px w-full bg-border overflow-hidden">
                      <motion.div
                        className="h-px progress-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground font-light mt-1.5 tabular-nums">
                      ${Number(goal.currentProgress).toLocaleString()} / $
                      {Number(goal.targetAmount).toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
