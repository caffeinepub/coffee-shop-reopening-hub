import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface MenuItem {
    id: bigint;
    name: string;
    description: string;
    available: boolean;
    category: MenuCategory;
    price: number;
}
export interface SalesGoal {
    id: bigint;
    period: GoalPeriod;
    name: string;
    currentProgress: bigint;
    targetAmount: bigint;
    notes: string;
}
export interface Task {
    id: bigint;
    status: TaskStatus;
    assignee: string;
    title: string;
    dueDate: string;
    category: TaskCategory;
    priority: TaskPriority;
}
export interface UserProfile {
    name: string;
}
export interface TeamNote {
    id: bigint;
    title: string;
    body: string;
    timestamp: bigint;
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
    createMenuItem(item: MenuItem): Promise<MenuItem>;
    createSalesGoal(goal: SalesGoal): Promise<SalesGoal>;
    createTask(task: Task): Promise<Task>;
    createTeamNote(note: TeamNote): Promise<TeamNote>;
    deleteMenuItem(itemId: bigint): Promise<void>;
    deleteSalesGoal(goalId: bigint): Promise<void>;
    deleteTask(taskId: bigint): Promise<void>;
    deleteTeamNote(noteId: bigint): Promise<void>;
    getAllMenuItems(): Promise<Array<MenuItem>>;
    getAllSalesGoals(): Promise<Array<SalesGoal>>;
    getAllTasks(): Promise<Array<Task>>;
    getAllTeamNotes(): Promise<Array<TeamNote>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getMenuItem(itemId: bigint): Promise<MenuItem>;
    getSalesGoal(goalId: bigint): Promise<SalesGoal>;
    getTask(taskId: bigint): Promise<Task>;
    getTeamNote(noteId: bigint): Promise<TeamNote>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateMenuItem(updatedItem: MenuItem): Promise<MenuItem>;
    updateSalesGoal(updatedGoal: SalesGoal): Promise<SalesGoal>;
    updateTask(updatedTask: Task): Promise<Task>;
    updateTeamNote(updatedNote: TeamNote): Promise<TeamNote>;
}
