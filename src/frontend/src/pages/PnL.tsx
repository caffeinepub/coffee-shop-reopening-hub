import type { Expense, RevenueEntry } from "@/backend.d";
import { ExpenseCategory, PaymentStatus } from "@/backend.d";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  FileText,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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

// ─── Square Import Types & Parsers ────────────────────────────────────────────

interface SalesMixItem {
  item: string;
  quantity: number;
  netSales: number;
}

interface ParsedSalesDay {
  date: string; // YYYY-MM-DD
  grossSales: number;
  discounts: number;
  netSales: number;
  taxes: number;
  tips: number;
  totalCollected: number;
  refunds: number;
  salesMix: SalesMixItem[];
  rawSource: string; // "Square PDF Import" | "Square CSV Import"
}

// Normalise a header/column name for matching
function normHeader(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s*\(usd\)/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .trim();
}

// Try to parse a date string into YYYY-MM-DD
function parseDate(raw: string): string | null {
  if (!raw) return null;
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return raw.trim();
  // MM/DD/YYYY or M/D/YYYY
  const mdy = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // Month D, YYYY  e.g. "March 20, 2026"
  const longDate = raw.trim().match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (longDate) {
    const months: Record<string, string> = {
      january: "01",
      february: "02",
      march: "03",
      april: "04",
      may: "05",
      june: "06",
      july: "07",
      august: "08",
      september: "09",
      october: "10",
      november: "11",
      december: "12",
    };
    const [, mon, d, y] = longDate;
    const mNum = months[mon.toLowerCase()];
    if (mNum) return `${y}-${mNum}-${d.padStart(2, "0")}`;
  }
  // Try native Date
  const d = new Date(raw.trim());
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }
  return null;
}

// Strip currency symbols and parse float
function parseMoney(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = String(raw)
    .replace(/[$,\s]/g, "")
    .replace(/[()]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isNaN(n) ? 0 : n;
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function parseSquareCSV(text: string): ParsedSalesDay[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Find header row (first row with recognizable Square field)
  let headerIdx = -1;
  let headers: string[] = [];

  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const cols = splitCSVLine(lines[i]).map(normHeader);
    if (
      cols.some(
        (c) =>
          c === "date" ||
          c === "gross sales" ||
          c === "net sales" ||
          c === "total collected",
      )
    ) {
      headerIdx = i;
      headers = cols;
      break;
    }
  }

  if (headerIdx === -1) return [];

  const idx = (names: string[]): number => {
    for (const name of names) {
      const i = headers.indexOf(name);
      if (i !== -1) return i;
    }
    return -1;
  };

  const dateCol = idx(["date", "transaction date", "sale date"]);
  const grossCol = idx(["gross sales", "gross revenue"]);
  const discountCol = idx(["discounts", "discount"]);
  const netCol = idx(["net sales", "net revenue"]);
  const taxCol = idx(["tax", "taxes", "total tax"]);
  const tipsCol = idx(["tips", "tip"]);
  const totalCol = idx(["total collected", "total sales", "total"]);
  const refundCol = idx(["refunds", "refund"]);
  const itemCol = idx(["item", "item name", "product", "description"]);
  const qtyCol = idx(["qty", "quantity", "units"]);

  // Detect if this is a summary (one row per day) or item-level export
  const isSummary =
    itemCol === -1 && dateCol !== -1 && (grossCol !== -1 || netCol !== -1);

  if (isSummary) {
    // One row per day
    const rows = lines.slice(headerIdx + 1);
    const byDate: Record<string, ParsedSalesDay> = {};

    for (const row of rows) {
      const cols = splitCSVLine(row);
      if (!cols[dateCol]) continue;
      const date = parseDate(cols[dateCol]);
      if (!date) continue;

      byDate[date] = {
        date,
        grossSales: parseMoney(cols[grossCol]),
        discounts: parseMoney(cols[discountCol]),
        netSales: parseMoney(cols[netCol]),
        taxes: parseMoney(cols[taxCol]),
        tips: parseMoney(cols[tipsCol]),
        totalCollected: parseMoney(cols[totalCol]),
        refunds: parseMoney(cols[refundCol]),
        salesMix: [],
        rawSource: "Square CSV Import",
      };
    }
    return Object.values(byDate);
  }

  // Item-level export — aggregate per day, collect sales mix
  const rows = lines.slice(headerIdx + 1);
  const byDate: Record<string, ParsedSalesDay> = {};

  for (const row of rows) {
    const cols = splitCSVLine(row);
    const dateRaw = dateCol !== -1 ? cols[dateCol] : "";
    const date = parseDate(dateRaw);
    if (!date) continue;

    if (!byDate[date]) {
      byDate[date] = {
        date,
        grossSales: 0,
        discounts: 0,
        netSales: 0,
        taxes: 0,
        tips: 0,
        totalCollected: 0,
        refunds: 0,
        salesMix: [],
        rawSource: "Square CSV Import",
      };
    }

    const entry = byDate[date];
    entry.grossSales += parseMoney(cols[grossCol]);
    entry.discounts += parseMoney(cols[discountCol]);
    entry.netSales += parseMoney(cols[netCol]);
    entry.taxes += parseMoney(cols[taxCol]);
    entry.tips += parseMoney(cols[tipsCol]);
    entry.totalCollected += parseMoney(cols[totalCol]);
    entry.refunds += parseMoney(cols[refundCol]);

    const itemName = itemCol !== -1 ? (cols[itemCol] ?? "").trim() : "";
    const qty = qtyCol !== -1 ? Number.parseFloat(cols[qtyCol] ?? "1") || 1 : 1;
    const itemNet = parseMoney(cols[netCol]);

    if (itemName) {
      const existing = entry.salesMix.find((s) => s.item === itemName);
      if (existing) {
        existing.quantity += qty;
        existing.netSales += itemNet;
      } else {
        entry.salesMix.push({
          item: itemName,
          quantity: qty,
          netSales: itemNet,
        });
      }
    }
  }

  return Object.values(byDate);
}

// Minimal CSV line splitter that handles quoted fields
function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ""));
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ""));
  return result;
}

