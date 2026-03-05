# Coffee Shop Reopening Hub

## Current State

Full-stack ops platform with Tasks, Menu, Inventory (recipes + count sheets), Financials (P&L with expenses and revenue), and Team Chat. The Financials page supports Square sales file imports (PDF/CSV) which create up to 3 revenue line items per day: Net Sales, Tax Collected, and Tips. ExpenseCategory currently has: rent, utilities, labor, supplies, marketing, website, equipment, licensing, cleaning, legal, custom.

## Requested Changes (Diff)

### Add
- `#sales_tax` variant to `ExpenseCategory` in the backend
- `#tips` variant to `ExpenseCategory` in the backend
- Auto-creation of a `Sales Tax Payable` expense entry (category: `sales_tax`, paymentStatus: `payable`) whenever a Square import includes a tax amount > 0
- Auto-creation of a `Tips Payable` expense entry (category: `tips`, paymentStatus: `payable`) whenever a Square import includes a tips amount > 0

### Modify
- `ExpenseCategory` enum in `main.mo` to include `#sales_tax` and `#tips`
- `backend.d.ts` (auto-generated) to include `sales_tax` and `tips` in the enum
- `PnL.tsx`: in `handleConfirmImport`, after creating revenue entries for tax and tips, also call `createExpense` for each day's tax and tips amounts with the appropriate new categories and `PaymentStatus.payable`
- `PnL.tsx`: add `sales_tax` and `tips` to `EXPENSE_CATEGORIES` list and `CATEGORY_COLORS` map

### Remove
- Nothing

## Implementation Plan

1. Regenerate backend `main.mo` with `#sales_tax` and `#tips` added to `ExpenseCategory` — all other logic unchanged
2. Update frontend `PnL.tsx`:
   - Add `sales_tax` and `tips` entries to `EXPENSE_CATEGORIES` and `CATEGORY_COLORS`
   - In `SquareImportDialog.handleConfirmImport`, after the tax revenue entry is created for a day, call `createExpense` with `{ category: ExpenseCategory.sales_tax, paymentStatus: PaymentStatus.payable, amount: day.taxes, description: "Sales Tax Payable — Square [date]", date: day.date, ... }`
   - Similarly for tips: `{ category: ExpenseCategory.tips, paymentStatus: PaymentStatus.payable, amount: day.tips, description: "Tips Payable — Square [date]", date: day.date, ... }`
