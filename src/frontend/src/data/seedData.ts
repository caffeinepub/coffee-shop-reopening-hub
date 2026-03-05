import {
  ExpenseCategory,
  GoalPeriod,
  MenuCategory,
  PaymentStatus,
  TaskCategory,
  TaskPriority,
  TaskStatus,
} from "../backend.d";
import type {
  Expense,
  MenuItem,
  SalesGoal,
  Task,
  TeamNote,
} from "../backend.d";

export const SEED_TASKS: Omit<Task, "id">[] = [
  // Juan
  {
    title: "Inventory check",
    category: TaskCategory.equipment,
    assignee: "Juan",
    dueDate: "2026-03-20",
    status: TaskStatus.todo,
    priority: TaskPriority.high,
  },
  {
    title:
      "Equipment check (fridges, dishwasher, espresso machine, drip machine, ice machine, cold brew tank)",
    category: TaskCategory.equipment,
    assignee: "Juan",
    dueDate: "2026-03-20",
    status: TaskStatus.todo,
    priority: TaskPriority.high,
  },
  {
    title:
      "Organize space cleaning — coordinate with team or schedule group clean",
    category: TaskCategory.cleaning,
    assignee: "Juan",
    dueDate: "2026-03-20",
    status: TaskStatus.todo,
    priority: TaskPriority.high,
  },
  {
    title: "Reinstall all previous and necessary equipment",
    category: TaskCategory.equipment,
    assignee: "Juan",
    dueDate: "2026-03-20",
    status: TaskStatus.todo,
    priority: TaskPriority.high,
  },
  {
    title: "Sanitize kegs",
    category: TaskCategory.cleaning,
    assignee: "Juan",
    dueDate: "2026-03-20",
    status: TaskStatus.todo,
    priority: TaskPriority.medium,
  },
  {
    title:
      "Supplies list and order (coffee cups, napkins, toilet paper, paper towels, stirrer sticks)",
    category: TaskCategory.equipment,
    assignee: "Juan",
    dueDate: "2026-03-19",
    status: TaskStatus.todo,
    priority: TaskPriority.high,
  },
  {
    title: "Ingredients list and order",
    category: TaskCategory.equipment,
    assignee: "Juan",
    dueDate: "2026-03-19",
    status: TaskStatus.todo,
    priority: TaskPriority.high,
  },
  {
    title: "Test cold brew with Xtreme Ruby",
    category: TaskCategory.equipment,
    assignee: "Juan",
    dueDate: "2026-03-20",
    status: TaskStatus.todo,
    priority: TaskPriority.medium,
  },
  {
    title: "Order coffee",
    category: TaskCategory.equipment,
    assignee: "Juan",
    dueDate: "2026-03-18",
    status: TaskStatus.todo,
    priority: TaskPriority.high,
  },
  {
    title: "Make chai",
    category: TaskCategory.equipment,
    assignee: "Juan",
    dueDate: "2026-03-20",
    status: TaskStatus.todo,
    priority: TaskPriority.medium,
  },
  {
    title: "Make sweetheart mix",
    category: TaskCategory.equipment,
    assignee: "Juan",
    dueDate: "2026-03-20",
    status: TaskStatus.todo,
    priority: TaskPriority.medium,
  },
  {
    title: "Set up POS",
    category: TaskCategory.equipment,
    assignee: "Juan",
    dueDate: "2026-03-20",
    status: TaskStatus.todo,
    priority: TaskPriority.high,
  },

  // Camila
  {
    title: "Label design",
    category: TaskCategory.marketing,
    assignee: "Camila",
    dueDate: "2026-03-18",
    status: TaskStatus.todo,
    priority: TaskPriority.high,
  },
  {
    title: "T-shirt design",
    category: TaskCategory.marketing,
    assignee: "Camila",
    dueDate: "2026-03-18",
    status: TaskStatus.todo,
    priority: TaskPriority.medium,
  },
  {
    title:
      "Design and order t-shirts (ask at marketing call for custom printing)",
    category: TaskCategory.marketing,
    assignee: "Camila",
    dueDate: "2026-03-18",
    status: TaskStatus.todo,
    priority: TaskPriority.medium,
  },
  {
    title: "Marketing and promotions",
    category: TaskCategory.marketing,
    assignee: "Camila",
    dueDate: "2026-03-20",
    status: TaskStatus.todo,
    priority: TaskPriority.high,
  },
  {
    title: "Get Chris (tech) to come set up machine",
    category: TaskCategory.equipment,
    assignee: "Camila",
    dueDate: "2026-03-20",
    status: TaskStatus.todo,
    priority: TaskPriority.high,
  },
  {
    title: "Club Space marketing meeting — March 5 at 2pm, Chris attending",
    category: TaskCategory.marketing,
    assignee: "Camila",
    dueDate: "2026-03-05",
    status: TaskStatus.todo,
    priority: TaskPriority.high,
  },
  {
    title: "Launch website pre-orders on alldaymia.com",
    category: TaskCategory.marketing,
    assignee: "Camila",
    dueDate: "2026-03-07",
    status: TaskStatus.todo,
    priority: TaskPriority.high,
  },

  // Chris
  {
    title: "Clean main space and bathrooms",
    category: TaskCategory.cleaning,
    assignee: "Chris",
    dueDate: "2026-03-20",
    status: TaskStatus.todo,
    priority: TaskPriority.high,
  },
  {
    title: "Set up and configure espresso machine",
    category: TaskCategory.equipment,
    assignee: "Chris",
    dueDate: "2026-03-20",
    status: TaskStatus.todo,
    priority: TaskPriority.high,
  },

  // Valeria — legal / admin
  {
    title: "Open new bank account",
    category: TaskCategory.permits,
    assignee: "Valeria",
    dueDate: "2026-03-18",
    status: TaskStatus.todo,
    priority: TaskPriority.high,
  },
  {
    title: "Form new LLC",
    category: TaskCategory.permits,
    assignee: "Valeria",
    dueDate: "2026-03-18",
    status: TaskStatus.todo,
    priority: TaskPriority.high,
  },
  {
    title: "Check any licensing requirements",
    category: TaskCategory.permits,
    assignee: "Valeria",
    dueDate: "2026-03-18",
    status: TaskStatus.todo,
    priority: TaskPriority.high,
  },
  {
    title: "Organize prices and costs for menu items",
    category: TaskCategory.permits,
    assignee: "Valeria",
    dueDate: "2026-03-19",
    status: TaskStatus.todo,
    priority: TaskPriority.medium,
  },
  {
    title: "ASAP: website pre-order activation",
    category: TaskCategory.marketing,
    assignee: "Valeria",
    dueDate: "2026-03-15",
    status: TaskStatus.todo,
    priority: TaskPriority.high,
  },
  {
    title: "Pop-up day ops — March 20",
    category: TaskCategory.staffing,
    assignee: "Valeria",
    dueDate: "2026-03-20",
    status: TaskStatus.todo,
    priority: TaskPriority.high,
  },
  {
    title: "Pop-up day ops — March 21",
    category: TaskCategory.staffing,
    assignee: "Valeria",
    dueDate: "2026-03-21",
    status: TaskStatus.todo,
    priority: TaskPriority.high,
  },
];