// ─── PDF Parser (via CDN pdf.js) ──────────────────────────────────────────────

const PDFJS_CDN =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs";
const PDFJS_WORKER_CDN =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

// Dynamically load pdf.js from CDN (only once)
let pdfjsPromise: Promise<unknown> | null = null;

type PdfJsLib = {
  getDocument: (src: { data: ArrayBuffer }) => {
    promise: Promise<PdfJsDoc>;
  };
  GlobalWorkerOptions: { workerSrc: string };
};

type PdfJsDoc = {
  numPages: number;
  getPage: (n: number) => Promise<PdfJsPage>;
};

type PdfJsPage = {
  getTextContent: () => Promise<{ items: { str?: string }[] }>;
};

// Use indirect dynamic import to avoid Vite static analysis of CDN URL
const dynamicImport = (url: string): Promise<unknown> =>
  (Function("url", "return import(url)") as (u: string) => Promise<unknown>)(
    url,
  );

async function loadPdfJs(): Promise<PdfJsLib> {
  if (!pdfjsPromise) {
    pdfjsPromise = dynamicImport(PDFJS_CDN);
  }
  const lib = (await pdfjsPromise) as PdfJsLib;
  lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
  return lib;
}

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjs = await loadPdfJs();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str ?? "").join(" ");
    fullText += `${pageText}\n`;
  }
  return fullText;
}

// Extract structured sales data from unstructured PDF text using multiple strategies
function parseSquarePDFText(text: string): ParsedSalesDay[] {
  // ── Pre-process: split text into lines, also keep the raw text for scanning ──
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Strategy 1: Structured line-by-line parsing (date + label:value blocks)
  const strategy1Results = parseSquarePDFStrategy1(lines);
  if (strategy1Results.length > 0) return strategy1Results;

  // Strategy 2: Scan ALL text for date + money value proximity
  const strategy2Results = parseSquarePDFStrategy2(text, lines);
  if (strategy2Results.length > 0) return strategy2Results;

  // Strategy 3: Look for known Square summary keywords anywhere in the text
  const strategy3Results = parseSquarePDFStrategy3(text, lines);
  if (strategy3Results.length > 0) return strategy3Results;

  // Strategy 4: If any dollar amounts found, use today's date as fallback
  const strategy4Results = parseSquarePDFStrategy4(text);
  return strategy4Results;
}

