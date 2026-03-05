// Unit families
export type UnitFamily = "weight" | "volume" | "count";

// Base units: grams for weight, ml for volume
// Factors: how many base units is 1 of this unit
export const UNIT_FACTORS: Record<
  string,
  { family: UnitFamily; toBase: number }
> = {
  g: { family: "weight", toBase: 1 },
  kg: { family: "weight", toBase: 1000 },
  oz: { family: "weight", toBase: 28.3495 },
  lb: { family: "weight", toBase: 453.592 },
  ml: { family: "volume", toBase: 1 },
  L: { family: "volume", toBase: 1000 },
  "fl oz": { family: "volume", toBase: 29.5735 },
  qt: { family: "volume", toBase: 946.353 },
  gallon: { family: "volume", toBase: 3785.41 },
  each: { family: "count", toBase: 1 },
  bag: { family: "count", toBase: 1 },
};

/**
 * Convert a value from one unit to another within the same family.
 * If units are incompatible, returns the value unchanged.
 */
export function convertUnit(
  value: number,
  fromUnit: string,
  toUnit: string,
): number {
  if (fromUnit === toUnit) return value;
  const from = UNIT_FACTORS[fromUnit];
  const to = UNIT_FACTORS[toUnit];
  if (!from || !to || from.family !== to.family) return value; // incompatible, return as-is
  return (value * from.toBase) / to.toBase;
}

/**
 * Get all units compatible with the given unit (same family).
 */
export function getCompatibleUnits(unit: string): string[] {
  const entry = UNIT_FACTORS[unit];
  if (!entry) return [unit];
  return Object.entries(UNIT_FACTORS)
    .filter(([, v]) => v.family === entry.family)
    .map(([k]) => k);
}

/**
 * Format a numeric value for display, adapting precision to magnitude.
 */
export function formatValue(value: number): string {
  if (value === 0) return "0";
  if (Math.abs(value) < 0.001) return value.toExponential(2);
  if (Math.abs(value) < 0.1) return value.toFixed(4);
  if (Math.abs(value) < 10) return value.toFixed(3);
  if (Math.abs(value) < 1000) return value.toFixed(2);
  return value.toFixed(1);
}

/**
 * Cycle to the next unit in the compatible unit list.
 */
export function cycleUnit(currentUnit: string, baseUnit: string): string {
  const compatible = getCompatibleUnits(baseUnit);
  if (compatible.length <= 1) return currentUnit;
  const idx = compatible.indexOf(currentUnit);
  const nextIdx = idx === -1 ? 0 : (idx + 1) % compatible.length;
  return compatible[nextIdx];
}
