import type {
  Ingredient,
  InventoryCount,
  InventoryCountEntry,
  Recipe,
  RecipeIngredient,
} from "@/backend.d";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateIngredient,
  useCreateInventoryCount,
  useCreateRecipe,
  useDeleteIngredient,
  useDeleteInventoryCount,
  useGetAllIngredients,
  useGetAllInventoryCounts,
  useGetAllMenuItems,
  useGetAllRecipes,
  useUpdateIngredient,
  useUpdateRecipe,
} from "@/hooks/useQueries";
import {
  convertUnit,
  cycleUnit,
  formatValue,
  getCompatibleUnits,
} from "@/utils/unitConversions";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

const STORAGE_KEY = "alldaymia_user_name";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getMondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

const INGREDIENT_CATEGORIES = [
  "coffee",
  "milk",
  "syrup",
  "tea",
  "supply",
  "cup",
  "packaging",
  "cleaning",
  "food",
  "other",
];

const INGREDIENT_UNITS = [
  "g",
  "kg",
  "oz",
  "lb",
  "ml",
  "L",
  "fl oz",
  "each",
  "bag",
  "qt",
  "gallon",
];

// ── Empty form templates ──────────────────────────────────────────────────────

const EMPTY_INGREDIENT: Omit<Ingredient, "id"> = {
  name: "",
  category: "coffee",
  unit: "g",
  unitCost: 0,
  parLevel: 0,
};

// ── Unit Toggle Badge ─────────────────────────────────────────────────────────

interface UnitToggleBadgeProps {
  currentUnit: string;
  baseUnit: string;
  onChange: (newUnit: string) => void;
  "data-ocid"?: string;
  title?: string;
}

function UnitToggleBadge({
  currentUnit,
  baseUnit,
  onChange,
  "data-ocid": dataOcid,
  title,
}: UnitToggleBadgeProps) {
  const compatible = getCompatibleUnits(baseUnit);
  const hasAlternatives = compatible.length > 1;

  if (!hasAlternatives) {
    return (
      <span className="text-xs text-muted-foreground tabular-nums">
        {currentUnit}
      </span>
    );
  }

  function handleClick() {
    onChange(cycleUnit(currentUnit, baseUnit));
  }

  return (
    <button
      type="button"
      data-ocid={dataOcid}
      title={title ?? `Click to cycle unit (${compatible.join(" → ")})`}
      onClick={handleClick}
      className="inline-flex items-center px-1.5 py-0.5 text-[10px] uppercase tracking-widest font-medium text-muted-foreground border border-border/60 hover:border-foreground/40 hover:text-foreground transition-all duration-150 cursor-pointer select-none tabular-nums"
      style={{ lineHeight: 1.4 }}
    >
      {currentUnit}
    </button>
  );
}

// ── Ingredient Form Dialog ────────────────────────────────────────────────────

interface IngredientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Ingredient | null;
  onSubmit: (data: Omit<Ingredient, "id">) => void;
  isPending: boolean;
}

function IngredientDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
  isPending,
}: IngredientDialogProps) {
  const [form, setForm] = useState<Omit<Ingredient, "id">>(() =>
    editing
      ? {
          name: editing.name,
          category: editing.category,
          unit: editing.unit,
          unitCost: editing.unitCost,
          parLevel: editing.parLevel,
        }
      : EMPTY_INGREDIENT,
  );

  // Reset form when dialog opens with new editing target
  const handleOpenChange = useCallback(
    (val: boolean) => {
      if (val) {
        setForm(
          editing
            ? {
                name: editing.name,
                category: editing.category,
                unit: editing.unit,
                unitCost: editing.unitCost,
                parLevel: editing.parLevel,
              }
            : EMPTY_INGREDIENT,
        );
      }
      onOpenChange(val);
    },
    [editing, onOpenChange],
  );

  // Keep form in sync when editing changes
  useMemo(() => {
    if (open) {
      setForm(
        editing
          ? {
              name: editing.name,
              category: editing.category,
              unit: editing.unit,
              unitCost: editing.unitCost,
              parLevel: editing.parLevel,
            }
          : EMPTY_INGREDIENT,
      );
    }
  }, [open, editing]);

  function handleSubmit() {
    if (!form.name.trim()) return;
    onSubmit(form);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        data-ocid="inventory.ingredient_form.dialog"
        className="sm:max-w-md rounded-none"
      >
        <DialogHeader>
          <DialogTitle className="uppercase tracking-widest font-normal text-base">
            {editing ? "Edit Ingredient" : "Add Ingredient"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="label-caps">Name</Label>
            <Input
              data-ocid="inventory.ingredient_name.input"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g., Espresso Beans"
              className="rounded-none font-light text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="label-caps">Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}
              >
                <SelectTrigger
                  data-ocid="inventory.ingredient_category.input"
                  className="rounded-none text-sm font-light"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  {INGREDIENT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="label-caps">Unit</Label>
              <Select
                value={form.unit}
                onValueChange={(v) => setForm((p) => ({ ...p, unit: v }))}
              >
                <SelectTrigger
                  data-ocid="inventory.ingredient_unit.input"
                  className="rounded-none text-sm font-light"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  {INGREDIENT_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="label-caps">Unit Cost ($)</Label>
              <Input
                data-ocid="inventory.ingredient_unitcost.input"
                type="number"
                step="0.001"
                min="0"
                value={form.unitCost === 0 ? "" : form.unitCost}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    unitCost: Number.parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="0.00"
                className="rounded-none font-light text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="label-caps">Par Level</Label>
              <Input
                data-ocid="inventory.ingredient_parlevel.input"
                type="number"
                min="0"
                value={form.parLevel === 0 ? "" : form.parLevel}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    parLevel: Number.parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="0"
                className="rounded-none font-light text-sm"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-ocid="inventory.ingredient_form.cancel_button"
            className="rounded-none text-xs uppercase tracking-widest"
          >
            Cancel
          </Button>
          <Button
            data-ocid="inventory.ingredient_form.submit_button"
            onClick={handleSubmit}
            disabled={isPending || !form.name.trim()}
            className="rounded-none text-xs uppercase tracking-widest"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : null}
            {editing ? "Save Changes" : "Add Ingredient"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Ingredient Library Panel ──────────────────────────────────────────────────

interface IngredientLibraryProps {
  ingredients: Ingredient[];
  isLoading: boolean;
}

function IngredientLibrary({ ingredients, isLoading }: IngredientLibraryProps) {
  const createIngredient = useCreateIngredient();
  const updateIngredient = useUpdateIngredient();
  const deleteIngredient = useDeleteIngredient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<bigint | null>(null);
  // Display unit per ingredient ID (defaults to stored unit)
  const [displayUnits, setDisplayUnits] = useState<Record<string, string>>({});

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(ing: Ingredient) {
    setEditing(ing);
    setDialogOpen(true);
  }

  async function handleSubmit(data: Omit<Ingredient, "id">) {
    try {
      if (editing) {
        await updateIngredient.mutateAsync({ id: editing.id, ...data });
        toast.success("Ingredient updated");
      } else {
        await createIngredient.mutateAsync({ id: BigInt(0), ...data });
        toast.success("Ingredient added");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save ingredient");
    }
  }

  async function handleDelete() {
    if (deleteTarget === null) return;
    try {
      await deleteIngredient.mutateAsync(deleteTarget);
      toast.success("Ingredient removed");
    } catch {
      toast.error("Failed to delete ingredient");
    }
    setDeleteTarget(null);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="label-caps mb-0.5">Library</p>
          <h2 className="text-lg font-normal uppercase tracking-widest text-foreground">
            Ingredients
          </h2>
        </div>
        <button
          type="button"
          data-ocid="inventory.add_ingredient_button"
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-foreground text-background text-xs uppercase tracking-widest font-medium py-2.5 px-4 hover:opacity-80 transition-opacity"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-none" />
          ))}
        </div>
      ) : ingredients.length === 0 ? (
        <div
          data-ocid="inventory.ingredients.empty_state"
          className="py-12 text-center border border-dashed border-border"
        >
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-light">
            No ingredients yet
          </p>
          <p className="text-xs text-muted-foreground font-light mt-1">
            Add ingredients to start building recipes.
          </p>
        </div>
      ) : (
        <div className="border border-border divide-y divide-border overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="label-caps text-left px-3 py-2.5 font-medium">
                  Name
                </th>
                <th className="label-caps text-left px-3 py-2.5 font-medium hidden sm:table-cell">
                  Cat.
                </th>
                <th className="label-caps text-left px-3 py-2.5 font-medium">
                  Unit
                </th>
                <th className="label-caps text-right px-3 py-2.5 font-medium">
                  $/Unit
                </th>
                <th className="label-caps text-right px-3 py-2.5 font-medium hidden sm:table-cell">
                  Par
                </th>
                <th className="px-3 py-2.5 w-16" />
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {ingredients.map((ing, idx) => (
                  <motion.tr
                    key={ing.id.toString()}
                    data-ocid={`inventory.ingredient.item.${idx + 1}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="group hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-3 py-2.5 font-light text-foreground">
                      {ing.name}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground capitalize hidden sm:table-cell">
                      {ing.category}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      <UnitToggleBadge
                        currentUnit={
                          displayUnits[ing.id.toString()] ?? ing.unit
                        }
                        baseUnit={ing.unit}
                        onChange={(newUnit) =>
                          setDisplayUnits((prev) => ({
                            ...prev,
                            [ing.id.toString()]: newUnit,
                          }))
                        }
                        data-ocid={`inventory.ingredient.unit_toggle.${idx + 1}`}
                        title={`Toggle unit (click to cycle between ${getCompatibleUnits(ing.unit).join(", ")})`}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-foreground font-light">
                      {(() => {
                        const displayUnit =
                          displayUnits[ing.id.toString()] ?? ing.unit;
                        const convertedCost =
                          displayUnit === ing.unit
                            ? ing.unitCost
                            : convertUnit(ing.unitCost, ing.unit, displayUnit);
                        return `$${formatValue(convertedCost)}`;
                      })()}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                      {ing.parLevel}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          data-ocid={`inventory.ingredient.edit_button.${idx + 1}`}
                          onClick={() => openEdit(ing)}
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit ingredient"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          data-ocid={`inventory.ingredient.delete_button.${idx + 1}`}
                          onClick={() => setDeleteTarget(ing.id)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete ingredient"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      <IngredientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSubmit={handleSubmit}
        isPending={createIngredient.isPending || updateIngredient.isPending}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="uppercase tracking-widest font-normal text-sm">
              Remove ingredient?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-light">
              This will also affect any recipes using this ingredient. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none text-xs uppercase tracking-widest">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="inventory.ingredient.confirm_button"
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

// ── Recipe Row type (local state) ─────────────────────────────────────────────

interface RecipeRow {
  key: number;
  ingredientId: string; // string for select value, convert to bigint on save
  quantityUsed: number;
}

// ── Recipe Builder Panel ──────────────────────────────────────────────────────

interface RecipeBuilderProps {
  ingredients: Ingredient[];
  recipes: Recipe[];
  isLoadingIngredients: boolean;
  isLoadingRecipes: boolean;
}

function RecipeBuilder({
  ingredients,
  recipes,
  isLoadingIngredients,
  isLoadingRecipes,
}: RecipeBuilderProps) {
  const { data: menuItems, isLoading: isLoadingMenu } = useGetAllMenuItems();
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();

  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>("");
  const [rows, setRows] = useState<RecipeRow[]>([]);
  const [notes, setNotes] = useState("");
  const [rowCounter, setRowCounter] = useState(0);
  // Display unit per recipe row key
  const [rowDisplayUnits, setRowDisplayUnits] = useState<
    Record<number, string>
  >({});

  // Derive existing recipe for selected menu item
  const existingRecipe = useMemo(() => {
    if (!selectedMenuItemId) return null;
    return (
      recipes.find((r) => r.menuItemId.toString() === selectedMenuItemId) ??
      null
    );
  }, [selectedMenuItemId, recipes]);

  // When menu item changes, populate form from existing recipe or clear
  const handleMenuItemChange = useCallback(
    (val: string) => {
      setSelectedMenuItemId(val);
      const recipe = recipes.find((r) => r.menuItemId.toString() === val);
      setRowDisplayUnits({});
      if (recipe) {
        let counter = rowCounter;
        const newRows: RecipeRow[] = recipe.ingredients.map((ri) => ({
          key: ++counter,
          ingredientId: ri.ingredientId.toString(),
          quantityUsed: ri.quantityUsed,
        }));
        setRowCounter(counter);
        setRows(newRows);
        setNotes(recipe.notes);
      } else {
        setRows([]);
        setNotes("");
      }
    },
    [recipes, rowCounter],
  );

  function addRow() {
    setRowCounter((c) => {
      const next = c + 1;
      setRows((prev) => [
        ...prev,
        { key: next, ingredientId: "", quantityUsed: 0 },
      ]);
      return next;
    });
  }

  function removeRow(key: number) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function updateRow(key: number, patch: Partial<RecipeRow>) {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
  }

  // Compute per-row cost and total
  const ingredientMap = useMemo(() => {
    const map = new Map<string, Ingredient>();
    for (const ing of ingredients) map.set(ing.id.toString(), ing);
    return map;
  }, [ingredients]);

  const totalCost = useMemo(() => {
    return rows.reduce((sum, row) => {
      const ing = ingredientMap.get(row.ingredientId);
      if (!ing) return sum;
      return sum + row.quantityUsed * ing.unitCost;
    }, 0);
  }, [rows, ingredientMap]);

  async function handleSave() {
    if (!selectedMenuItemId) return;
    const recipeIngredients: RecipeIngredient[] = rows
      .filter((r) => r.ingredientId && r.quantityUsed > 0)
      .map((r) => ({
        ingredientId: BigInt(r.ingredientId),
        quantityUsed: r.quantityUsed,
      }));

    try {
      if (existingRecipe) {
        await updateRecipe.mutateAsync({
          id: existingRecipe.id,
          menuItemId: BigInt(selectedMenuItemId),
          ingredients: recipeIngredients,
          notes,
        });
        toast.success("Recipe updated");
      } else {
        await createRecipe.mutateAsync({
          id: BigInt(0),
          menuItemId: BigInt(selectedMenuItemId),
          ingredients: recipeIngredients,
          notes,
        });
        toast.success("Recipe saved");
      }
    } catch {
      toast.error("Failed to save recipe");
    }
  }

  const isLoading = isLoadingIngredients || isLoadingRecipes || isLoadingMenu;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <p className="label-caps mb-0.5">Costing</p>
        <h2 className="text-lg font-normal uppercase tracking-widest text-foreground">
          Recipe Builder
        </h2>
      </div>

      {/* Menu Item Select */}
      <div className="space-y-1.5">
        <Label className="label-caps">Menu Item</Label>
        {isLoading ? (
          <Skeleton className="h-9 w-full rounded-none" />
        ) : (
          <Select
            value={selectedMenuItemId}
            onValueChange={handleMenuItemChange}
          >
            <SelectTrigger
              data-ocid="inventory.menuitem.select"
              className="rounded-none font-light text-sm"
            >
              <SelectValue placeholder="Select a menu item…" />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              {(menuItems ?? []).map((item) => (
                <SelectItem key={item.id.toString()} value={item.id.toString()}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {selectedMenuItemId && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="flex flex-col gap-4"
        >
          {/* Existing recipe indicator */}
          {existingRecipe && (
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-light">
              Editing existing recipe
            </p>
          )}

          {/* Ingredient rows */}
          {rows.length > 0 ? (
            <div className="border border-border divide-y divide-border">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_100px_80px_28px] gap-2 px-3 py-2 bg-muted/30">
                <p className="label-caps">Ingredient</p>
                <p className="label-caps">Qty Used</p>
                <p className="label-caps text-right">Cost</p>
                <div />
              </div>
              {rows.map((row) => {
                const ing = ingredientMap.get(row.ingredientId);
                const rowCost = ing ? row.quantityUsed * ing.unitCost : 0;
                // Display unit for this row (defaults to ingredient's stored unit)
                const rowDisplayUnit = ing
                  ? (rowDisplayUnits[row.key] ?? ing.unit)
                  : undefined;
                // Quantity shown in display unit
                const displayQty =
                  ing && rowDisplayUnit && rowDisplayUnit !== ing.unit
                    ? convertUnit(row.quantityUsed, ing.unit, rowDisplayUnit)
                    : row.quantityUsed;
                return (
                  <div
                    key={row.key}
                    className="grid grid-cols-[1fr_120px_80px_28px] gap-2 items-center px-3 py-2"
                  >
                    <Select
                      value={row.ingredientId}
                      onValueChange={(v) => {
                        updateRow(row.key, { ingredientId: v });
                        // Reset display unit when ingredient changes
                        setRowDisplayUnits((prev) => {
                          const next = { ...prev };
                          delete next[row.key];
                          return next;
                        });
                      }}
                    >
                      <SelectTrigger className="rounded-none h-8 text-xs font-light">
                        <SelectValue placeholder="Choose…" />
                      </SelectTrigger>
                      <SelectContent className="rounded-none">
                        {ingredients.map((ing) => (
                          <SelectItem
                            key={ing.id.toString()}
                            value={ing.id.toString()}
                            className="text-xs"
                          >
                            {ing.name}{" "}
                            <span className="text-muted-foreground ml-1">
                              ({ing.unit})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={displayQty === 0 ? "" : formatValue(displayQty)}
                        onChange={(e) => {
                          const inputVal =
                            Number.parseFloat(e.target.value) || 0;
                          // Convert back to stored unit
                          const storedQty =
                            ing && rowDisplayUnit && rowDisplayUnit !== ing.unit
                              ? convertUnit(inputVal, rowDisplayUnit, ing.unit)
                              : inputVal;
                          updateRow(row.key, { quantityUsed: storedQty });
                        }}
                        className="rounded-none h-8 text-xs font-light tabular-nums"
                        placeholder="0"
                      />
                      {ing && rowDisplayUnit && (
                        <UnitToggleBadge
                          currentUnit={rowDisplayUnit}
                          baseUnit={ing.unit}
                          onChange={(newUnit) =>
                            setRowDisplayUnits((prev) => ({
                              ...prev,
                              [row.key]: newUnit,
                            }))
                          }
                          data-ocid={`inventory.recipe.row_unit_toggle.${row.key}`}
                          title={`Toggle qty unit (stored in ${ing.unit})`}
                        />
                      )}
                    </div>
                    <p className="text-xs tabular-nums text-right text-foreground font-light">
                      {rowCost > 0 ? `$${rowCost.toFixed(3)}` : "—"}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border border-dashed border-border py-6 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-light">
                No ingredients added
              </p>
            </div>
          )}

          {/* Add ingredient row */}
          <button
            type="button"
            data-ocid="inventory.recipe.add_ingredient_button"
            onClick={addRow}
            className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-medium text-muted-foreground hover:text-foreground transition-colors self-start"
          >
            <Plus className="w-3 h-3" />
            Add Ingredient
          </button>

          {/* Total cost */}
          {rows.length > 0 && (
            <div className="flex items-center justify-between border-t border-border pt-3">
              <p className="label-caps">Total Cost Per Serving</p>
              <p className="text-xl font-light tabular-nums text-foreground">
                ${totalCost.toFixed(3)}
              </p>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="label-caps">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Preparation notes, allergens, variations…"
              rows={2}
              className="rounded-none font-light text-sm resize-none"
            />
          </div>

          {/* Save */}
          <div className="flex justify-end">
            <Button
              data-ocid="inventory.recipe.save_button"
              onClick={handleSave}
              disabled={createRecipe.isPending || updateRecipe.isPending}
              className="rounded-none text-xs uppercase tracking-widest"
            >
              {createRecipe.isPending || updateRecipe.isPending ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : null}
              {existingRecipe ? "Update Recipe" : "Save Recipe"}
            </Button>
          </div>
        </motion.div>
      )}

      {!selectedMenuItemId && (
        <div className="py-12 text-center border border-dashed border-border">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-light">
            Select a menu item to view or build its recipe
          </p>
        </div>
      )}
    </div>
  );
}

// ── Count Sheet Tab ───────────────────────────────────────────────────────────

interface CountSheetEntryState {
  ingredientId: bigint;
  openingQty: number;
  purchasesQty: number;
  closingQty: number;
  expectedUsage: number;
}

function computeActualUsage(e: CountSheetEntryState): number {
  return e.openingQty + e.purchasesQty - e.closingQty;
}

function computeWaste(e: CountSheetEntryState): number {
  return computeActualUsage(e) - e.expectedUsage;
}

interface CountSheetTabProps {
  ingredients: Ingredient[];
  counts: InventoryCount[];
  isLoadingIngredients: boolean;
  isLoadingCounts: boolean;
}

function CountSheetTab({
  ingredients,
  counts,
  isLoadingIngredients,
  isLoadingCounts,
}: CountSheetTabProps) {
  const createCount = useCreateInventoryCount();
  const deleteCount = useDeleteInventoryCount();

  const [weekOf, setWeekOf] = useState(() => getMondayOfWeek(new Date()));
  const [entries, setEntries] = useState<Record<string, CountSheetEntryState>>(
    {},
  );
  const [deleteTarget, setDeleteTarget] = useState<bigint | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<bigint | null>(
    null,
  );
  // Display unit per ingredient ID in the count sheet
  const [countDisplayUnits, setCountDisplayUnits] = useState<
    Record<string, string>
  >({});

  // Initialize entries when ingredients load
  useMemo(() => {
    if (ingredients.length === 0) return;
    setEntries((prev) => {
      const next = { ...prev };
      for (const ing of ingredients) {
        const k = ing.id.toString();
        if (!next[k]) {
          next[k] = {
            ingredientId: ing.id,
            openingQty: 0,
            purchasesQty: 0,
            closingQty: 0,
            expectedUsage: 0,
          };
        }
      }
      return next;
    });
  }, [ingredients]);

  function updateEntry(id: bigint, patch: Partial<CountSheetEntryState>) {
    setEntries((prev) => ({
      ...prev,
      [id.toString()]: { ...prev[id.toString()], ...patch },
    }));
  }

  async function handleSubmit() {
    const userName = localStorage.getItem(STORAGE_KEY) ?? "Unknown";
    const entryList: InventoryCountEntry[] = Object.values(entries).map(
      (e) => ({
        ingredientId: e.ingredientId,
        openingQty: e.openingQty,
        purchasesQty: e.purchasesQty,
        closingQty: e.closingQty,
        expectedUsage: e.expectedUsage,
        actualUsage: computeActualUsage(e),
        waste: computeWaste(e),
      }),
    );

    try {
      await createCount.mutateAsync({
        id: BigInt(0),
        weekOf,
        entries: entryList,
        submittedBy: userName,
        submittedAt: BigInt(Date.now()),
      });
      toast.success("Count sheet submitted");
      // Reset entries
      setEntries({});
      setWeekOf(getMondayOfWeek(new Date()));
    } catch {
      toast.error("Failed to submit count sheet");
    }
  }

  async function handleDelete() {
    if (deleteTarget === null) return;
    try {
      await deleteCount.mutateAsync(deleteTarget);
      toast.success("Count record deleted");
    } catch {
      toast.error("Failed to delete count record");
    }
    setDeleteTarget(null);
  }

  const sortedCounts = useMemo(() => {
    return [...counts].sort((a, b) => {
      const aAt =
        typeof a.submittedAt === "bigint"
          ? Number(a.submittedAt)
          : a.submittedAt;
      const bAt =
        typeof b.submittedAt === "bigint"
          ? Number(b.submittedAt)
          : b.submittedAt;
      return bAt - aAt;
    });
  }, [counts]);

  const ingredientMap = useMemo(() => {
    const map = new Map<string, Ingredient>();
    for (const ing of ingredients) map.set(ing.id.toString(), ing);
    return map;
  }, [ingredients]);

  if (isLoadingIngredients) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-none" />
        ))}
      </div>
    );
  }

  if (ingredients.length === 0) {
    return (
      <div
        data-ocid="inventory.countsheet.empty_state"
        className="py-16 text-center border border-dashed border-border"
      >
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-light">
          No ingredients in library
        </p>
        <p className="text-xs text-muted-foreground font-light mt-1">
          Add ingredients in the Recipes tab first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* ── Active Count Form ── */}
      <div className="space-y-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="label-caps mb-0.5">Weekly</p>
            <h2 className="text-lg font-normal uppercase tracking-widest text-foreground">
              Count Sheet
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="space-y-1">
              <Label className="label-caps text-[10px]">Week of</Label>
              <Input
                data-ocid="inventory.countsheet.weekof.input"
                type="date"
                value={weekOf}
                onChange={(e) => setWeekOf(e.target.value)}
                className="rounded-none font-light text-sm h-8 w-36"
              />
            </div>
          </div>
        </div>

        {/* Count table */}
        <div className="border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="label-caps w-40">Ingredient</TableHead>
                <TableHead className="label-caps text-right w-24">
                  Opening
                </TableHead>
                <TableHead className="label-caps text-right w-24">
                  Purchases
                </TableHead>
                <TableHead className="label-caps text-right w-24">
                  Closing
                </TableHead>
                <TableHead className="label-caps text-right w-28">
                  Expected Use
                </TableHead>
                <TableHead className="label-caps text-right w-24">
                  Actual Use
                </TableHead>
                <TableHead className="label-caps text-right w-20">
                  Waste
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ingredients.map((ing) => {
                const ingKey = ing.id.toString();
                const e = entries[ingKey] ?? {
                  ingredientId: ing.id,
                  openingQty: 0,
                  purchasesQty: 0,
                  closingQty: 0,
                  expectedUsage: 0,
                };
                const actual = computeActualUsage(e);
                const waste = computeWaste(e);
                const displayUnit = countDisplayUnits[ingKey] ?? ing.unit;
                const isConverted = displayUnit !== ing.unit;

                // Helper: stored → display
                function toDisplay(stored: number) {
                  return isConverted
                    ? convertUnit(stored, ing.unit, displayUnit)
                    : stored;
                }
                // Helper: display → stored
                function toStored(display: number) {
                  return isConverted
                    ? convertUnit(display, displayUnit, ing.unit)
                    : display;
                }

                return (
                  <TableRow
                    key={ingKey}
                    className="border-border hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="font-light text-sm py-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {ing.name}
                        <UnitToggleBadge
                          currentUnit={displayUnit}
                          baseUnit={ing.unit}
                          onChange={(newUnit) =>
                            setCountDisplayUnits((prev) => ({
                              ...prev,
                              [ingKey]: newUnit,
                            }))
                          }
                          data-ocid={`inventory.countsheet.unit_toggle.${ingKey}`}
                          title={`Toggle display unit (stored in ${ing.unit})`}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={
                          e.openingQty === 0
                            ? ""
                            : formatValue(toDisplay(e.openingQty))
                        }
                        onChange={(ev) =>
                          updateEntry(ing.id, {
                            openingQty: toStored(
                              Number.parseFloat(ev.target.value) || 0,
                            ),
                          })
                        }
                        className="rounded-none h-7 text-xs tabular-nums text-right w-20 ml-auto font-light"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={
                          e.purchasesQty === 0
                            ? ""
                            : formatValue(toDisplay(e.purchasesQty))
                        }
                        onChange={(ev) =>
                          updateEntry(ing.id, {
                            purchasesQty: toStored(
                              Number.parseFloat(ev.target.value) || 0,
                            ),
                          })
                        }
                        className="rounded-none h-7 text-xs tabular-nums text-right w-20 ml-auto font-light"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={
                          e.closingQty === 0
                            ? ""
                            : formatValue(toDisplay(e.closingQty))
                        }
                        onChange={(ev) =>
                          updateEntry(ing.id, {
                            closingQty: toStored(
                              Number.parseFloat(ev.target.value) || 0,
                            ),
                          })
                        }
                        className="rounded-none h-7 text-xs tabular-nums text-right w-20 ml-auto font-light"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={
                          e.expectedUsage === 0
                            ? ""
                            : formatValue(toDisplay(e.expectedUsage))
                        }
                        onChange={(ev) =>
                          updateEntry(ing.id, {
                            expectedUsage: toStored(
                              Number.parseFloat(ev.target.value) || 0,
                            ),
                          })
                        }
                        className="rounded-none h-7 text-xs tabular-nums text-right w-24 ml-auto font-light"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className="py-2 text-right text-xs tabular-nums font-light text-muted-foreground">
                      {formatValue(toDisplay(actual))}
                    </TableCell>
                    <TableCell className="py-2 text-right text-xs tabular-nums font-light">
                      <span
                        className={
                          waste > 0.001
                            ? "text-destructive font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        {waste > 0.001
                          ? `+${formatValue(toDisplay(waste))}`
                          : waste < -0.001
                            ? formatValue(toDisplay(waste))
                            : "—"}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end">
          <Button
            data-ocid="inventory.countsheet.submit_button"
            onClick={handleSubmit}
            disabled={createCount.isPending}
            className="rounded-none text-xs uppercase tracking-widest"
          >
            {createCount.isPending ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : null}
            Submit Count
          </Button>
        </div>
      </div>

      {/* ── Count History ── */}
      <div className="space-y-4">
        <div className="border-t border-border pt-8">
          <p className="label-caps mb-0.5">Archive</p>
          <h2 className="text-lg font-normal uppercase tracking-widest text-foreground">
            Count History
          </h2>
        </div>

        {isLoadingCounts ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-none" />
            ))}
          </div>
        ) : sortedCounts.length === 0 ? (
          <div
            data-ocid="inventory.history.empty_state"
            className="py-10 text-center border border-dashed border-border"
          >
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-light">
              No count history yet
            </p>
          </div>
        ) : (
          <div className="border border-border divide-y divide-border">
            {sortedCounts.map((count, idx) => {
              const totalWaste = count.entries.reduce(
                (sum, e) => sum + e.waste,
                0,
              );
              const isExpanded = expandedHistoryId === count.id;
              return (
                <motion.div
                  key={count.id.toString()}
                  data-ocid={`inventory.history.item.${idx + 1}`}
                  layout
                >
                  <div className="flex items-center gap-4 px-4 py-3 hover:bg-muted/20 transition-colors">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedHistoryId(isExpanded ? null : count.id)
                      }
                      className="flex items-center gap-2 flex-1 text-left min-w-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <p className="text-sm font-light text-foreground">
                          Week of {count.weekOf}
                        </p>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest hidden sm:block">
                          by {count.submittedBy}
                        </p>
                        {totalWaste > 0.001 && (
                          <span className="text-xs font-medium text-destructive ml-auto shrink-0">
                            Waste: +{totalWaste.toFixed(2)}
                          </span>
                        )}
                        {totalWaste <= 0.001 && (
                          <span className="text-xs text-muted-foreground font-light ml-auto shrink-0">
                            No waste
                          </span>
                        )}
                      </div>
                    </button>
                    <button
                      type="button"
                      data-ocid={`inventory.history.delete_button.${idx + 1}`}
                      onClick={() => setDeleteTarget(count.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      title="Delete count record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 overflow-x-auto">
                          <table className="w-full text-xs border-t border-border mt-2">
                            <thead>
                              <tr>
                                <th className="label-caps text-left py-2 pr-4">
                                  Ingredient
                                </th>
                                <th className="label-caps text-right py-2 px-2">
                                  Opening
                                </th>
                                <th className="label-caps text-right py-2 px-2">
                                  Purchases
                                </th>
                                <th className="label-caps text-right py-2 px-2">
                                  Closing
                                </th>
                                <th className="label-caps text-right py-2 px-2">
                                  Expected
                                </th>
                                <th className="label-caps text-right py-2 px-2">
                                  Actual
                                </th>
                                <th className="label-caps text-right py-2 pl-2">
                                  Waste
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {count.entries.map((entry) => {
                                const ing = ingredientMap.get(
                                  entry.ingredientId.toString(),
                                );
                                return (
                                  <tr
                                    key={entry.ingredientId.toString()}
                                    className="hover:bg-muted/20"
                                  >
                                    <td className="py-1.5 pr-4 font-light text-foreground">
                                      {ing
                                        ? `${ing.name} (${ing.unit})`
                                        : entry.ingredientId.toString()}
                                    </td>
                                    <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">
                                      {entry.openingQty.toFixed(2)}
                                    </td>
                                    <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">
                                      {entry.purchasesQty.toFixed(2)}
                                    </td>
                                    <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">
                                      {entry.closingQty.toFixed(2)}
                                    </td>
                                    <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">
                                      {entry.expectedUsage.toFixed(2)}
                                    </td>
                                    <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">
                                      {entry.actualUsage.toFixed(2)}
                                    </td>
                                    <td
                                      className={`py-1.5 pl-2 text-right tabular-nums font-medium ${entry.waste > 0.001 ? "text-destructive" : "text-muted-foreground"}`}
                                    >
                                      {entry.waste > 0.001
                                        ? `+${entry.waste.toFixed(2)}`
                                        : entry.waste < -0.001
                                          ? entry.waste.toFixed(2)
                                          : "—"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirm */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="uppercase tracking-widest font-normal text-sm">
              Delete count record?
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

// ── Main Inventory Page ───────────────────────────────────────────────────────

export default function InventoryPage() {
  const { data: ingredients = [], isLoading: isLoadingIngredients } =
    useGetAllIngredients();
  const { data: recipes = [], isLoading: isLoadingRecipes } =
    useGetAllRecipes();
  const { data: counts = [], isLoading: isLoadingCounts } =
    useGetAllInventoryCounts();

  return (
    <div className="px-6 py-10 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="label-caps mb-1">Operations</p>
          <h1 className="text-3xl font-normal uppercase tracking-widest text-foreground">
            Inventory
          </h1>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground uppercase tracking-widest font-light">
          <span>{ingredients.length} ingredients</span>
          <span className="w-px h-3 bg-border block" />
          <span>{recipes.length} recipes</span>
        </div>
      </div>

      <Tabs defaultValue="recipes" className="w-full">
        <TabsList className="rounded-none bg-transparent border-b border-border w-full justify-start gap-0 h-auto p-0 mb-8">
          <TabsTrigger
            data-ocid="inventory.recipes_tab"
            value="recipes"
            className="rounded-none px-0 mr-8 pb-3 text-xs uppercase tracking-widest font-medium text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:shadow-none bg-transparent data-[state=active]:bg-transparent"
          >
            Recipes
          </TabsTrigger>
          <TabsTrigger
            data-ocid="inventory.countsheet_tab"
            value="countsheet"
            className="rounded-none px-0 mr-8 pb-3 text-xs uppercase tracking-widest font-medium text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:shadow-none bg-transparent data-[state=active]:bg-transparent"
          >
            Count Sheet
          </TabsTrigger>
        </TabsList>

        {/* ── Recipes Tab ── */}
        <TabsContent value="recipes" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <IngredientLibrary
              ingredients={ingredients}
              isLoading={isLoadingIngredients}
            />
            <div className="lg:border-l lg:border-border lg:pl-10">
              <RecipeBuilder
                ingredients={ingredients}
                recipes={recipes}
                isLoadingIngredients={isLoadingIngredients}
                isLoadingRecipes={isLoadingRecipes}
              />
            </div>
          </div>
        </TabsContent>

        {/* ── Count Sheet Tab ── */}
        <TabsContent value="countsheet" className="mt-0">
          <CountSheetTab
            ingredients={ingredients}
            counts={counts}
            isLoadingIngredients={isLoadingIngredients}
            isLoadingCounts={isLoadingCounts}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