// Strategy 1: Original structured approach — date sections + label:value lines
function parseSquarePDFStrategy1(lines: string[]): ParsedSalesDay[] {
  const results: ParsedSalesDay[] = [];
  let currentDate: string | null = null;
  const fieldMap: Record<string, string> = {};
  const salesMix: SalesMixItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect a date standalone or prefixed with "Date:"
    const dateMatch = line.match(
      /(?:^|\bDate[:\s]+)(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}|[A-Za-z]+ \d{1,2},?\s*\d{4})/i,
    );
    if (dateMatch) {
      if (currentDate && Object.keys(fieldMap).length > 0) {
        const entry = buildParsedDay(
          currentDate,
          fieldMap,
          salesMix,
          "Square PDF Import",
        );
        if (entry) results.push(entry);
        for (const k of Object.keys(fieldMap)) delete fieldMap[k];
        salesMix.length = 0;
      }
      const parsed = parseDate(dateMatch[1]);
      if (parsed) currentDate = parsed;
      continue;
    }

    // "Label: $value" or "Label  $value"
    const labelValueMatch = line.match(
      /^([A-Za-z\s]+?)[\s:]+\$?([\d,]+\.?\d*)\s*$/,
    );
    if (labelValueMatch) {
      fieldMap[normHeader(labelValueMatch[1])] = labelValueMatch[2].replace(
        /,/g,
        "",
      );
      continue;
    }

    // "Item  qty  $amount" — sales mix
    const itemLineMatch = line.match(/^(.+?)\s{2,}(\d+)\s+\$?([\d,]+\.?\d*)$/);
    if (itemLineMatch && currentDate) {
      salesMix.push({
        item: itemLineMatch[1].trim(),
        quantity: Number.parseInt(itemLineMatch[2], 10),
        netSales: parseMoney(itemLineMatch[3]),
      });
    }
  }

  if (currentDate && Object.keys(fieldMap).length > 0) {
    const entry = buildParsedDay(
      currentDate,
      fieldMap,
      salesMix,
      "Square PDF Import",
    );
    if (entry) results.push(entry);
  }

  return results;
}

// Strategy 2: Find all dates and all money values; associate nearby ones
function parseSquarePDFStrategy2(
  text: string,
  lines: string[],
): ParsedSalesDay[] {
  // Collect all dates found in the text with their line index
  const datesByLine: { lineIdx: number; date: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Try multiple date patterns on this line
    const patterns = [
      /(\d{1,2}\/\d{1,2}\/\d{2,4})/g,
      /(\d{4}-\d{2}-\d{2})/g,
      /([A-Za-z]{3,9}\s+\d{1,2},?\s*\d{4})/g,
    ];
    for (const pat of patterns) {
      let m = pat.exec(line);
      while (m !== null) {
        const parsed = parseDate(m[1]);
        if (parsed) {
          datesByLine.push({ lineIdx: i, date: parsed });
          break;
        }
        m = pat.exec(line);
      }
    }
  }

  if (datesByLine.length === 0) return [];

  // Check if the text contains any money values at all (gate before heavier processing)
  if (!/\$\s*[\d,]+\.?\d{0,2}/.test(text)) return [];

  // For each date found, scan nearby lines (±10) for financial labels
  const results: ParsedSalesDay[] = [];
  const usedDates = new Set<string>();

  for (const { lineIdx, date } of datesByLine) {
    if (usedDates.has(date)) continue;

    const windowStart = Math.max(0, lineIdx - 2);
    const windowEnd = Math.min(lines.length - 1, lineIdx + 15);
    const windowLines = lines.slice(windowStart, windowEnd + 1);
    const windowText = windowLines.join(" ");

    // Scan window for key financial labels + amounts
    const fieldMap: Record<string, string> = {};

    // Pattern: "LabelKeyword ... $amount" or "LabelKeyword amount"
    const labelPatterns: [RegExp, string][] = [
      [/gross\s+sales?\s*:?\s*\$?([\d,]+\.?\d*)/i, "gross sales"],
      [/net\s+sales?\s*:?\s*\$?([\d,]+\.?\d*)/i, "net sales"],
      [/total\s+collected?\s*:?\s*\$?([\d,]+\.?\d*)/i, "total collected"],
      [/total\s+sales?\s*:?\s*\$?([\d,]+\.?\d*)/i, "total sales"],
      [/gross\s+revenue\s*:?\s*\$?([\d,]+\.?\d*)/i, "gross revenue"],
      [/net\s+revenue\s*:?\s*\$?([\d,]+\.?\d*)/i, "net revenue"],
      [/tax(?:es)?\s*:?\s*\$?([\d,]+\.?\d*)/i, "taxes"],
      [/tip(?:s)?\s*:?\s*\$?([\d,]+\.?\d*)/i, "tips"],
      [/discount(?:s)?\s*:?\s*\$?([\d,]+\.?\d*)/i, "discounts"],
      [/refund(?:s)?\s*:?\s*\$?([\d,]+\.?\d*)/i, "refunds"],
    ];

    for (const [pat, key] of labelPatterns) {
      const match = windowText.match(pat);
      if (match) fieldMap[key] = match[1].replace(/,/g, "");
    }

    // If no labeled values found in window, try the next 30 lines for any $ values
    if (Object.keys(fieldMap).length === 0) {
      const broadWindow = lines
        .slice(lineIdx, Math.min(lines.length, lineIdx + 30))
        .join(" ");
      const broadMoney = /\$\s*([\d,]+\.?\d{0,2})/g;
      const found: number[] = [];
      let bm = broadMoney.exec(broadWindow);
      while (bm !== null) {
        const v = parseMoney(bm[1]);
        if (v > 0) found.push(v);
        bm = broadMoney.exec(broadWindow);
      }
      if (found.length > 0) {
        // Assume the largest value is the total
        const largest = Math.max(...found);
        fieldMap["total collected"] = String(largest);
      }
    }

    const entry = buildParsedDay(date, fieldMap, [], "Square PDF Import");
    if (entry) {
      results.push(entry);
      usedDates.add(date);
    }
  }

  return results;
}

