import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Text "mo:core/Text";
import List "mo:core/List";
import Array "mo:core/Array";
import Char "mo:core/Char";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Float "mo:core/Float";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import MixinStorage "blob-storage/Mixin";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";



actor {
  include MixinStorage();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type UserProfile = {
    name : Text;
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

  public type Task = {
    id : Nat;
    title : Text;
    category : TaskCategory;
    assignee : Text;
    dueDate : Text;
    status : TaskStatus;
    priority : TaskPriority;
  };

  public type MenuCategory = {
    #espressoDrinks;
    #pastries;
    #sandwiches;
    #coldDrinks;
  };

  public type MenuItem = {
    id : Nat;
    name : Text;
    description : Text;
    category : MenuCategory;
    price : Float;
    available : Bool;
  };

  public type GoalPeriod = {
    #daily;
    #weekly;
    #monthly;
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
    timestamp : Int;
  };

  public type ChatMessage = {
    id : Nat;
    authorName : Text;
    body : Text;
    timestamp : Int;
    tags : [Text];
    attachmentUrl : ?Text;
    attachmentName : ?Text;
  };

  public type ExpenseCategory = {
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

  public type Expense = {
    id : Nat;
    description : Text;
    amount : Float;
    category : ExpenseCategory;
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

  var nextTaskId = 0;
  var nextMenuItemId = 0;
  var nextSalesGoalId = 0;
  var nextTeamNoteId = 0;
  var nextChatMessageId = 0;
  var nextExpenseId = 0;
  var nextRevenueEntryId = 0;

  let tasks = Map.empty<Nat, Task>();
  let menuItems = Map.empty<Nat, MenuItem>();
  let salesGoals = Map.empty<Nat, SalesGoal>();
  let teamNotes = Map.empty<Nat, TeamNote>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let chatMessages = Map.empty<Nat, ChatMessage>();
  let expenses = Map.empty<Nat, Expense>();
  let revenueEntries = Map.empty<Nat, RevenueEntry>();

  module Task {
    public func compare(task1 : Task, task2 : Task) : Order.Order {
      Nat.compare(task1.id, task2.id);
    };
  };

  module MenuItem {
    public func compare(item1 : MenuItem, item2 : MenuItem) : Order.Order {
      Nat.compare(item1.id, item2.id);
    };
  };

  module SalesGoal {
    public func compare(goal1 : SalesGoal, goal2 : SalesGoal) : Order.Order {
      Nat.compare(goal1.id, goal2.id);
    };
  };

  module TeamNote {
    public func compare(note1 : TeamNote, note2 : TeamNote) : Order.Order {
      Int.compare(note2.timestamp, note1.timestamp);
    };
  };

  module ChatMessage {
    public func compare(a : ChatMessage, b : ChatMessage) : Order.Order {
      compareTimestamp(a.timestamp, b.timestamp);
    };

    func compareTimestamp(a : Int, b : Int) : Order.Order {
      Int.compare(a, b);
    };
  };

  module Expense {
    public func compare(expense1 : Expense, expense2 : Expense) : Order.Order {
      Nat.compare(expense1.id, expense2.id);
    };
  };

  module RevenueEntry {
    public func compare(entry1 : RevenueEntry, entry2 : RevenueEntry) : Order.Order {
      Nat.compare(entry1.id, entry2.id);
    };
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func createTask(task : Task) : async Task {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create tasks");
    };
    let taskId = nextTaskId;
    nextTaskId += 1;
    let newTask = {
      task with
      id = taskId;
    };
    tasks.add(taskId, newTask);
    newTask;
  };

  public query ({ caller }) func getTask(taskId : Nat) : async Task {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view tasks");
    };
    switch (tasks.get(taskId)) {
      case (null) { Runtime.trap("Task does not exist") };
      case (?task) { task };
    };
  };

  public query ({ caller }) func getAllTasks() : async [Task] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view tasks");
    };
    tasks.values().toArray().sort();
  };

  public shared ({ caller }) func updateTask(updatedTask : Task) : async Task {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update tasks");
    };
    switch (tasks.get(updatedTask.id)) {
      case (null) { Runtime.trap("Task does not exist") };
      case (?_existingTask) {
        tasks.add(updatedTask.id, updatedTask);
        updatedTask;
      };
    };
  };

  public shared ({ caller }) func deleteTask(taskId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete tasks");
    };
    if (not tasks.containsKey(taskId)) {
      Runtime.trap("Task does not exist");
    };
    tasks.remove(taskId);
  };

  public shared ({ caller }) func createMenuItem(item : MenuItem) : async MenuItem {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create menu items");
    };
    let itemId = nextMenuItemId;
    nextMenuItemId += 1;
    let newItem = {
      item with
      id = itemId;
    };
    menuItems.add(itemId, newItem);
    newItem;
  };

  public query ({ caller }) func getMenuItem(itemId : Nat) : async MenuItem {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view menu items");
    };
    switch (menuItems.get(itemId)) {
      case (null) { Runtime.trap("Menu item does not exist") };
      case (?item) { item };
    };
  };

  public query ({ caller }) func getAllMenuItems() : async [MenuItem] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view menu items");
    };
    menuItems.values().toArray().sort();
  };

  public shared ({ caller }) func updateMenuItem(updatedItem : MenuItem) : async MenuItem {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update menu items");
    };
    switch (menuItems.get(updatedItem.id)) {
      case (null) { Runtime.trap("Menu item does not exist") };
      case (?_existingItem) {
        menuItems.add(updatedItem.id, updatedItem);
        updatedItem;
      };
    };
  };

  public shared ({ caller }) func deleteMenuItem(itemId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete menu items");
    };
    if (not menuItems.containsKey(itemId)) {
      Runtime.trap("Menu item does not exist");
    };
    menuItems.remove(itemId);
  };

  public shared ({ caller }) func createSalesGoal(goal : SalesGoal) : async SalesGoal {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create sales goals");
    };
    let goalId = nextSalesGoalId;
    nextSalesGoalId += 1;
    let newGoal = {
      goal with
      id = goalId;
    };
    salesGoals.add(goalId, newGoal);
    newGoal;
  };

  public query ({ caller }) func getSalesGoal(goalId : Nat) : async SalesGoal {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view sales goals");
    };
    switch (salesGoals.get(goalId)) {
      case (null) { Runtime.trap("Sales goal does not exist") };
      case (?goal) { goal };
    };
  };

  public query ({ caller }) func getAllSalesGoals() : async [SalesGoal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view sales goals");
    };
    salesGoals.values().toArray().sort();
  };

  public shared ({ caller }) func updateSalesGoal(updatedGoal : SalesGoal) : async SalesGoal {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update sales goals");
    };
    switch (salesGoals.get(updatedGoal.id)) {
      case (null) { Runtime.trap("Sales goal does not exist") };
      case (?_existingGoal) {
        salesGoals.add(updatedGoal.id, updatedGoal);
        updatedGoal;
      };
    };
  };

  public shared ({ caller }) func deleteSalesGoal(goalId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete sales goals");
    };
    if (not salesGoals.containsKey(goalId)) {
      Runtime.trap("Sales goal does not exist");
    };
    salesGoals.remove(goalId);
  };

  public shared ({ caller }) func createTeamNote(note : TeamNote) : async TeamNote {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create team notes");
    };
    let noteId = nextTeamNoteId;
    nextTeamNoteId += 1;
    let newNote = {
      note with
      id = noteId;
    };
    teamNotes.add(noteId, newNote);
    newNote;
  };

  public query ({ caller }) func getTeamNote(noteId : Nat) : async TeamNote {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view team notes");
    };
    switch (teamNotes.get(noteId)) {
      case (null) { Runtime.trap("Team note does not exist") };
      case (?note) { note };
    };
  };

  public query ({ caller }) func getAllTeamNotes() : async [TeamNote] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view team notes");
    };
    teamNotes.values().toArray().sort();
  };

  public shared ({ caller }) func updateTeamNote(updatedNote : TeamNote) : async TeamNote {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update team notes");
    };
    switch (teamNotes.get(updatedNote.id)) {
      case (null) { Runtime.trap("Team note does not exist") };
      case (?_existingNote) {
        teamNotes.add(updatedNote.id, updatedNote);
        updatedNote;
      };
    };
  };

  public shared ({ caller }) func deleteTeamNote(noteId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete team notes");
    };
    if (not teamNotes.containsKey(noteId)) {
      Runtime.trap("Team note does not exist");
    };
    teamNotes.remove(noteId);
  };

  public shared ({ caller }) func createChatMessage(
    authorName : Text,
    body : Text,
    attachmentUrl : ?Text,
    attachmentName : ?Text,
  ) : async ChatMessage {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create chat messages");
    };

    let id = nextChatMessageId;
    nextChatMessageId += 1;

    let tags = extractTags(body);

    let chatMessage : ChatMessage = {
      id;
      authorName;
      body;
      timestamp = Time.now();
      tags;
      attachmentUrl;
      attachmentName;
    };

    chatMessages.add(id, chatMessage);
    chatMessage;
  };

  public query ({ caller }) func getAllChatMessages() : async [ChatMessage] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view chat messages");
    };

    chatMessages.values().toArray().sort();
  };

  public shared ({ caller }) func deleteChatMessage(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete chat messages");
    };

    if (not chatMessages.containsKey(id)) {
      Runtime.trap("Chat message does not exist");
    };

    chatMessages.remove(id);
  };

  func extractTags(body : Text) : [Text] {
    let words : List.List<Text> = List.empty<Text>();
    let wordBuffer : List.List<Char> = List.empty<Char>();

    func processCharIter(iter : { next : () -> ?Char }, insideTag : Bool) : () {
      switch (iter.next()) {
        case (null) {};
        case (?ch) {
          if (ch == '#' and not insideTag) {
            wordBuffer.clear();
            processCharIter(iter, true);
          } else if (ch == ' ' and insideTag) {
            let tagChars : [Char] = wordBuffer.toArray();
            if (tagChars.size() > 0) {
              let tagText = Text.fromIter(tagChars.values());
              words.add(tagText);
            };
            wordBuffer.clear();
            processCharIter(iter, false);
          } else if (insideTag) {
            wordBuffer.add(ch);
            processCharIter(iter, true);
          } else {
            processCharIter(iter, insideTag);
          };
        };
      };
    };

    processCharIter(body.chars(), false);

    if (not wordBuffer.isEmpty()) {
      let tagChars : [Char] = wordBuffer.toArray();
      if (tagChars.size() > 0) {
        let tagText = Text.fromIter(tagChars.values());
        words.add(tagText);
      };
    };

    words.toArray();
  };

  // Expenses CRUD
  public shared ({ caller }) func createExpense(expense : Expense) : async Expense {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create expenses");
    };
    let expenseId = nextExpenseId;
    nextExpenseId += 1;
    let newExpense = { expense with id = expenseId };
    expenses.add(expenseId, newExpense);
    newExpense;
  };

  public query ({ caller }) func getExpense(expenseId : Nat) : async Expense {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view expenses");
    };
    switch (expenses.get(expenseId)) {
      case (null) { Runtime.trap("Expense does not exist") };
      case (?expense) { expense };
    };
  };

  public query ({ caller }) func getAllExpenses() : async [Expense] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view expenses");
    };
    expenses.values().toArray().sort();
  };

  public shared ({ caller }) func updateExpense(updatedExpense : Expense) : async Expense {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update expenses");
    };
    switch (expenses.get(updatedExpense.id)) {
      case (null) { Runtime.trap("Expense does not exist") };
      case (?_existingExpense) {
        expenses.add(updatedExpense.id, updatedExpense);
        updatedExpense;
      };
    };
  };

  public shared ({ caller }) func deleteExpense(expenseId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete expenses");
    };
    if (not expenses.containsKey(expenseId)) {
      Runtime.trap("Expense does not exist");
    };
    expenses.remove(expenseId);
  };

  public query ({ caller }) func getExpensesByDateRange(startDate : Text, endDate : Text) : async [Expense] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view expenses");
    };
    expenses.values().toArray().filter(
      func(expense) {
        expense.date >= startDate and expense.date <= endDate
      }
    );
  };

  // Revenue Entries CRUD
  public shared ({ caller }) func createRevenueEntry(entry : RevenueEntry) : async RevenueEntry {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create revenue entries");
    };
    let entryId = nextRevenueEntryId;
    nextRevenueEntryId += 1;
    let newEntry = { entry with id = entryId };
    revenueEntries.add(entryId, newEntry);
    newEntry;
  };

  public query ({ caller }) func getRevenueEntry(entryId : Nat) : async RevenueEntry {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view revenue entries");
    };
    switch (revenueEntries.get(entryId)) {
      case (null) { Runtime.trap("Revenue entry does not exist") };
      case (?entry) { entry };
    };
  };

  public query ({ caller }) func getAllRevenueEntries() : async [RevenueEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view revenue entries");
    };
    revenueEntries.values().toArray().sort();
  };

  public shared ({ caller }) func updateRevenueEntry(updatedEntry : RevenueEntry) : async RevenueEntry {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update revenue entries");
    };
    switch (revenueEntries.get(updatedEntry.id)) {
      case (null) { Runtime.trap("Revenue entry does not exist") };
      case (?_existingEntry) {
        revenueEntries.add(updatedEntry.id, updatedEntry);
        updatedEntry;
      };
    };
  };

  public shared ({ caller }) func deleteRevenueEntry(entryId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete revenue entries");
    };
    if (not revenueEntries.containsKey(entryId)) {
      Runtime.trap("Revenue entry does not exist");
    };
    revenueEntries.remove(entryId);
  };

  public query ({ caller }) func getRevenueByDateRange(startDate : Text, endDate : Text) : async [RevenueEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view revenue entries");
    };
    revenueEntries.values().toArray().filter(
      func(entry) {
        entry.date >= startDate and entry.date <= endDate
      }
    );
  };
};
