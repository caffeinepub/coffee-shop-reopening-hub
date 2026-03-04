import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Float "mo:core/Float";
import Time "mo:core/Time";
import Principal "mo:core/Principal";

module {
  public type OldActor = {
    nextTaskId : Nat;
    nextMenuItemId : Nat;
    nextSalesGoalId : Nat;
    nextTeamNoteId : Nat;
    nextChatMessageId : Nat;
    nextExpenseId : Nat;
    nextRevenueEntryId : Nat;
    tasks : Map.Map<Nat, Task>;
    menuItems : Map.Map<Nat, MenuItem>;
    salesGoals : Map.Map<Nat, SalesGoal>;
    teamNotes : Map.Map<Nat, TeamNote>;
    userProfiles : Map.Map<Principal, UserProfile>;
    chatMessages : Map.Map<Nat, ChatMessage>;
    expenses : Map.Map<Nat, OldExpense>;
    revenueEntries : Map.Map<Nat, RevenueEntry>;
  };

  public type NewActor = {
    nextTaskId : Nat;
    nextMenuItemId : Nat;
    nextSalesGoalId : Nat;
    nextTeamNoteId : Nat;
    nextChatMessageId : Nat;
    nextExpenseId : Nat;
    nextRevenueEntryId : Nat;
    tasks : Map.Map<Nat, Task>;
    menuItems : Map.Map<Nat, MenuItem>;
    salesGoals : Map.Map<Nat, SalesGoal>;
    teamNotes : Map.Map<Nat, TeamNote>;
    userProfiles : Map.Map<Principal, UserProfile>;
    chatMessages : Map.Map<Nat, ChatMessage>;
    expenses : Map.Map<Nat, NewExpense>;
    revenueEntries : Map.Map<Nat, RevenueEntry>;
  };

  public type UserProfile = { name : Text };
  public type Task = {
    id : Nat;
    title : Text;
    category : TaskCategory;
    assignee : Text;
    dueDate : Text;
    status : TaskStatus;
    priority : TaskPriority;
  };

  public type MenuItem = {
    id : Nat;
    name : Text;
    description : Text;
    category : MenuCategory;
    price : Float;
    available : Bool;
  };

  public type SalesGoal = {
    id : Nat;
    name : Text;
    targetAmount : Nat;
    currentProgress : Nat;
    period : GoalPeriod;
    notes : Text;
  };

  public type TeamNote = {
    id : Nat;
    title : Text;
    body : Text;
    timestamp : Time.Time;
  };

  public type ChatMessage = {
    id : Nat;
    authorName : Text;
    body : Text;
    timestamp : Time.Time;
    tags : [Text];
    attachmentUrl : ?Text;
    attachmentName : ?Text;
  };

  public type OldExpense = {
    id : Nat;
    description : Text;
    amount : Float;
    category : ExpenseCategoryOld;
    date : Text;
    notes : Text;
    createdBy : Text;
  };

  public type NewExpense = {
    id : Nat;
    description : Text;
    amount : Float;
    category : ExpenseCategoryNew;
    date : Text;
    notes : Text;
    createdBy : Text;
    paymentStatus : PaymentStatus;
    attachmentUrl : ?Text;
    attachmentName : ?Text;
  };

  public type RevenueEntry = {
    id : Nat;
    date : Text;
    totalRevenue : Float;
    notes : Text;
    source : Text;
    createdBy : Text;
  };

  public type TaskCategory = {
    #equipment;
    #staffing;
    #marketing;
    #cleaning;
    #permits;
  };
  public type TaskStatus = {
    #todo;
    #inProgress;
    #done;
  };
  public type TaskPriority = {
    #high;
    #medium;
    #low;
  };
  public type MenuCategory = {
    #espressoDrinks;
    #pastries;
    #sandwiches;
    #coldDrinks;
  };
  public type GoalPeriod = {
    #daily;
    #weekly;
    #monthly;
  };
  public type ExpenseCategoryOld = {
    #rent;
    #utilities;
    #labor;
    #supplies;
    #marketing;
    #equipment;
    #licensing;
    #cleaning;
    #legal;
    #custom;
  };
  public type ExpenseCategoryNew = {
    #rent;
    #utilities;
    #labor;
    #supplies;
    #marketing;
    #website;
    #equipment;
    #licensing;
    #cleaning;
    #legal;
    #custom;
  };
  public type PaymentStatus = {
    #paid;
    #payable;
  };

  func convertExpenseCategory(oldCategory : ExpenseCategoryOld) : ExpenseCategoryNew {
    switch (oldCategory) {
      case (#rent) { #rent };
      case (#utilities) { #utilities };
      case (#labor) { #labor };
      case (#supplies) { #supplies };
      case (#marketing) { #marketing };
      case (#equipment) { #equipment };
      case (#licensing) { #licensing };
      case (#cleaning) { #cleaning };
      case (#legal) { #legal };
      case (#custom) { #custom };
    };
  };

  public func run(old : OldActor) : NewActor {
    let newExpenses = old.expenses.map<Nat, OldExpense, NewExpense>(
      func(_id, oldExpense) {
        {
          oldExpense with
          category = convertExpenseCategory(oldExpense.category);
          paymentStatus = #paid;
          attachmentUrl = null;
          attachmentName = null;
        };
      }
    );

    { old with expenses = newExpenses };
  };
};
