import { MenuCategory } from "@/backend.d";
import type { MenuItem } from "@/backend.d";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateMenuItem,
  useDeleteMenuItem,
  useGetAllMenuItems,
  useUpdateMenuItem,
} from "@/hooks/useQueries";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";

// Subcategory tags encoded in description field
const SUBCATEGORY_TAGS: Record<string, string> = {
  "[tea]": "Tea",
  "[retail-coffee]": "Coffee",
  "[retail-apparel]": "Apparel",
};

function stripSubcategoryTag(description: string): {
  tag: string | null;
  clean: string;
} {
  for (const tag of Object.keys(SUBCATEGORY_TAGS)) {
    if (description.startsWith(`${tag} `)) {
      return { tag, clean: description.slice(tag.length + 1) };
    }
  }
  return { tag: null, clean: description };
}

// Top-level category config
const categoryLabels: Record<MenuCategory, string> = {
  [MenuCategory.espressoDrinks]: "Espresso-Based",
  [MenuCategory.coldDrinks]: "Brewed Coffee",
  [MenuCategory.pastries]: "Food",
  [MenuCategory.sandwiches]: "Retail",
};

// For espressoDrinks and coldDrinks we use subcategory split.
// coldDrinks: items tagged [tea] become "Tea" sub-section; untagged = "Brewed Coffee"
// sandwiches: items tagged [retail-coffee] = "Coffee", [retail-apparel] = "Apparel"

const categoryOrder: MenuCategory[] = [
  MenuCategory.espressoDrinks,
  MenuCategory.coldDrinks,
  MenuCategory.pastries,
  MenuCategory.sandwiches,
];

// For add/edit dialog category options
const categoryOptions: { value: MenuCategory; label: string }[] = [
  { value: MenuCategory.espressoDrinks, label: "Espresso-Based" },
  { value: MenuCategory.coldDrinks, label: "Brewed Coffee / Tea" },
  { value: MenuCategory.sandwiches, label: "Retail" },
  { value: MenuCategory.pastries, label: "Food" },
];

const EMPTY_FORM: Partial<MenuItem> = {
  name: "",
  description: "",
  category: MenuCategory.espressoDrinks,
  price: 0,
  available: true,
};

// Groups items within a category into sub-sections
function getSubsections(
  catItems: MenuItem[],
  cat: MenuCategory,
): { subLabel: string | null; items: MenuItem[] }[] {
  if (cat === MenuCategory.coldDrinks) {
    const brewed: MenuItem[] = [];
    const tea: MenuItem[] = [];
    for (const item of catItems) {
      const { tag } = stripSubcategoryTag(item.description);
      if (tag === "[tea]") tea.push(item);
      else brewed.push(item);
    }
    const sections: { subLabel: string | null; items: MenuItem[] }[] = [];
    if (brewed.length > 0) sections.push({ subLabel: null, items: brewed });
    if (tea.length > 0) sections.push({ subLabel: "Tea", items: tea });
    return sections;
  }
  if (cat === MenuCategory.sandwiches) {
    const coffee: MenuItem[] = [];
    const apparel: MenuItem[] = [];
    const other: MenuItem[] = [];
    for (const item of catItems) {
      const { tag } = stripSubcategoryTag(item.description);
      if (tag === "[retail-coffee]") coffee.push(item);
      else if (tag === "[retail-apparel]") apparel.push(item);
      else other.push(item);
    }
    const sections: { subLabel: string | null; items: MenuItem[] }[] = [];
    if (coffee.length > 0) sections.push({ subLabel: "Coffee", items: coffee });
    if (apparel.length > 0)
      sections.push({ subLabel: "Apparel", items: apparel });
    if (other.length > 0) sections.push({ subLabel: null, items: other });
    return sections;
  }
  // no sub-sections for espressoDrinks / pastries
  return [{ subLabel: null, items: catItems }];
}