// Strategy 3: Scan for Square-specific keywords like "Total Sales", "Net Sales" etc.
// Handles concatenated text where words are jammed together
function parseSquarePDFStrategy3(
  text: string,
  lines: string[],
): ParsedSalesDay[] {
  // Expand camelCase/PascalCase and common jammed patterns
  const expanded = text
    .replace(/([a-z])([A-Z])/g, "$1 $2") // camelCase -> camel Case
    .replace(/([A-Z]{2,})([A-Z][a-z])/g, "$1 $2") // XMLParser -> XML Parser
    .replace(/(\d)([A-Za-z])/g, "$1 $2") // 123abc -> 123 abc
    .replace(/([A-Za-z])(\d)/g, "$1 $2"); // abc123 -> abc 123

  const fieldMap: Record<string, string> = {};

  // Comprehensive keyword patterns for Square's various report formats
  const keywordPatterns: [RegExp, string][] = [
    [/gross\s+sales?\s*[:\-]?\s*\$?\s*([\d,]+\.?\d{0,2})/i, "gross sales"],
    [/net\s+sales?\s*[:\-]?\s*\$?\s*([\d,]+\.?\d{0,2})/i, "net sales"],
    [
      /total\s+collected?\s*[:\-]?\s*\$?\s*([\d,]+\.?\d{0,2})/i,
      "total collected",
    ],
    [/total\s+sales?\s*[:\-]?\s*\$?\s*([\d,]+\.?\d{0,2})/i, "total sales"],
    [/total\s+revenue\s*[:\-]?\s*\$?\s*([\d,]+\.?\d{0,2})/i, "total collected"],
    [/gross\s+revenue\s*[:\-]?\s*\$?\s*([\d,]+\.?\d{0,2})/i, "gross sales"],
    [/net\s+revenue\s*[:\-]?\s*\$?\s*([\d,]+\.?\d{0,2})/i, "net sales"],
    [/sales\s+total\s*[:\-]?\s*\$?\s*([\d,]+\.?\d{0,2})/i, "total collected"],
    [
      /amount\s+collected?\s*[:\-]?\s*\$?\s*([\d,]+\.?\d{0,2})/i,
      "total collected",
    ],
    [/total\s+amount\s*[:\-]?\s*\$?\s*([\d,]+\.?\d{0,2})/i, "total collected"],
    [/taxes?\s+collected?\s*[:\-]?\s*\$?\s*([\d,]+\.?\d{0,2})/i, "taxes"],
    [/sales?\s+tax\s*[:\-]?\s*\$?\s*([\d,]+\.?\d{0,2})/i, "taxes"],
    [/tip(?:s)?\s*[:\-]?\s*\$?\s*([\d,]+\.?\d{0,2})/i, "tips"],
    [/discount(?:s)?\s*[:\-]?\s*\$?\s*([\d,]+\.?\d{0,2})/i, "discounts"],
    [/refund(?:s)?\s*[:\-]?\s*\$?\s*([\d,]+\.?\d{0,2})/i, "refunds"],
  ];

  for (const [pat, key] of keywordPatterns) {
    const match = expanded.match(pat);
    if (match && !fieldMap[key]) {
      fieldMap[key] = match[1].replace(/,/g, "");
    }
  }

  if (Object.keys(fieldMap).length === 0) return [];

  // Try to extract a date from the text
  let date: string | null = null;
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
    /(\d{4}-\d{2}-\d{2})/,
    /([A-Za-z]{3,9}\s+\d{1,2},?\s*\d{4})/,
    /(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/,
  ];
  for (const pat of datePatterns) {
    const m = text.match(pat);
    if (m) {
      date = parseDate(m[1]);
      if (date) break;
    }
  }

  // Also try lines
  if (!date) {
    for (const line of lines) {
      for (const pat of datePatterns) {
        const m = line.match(pat);
        if (m) {
          date = parseDate(m[1]);
          if (date) break;
        }
      }
      if (date) break;
    }
  }

  if (!date) date = new Date().toISOString().split("T")[0];

  const entry = buildParsedDay(date, fieldMap, [], "Square PDF Import");
  return entry ? [entry] : [];
}

