import type { TeamNote } from "@/backend.d";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateTeamNote,
  useDeleteTeamNote,
  useGetAllTeamNotes,
  useUpdateTeamNote,
} from "@/hooks/useQueries";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";

function formatRelative(ts: bigint): string {
  const ms = Number(ts);
  const now = Date.now();
  const diffHrs = (now - ms) / (1000 * 60 * 60);
  if (diffHrs < 1) return "Just now";
  if (diffHrs < 24) return `${Math.floor(diffHrs)}h ago`;
  if (diffHrs < 48) return "Yesterday";
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatFull(ts: bigint): string {
  return new Date(Number(ts)).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const EMPTY_FORM = { title: "", body: "" };

export default function TeamNotes() {
  const { data: notes, isLoading } = useGetAllTeamNotes();
  const createNote = useCreateTeamNote();
  const updateNote = useUpdateTeamNote();
  const deleteNote = useDeleteTeamNote();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<TeamNote | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<bigint | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const sortedNotes = useMemo(() => {
    if (!notes) return [];
    return [...notes].sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
  }, [notes]);

  function openAdd() {
    setEditingNote(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(note: TeamNote) {
    setEditingNote(note);
    setForm({ title: note.title, body: note.body });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.body.trim()) return;
    const noteData: TeamNote = {
      id: editingNote?.id ?? BigInt(0),
      title: form.title,
      body: form.body,
      timestamp: editingNote?.timestamp ?? BigInt(Date.now()),
    };
    if (editingNote) {
      await updateNote.mutateAsync(noteData);
    } else {
      await createNote.mutateAsync(noteData);
    }
    setDialogOpen(false);
  }

  async function handleDelete() {
    if (deleteTarget !== null) {
      await deleteNote.mutateAsync(deleteTarget);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="px-8 py-10 max-w-3xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="label-caps mb-1">Communications</p>
          <h1 className="text-3xl font-normal uppercase tracking-widest text-foreground">
            Team Notes
          </h1>
        </div>
        <button
          type="button"
          onClick={openAdd}
          data-ocid="notes.add_button"
          className="flex items-center gap-2 bg-foreground text-background text-xs uppercase tracking-widest font-medium py-3 px-5 hover:opacity-80 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          Post Note
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-px divide-y divide-border border-t border-b border-border">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-none" />
          ))}
        </div>
      ) : sortedNotes.length === 0 ? (
        <div
          data-ocid="notes.empty_state"
          className="py-16 text-center border border-dashed border-border"
        >
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-light">
            No notes yet
          </p>
          <p className="text-xs text-muted-foreground font-light mt-1">
            Post your first note to keep the team informed.
          </p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="divide-y divide-border border-t border-b border-border">
            {sortedNotes.map((note, idx) => (
              <motion.div
                key={note.id.toString()}
                data-ocid={`notes.item.${idx + 1}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="py-7 group"
              >
                <div className="flex items-start justify-between gap-5">
                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="text-sm font-normal tracking-wide text-foreground">
                        {note.title}
                      </p>
                      <time
                        className="label-caps shrink-0"
                        title={formatFull(note.timestamp)}
                      >
                        {formatRelative(note.timestamp)}
                      </time>
                    </div>
                    <p className="text-sm text-muted-foreground font-light leading-relaxed whitespace-pre-wrap">
                      {note.body}
                    </p>
                    <p className="text-xs text-muted-foreground/60 font-light">
                      {formatFull(note.timestamp)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                    <button
                      type="button"
                      data-ocid={`notes.edit_button.${idx + 1}`}
                      onClick={() => openEdit(note)}
                      className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      data-ocid={`notes.delete_button.${idx + 1}`}
                      onClick={() => setDeleteTarget(note.id)}
                      className="p-1.5 text-muted-foreground hover:text-brand-terracotta transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          data-ocid="notes.dialog"
          className="sm:max-w-md rounded-none"
        >
          <DialogHeader>
            <DialogTitle className="uppercase tracking-widest font-normal text-base">
              {editingNote ? "Edit Note" : "Post Note"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="label-caps">Title</Label>
              <Input
                data-ocid="notes.title_input"
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="What's this about?"
                className="rounded-none font-light text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="label-caps">Message</Label>
              <Textarea
                data-ocid="notes.textarea"
                value={form.body}
                onChange={(e) =>
                  setForm((p) => ({ ...p, body: e.target.value }))
                }
                placeholder="Write your message for the team..."
                rows={5}
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
              data-ocid="notes.submit_button"
              onClick={handleSubmit}
              disabled={createNote.isPending || updateNote.isPending}
              className="rounded-none text-xs uppercase tracking-widest"
            >
              {editingNote ? "Save Changes" : "Post Note"}
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
              Delete this note?
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