// subcategory tag is encoded in the description with a leading "[tag] " prefix
// so the Menu page can parse and display it as a sub-header
export const SEED_MENU_ITEMS: Omit<MenuItem, "id">[] = [
  // ── ESPRESSO-BASED ──────────────────────────────────────────────────────────
  {
    name: "Espresso",
    description: "2oz · hot or iced",
    category: MenuCategory.espressoDrinks,
    price: 0,
    available: true,
  },
  {
    name: "Espresso & Milk — 1oz milk",
    description:
      "2oz espresso + 1oz milk · whole or oat · hot or iced · +vanilla syrup available",
    category: MenuCategory.espressoDrinks,
    price: 0,
    available: true,
  },
  {
    name: "Espresso & Milk — 2oz milk",
    description:
      "2oz espresso + 2oz milk · whole or oat · hot or iced · +vanilla syrup available",
    category: MenuCategory.espressoDrinks,
    price: 0,
    available: true,
  },
  {
    name: "Espresso & Milk — 4oz milk",
    description:
      "2oz espresso + 4oz milk · whole or oat · hot or iced · +vanilla syrup available",
    category: MenuCategory.espressoDrinks,
    price: 0,
    available: true,
  },
  {
    name: "Espresso & Milk — 6oz milk",
    description:
      "2oz espresso + 6oz milk · whole or oat · hot or iced · +vanilla syrup available",
    category: MenuCategory.espressoDrinks,
    price: 0,
    available: true,
  },
  {
    name: "Espresso & Milk — 10oz milk",
    description:
      "2oz espresso + 10oz milk · whole or oat · hot or iced · +vanilla syrup available",
    category: MenuCategory.espressoDrinks,
    price: 0,
    available: true,
  },
  {
    name: "Espresso & Milk — 14oz milk",
    description:
      "2oz espresso + 14oz milk · whole or oat · hot or iced · +vanilla syrup available",
    category: MenuCategory.espressoDrinks,
    price: 0,
    available: true,
  },

  // ── BREWED COFFEE ────────────────────────────────────────────────────────────
  {
    name: "Hot Drip Coffee",
    description: "House drip · hot",
    category: MenuCategory.coldDrinks,
    price: 0,
    available: true,
  },
  {
    name: "Space Brew",
    description:
      "Branded cold brew collab with Club Space · 16oz · black or with milk",
    category: MenuCategory.coldDrinks,
    price: 0,
    available: true,
  },
  {
    name: "Sweetheart",
    description: "Rosemary cold brew limeade · 16oz · iced",
    category: MenuCategory.coldDrinks,
    price: 0,
    available: true,
  },

  // ── TEA ─────────────────────────────────────────────────────────────────────
  {
    name: "Homemade Chai",
    description: "[tea] Hot or iced · as a tea or latte · whole or oat milk",
    category: MenuCategory.coldDrinks,
    price: 0,
    available: true,
  },

  // ── RETAIL — COFFEE ──────────────────────────────────────────────────────────
  {
    name: "Cold Brew — Quart",
    description: "[retail-coffee] 1 quart house cold brew",
    category: MenuCategory.sandwiches,
    price: 0,
    available: true,
  },
  {
    name: "Chai — Quart",
    description: "[retail-coffee] 1 quart homemade chai",
    category: MenuCategory.sandwiches,
    price: 0,
    available: true,
  },
  {
    name: "Whole Bean Coffee — 12oz",
    description: "[retail-coffee] 12oz bag whole bean",
    category: MenuCategory.sandwiches,
    price: 0,
    available: true,
  },

  // ── RETAIL — APPAREL ─────────────────────────────────────────────────────────
  {
    name: "T-Shirt",
    description: "[retail-apparel] All Day branded tee",
    category: MenuCategory.sandwiches,
    price: 0,
    available: true,
  },

  // ── FOOD — TBD ───────────────────────────────────────────────────────────────
  {
    name: "Baked Goods",
    description: "Partnering with local baker — menu coming soon",
    category: MenuCategory.pastries,
    price: 0,
    available: false,
  },
];