// Strategy 4: Pure fallback — if ANY dollar amounts found, group them under today
function parseSquarePDFStrategy4(text: string): ParsedSalesDay[] {
  const moneyPattern = /\$\s*([\d,]+\.?\d{0,2})/g;
  const amounts: number[] = [];
  let m = moneyPattern.exec(text);
  while (m !== null) {
    const v = parseMoney(m[1]);
    if (v > 0) amounts.push(v);
    m = moneyPattern.exec(text);
  }

  if (amounts.length === 0) return [];

  // Use max value as total collected (most likely the "bottom line" in a receipt/report)
  const total = Math.max(...amounts);
  const date = new Date().toISOString().split("T")[0];

  return [
    {
      date,
      grossSales: total,
      discounts: 0,
      netSales: total,
      taxes: 0,
      tips: 0,
      totalCollected: total,
      refunds: 0,
      salesMix: [],
      rawSource: "Square PDF Import (estimated)",
    },
  ];
}

function buildParsedDay(
  date: string,
  fieldMap: Record<string, string>,
  salesMix: SalesMixItem[],
  rawSource: string,
): ParsedSalesDay | null {
  const get = (...keys: string[]): number => {
    for (const k of keys) {
      if (fieldMap[k] !== undefined) return parseMoney(fieldMap[k]);
    }
    return 0;
  };

  const gross = get("gross sales", "gross revenue", "gross");
  const net = get("net sales", "net revenue", "net");
  const total = get("total collected", "total sales", "total", "amount");
  const taxes = get("tax", "taxes", "total tax");
  const tips = get("tips", "tip");
  const discounts = get("discounts", "discount");
  const refunds = get("refunds", "refund");

  // Only return if we found at least one monetary value
  if (gross === 0 && net === 0 && total === 0) return null;

  return {
    date,
    grossSales: gross,
    discounts,
    netSales: net,
    taxes,
    tips,
    totalCollected: total,
    refunds,
    salesMix: [...salesMix],
    rawSource,
  };
}

// ─── Square Import Dialog ─────────────────────────────────────────────────────

type ImportDialogState =
  | { step: "idle" }
  | { step: "parsing" }
  | { step: "preview"; days: ParsedSalesDay[] }
  | { step: "importing"; days: ParsedSalesDay[]; progress: number }
  | { step: "done"; count: number }
  | { step: "error"; message: string };

interface SquareImportDialogProps {
  open: boolean;
  onClose: () => void;
  onManualEntry?: () => void;
}

