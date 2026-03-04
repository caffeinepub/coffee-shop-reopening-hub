import type { ChatMessage } from "@/backend.d";
import { ExpenseCategory, PaymentStatus } from "@/backend.d";
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
import { Progress } from "@/components/ui/progress";
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
  useCreateChatMessage,
  useCreateExpense,
  useDeleteChatMessage,
  useGetAllChatMessages,
} from "@/hooks/useQueries";
import { useStorageClient } from "@/hooks/useStorageClient";
import { DollarSign, Loader2, Paperclip, Send, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const STORAGE_KEY = "alldaymia_user_name";
const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"];

function getFileExt(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function isImage(name: string): boolean {
  return IMAGE_EXTS.includes(getFileExt(name));
}

function formatRelative(ts: bigint): string {
  const ms = Number(ts);
  const now = Date.now();
  const diffMin = (now - ms) / 60000;
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${Math.floor(diffMin)}m ago`;
  const diffHrs = diffMin / 60;
  if (diffHrs < 24) return `${Math.floor(diffHrs)}h ago`;
  if (diffHrs < 48) return "Yesterday";
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year:
      new Date(ms).getFullYear() !== new Date().getFullYear()
        ? "numeric"
        : undefined,
  });
}

function formatFull(ts: bigint): string {
  return new Date(Number(ts)).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

// Highlight #hashtags and @mentions in message body
function renderBody(body: string) {
  const parts = body.split(/(\s)/);
  return parts.map((part, i) => {
    const key = `${part}-${i}`;
    if (part.startsWith("#") && part.length > 1) {
      return (
        <span key={key} className="font-medium text-foreground">
          {part}
        </span>
      );
    }
    if (part.startsWith("@") && part.length > 1) {
      return (
        <span key={key} className="font-medium text-foreground">
          {part}
        </span>
      );
    }
    return part;
  });
}

// ─── Author avatar color mapping ─────────────────────────────────────────────
const AUTHOR_COLORS: Record<string, string> = {
  Camila: "bg-[oklch(0.30_0.030_50)] text-[oklch(0.92_0.012_80)]",
  Juan: "bg-[oklch(0.22_0.010_48)] text-[oklch(0.88_0.016_80)]",
  Chris: "bg-[oklch(0.38_0.06_60)]  text-[oklch(0.96_0.008_82)]",
  Valeria: "bg-[oklch(0.46_0.10_30)]  text-[oklch(0.96_0.008_82)]",
};

function avatarClass(name: string): string {
  return (
    AUTHOR_COLORS[name] ??
    "bg-[oklch(0.18_0.010_48)] text-[oklch(0.92_0.012_80)]"
  );
}

// ─── Expense Category constants for chat dialog ───────────────────────────────
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

// ─── Smart parser ─────────────────────────────────────────────────────────────

interface ParsedExpense {
  amount: number;
  category: ExpenseCategory;
  paymentStatus: PaymentStatus;
  description: string;
  date: string;
  attachmentUrl?: string;
  attachmentName?: string;
}

function inferCategory(text: string): ExpenseCategory {
  const t = text.toLowerCase();
  if (
    /square|subscription|domain|website|online store|hosting|\.com|alldayaway|alldaymia/.test(
      t,
    )
  )
    return ExpenseCategory.website;
  if (/rent|lease/.test(t)) return ExpenseCategory.rent;
  if (/electric|water|internet|wifi|utility|utilities|gas/.test(t))
    return ExpenseCategory.utilities;
  if (/labor|payroll|salary|wages|\bpay\b/.test(t))
    return ExpenseCategory.labor;
  if (/supplies|supply|paper|cups|lids|napkins|bags/.test(t))
    return ExpenseCategory.supplies;
  if (/marketing|ads|advertising|social media|print|flyer/.test(t))
    return ExpenseCategory.marketing;
  if (/equipment|machine|repair|tech|plumber|electrician/.test(t))
    return ExpenseCategory.equipment;
  if (/license|licensing|permit/.test(t)) return ExpenseCategory.licensing;
  if (/cleaning|clean|janitorial/.test(t)) return ExpenseCategory.cleaning;
  if (/legal|lawyer|attorney|contract/.test(t)) return ExpenseCategory.legal;
  return ExpenseCategory.custom;
}

function inferPaymentStatus(text: string): PaymentStatus {
  const t = text.toLowerCase();
  if (/charged|paid|payment|charge|purchased|billing/.test(t))
    return PaymentStatus.paid;
  return PaymentStatus.payable;
}

function extractAmount(text: string): number | null {
  // Match $28.90, $1,200, $500, etc.
  const dollarMatch = text.match(/\$([\d,]+(?:\.\d{1,2})?)/);
  if (dollarMatch) {
    const cleaned = dollarMatch[1].replace(/,/g, "");
    const n = Number.parseFloat(cleaned);
    if (!Number.isNaN(n)) return n;
  }
  // Match "28.90 dollars", "500 USD", etc.
  const wordMatch = text.match(/([\d,]+(?:\.\d{1,2})?)\s*(?:dollars?|USD)/i);
  if (wordMatch) {
    const cleaned = wordMatch[1].replace(/,/g, "");
    const n = Number.parseFloat(cleaned);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

function parseMessageForExpense(
  body: string,
  attachmentUrl?: string | null,
  attachmentName?: string | null,
): ParsedExpense | null {
  const amount = extractAmount(body);
  if (amount === null) return null;

  return {
    amount,
    category: inferCategory(body),
    paymentStatus: inferPaymentStatus(body),
    description: body.length > 160 ? `${body.slice(0, 157)}…` : body,
    date: todayISO(),
    attachmentUrl: attachmentUrl ?? undefined,
    attachmentName: attachmentName ?? undefined,
  };
}

// ─── Add to P&L Confirmation Dialog ──────────────────────────────────────────

interface AddToPnLDialogProps {
  open: boolean;
  parsed: ParsedExpense | null;
  onClose: () => void;
  onConfirm: () => void;
}

function AddToPnLDialog({
  open,
  parsed,
  onClose,
  onConfirm,
}: AddToPnLDialogProps) {
  const userName = localStorage.getItem(STORAGE_KEY) ?? "Team";
  const createExpense = useCreateExpense();

  const [form, setForm] = useState({
    description: parsed?.description ?? "",
    amount: parsed ? String(parsed.amount) : "",
    category: parsed?.category ?? ExpenseCategory.custom,
    date: parsed?.date ?? todayISO(),
    notes: "",
    paymentStatus: parsed?.paymentStatus ?? PaymentStatus.payable,
  });

  // Sync form when parsed changes (new dialog open)
  const prevParsedRef = useRef(parsed);
  if (prevParsedRef.current !== parsed && parsed) {
    prevParsedRef.current = parsed;
    setForm({
      description: parsed.description,
      amount: String(parsed.amount),
      category: parsed.category,
      date: parsed.date,
      notes: "",
      paymentStatus: parsed.paymentStatus,
    });
  }

  const handleConfirm = async () => {
    const amount = Number.parseFloat(form.amount);
    if (Number.isNaN(amount) || !form.description.trim()) return;

    try {
      await createExpense.mutateAsync({
        id: BigInt(0),
        description: form.description.trim(),
        amount,
        category: form.category,
        date: form.date,
        notes: form.notes.trim(),
        createdBy: userName,
        paymentStatus: form.paymentStatus,
        attachmentUrl: parsed?.attachmentUrl,
        attachmentName: parsed?.attachmentName,
      });
      toast.success("Expense added to P&L");
      onConfirm();
    } catch {
      toast.error("Failed to add expense.");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent data-ocid="chat.pnl_dialog" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-widest text-sm font-medium">
            Add to P&amp;L?
          </DialogTitle>
          <p className="text-xs text-muted-foreground font-light pt-1">
            We detected an expense in your message. Review and confirm to save.
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Description */}
          <div className="space-y-1.5">
            <Label className="label-caps">Description</Label>
            <Textarea
              data-ocid="chat.pnl_description_input"
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
            />
          </div>

          {/* Amount + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="label-caps">Amount ($)</Label>
              <Input
                data-ocid="chat.pnl_amount_input"
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) =>
                  setForm((p) => ({ ...p, amount: e.target.value }))
                }
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
                <SelectTrigger data-ocid="chat.pnl_category_select">
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
              data-ocid="chat.pnl_date_input"
              type="date"
              value={form.date}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
            />
          </div>

          {/* Payment status toggle */}
          <div className="space-y-1.5">
            <Label className="label-caps">Status</Label>
            <div
              className="flex gap-0 border border-border w-fit"
              data-ocid="chat.pnl_payment_status_toggle"
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

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="label-caps">Notes (optional)</Label>
            <Input
              data-ocid="chat.pnl_notes_input"
              placeholder="Additional details..."
              value={form.notes}
              onChange={(e) =>
                setForm((p) => ({ ...p, notes: e.target.value }))
              }
            />
          </div>

          {/* Attachment (read-only) */}
          {parsed?.attachmentName && (
            <div className="flex items-center gap-2 px-3 py-2 border border-border text-xs text-muted-foreground">
              <Paperclip className="w-3 h-3 shrink-0" />
              {parsed.attachmentUrl ? (
                <a
                  href={parsed.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate hover:text-foreground underline underline-offset-2 transition-colors"
                >
                  {parsed.attachmentName}
                </a>
              ) : (
                <span className="truncate">{parsed.attachmentName}</span>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            data-ocid="chat.pnl_dismiss_button"
            onClick={onClose}
          >
            Dismiss
          </Button>
          <Button
            type="button"
            data-ocid="chat.pnl_confirm_button"
            disabled={createExpense.isPending}
            onClick={handleConfirm}
          >
            {createExpense.isPending ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : null}
            Add to P&amp;L
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Message bubble ──────────────────────────────────────────────────────────
interface MessageItemProps {
  msg: ChatMessage;
  index: number;
  currentUser: string | null;
  onDelete: (id: bigint) => void;
  onAddToPnL: (msg: ChatMessage) => void;
}

function MessageItem({
  msg,
  index,
  currentUser,
  onDelete,
  onAddToPnL,
}: MessageItemProps) {
  const isOwn = msg.authorName === currentUser;
  const hasAmount = extractAmount(msg.body) !== null;

  return (
    <motion.div
      key={msg.id.toString()}
      data-ocid={`chat.item.${index}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="group flex gap-3 py-5 border-b border-border last:border-b-0"
    >
      {/* Avatar */}
      <div
        className={`shrink-0 w-7 h-7 flex items-center justify-center text-[10px] font-medium uppercase tracking-wider ${avatarClass(msg.authorName)}`}
      >
        {getInitial(msg.authorName)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Header */}
        <div className="flex items-baseline gap-3">
          <span className="text-xs font-medium uppercase tracking-widest text-foreground">
            {msg.authorName}
          </span>
          <time
            className="label-caps text-[10px]"
            title={formatFull(msg.timestamp)}
          >
            {formatRelative(msg.timestamp)}
          </time>
        </div>

        {/* Body */}
        <p className="text-sm font-light leading-relaxed text-foreground/80 whitespace-pre-wrap break-words">
          {renderBody(msg.body)}
        </p>

        {/* Auto-extracted tags */}
        {msg.tags && msg.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {msg.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-0.5 text-[9px] uppercase tracking-widest font-medium border border-border text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Attachment */}
        {msg.attachmentUrl && msg.attachmentName && (
          <div className="pt-1">
            {isImage(msg.attachmentName) ? (
              <a
                href={msg.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <img
                  src={msg.attachmentUrl}
                  alt={msg.attachmentName}
                  className="max-h-28 max-w-xs object-cover border border-border opacity-90 hover:opacity-100 transition-opacity"
                />
              </a>
            ) : (
              <a
                href={msg.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                <Paperclip className="w-3 h-3 shrink-0" />
                <span className="font-light truncate max-w-[200px]">
                  {msg.attachmentName}
                </span>
              </a>
            )}
          </div>
        )}
      </div>

      {/* Actions — visible on hover */}
      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
        {hasAmount && (
          <button
            type="button"
            data-ocid={`chat.pnl_add_button.${index}`}
            onClick={() => onAddToPnL(msg)}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            title="Add to P&L"
          >
            <DollarSign className="w-3.5 h-3.5" />
          </button>
        )}
        {isOwn && (
          <button
            type="button"
            data-ocid={`chat.delete_button.${index}`}
            onClick={() => onDelete(msg.id)}
            className="p-1.5 text-muted-foreground hover:text-brand-terracotta transition-colors"
            title="Delete message"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Chat page ──────────────────────────────────────────────────────────
export default function Chat() {
  const currentUser = localStorage.getItem(STORAGE_KEY);

  const { data: messages, isLoading } = useGetAllChatMessages();
  const createMessage = useCreateChatMessage();
  const deleteMessage = useDeleteChatMessage();
  const { data: storageClient } = useStorageClient();

  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // P&L dialog state
  const [pnlDialogOpen, setPnlDialogOpen] = useState(false);
  const [parsedExpense, setParsedExpense] = useState<ParsedExpense | null>(
    null,
  );

  const feedRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages arrive
  const messageCount = messages?.length ?? 0;
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional trigger on message count
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messageCount]);

  // All unique tags across messages
  const allTags = useMemo(() => {
    if (!messages) return [];
    const tagSet = new Set<string>();
    for (const m of messages) {
      if (m.tags) {
        for (const t of m.tags) {
          tagSet.add(t);
        }
      }
    }
    return Array.from(tagSet).sort();
  }, [messages]);

  // Sorted + filtered messages
  const filteredMessages = useMemo(() => {
    if (!messages) return [];
    let list = [...messages].sort(
      (a, b) => Number(a.timestamp) - Number(b.timestamp),
    );
    if (activeTag) {
      list = list.filter((m) => m.tags?.includes(activeTag));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((m) => m.body.toLowerCase().includes(q));
    }
    return list;
  }, [messages, activeTag, search]);

  // Textarea keyboard handler
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed && !file) return;
    if (!currentUser) {
      toast.error("Please select your name first.");
      return;
    }

    let attachmentUrl: string | null = null;
    let attachmentName: string | null = null;

    // Upload file if present
    if (file && storageClient) {
      try {
        setUploadProgress(0);
        const bytes = new Uint8Array(await file.arrayBuffer());
        const { hash } = await storageClient.putFile(bytes, (pct) => {
          setUploadProgress(pct);
        });
        attachmentUrl = await storageClient.getDirectURL(hash);
        attachmentName = file.name;
        setUploadProgress(100);
      } catch (_err) {
        toast.error("File upload failed. Please try again.");
        setUploadProgress(null);
        return;
      }
    }

    try {
      await createMessage.mutateAsync({
        authorName: currentUser,
        body: trimmed,
        attachmentUrl,
        attachmentName,
      });

      // Clear compose fields first
      setBody("");
      setFile(null);
      setUploadProgress(null);

      // After message is sent, check if we should suggest adding to P&L.
      // Deferred via setTimeout so the dialog open doesn't get swallowed by
      // the same React flush that clears the form state.
      const parsed = parseMessageForExpense(
        trimmed,
        attachmentUrl,
        attachmentName,
      );
      if (parsed) {
        setTimeout(() => {
          setParsedExpense(parsed);
          setPnlDialogOpen(true);
        }, 0);
      }

      // Scroll after a tick to capture the new message
      setTimeout(() => {
        if (feedRef.current) {
          feedRef.current.scrollTop = feedRef.current.scrollHeight;
        }
      }, 100);
    } catch {
      toast.error("Failed to send message.");
      setUploadProgress(null);
    }
  }

  async function handleDelete(id: bigint) {
    try {
      await deleteMessage.mutateAsync(id);
    } catch {
      toast.error("Failed to delete message.");
    }
  }

  function handleAddToPnLFromMessage(msg: ChatMessage) {
    const parsed = parseMessageForExpense(
      msg.body,
      msg.attachmentUrl ?? null,
      msg.attachmentName ?? null,
    );
    if (parsed) {
      setParsedExpense(parsed);
      setPnlDialogOpen(true);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Page header ── */}
      <div className="px-8 pt-10 pb-6 border-b border-border shrink-0">
        <p className="label-caps mb-1">All Day</p>
        <h1 className="text-3xl font-normal uppercase tracking-widest text-foreground">
          Team Chat
        </h1>

        {/* Search + tag filters */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              data-ocid="chat.search_input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search messages…"
              className="w-full pl-3 pr-3 py-2 text-xs bg-transparent border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40 transition-colors font-light tracking-wide"
            />
          </div>

          {/* Tag filters */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                data-ocid="chat.tag_filter.tab"
                onClick={() => setActiveTag(null)}
                className={`px-2.5 py-1 text-[9px] uppercase tracking-widest font-medium border transition-colors ${
                  activeTag === null
                    ? "border-foreground text-foreground bg-transparent"
                    : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                }`}
              >
                All
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  data-ocid="chat.tag_filter.tab"
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  className={`px-2.5 py-1 text-[9px] uppercase tracking-widest font-medium border transition-colors ${
                    activeTag === tag
                      ? "border-foreground text-foreground bg-transparent"
                      : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Message feed ── */}
      <div ref={feedRef} className="flex-1 overflow-y-auto min-h-0 px-8">
        {isLoading ? (
          <div className="space-y-6 py-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-7 h-7 rounded-none shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-28 rounded-none" />
                  <Skeleton className="h-4 w-3/4 rounded-none" />
                  <Skeleton className="h-4 w-1/2 rounded-none" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredMessages.length === 0 ? (
          <div
            data-ocid="chat.empty_state"
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-10 h-px bg-border mb-6" />
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-light">
              {search || activeTag
                ? "No messages match your filter"
                : "No messages yet"}
            </p>
            <p className="text-xs text-muted-foreground/60 font-light mt-1.5">
              {!search && !activeTag && "Send the first message to the team."}
            </p>
            <div className="w-10 h-px bg-border mt-6" />
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="divide-y-0 border-b border-border">
              {filteredMessages.map((msg, idx) => (
                <MessageItem
                  key={msg.id.toString()}
                  msg={msg}
                  index={idx + 1}
                  currentUser={currentUser}
                  onDelete={handleDelete}
                  onAddToPnL={handleAddToPnLFromMessage}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* ── Compose area ── */}
      <div className="shrink-0 border-t border-border bg-background">
        {/* File chip */}
        <AnimatePresence>
          {file && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-8 pt-3"
            >
              <div className="inline-flex items-center gap-2 px-2.5 py-1.5 border border-border text-xs text-muted-foreground font-light">
                <Paperclip className="w-3 h-3 shrink-0" />
                <span className="truncate max-w-[200px]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload progress */}
        <AnimatePresence>
          {uploadProgress !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-8 pt-2"
            >
              <div className="flex items-center gap-3">
                <Progress
                  value={uploadProgress}
                  className="flex-1 h-px rounded-none"
                />
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground shrink-0">
                  {uploadProgress < 100 ? `${uploadProgress}%` : "Done"}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input row */}
        <div className="flex items-end gap-2 px-8 py-4">
          {/* Paperclip */}
          <button
            type="button"
            data-ocid="chat.upload_button"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 p-2 text-muted-foreground hover:text-foreground transition-colors self-end mb-0.5"
            title="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            data-ocid="chat.message_input"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message the team… (Shift+Enter for new line)"
            rows={1}
            className="flex-1 min-h-[40px] max-h-36 resize-none bg-transparent border border-border px-3 py-2.5 text-sm font-light text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40 transition-colors leading-relaxed"
            style={{
              height: "auto",
              overflowY: body.split("\n").length > 3 ? "auto" : "hidden",
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
            }}
          />

          {/* Send */}
          <button
            type="button"
            data-ocid="chat.send_button"
            onClick={handleSend}
            disabled={createMessage.isPending || (!body.trim() && !file)}
            className="shrink-0 p-2 bg-foreground text-background hover:opacity-80 disabled:opacity-30 transition-opacity self-end mb-0.5"
            title="Send message"
          >
            {createMessage.isPending ? (
              <div className="w-4 h-4 border border-background border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* ── Add to P&L Dialog ── */}
      <AddToPnLDialog
        open={pnlDialogOpen}
        parsed={parsedExpense}
        onClose={() => {
          setPnlDialogOpen(false);
          setParsedExpense(null);
        }}
        onConfirm={() => {
          setPnlDialogOpen(false);
          setParsedExpense(null);
        }}
      />
    </div>
  );
}