export const SEED_SALES_GOALS: Omit<SalesGoal, "id">[] = [
  {
    name: "Opening Week Revenue",
    targetAmount: BigInt(5000),
    currentProgress: BigInt(0),
    period: GoalPeriod.weekly,
    notes:
      "Goal for our first full week back open. Based on last year's numbers + 15% growth target.",
  },
  {
    name: "Daily Coffee Cups Sold",
    targetAmount: BigInt(80),
    currentProgress: BigInt(0),
    period: GoalPeriod.daily,
    notes:
      "Tracking both espresso drinks and cold brew. Baristas to tally on shift sheet.",
  },
  {
    name: "March Total Revenue",
    targetAmount: BigInt(18000),
    currentProgress: BigInt(0),
    period: GoalPeriod.monthly,
    notes: "Includes all categories: drinks, food, and merchandise.",
  },
];

export const SEED_TEAM_NOTES: Omit<TeamNote, "id">[] = [];

export const SEED_EXPENSES: Omit<Expense, "id">[] = [
  {
    description:
      "Square Online Store subscription — alldayaway.com custom domain for AD online store",
    amount: 28.9,
    category: ExpenseCategory.website,
    date: "2026-03-04",
    notes: "Charged to CC ending in 3920. Recurring monthly.",
    createdBy: "Camila",
    paymentStatus: PaymentStatus.paid,
  },
];