export default function Menu() {
  const { data: items, isLoading } = useGetAllMenuItems();
  const createItem = useCreateMenuItem();
  const updateItem = useUpdateMenuItem();
  const deleteItem = useDeleteMenuItem();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<bigint | null>(null);
  const [form, setForm] = useState<Partial<MenuItem>>(EMPTY_FORM);

  const grouped = useMemo(() => {
    if (!items) return {} as Record<MenuCategory, MenuItem[]>;
    const result: Record<MenuCategory, MenuItem[]> = {
      [MenuCategory.espressoDrinks]: [],
      [MenuCategory.coldDrinks]: [],
      [MenuCategory.pastries]: [],
      [MenuCategory.sandwiches]: [],
    };
    for (const item of items) {
      result[item.category].push(item);
    }
    return result;
  }, [items]);

  const allItemsByOrder = useMemo(() => {
    if (!items) return new Map<string, number>();
    const sorted = [...items].sort(
      (a, b) =>
        categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category),
    );
    const map = new Map<string, number>();
    sorted.forEach((item, i) => map.set(item.id.toString(), i + 1));
    return map;
  }, [items]);

  function openAdd() {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(item: MenuItem) {
    setEditingItem(item);
    setForm({ ...item });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.name?.trim()) return;
    const itemData: MenuItem = {
      id: editingItem?.id ?? BigInt(0),
      name: form.name!,
      description: form.description ?? "",
      category: form.category ?? MenuCategory.espressoDrinks,
      price: Number(form.price) || 0,
      available: form.available ?? true,
    };
    if (editingItem) {
      await updateItem.mutateAsync(itemData);
    } else {
      await createItem.mutateAsync(itemData);
    }
    setDialogOpen(false);
  }

  async function toggleAvailability(item: MenuItem) {
    await updateItem.mutateAsync({ ...item, available: !item.available });
  }

  async function handleDelete() {
    if (deleteTarget !== null) {
      await deleteItem.mutateAsync(deleteTarget);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="px-8 py-10 max-w-5xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="label-caps mb-1">Management</p>
          <h1 className="text-3xl font-normal uppercase tracking-widest text-foreground">
            Menu
          </h1>
        </div>
        <button
          type="button"
          onClick={openAdd}
          data-ocid="menu.add_button"
          className="flex items-center gap-2 bg-foreground text-background text-xs uppercase tracking-widest font-medium py-3 px-5 hover:opacity-80 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Item
        </button>
      </div>

      {/* Stats line */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground uppercase tracking-widest font-light border-b border-border pb-5">
        <span>{items?.length ?? 0} items</span>
        <span className="w-px h-3 bg-border block" />
        <span>{items?.filter((i) => i.available).length ?? 0} available</span>
        <span className="w-px h-3 bg-border block" />
        <span>{items?.filter((i) => !i.available).length ?? 0} 86'd</span>
      </div>

      {isLoading ? (
        <div className="space-y-8">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-5 w-32 rounded-none" />
              <div className="space-y-px bg-border">
                <Skeleton className="h-16 w-full rounded-none" />
                <Skeleton className="h-16 w-full rounded-none" />
              </div>
            </div>
          ))}
        </div>
      ) : items?.length === 0 ? (
        <div
          data-ocid="menu.empty_state"
          className="py-16 text-center border border-dashed border-border"
        >
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-light">
            No menu items
          </p>
          <p className="text-xs text-muted-foreground font-light mt-1">
            Add your first item to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {categoryOrder.map((cat) => {
            const catItems = grouped[cat];
            if (!catItems || catItems.length === 0) return null;

            const subsections = getSubsections(catItems, cat);

            return (
              <motion.div
                key={cat}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Category heading */}
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs uppercase tracking-widest font-medium text-foreground">
                    {categoryLabels[cat]}
                  </p>
                  <span className="label-caps">{catItems.length}</span>
                </div>

                {/* Subsections */}
                <div className="space-y-5">
                  {subsections.map((section, si) => (
                    <div key={section.subLabel ?? `_${si}`}>
                      {section.subLabel && (
                        <p className="text-xs uppercase tracking-widest font-light text-muted-foreground mb-2 pl-0.5">
                          {section.subLabel}
                        </p>
                      )}
                      <div className="divide-y divide-border border-t border-b border-border">
                        <AnimatePresence mode="popLayout">
                          {section.items.map((item) => {
                            const markerIdx =
                              allItemsByOrder.get(item.id.toString()) ?? 0;
                            const { clean: cleanDesc } = stripSubcategoryTag(
                              item.description,
                            );
                            return (
                              <motion.div
                                key={item.id.toString()}
                                data-ocid={`menu.item.${markerIdx}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.18 }}
                                className="flex items-center gap-5 py-4 group"
                              >
                                {/* Availability indicator */}
                                <Switch
                                  data-ocid={`menu.availability_toggle.${markerIdx}`}
                                  checked={item.available}
                                  onCheckedChange={() =>
                                    toggleAvailability(item)
                                  }
                                  className="shrink-0 data-[state=checked]:bg-foreground data-[state=unchecked]:bg-border"
                                />

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3">
                                    <p
                                      className={`text-sm font-light tracking-wide ${!item.available ? "text-muted-foreground line-through" : "text-foreground"}`}
                                    >
                                      {item.name}
                                    </p>
                                    {!item.available && (
                                      <span className="text-xs uppercase tracking-widest badge-high px-1.5 py-0.5 font-medium">
                                        86'd
                                      </span>
                                    )}
                                  </div>
                                  {cleanDesc && (
                                    <p className="text-xs text-muted-foreground font-light mt-0.5 line-clamp-1 tracking-wide">
                                      {cleanDesc}
                                    </p>
                                  )}
                                </div>

                                {/* Price */}
                                {item.price > 0 && (
                                  <p className="text-sm font-light tabular-nums text-foreground shrink-0">
                                    ${item.price.toFixed(2)}
                                  </p>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => openEdit(item)}
                                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteTarget(item.id)}
                                    className="p-1.5 text-muted-foreground hover:text-brand-terracotta transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          data-ocid="menu.dialog"
          className="sm:max-w-md rounded-none"
        >
          <DialogHeader>
            <DialogTitle className="uppercase tracking-widest font-normal text-base">
              {editingItem ? "Edit Item" : "New Menu Item"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="label-caps">Name</Label>
              <Input
                data-ocid="menu.name_input"
                value={form.name ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g., Cortado"
                className="rounded-none font-light text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="label-caps">Description</Label>
              <Textarea
                value={form.description ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Brief description"
                rows={2}
                className="rounded-none font-light text-sm resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="label-caps">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, category: v as MenuCategory }))
                  }
                >
                  <SelectTrigger className="rounded-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none">
                    {categoryOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="label-caps">Price ($)</Label>
                <Input
                  data-ocid="menu.price_input"
                  type="number"
                  step="0.25"
                  min="0"
                  value={form.price ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      price: Number.parseFloat(e.target.value) || 0,
                    }))
                  }
                  placeholder="0.00"
                  className="rounded-none font-light text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.available ?? true}
                onCheckedChange={(v) =>
                  setForm((p) => ({ ...p, available: v }))
                }
                className="data-[state=checked]:bg-foreground"
              />
              <Label className="font-light text-sm">Available on menu</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-ocid="menu.cancel_button"
              className="rounded-none text-xs uppercase tracking-widest"
            >
              Cancel
            </Button>
            <Button
              data-ocid="menu.submit_button"
              onClick={handleSubmit}
              disabled={createItem.isPending || updateItem.isPending}
              className="rounded-none text-xs uppercase tracking-widest"
            >
              {editingItem ? "Save Changes" : "Add Item"}
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
              Remove this item?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-light">
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid="menu.cancel_button"
              className="rounded-none text-xs uppercase tracking-widest"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="menu.delete_button"
              onClick={handleDelete}
              className="rounded-none text-xs uppercase tracking-widest"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
