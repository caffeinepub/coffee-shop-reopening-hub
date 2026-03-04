import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Order "mo:core/Order";
import List "mo:core/List";
import Float "mo:core/Float";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
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

  var nextTaskId = 0;
  var nextMenuItemId = 0;
  var nextSalesGoalId = 0;
  var nextTeamNoteId = 0;

  let tasks = Map.empty<Nat, Task>();
  let menuItems = Map.empty<Nat, MenuItem>();
  let salesGoals = Map.empty<Nat, SalesGoal>();
  let teamNotes = Map.empty<Nat, TeamNote>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  // Comparison modules for sorting
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

  // User Profile Management
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

  // Task Management
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

  // Menu Item Management
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

  // Sales Goal Management
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

  // Team Note Management
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
};
