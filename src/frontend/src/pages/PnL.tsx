import type { Expense, RevenueEntry } from "@/backend.d";
import { ExpenseCategory, PaymentStatus } from "@/backend.d";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateExpense,
  useCreateRevenueEntry,
  useDeleteExpense,
  useDeleteRevenueEntry,
  useGetAllExpenses,
  useGetAllRevenueEntries,
  useUpdateExpense,
  useUpdateRevenueEntry,
} from "@/hooks/useQueries";
import { Loader2, Paperclip, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "alldaymia_user_name";
const REOPENING_DATE = "2026-03-20"; // Operations start date

type TimePeriod = "weekly" | "monthly" | "quarterly" | "annual";
type Phase = "all" | "preopening" | "operations";
type PaymentFilter = "all" | "paid" | "payable";

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: ExpenseCategory.rent, label: "Rent" },
  { value: ExpenseCategory.utilities, label: "Utilities" },
  { value: ExpenseCategory.labor, label: "Labor" },
  { value: ExpenseCategory.supplies, label: "Supplies" },
  { value: ExpenseCategory.marketing, label: "Marketing" },
  { value: ExpenseCategory.website, label: "Website" },
  { value: ExpenseCategory.equipment, label: "Equipment" },
  { value: ExpenseCategory.licensing, label: "Licensing" },
  { value: ExpenseCategory.cleaning, label: "Cleaning" },
  { value: ExpenseCategory.legal, label: "Legal" },
  { value: ExpenseCategory.custom, label: "Custom" },
];

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  [ExpenseCategory.rent]: "bg-stone-100 text-stone-700 border-stone-200",
  [ExpenseCategory.utilities]: "bg-amber-50 text-amber-700 border-amber-200",
  [ExpenseCategory.labor]: "bg-sky-50 text-sky-700 border-sky-200",
  [ExpenseCategory.supplies]:
    "bg-emerald-50 text-emerald-700 border-emerald-200",
  [ExpenseCategory.marketing]: "bg-violet-50 text-violet-700 border-violet-200",
  [ExpenseCategory.website]: "bg-indigo-50 text-indigo-700 border-indigo-200",
  [ExpenseCategory.equipment]: "bg-orange-50 text-orange-700 border-orange-200",
  [ExpenseCategory.licensing]: "bg-teal-50 text-teal-700 border-teal-200",
  [ExpenseCategory.cleaning]: "bg-cyan-50 text-cyan-700 border-cyan-200",
  [ExpenseCategory.legal]: "bg-red-50 text-red-700 border-red-200",
  [ExpenseCategory.custom]:
    "bg-neutral-100 text-neutral-600 border-neutral-200",
};

const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  [PaymentStatus.paid]: "bg-emerald-50 text-emerald-700 border-emerald-200",
  [PaymentStatus.payable]: "bg-amber-50 text-amber-700 border-amber-200",
};

// ─── Date Range Helpers ───────────────────────────────────────────────────────

function getDateRange(period: TimePeriod): { start: string; end: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  if (period === "weekly") {
    const day = today.getDay(); // 0=Sun
    const diff = day === 0 ? -6 : 1 - day; // Mon start
    const mon = new Date(today);
    mon.setDate(today.getDate() + diff);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { start: fmt(mon), end: fmt(sun) };
  }

  if (period === "monthly") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start: fmt(start), end: fmt(end) };
  }

  if (period === "quarterly") {
    const q = Math.floor(today.getMonth() / 3);
    const start = new Date(today.getFullYear(), q * 3, 1);
    const end = new Date(today.getFullYear(), q * 3 + 3, 0);
    return { start: fmt(start), end: fmt(end) };
  }

  // annual
  const start = new Date(today.getFullYear(), 0, 1);
  const end = new Date(today.getFullYear(), 11, 31);
  return { start: fmt(start), end: fmt(end) };
}

function filterByPhase<T extends { date: string }>(
  items: T[],
  phase: Phase,
): T[] {
  if (phase === "all") return items;
  if (phase === "preopening")
    return items.filter((i) => i.date < REOPENING_DATE);
  return items.filter((i) => i.date >= REOPENING_DATE);
}

