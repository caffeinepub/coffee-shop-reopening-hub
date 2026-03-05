import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Task {
    id: bigint;
    status: TaskStatus;
    assignee: string;
    title: string;
    dueDate: string;
    category: TaskCategory;
    priority: TaskPriority;
}
export interface RevenueEntry {
    id: bigint;
    source: string;
    date: string;
    createdBy: string;
    notes: string;
    totalRevenue: number;
}
export interface Expense {
    id: bigint;
    attachmentUrl?: string;
    paymentStatus: PaymentStatus;
    date: string;
    createdBy: string;
    description: string;
    notes: string;
    category: ExpenseCategory;
    attachmentName?: string;
    amount: number;
}
export interface RecipeIngredient {
    quantityUsed: number;
    ingredientId: bigint;
}
export interface TeamNote {
    id: bigint;
    title: string;
    body: string;
    timestamp: bigint;
}
export interface MenuItem {
    id: bigint;
    name: string;
    description: string;
    available: boolean;
    category: MenuCategory;
    price: number;
}
export interface InventoryCountEntry {
    actualUsage: number;
    purchasesQty: number;
    closingQty: number;
    openingQty: number;
    expectedUsage: number;
    waste: number;
    ingredientId: bigint;
}
export interface Ingredient {
    id: bigint;
    name: string;
    unit: string;
    parLevel: number;
    category: string;
    unitCost: number;
}
export interface SalesGoal {
    id: bigint;
    period: GoalPeriod;
    name: string;
    currentProgress: bigint;
    targetAmount: bigint;
    notes: string;
}
export interface ChatMessage {
    id: bigint;
    attachmentUrl?: string;
    body: string;
    tags: Array<string>;
    authorName: string;
    timestamp: bigint;
    attachmentName?: string;
}
export interface Recipe {
    id: bigint;
    notes: string;
    menuItemId: bigint;
    ingredients: Array<RecipeIngredient>;
}
export interface InventoryCount {
    id: bigint;
    submittedAt: bigint;
    submittedBy: string;
    entries: Array<InventoryCountEntry>;
    weekOf: string;
}
export interface UserProfile {
    name: string;
}
export enum ExpenseCategory {
    cleaning = "cleaning",
    equipment = "equipment",
    marketing = "marketing",
    supplies = "supplies",
    custom = "custom",
    rent = "rent",
    utilities = "utilities",
    labor = "labor",
    website = "website",
    legal = "legal",
    licensing = "licensing"
}
export enum GoalPeriod {
    monthly = "monthly",
    daily = "daily",
    weekly = "weekly"
}
export enum MenuCategory {
    coldDrinks = "coldDrinks",
    sandwiches = "sandwiches",
    espressoDrinks = "espressoDrinks",
    pastries = "pastries"
}
export enum PaymentStatus {
    paid = "paid",
    payable = "payable"
}
export enum TaskCategory {
    cleaning = "cleaning",
    equipment = "equipment",
    marketing = "marketing",
    staffing = "staffing",
    permits = "permits"
}
export enum TaskPriority {
    low = "low",
    high = "high",
    medium = "medium"
}
export enum TaskStatus {
    done = "done",
    todo = "todo",
    inProgress = "inProgress"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createChatMessage(authorName: string, body: string, attachmentUrl: string | null, attachmentName: string | null): Promise<ChatMessage>;
    createExpense(expense: Expense): Promise<Expense>;
    createIngredient(ingredient: Ingredient): Promise<Ingredient>;
    createInventoryCount(invCount: InventoryCount): Promise<InventoryCount>;
    createMenuItem(item: MenuItem): Promise<MenuItem>;
    createRecipe(recipe: Recipe): Promise<Recipe>;
    createRevenueEntry(entry: RevenueEntry): Promise<RevenueEntry>;
    createSalesGoal(goal: SalesGoal): Promise<SalesGoal>;
    createTask(task: Task): Promise<Task>;
    createTeamNote(note: TeamNote): Promise<TeamNote>;
    deleteChatMessage(id: bigint): Promise<void>;
    deleteExpense(expenseId: bigint): Promise<void>;
    deleteIngredient(ingredientId: bigint): Promise<void>;
    deleteInventoryCount(countId: bigint): Promise<void>;
    deleteMenuItem(itemId: bigint): Promise<void>;
    deleteRecipe(recipeId: bigint): Promise<void>;
    deleteRevenueEntry(entryId: bigint): Promise<void>;
    deleteSalesGoal(goalId: bigint): Promise<void>;
    deleteTask(taskId: bigint): Promise<void>;
    deleteTeamNote(noteId: bigint): Promise<void>;
    getAllChatMessages(): Promise<Array<ChatMessage>>;
    getAllExpenses(): Promise<Array<Expense>>;
    getAllIngredients(): Promise<Array<Ingredient>>;
    getAllInventoryCounts(): Promise<Array<InventoryCount>>;
    getAllMenuItems(): Promise<Array<MenuItem>>;
    getAllRecipes(): Promise<Array<Recipe>>;
    getAllRevenueEntries(): Promise<Array<RevenueEntry>>;
    getAllSalesGoals(): Promise<Array<SalesGoal>>;
    getAllTasks(): Promise<Array<Task>>;
    getAllTeamNotes(): Promise<Array<TeamNote>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getExpense(expenseId: bigint): Promise<Expense>;
    getExpensesByDateRange(startDate: string, endDate: string): Promise<Array<Expense>>;
    getIngredient(ingredientId: bigint): Promise<Ingredient>;
    getInventoryCount(countId: bigint): Promise<InventoryCount>;
    getMenuItem(itemId: bigint): Promise<MenuItem>;
    getRecipe(recipeId: bigint): Promise<Recipe>;
    getRecipeByMenuItem(menuItemId: bigint): Promise<Recipe>;
    getRevenueByDateRange(startDate: string, endDate: string): Promise<Array<RevenueEntry>>;
    getRevenueEntry(entryId: bigint): Promise<RevenueEntry>;
    getSalesGoal(goalId: bigint): Promise<SalesGoal>;
    getTask(taskId: bigint): Promise<Task>;
    getTeamNote(noteId: bigint): Promise<TeamNote>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateExpense(updatedExpense: Expense): Promise<Expense>;
    updateIngredient(updatedIngredient: Ingredient): Promise<Ingredient>;
    updateMenuItem(updatedItem: MenuItem): Promise<MenuItem>;
    updateRecipe(updatedRecipe: Recipe): Promise<Recipe>;
    updateRevenueEntry(updatedEntry: RevenueEntry): Promise<RevenueEntry>;
    updateSalesGoal(updatedGoal: SalesGoal): Promise<SalesGoal>;
    updateTask(updatedTask: Task): Promise<Task>;
    updateTeamNote(updatedNote: TeamNote): Promise<TeamNote>;
}
