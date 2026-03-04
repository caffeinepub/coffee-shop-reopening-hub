# Coffee Shop Reopening Hub

## Current State
- Team Chat: messages saved with body, author, timestamp, file attachment, and extracted hashtags
- P&L: Expenses stored with category (enum), amount, date, description, notes, createdBy
- No connection between chat and P&L -- posting in chat never creates expense entries
- ExpenseCategory has: rent, utilities, labor, supplies, marketing, equipment, licensing, cleaning, legal, custom
- No paid/payable status on expenses
- No website subcategory under marketing

## Requested Changes (Diff)

### Add
- `paymentStatus` field on `Expense`: `#paid` or `#payable`
- `website` subcategory under marketing (as a new `ExpenseCategory` variant)
- Smart parsing logic in frontend: after a chat message is sent, scan the message body for dollar amounts and contextual keywords to infer category and suggest an expense entry
- Confirmation dialog in Chat: if parsing detects a potential expense, show a pre-filled "Add to P&L?" dialog the user can confirm or dismiss
- Attached file (invoice) linked to the expense entry via `attachmentUrl` and `attachmentName` fields on Expense
- PAID / PAYABLE toggle filter on P&L page, searchable/filterable
- Visual badge on each expense row showing PAID or PAYABLE status
- Category keyword mapping for smart parsing: e.g. "square", "subscription", "domain", "website", "online store" → `#website` (marketing subcategory)

### Modify
- `Expense` type in backend: add `paymentStatus` variant field and `attachmentUrl`/`attachmentName` optional fields
- `ExpenseCategory` enum: add `#website` variant
- P&L page: add PAID/PAYABLE toggle filter; show badge on each row; default new expenses to `#payable`
- Expense creation dialog: add payment status selector (PAID / PAYABLE), default to PAYABLE
- Chat send handler: after message posts, run smart parser and conditionally show confirmation dialog

### Remove
- Nothing removed

## Implementation Plan
1. Update `Expense` type in `main.mo`: add `paymentStatus : { #paid; #payable }`, `attachmentUrl : ?Text`, `attachmentName : ?Text`
2. Add `#website` to `ExpenseCategory` enum in `main.mo`
3. Update frontend `PnL.tsx`: add `paymentStatus` to form, add PAID/PAYABLE filter toggle, show badge per row
4. Update frontend `Chat.tsx`: after send, run `parseExpenseFromMessage()` util; if result found, show confirmation dialog pre-filled with parsed amount, category (website/marketing/etc.), description, date, paymentStatus (default payable), and attachment from the message
5. Add `parseExpenseFromMessage` utility: regex for dollar amounts, keyword-to-category map
6. Wire attachment URL/name from chat message into expense confirmation dialog so invoice is saved with the expense