function filterByDateRange<T extends { date: string }>(
  items: T[],
  start: string,
  end: string,
): T[] {
  return items.filter((i) => i.date >= start && i.date <= end);
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

function formatDate(d: string): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${m}/${day}/${y}`;
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── Expense Form ─────────────────────────────────────────────────────────────

interface ExpenseFormState {
  description: string;
  amount: string;
  category: ExpenseCategory;
  date: string;
  notes: string;
  paymentStatus: PaymentStatus;
  attachmentUrl: string;
  attachmentName: string;
}

function emptyExpenseForm(): ExpenseFormState {
  return {
    description: "",
    amount: "",
    category: ExpenseCategory.supplies,
    date: todayISO(),
    notes: "",
    paymentStatus: PaymentStatus.payable,
    attachmentUrl: "",
    attachmentName: "",
  };
}

interface ExpenseDialogProps {
  open: boolean;
  onClose: () => void;
  editingExpense?: Expense | null;
  prefill?: Partial<ExpenseFormState>;
}

function ExpenseDialog({
  open,
  onClose,
  editingExpense,
  prefill,
}: ExpenseDialogProps) {
  const userName = localStorage.getItem(STORAGE_KEY) ?? "Team";
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();

  const [form, setForm] = useState<ExpenseFormState>(() => {
    if (editingExpense) {
      return {
        description: editingExpense.description,
        amount: String(editingExpense.amount),
        category: editingExpense.category,
        date: editingExpense.date,
        notes: editingExpense.notes,
        paymentStatus: editingExpense.paymentStatus,
        attachmentUrl: editingExpense.attachmentUrl ?? "",
        attachmentName: editingExpense.attachmentName ?? "",
      };
    }
    if (prefill) {
      return { ...emptyExpenseForm(), ...prefill };
    }
    return emptyExpenseForm();
  });

  // Reset form when dialog opens/closes or editingExpense changes
  const handleOpenChange = (o: boolean) => {
    if (!o) {
      onClose();
      setForm(emptyExpenseForm());
    }
  };

  // Sync form if editingExpense prop changes while dialog is open
  const syncedRef = { current: editingExpense };
  if (syncedRef.current !== editingExpense && open) {
    setForm(
      editingExpense
        ? {
            description: editingExpense.description,
            amount: String(editingExpense.amount),
            category: editingExpense.category,
            date: editingExpense.date,
            notes: editingExpense.notes,
            paymentStatus: editingExpense.paymentStatus,
            attachmentUrl: editingExpense.attachmentUrl ?? "",
            attachmentName: editingExpense.attachmentName ?? "",
          }
        : emptyExpenseForm(),
    );
    syncedRef.current = editingExpense;
  }

  const isPending = createExpense.isPending || updateExpense.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number.parseFloat(form.amount);
    if (Number.isNaN(amount) || amount < 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Description is required.");
      return;
    }

    try {
      if (editingExpense) {
        await updateExpense.mutateAsync({
          ...editingExpense,
          description: form.description.trim(),
          amount,
          category: form.category,
          date: form.date,
          notes: form.notes.trim(),
          paymentStatus: form.paymentStatus,
          attachmentUrl: form.attachmentUrl || undefined,
          attachmentName: form.attachmentName || undefined,
        });
        toast.success("Expense updated.");
      } else {
        await createExpense.mutateAsync({
          id: BigInt(0),
          description: form.description.trim(),
          amount,
          category: form.category,
          date: form.date,
          notes: form.notes.trim(),
          createdBy: userName,
          paymentStatus: form.paymentStatus,
          attachmentUrl: form.attachmentUrl || undefined,
          attachmentName: form.attachmentName || undefined,
        });
        toast.success("Expense added.");
      }
      onClose();
      setForm(emptyExpenseForm());
    } catch {
      toast.error("Failed to save expense.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent data-ocid="pnl.expense_form_dialog" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-widest text-sm font-medium">
            {editingExpense ? "Edit Expense" : "Add Expense"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Description */}
          <div className="space-y-1.5">
            <Label className="label-caps">Description</Label>
            <Textarea
              data-ocid="pnl.expense_description_input"
              placeholder="e.g. Monthly rent payment"
              value={form.description}
              rows={2}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              required
            />
          </div>

          {/* Amount + Category row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="label-caps">Amount ($)</Label>
              <Input
                data-ocid="pnl.expense_amount_input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) =>
                  setForm((p) => ({ ...p, amount: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="label-caps">Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, category: v as ExpenseCategory }))
                }
              >
                <SelectTrigger data-ocid="pnl.expense_category_select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label className="label-caps">Date</Label>
            <Input
              data-ocid="pnl.expense_date_input"
              type="date"
              value={form.date}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              required
            />
          </div>

          {/* Payment Status toggle */}
          <div className="space-y-1.5">
            <Label className="label-caps">Payment Status</Label>
            <div
              className="flex gap-0 border border-border w-fit"
              data-ocid="pnl.expense_payment_status_toggle"
            >
              {[
                { value: PaymentStatus.payable, label: "PAYABLE" },
                { value: PaymentStatus.paid, label: "PAID" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setForm((p) => ({ ...p, paymentStatus: opt.value }))
                  }
                  className={`px-4 py-1.5 text-[10px] uppercase tracking-widest font-medium transition-colors duration-150 ${
                    form.paymentStatus === opt.value
                      ? opt.value === PaymentStatus.paid
                        ? "bg-emerald-600 text-white"
                        : "bg-amber-500 text-white"
                      : "text-muted-foreground hover:text-foreground bg-background"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Attachment (read-only if pre-filled, hidden if empty) */}
          {form.attachmentName && (
            <div className="space-y-1.5">
              <Label className="label-caps">Attachment</Label>
              <div className="flex items-center gap-2 px-3 py-2 border border-border text-xs text-muted-foreground">
                <Paperclip className="w-3 h-3 shrink-0" />
                {form.attachmentUrl ? (
                  <a
                    href={form.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate hover:text-foreground underline underline-offset-2 transition-colors"
                  >
                    {form.attachmentName}
                  </a>
                ) : (
                  <span className="truncate">{form.attachmentName}</span>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="label-caps">Notes (optional)</Label>
            <Textarea
              data-ocid="pnl.expense_notes_textarea"
              placeholder="Additional details..."
              rows={2}
              value={form.notes}
              onChange={(e) =>
                setForm((p) => ({ ...p, notes: e.target.value }))
              }
            />
          </div>

          <DialogFooter className="gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              data-ocid="pnl.expense_cancel_button"
              onClick={() => {
                onClose();
                setForm(emptyExpenseForm());
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-ocid="pnl.expense_submit_button"
              disabled={isPending}
            >
              {isPending && (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              )}
              {editingExpense ? "Save Changes" : "Add Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Revenue Form ─────────────────────────────────────────────────────────────

interface RevenueFormState {
  source: string;
  date: string;
  totalRevenue: string;
  notes: string;
}

function emptyRevenueForm(): RevenueFormState {
  return {
    source: "Manual Entry",
    date: todayISO(),
    totalRevenue: "",
    notes: "",
  };
}

interface RevenueDialogProps {
  open: boolean;
  onClose: () => void;
  editingEntry?: RevenueEntry | null;
}

function RevenueDialog({ open, onClose, editingEntry }: RevenueDialogProps) {
  const userName = localStorage.getItem(STORAGE_KEY) ?? "Team";
  const createRevenue = useCreateRevenueEntry();
  const updateRevenue = useUpdateRevenueEntry();

  const [form, setForm] = useState<RevenueFormState>(() =>
    editingEntry
      ? {
          source: editingEntry.source,
          date: editingEntry.date,
          totalRevenue: String(editingEntry.totalRevenue),
          notes: editingEntry.notes,
        }
      : emptyRevenueForm(),
  );

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      onClose();
      setForm(emptyRevenueForm());
    }
  };

  const isPending = createRevenue.isPending || updateRevenue.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number.parseFloat(form.totalRevenue);
    if (Number.isNaN(amount) || amount < 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    try {
      if (editingEntry) {
        await updateRevenue.mutateAsync({
          ...editingEntry,
          source: form.source.trim() || "Manual Entry",
          date: form.date,
          totalRevenue: amount,
          notes: form.notes.trim(),
        });
        toast.success("Revenue entry updated.");
      } else {
        await createRevenue.mutateAsync({
          id: BigInt(0),
          source: form.source.trim() || "Manual Entry",
          date: form.date,
          totalRevenue: amount,
          notes: form.notes.trim(),
          createdBy: userName,
        });
        toast.success("Revenue entry added.");
      }
      onClose();
      setForm(emptyRevenueForm());
    } catch {
      toast.error("Failed to save revenue entry.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent data-ocid="pnl.revenue_form_dialog" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-widest text-sm font-medium">
            {editingEntry ? "Edit Revenue Entry" : "Add Revenue"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Amount */}
          <div className="space-y-1.5">
            <Label className="label-caps">Total Amount ($)</Label>
            <Input
              data-ocid="pnl.revenue_amount_input"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.totalRevenue}
              onChange={(e) =>
                setForm((p) => ({ ...p, totalRevenue: e.target.value }))
              }
              required
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label className="label-caps">Date</Label>
            <Input
              data-ocid="pnl.revenue_date_input"
              type="date"
              value={form.date}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              required
            />
          </div>

          {/* Source */}
          <div className="space-y-1.5">
            <Label className="label-caps">Source</Label>
            <Input
              data-ocid="pnl.revenue_source_input"
              placeholder="Manual Entry, Square Export, etc."
              value={form.source}
              onChange={(e) =>
                setForm((p) => ({ ...p, source: e.target.value }))
              }
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="label-caps">Notes (optional)</Label>
            <Textarea
              data-ocid="pnl.revenue_notes_textarea"
              placeholder="e.g. Pop-up day sales — March 20"
              rows={2}
              value={form.notes}
              onChange={(e) =>
                setForm((p) => ({ ...p, notes: e.target.value }))
              }
            />
          </div>

          <DialogFooter className="gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              data-ocid="pnl.revenue_cancel_button"
              onClick={() => {
                onClose();
                setForm(emptyRevenueForm());
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-ocid="pnl.revenue_submit_button"
              disabled={isPending}
            >
              {isPending && (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              )}
              {editingEntry ? "Save Changes" : "Add Revenue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  ocid,
  variant = "default",
  sub,
}: {
  label: string;
  value: number;
  ocid: string;
  variant?: "default" | "positive" | "negative";
  sub?: string;
}) {
  const valueClass =
    variant === "positive"
      ? "text-emerald-700"
      : variant === "negative"
        ? "text-red-700"
        : "text-foreground";

  return (
    <div
      data-ocid={ocid}
      className="bg-card border border-border p-5 flex flex-col gap-1 min-w-0"
    >
      <p className="label-caps truncate">{label}</p>
      <p className={`text-2xl font-light tracking-tight ${valueClass}`}>
        {formatCurrency(value)}
      </p>
      {sub && (
        <p className="text-xs text-muted-foreground font-light mt-0.5">{sub}</p>
      )}
    </div>
  );
}

// ─── Category Breakdown ───────────────────────────────────────────────────────

function CategoryBreakdown({ expenses }: { expenses: Expense[] }) {
  const byCategory = EXPENSE_CATEGORIES.map(({ value, label }) => {
    const total = expenses
      .filter((e) => e.category === value)
      .reduce((sum, e) => sum + e.amount, 0);
    return { value, label, total };
  }).filter((c) => c.total > 0);

  if (byCategory.length === 0) return null;

  const grandTotal = byCategory.reduce((s, c) => s + c.total, 0);

  return (
    <div className="border border-border bg-card p-4">
      <p className="label-caps mb-3">By Category</p>
      <div className="space-y-2">
        {byCategory.map((c) => (
          <div key={c.value} className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={`text-[10px] uppercase tracking-wider font-medium shrink-0 ${CATEGORY_COLORS[c.value]}`}
            >
              {c.label}
            </Badge>
            <div className="flex-1 min-w-0">
              <div
                className="h-1 bg-foreground/10 rounded-full overflow-hidden"
                style={{ background: "var(--border)" }}
              >
                <div
                  className="h-full bg-foreground/30 rounded-full transition-all duration-500"
                  style={{
                    width: `${grandTotal > 0 ? (c.total / grandTotal) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <span className="text-xs font-medium text-foreground shrink-0">
              {formatCurrency(c.total)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Payment Status Badge ─────────────────────────────────────────────────────

function PaymentStatusBadge({
  status,
  onClick,
  loading,
  ocid,
}: {
  status: PaymentStatus;
  onClick?: () => void;
  loading?: boolean;
  ocid?: string;
}) {
  return (
    <button
      type="button"
      data-ocid={ocid}
      onClick={onClick}
      title={`Click to mark as ${status === PaymentStatus.paid ? "PAYABLE" : "PAID"}`}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] uppercase tracking-widest font-medium border transition-all duration-150 ${
        PAYMENT_STATUS_COLORS[status]
      } ${onClick ? "cursor-pointer hover:opacity-80 active:scale-95" : "cursor-default"}`}
    >
      {loading ? (
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
      ) : status === PaymentStatus.paid ? (
        "Paid"
      ) : (
        "Payable"
      )}
    </button>
  );
}

// ─── Main PnL Page ────────────────────────────────────────────────────────────

export default function PnL() {
  const [period, setPeriod] = useState<TimePeriod>("monthly");
  const [phase, setPhase] = useState<Phase>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [search, setSearch] = useState("");
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [revenueDialogOpen, setRevenueDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingRevenue, setEditingRevenue] = useState<RevenueEntry | null>(
    null,
  );
  const [togglingId, setTogglingId] = useState<bigint | null>(null);

  const { data: allExpenses = [], isLoading: expensesLoading } =
    useGetAllExpenses();
  const { data: allRevenue = [], isLoading: revenueLoading } =
    useGetAllRevenueEntries();
  const deleteExpense = useDeleteExpense();
  const deleteRevenue = useDeleteRevenueEntry();
  const updateExpense = useUpdateExpense();

  const isLoading = expensesLoading || revenueLoading;

  const { start, end } = getDateRange(period);

  // Filter: first by period, then by phase
  const periodExpenses = filterByDateRange(allExpenses, start, end);
  const periodRevenue = filterByDateRange(allRevenue, start, end);

  const phaseExpenses = filterByPhase(periodExpenses, phase);
  const filteredRevenue = filterByPhase(periodRevenue, phase);

  // Apply payment filter and search
  const filteredExpenses = phaseExpenses.filter((e) => {
    if (paymentFilter !== "all" && e.paymentStatus !== paymentFilter) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        e.description.toLowerCase().includes(q) ||
        e.notes.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredRevenueSearched = filteredRevenue.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.source.toLowerCase().includes(q) || r.notes.toLowerCase().includes(q)
    );
  });

  // Summaries (always based on all phase expenses, not filtered by payment status)
  const totalRevenue = filteredRevenue.reduce((s, r) => s + r.totalRevenue, 0);
  const totalExpenses = phaseExpenses.reduce((s, e) => s + e.amount, 0);
  const netPnl = totalRevenue - totalExpenses;

  // Sort by date desc
  const sortedExpenses = [...filteredExpenses].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const sortedRevenue = [...filteredRevenueSearched].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  const handleDeleteExpense = async (id: bigint) => {
    try {
      await deleteExpense.mutateAsync(id);
      toast.success("Expense deleted.");
    } catch {
      toast.error("Failed to delete expense.");
    }
  };

  const handleDeleteRevenue = async (id: bigint) => {
    try {
      await deleteRevenue.mutateAsync(id);
      toast.success("Revenue entry deleted.");
    } catch {
      toast.error("Failed to delete revenue entry.");
    }
  };

  const handleTogglePaymentStatus = async (expense: Expense) => {
    setTogglingId(expense.id);
    try {
      const newStatus =
        expense.paymentStatus === PaymentStatus.paid
          ? PaymentStatus.payable
          : PaymentStatus.paid;
      await updateExpense.mutateAsync({ ...expense, paymentStatus: newStatus });
    } catch {
      toast.error("Failed to update payment status.");
    } finally {
      setTogglingId(null);
    }
  };

  const periodLabel = {
    weekly: `Week of ${formatDate(start)}`,
    monthly: new Date(`${start}T12:00:00`).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    }),
    quarterly: `Q${Math.floor(new Date(`${start}T12:00:00`).getMonth() / 3) + 1} ${new Date(`${start}T12:00:00`).getFullYear()}`,
    annual: String(new Date(`${start}T12:00:00`).getFullYear()),
  }[period];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="heading-editorial text-lg">Profit &amp; Loss</h1>
          <p className="text-xs text-muted-foreground font-light mt-1 uppercase tracking-wider">
            {periodLabel}
          </p>
        </div>
      </div>

      {/* Period tabs + filters row */}
      <div className="flex flex-col gap-3">
        {/* Period + Phase */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-0 border border-border">
            {(
              [
                {
                  id: "weekly" as TimePeriod,
                  label: "Week",
                  ocid: "pnl.weekly_tab",
                },
                {
                  id: "monthly" as TimePeriod,
                  label: "Month",
                  ocid: "pnl.monthly_tab",
                },
                {
                  id: "quarterly" as TimePeriod,
                  label: "Quarter",
                  ocid: "pnl.quarterly_tab",
                },
                {
                  id: "annual" as TimePeriod,
                  label: "Year",
                  ocid: "pnl.annual_tab",
                },
              ] as const
            ).map(({ id, label, ocid }) => (
              <button
                key={id}
                type="button"
                data-ocid={ocid}
                onClick={() => setPeriod(id)}
                className={`px-4 py-2 text-xs uppercase tracking-widest font-medium transition-colors duration-150 ${
                  period === id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground bg-background"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Phase toggle */}
          <div className="flex gap-0 border border-border">
            {(
              [
                {
                  id: "all" as Phase,
                  label: "All",
                  ocid: "pnl.all_phase_toggle",
                },
                {
                  id: "preopening" as Phase,
                  label: "Pre-Opening",
                  ocid: "pnl.preopening_toggle",
                },
                {
                  id: "operations" as Phase,
                  label: "Operations",
                  ocid: "pnl.operations_toggle",
                },
              ] as const
            ).map(({ id, label, ocid }) => (
              <button
                key={id}
                type="button"
                data-ocid={ocid}
                onClick={() => setPhase(id)}
                className={`px-3 py-2 text-[10px] uppercase tracking-widest font-medium transition-colors duration-150 ${
                  phase === id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground bg-background"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Search + Payment Status filter */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              data-ocid="pnl.search_input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search expenses & revenue…"
              className="w-full pl-3 pr-3 py-2 text-xs bg-transparent border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40 transition-colors font-light tracking-wide"
            />
          </div>

          {/* PAID / PAYABLE filter */}
          <div className="flex gap-0 border border-border">
            {(
              [
                {
                  id: "all" as PaymentFilter,
                  label: "All",
                  ocid: "pnl.payment_filter_all_tab",
                },
                {
                  id: "paid" as PaymentFilter,
                  label: "Paid",
                  ocid: "pnl.payment_filter_paid_tab",
                },
                {
                  id: "payable" as PaymentFilter,
                  label: "Payable",
                  ocid: "pnl.payment_filter_payable_tab",
                },
              ] as const
            ).map(({ id, label, ocid }) => (
              <button
                key={id}
                type="button"
                data-ocid={ocid}
                onClick={() => setPaymentFilter(id)}
                className={`px-3 py-2 text-[10px] uppercase tracking-widest font-medium transition-colors duration-150 ${
                  paymentFilter === id
                    ? id === "paid"
                      ? "bg-emerald-600 text-white"
                      : id === "payable"
                        ? "bg-amber-500 text-white"
                        : "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground bg-background"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div
          data-ocid="pnl.loading_state"
          className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-widest font-light py-8"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading financial data...
        </div>
      )}

      {!isLoading && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SummaryCard
              label="Total Revenue"
              value={totalRevenue}
              ocid="pnl.revenue_card"
              sub="Operations income"
            />
            <SummaryCard
              label="Total Expenses"
              value={totalExpenses}
              ocid="pnl.expenses_card"
              sub={`${phaseExpenses.length} item${phaseExpenses.length !== 1 ? "s" : ""}`}
            />
            <SummaryCard
              label="Net P&L"
              value={netPnl}
              ocid="pnl.net_card"
              variant={
                netPnl > 0 ? "positive" : netPnl < 0 ? "negative" : "default"
              }
              sub={netPnl >= 0 ? "On track" : "Deficit"}
            />
          </div>

          {/* Expenses section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="heading-editorial text-sm">Expenses</h2>
              <Button
                size="sm"
                data-ocid="pnl.add_expense_button"
                onClick={() => {
                  setEditingExpense(null);
                  setExpenseDialogOpen(true);
                }}
                className="gap-1.5 text-xs uppercase tracking-widest font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Expense
              </Button>
            </div>

            {sortedExpenses.length > 0 && (
              <CategoryBreakdown expenses={sortedExpenses} />
            )}

            <Separator />

            {sortedExpenses.length === 0 ? (
              <div
                data-ocid="pnl.expenses.empty_state"
                className="text-center py-12 text-muted-foreground"
              >
                <p className="text-xs uppercase tracking-widest font-light">
                  No expenses recorded for this period
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1.5 font-light">
                  Use "Add Expense" to log costs
                </p>
              </div>
            ) : (
              <div className="space-y-0 border border-border divide-y divide-border">
                {sortedExpenses.map((expense, idx) => (
                  <div
                    key={String(expense.id)}
                    data-ocid={`pnl.expense.item.${idx + 1}`}
                    className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-accent/30 transition-colors duration-100 group"
                  >
                    <div className="shrink-0 w-20 text-xs text-muted-foreground font-light">
                      {formatDate(expense.date)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-light text-foreground truncate">
                        {expense.description}
                      </p>
                      {expense.notes && (
                        <p className="text-xs text-muted-foreground/70 font-light truncate mt-0.5">
                          {expense.notes}
                        </p>
                      )}
                    </div>

                    {/* Category badge */}
                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase tracking-wider font-medium shrink-0 hidden sm:inline-flex ${CATEGORY_COLORS[expense.category]}`}
                    >
                      {expense.category}
                    </Badge>

                    {/* Payment status badge (always visible, clickable to toggle) */}
                    <PaymentStatusBadge
                      status={expense.paymentStatus}
                      loading={togglingId === expense.id}
                      ocid={`pnl.expense.toggle.${idx + 1}`}
                      onClick={() => handleTogglePaymentStatus(expense)}
                    />

                    {/* Attachment link */}
                    {expense.attachmentUrl && expense.attachmentName && (
                      <a
                        href={expense.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        title={expense.attachmentName}
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                      </a>
                    )}

                    <div className="shrink-0 text-sm font-medium text-foreground w-24 text-right">
                      {formatCurrency(expense.amount)}
                    </div>
                    <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <button
                        type="button"
                        data-ocid={`pnl.expense.edit_button.${idx + 1}`}
                        onClick={() => {
                          setEditingExpense(expense);
                          setExpenseDialogOpen(true);
                        }}
                        className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded"
                        title="Edit expense"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        data-ocid={`pnl.expense.delete_button.${idx + 1}`}
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded"
                        title="Delete expense"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Revenue section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="heading-editorial text-sm">Revenue</h2>
              </div>
              <Button
                size="sm"
                data-ocid="pnl.add_revenue_button"
                variant="outline"
                onClick={() => {
                  setEditingRevenue(null);
                  setRevenueDialogOpen(true);
                }}
                className="gap-1.5 text-xs uppercase tracking-widest font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Revenue
              </Button>
            </div>

            {/* Square note */}
            <div className="flex items-start gap-2.5 bg-muted/60 border border-border px-4 py-3">
              <Upload className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground font-light leading-relaxed">
                Square integration coming soon — upload EOD exports manually for
                now using "Add Revenue" above.
              </p>
            </div>

            <Separator />

            {sortedRevenue.length === 0 ? (
              <div
                data-ocid="pnl.revenue.empty_state"
                className="text-center py-12 text-muted-foreground"
              >
                <p className="text-xs uppercase tracking-widest font-light">
                  No revenue recorded for this period
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1.5 font-light">
                  Revenue will show here once you start making sales
                </p>
              </div>
            ) : (
              <div className="space-y-0 border border-border divide-y divide-border">
                {sortedRevenue.map((entry, idx) => (
                  <div
                    key={String(entry.id)}
                    data-ocid={`pnl.revenue.item.${idx + 1}`}
                    className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-accent/30 transition-colors duration-100 group"
                  >
                    <div className="shrink-0 w-20 text-xs text-muted-foreground font-light">
                      {formatDate(entry.date)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-light text-foreground truncate">
                        {entry.source}
                      </p>
                      {entry.notes && (
                        <p className="text-xs text-muted-foreground/70 font-light truncate mt-0.5">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-sm font-medium text-emerald-700 w-24 text-right">
                      +{formatCurrency(entry.totalRevenue)}
                    </div>
                    <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <button
                        type="button"
                        data-ocid={`pnl.revenue.edit_button.${idx + 1}`}
                        onClick={() => {
                          setEditingRevenue(entry);
                          setRevenueDialogOpen(true);
                        }}
                        className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded"
                        title="Edit revenue entry"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        data-ocid={`pnl.revenue.delete_button.${idx + 1}`}
                        onClick={() => handleDeleteRevenue(entry.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded"
                        title="Delete revenue entry"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Dialogs */}
      <ExpenseDialog
        open={expenseDialogOpen}
        onClose={() => {
          setExpenseDialogOpen(false);
          setEditingExpense(null);
        }}
        editingExpense={editingExpense}
      />

      <RevenueDialog
        open={revenueDialogOpen}
        onClose={() => {
          setRevenueDialogOpen(false);
          setEditingRevenue(null);
        }}
        editingEntry={editingRevenue}
      />
    </div>
  );
}