function SquareImportDialog({
  open,
  onClose,
  onManualEntry,
}: SquareImportDialogProps) {
  const userName = localStorage.getItem(STORAGE_KEY) ?? "Team";
  const createRevenue = useCreateRevenueEntry();
  const [state, setState] = useState<ImportDialogState>({ step: "idle" });
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setState({ step: "idle" });
      setIsDragOver(false);
    }
  }, [open]);

  const processFile = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv" && ext !== "pdf") {
      setState({
        step: "error",
        message: "Only .csv and .pdf files are supported.",
      });
      return;
    }

    setState({ step: "parsing" });

    try {
      let days: ParsedSalesDay[] = [];

      if (ext === "csv") {
        const text = await file.text();
        days = parseSquareCSV(text);
      } else {
        // PDF
        const text = await extractPdfText(file);
        days = parseSquarePDFText(text);
      }

      if (days.length === 0) {
        setState({
          step: "error",
          message:
            "We couldn't automatically read this PDF. Square PDFs can vary in format. You can add this entry manually using the Add Revenue button, or try exporting as a CSV from Square Dashboard for automatic import.",
        });
        return;
      }

      setState({ step: "preview", days });
    } catch (err) {
      console.error("Square import parse error:", err);
      setState({
        step: "error",
        message:
          "We couldn't automatically read this PDF. Square PDFs can vary in format. You can add this entry manually using the Add Revenue button, or try exporting as a CSV from Square Dashboard for automatic import.",
      });
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleConfirmImport = async () => {
    if (state.step !== "preview") return;
    const { days } = state;
    setState({ step: "importing", days, progress: 0 });

    let imported = 0;
    for (const day of days) {
      const revenue =
        day.totalCollected > 0 ? day.totalCollected : day.netSales;
      const notesParts: string[] = [];
      if (day.salesMix.length > 0) {
        notesParts.push(
          day.salesMix.map((s) => `${s.item} x${s.quantity}`).join(", "),
        );
      }
      if (day.discounts > 0)
        notesParts.push(`Discounts: ${formatCurrency(day.discounts)}`);
      if (day.refunds > 0)
        notesParts.push(`Refunds: ${formatCurrency(day.refunds)}`);
      if (day.tips > 0) notesParts.push(`Tips: ${formatCurrency(day.tips)}`);

      try {
        await createRevenue.mutateAsync({
          id: BigInt(0),
          date: day.date,
          totalRevenue: revenue,
          source: "Square Import",
          notes: notesParts.join(" | "),
          createdBy: userName,
        });
        imported++;
        setState({
          step: "importing",
          days,
          progress: Math.round((imported / days.length) * 100),
        });
      } catch {
        // Continue on individual failure
      }
    }

    setState({ step: "done", count: imported });
    toast.success(
      `${imported} revenue ${imported === 1 ? "entry" : "entries"} added from Square export`,
    );
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent data-ocid="pnl.import_dialog" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-widest text-sm font-medium flex items-center gap-2">
            <Upload className="w-4 h-4 text-muted-foreground" />
            Import Square Sales File
          </DialogTitle>
        </DialogHeader>

        {/* ── IDLE: drop zone ── */}
        {state.step === "idle" && (
          <div className="space-y-4 py-2">
            <button
              type="button"
              data-ocid="pnl.sales_dropzone"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  fileInputRef.current?.click();
              }}
              className={`relative w-full border-2 border-dashed cursor-pointer transition-all duration-150 px-8 py-12 flex flex-col items-center gap-3 text-center select-none ${
                isDragOver
                  ? "border-foreground/60 bg-accent/40"
                  : "border-border hover:border-foreground/30 hover:bg-accent/20"
              }`}
            >
              <FileText
                className={`w-8 h-8 transition-colors duration-150 ${
                  isDragOver ? "text-foreground" : "text-muted-foreground/60"
                }`}
              />
              <div>
                <p className="text-sm font-light text-foreground">
                  Drop your Square export here
                </p>
                <p className="text-xs text-muted-foreground font-light mt-1">
                  or click to browse &mdash; CSV or PDF
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-light">
                Daily EOD exports, Summary, or Item Sales reports
              </p>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.pdf"
              onChange={handleFileChange}
              className="sr-only"
              aria-label="Upload Square sales file"
            />
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                data-ocid="pnl.import_cancel_button"
                onClick={handleClose}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* ── PARSING ── */}
        {state.step === "parsing" && (
          <div className="py-14 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p className="text-xs uppercase tracking-widest font-light">
              Reading file…
            </p>
          </div>
        )}

        {/* ── PREVIEW ── */}
        {state.step === "preview" && (
          <div className="space-y-4 py-1">
            <p className="text-xs text-muted-foreground font-light">
              Found{" "}
              <span className="text-foreground font-medium">
                {state.days.length}
              </span>{" "}
              day{state.days.length !== 1 ? "s" : ""} of sales data. Review and
              confirm to add to Financials.
            </p>

            <ScrollArea className="h-72 border border-border">
              <Accordion type="multiple" className="divide-y divide-border">
                {state.days.map((day, idx) => (
                  <AccordionItem
                    key={day.date}
                    value={day.date}
                    data-ocid={`pnl.import_preview.item.${idx + 1}`}
                    className="border-0"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:bg-accent/20 hover:no-underline text-left [&>svg]:hidden">
                      <div className="flex items-center justify-between w-full gap-4 pr-2">
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-muted-foreground font-light w-24 shrink-0">
                            {formatDate(day.date)}
                          </span>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70 font-light flex-wrap">
                            {day.grossSales > 0 && (
                              <span>
                                Gross {formatCurrency(day.grossSales)}
                              </span>
                            )}
                            {day.discounts > 0 && (
                              <span className="text-amber-600">
                                Disc −{formatCurrency(day.discounts)}
                              </span>
                            )}
                            {day.taxes > 0 && (
                              <span>Tax {formatCurrency(day.taxes)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-medium text-emerald-700">
                            +
                            {formatCurrency(
                              day.totalCollected > 0
                                ? day.totalCollected
                                : day.netSales,
                            )}
                          </span>
                          {day.salesMix.length > 0 && (
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground transition-transform duration-150 [[data-state=open]>&]:rotate-180" />
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    {day.salesMix.length > 0 && (
                      <AccordionContent className="pb-0">
                        <div className="px-4 pb-3 space-y-1">
                          {day.salesMix.map((mix) => (
                            <div
                              key={mix.item}
                              className="flex justify-between text-[11px] text-muted-foreground font-light pl-24"
                            >
                              <span>
                                {mix.item}{" "}
                                <span className="text-muted-foreground/60">
                                  ×{mix.quantity}
                                </span>
                              </span>
                              <span>{formatCurrency(mix.netSales)}</span>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    )}
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollArea>

            <DialogFooter className="gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                data-ocid="pnl.import_cancel_button"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                data-ocid="pnl.import_confirm_button"
                onClick={handleConfirmImport}
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Add {state.days.length}{" "}
                {state.days.length === 1 ? "Entry" : "Entries"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ── IMPORTING ── */}
        {state.step === "importing" && (
          <div className="py-14 flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
            <div className="text-center space-y-1.5">
              <p className="text-xs uppercase tracking-widest font-light">
                Saving entries…
              </p>
              <p className="text-[10px] text-muted-foreground/60">
                {state.progress}% complete
              </p>
            </div>
            <div className="w-48 h-px bg-border overflow-hidden relative">
              <div
                className="absolute inset-y-0 left-0 bg-foreground/40 transition-all duration-300"
                style={{ width: `${state.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {state.step === "done" && (
          <div className="py-14 flex flex-col items-center gap-3 text-muted-foreground">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <p className="text-xs uppercase tracking-widest font-light">
              {state.count} {state.count === 1 ? "entry" : "entries"} added
            </p>
            <Button size="sm" onClick={handleClose} className="mt-2">
              Close
            </Button>
          </div>
        )}

        {/* ── ERROR ── */}
        {state.step === "error" && (
          <div
            data-ocid="pnl.import_error_state"
            className="py-8 flex flex-col items-center gap-4 text-muted-foreground"
          >
            <AlertCircle className="w-6 h-6 text-destructive" />
            <div className="text-center space-y-1 max-w-sm">
              <p className="text-sm font-light text-foreground">
                {state.message}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-2 items-center">
              <Button
                variant="outline"
                size="sm"
                data-ocid="pnl.import_cancel_button"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                data-ocid="pnl.import_try_file_button"
                onClick={() => {
                  setState({ step: "idle" });
                  // Slight delay so the file input re-renders cleanly
                  setTimeout(() => fileInputRef.current?.click(), 100);
                }}
              >
                Try Different File
              </Button>
              {onManualEntry && (
                <Button
                  size="sm"
                  data-ocid="pnl.import_manual_entry_button"
                  onClick={() => {
                    handleClose();
                    onManualEntry();
                  }}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add Revenue Manually
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

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

  const [form, setForm] = useState<ExpenseFormState>(emptyExpenseForm);

  // Sync form whenever the dialog opens or the expense being edited changes
  useEffect(() => {
    if (!open) return;
    if (editingExpense) {
      setForm({
        description: editingExpense.description,
        amount: String(editingExpense.amount),
        category: editingExpense.category,
        date: editingExpense.date,
        notes: editingExpense.notes,
        paymentStatus: editingExpense.paymentStatus,
        attachmentUrl: editingExpense.attachmentUrl ?? "",
        attachmentName: editingExpense.attachmentName ?? "",
      });
    } else {
      setForm(
        prefill ? { ...emptyExpenseForm(), ...prefill } : emptyExpenseForm(),
      );
    }
  }, [open, editingExpense, prefill]);

  // Reset form when dialog closes
  const handleOpenChange = (o: boolean) => {
    if (!o) {
      onClose();
      setForm(emptyExpenseForm());
    }
  };

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

  const [form, setForm] = useState<RevenueFormState>(emptyRevenueForm);

  // Sync form whenever the dialog opens or the entry being edited changes
  useEffect(() => {
    if (!open) return;
    if (editingEntry) {
      setForm({
        source: editingEntry.source,
        date: editingEntry.date,
        totalRevenue: String(editingEntry.totalRevenue),
        notes: editingEntry.notes,
      });
    } else {
      setForm(emptyRevenueForm());
    }
  }, [open, editingEntry]);

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
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingRevenue, setEditingRevenue] = useState<RevenueEntry | null>(
    null,
  );
  const [togglingId, setTogglingId] = useState<bigint | null>(null);
  const [dropzoneOver, setDropzoneOver] = useState(false);
  const inlineFileRef = useRef<HTMLInputElement>(null);

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
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="heading-editorial text-sm">Revenue</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  data-ocid="pnl.upload_sales_button"
                  onClick={() => setImportDialogOpen(true)}
                  className="gap-1.5 text-xs uppercase tracking-widest font-medium"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload Sales File
                </Button>
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
            </div>

            {/* Inline drag-and-drop dropzone */}
            <button
              type="button"
              data-ocid="pnl.sales_dropzone"
              onDragOver={(e) => {
                e.preventDefault();
                setDropzoneOver(true);
              }}
              onDragLeave={() => setDropzoneOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDropzoneOver(false);
                setImportDialogOpen(true);
              }}
              onClick={() => setImportDialogOpen(true)}
              className={`w-full flex items-center gap-3 border border-dashed cursor-pointer px-4 py-3 transition-all duration-150 text-left ${
                dropzoneOver
                  ? "border-foreground/50 bg-accent/40"
                  : "border-border/60 hover:border-foreground/30 hover:bg-accent/10"
              }`}
            >
              <Upload
                className={`h-3.5 w-3.5 shrink-0 transition-colors duration-150 ${dropzoneOver ? "text-foreground" : "text-muted-foreground"}`}
              />
              <p className="text-xs text-muted-foreground font-light leading-relaxed">
                Drop a Square EOD export here, or click "Upload Sales File" to
                import CSV or PDF &mdash; revenue entries are added
                automatically.
              </p>
            </button>
            <input
              ref={inlineFileRef}
              type="file"
              accept=".csv,.pdf"
              className="sr-only"
              aria-label="Upload Square sales file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setImportDialogOpen(true);
                }
                e.target.value = "";
              }}
            />

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

      <SquareImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onManualEntry={() => {
          setImportDialogOpen(false);
          setEditingRevenue(null);
          setRevenueDialogOpen(true);
        }}
      />
    </div>
  );
}
