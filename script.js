"use strict";

const STORAGE_KEY = "daylist.tasks.v1";
const taskList = document.querySelector("#task-list");
const taskInput = document.querySelector("#task-input");
const addForm = document.querySelector("#add-form");
const emptyState = document.querySelector("#empty-state");
const filterButtons = document.querySelectorAll(".filter-button");
const todayLabel = document.querySelector("#today-label");
const taskSummary = document.querySelector("#task-summary");
const allCount = document.querySelector("#all-count");
const remainingLabel = document.querySelector("#remaining-label");
const progressRing = document.querySelector("#progress-ring");
const progressValue = document.querySelector("#progress-value");
const clearCompletedButton = document.querySelector("#clear-completed");

let tasks = loadTasks();
let activeFilter = "all";
let editingTaskId = null;

function loadTasks() {
  try {
    const savedTasks = localStorage.getItem(STORAGE_KEY);
    if (!savedTasks) return [];

    const parsedTasks = JSON.parse(savedTasks);
    if (!Array.isArray(parsedTasks)) return [];

    return parsedTasks.filter((task) =>
      task &&
      typeof task.id === "string" &&
      typeof task.text === "string" &&
      typeof task.completed === "boolean"
    );
  } catch (error) {
    console.error("Could not load saved tasks.", error);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error("Could not save tasks in this browser.", error);
  }
}

function updateDateLabel() {
  todayLabel.textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(new Date()).toUpperCase();
}

function renderTasks() {
  const completedCount = tasks.filter((task) => task.completed).length;
  const remainingCount = tasks.length - completedCount;
  const visibleTasks = tasks.filter((task) => {
    if (activeFilter === "active") return !task.completed;
    if (activeFilter === "completed") return task.completed;
    return true;
  });

  taskList.replaceChildren();

  visibleTasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = `task-item${task.completed ? " completed" : ""}`;

    if (task.id === editingTaskId) {
      const editForm = document.createElement("form");
      editForm.className = "task-edit-form";

      const editInput = document.createElement("input");
      editInput.type = "text";
      editInput.maxLength = 160;
      editInput.value = task.text;
      editInput.setAttribute("aria-label", "Edit task");
      editInput.required = true;

      const saveButton = document.createElement("button");
      saveButton.type = "submit";
      saveButton.className = "edit-task save-task";
      saveButton.textContent = "Save";

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "edit-task cancel-task";
      cancelButton.textContent = "Cancel";
      cancelButton.addEventListener("click", () => {
        editingTaskId = null;
        renderTasks();
      });

      editForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const text = editInput.value.trim();
        if (!text) {
          editInput.focus();
          return;
        }

        tasks = tasks.map((currentTask) =>
          currentTask.id === task.id ? { ...currentTask, text } : currentTask
        );
        editingTaskId = null;
        saveTasks();
        renderTasks();
      });

      editForm.append(editInput, saveButton, cancelButton);
      item.append(editForm);
      taskList.append(item);
      editInput.focus();
      editInput.select();
      return;
    }

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "task-toggle";
    toggle.setAttribute("aria-label", task.completed ? `Mark ${task.text} as active` : `Mark ${task.text} as completed`);
    toggle.setAttribute("aria-pressed", String(task.completed));
    if (task.completed) {
      const checkmark = document.createElement("span");
      checkmark.setAttribute("aria-hidden", "true");
      checkmark.textContent = "✓";
      toggle.append(checkmark);
    }
    toggle.addEventListener("click", () => toggleTask(task.id));

    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = task.text;

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-task";
    remove.setAttribute("aria-label", `Delete ${task.text}`);
    remove.textContent = "Delete";
    remove.addEventListener("click", () => deleteTask(task.id));

    if (!task.completed) {
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "edit-task";
      edit.setAttribute("aria-label", `Edit ${task.text}`);
      edit.textContent = "Edit";
      edit.addEventListener("click", () => {
        editingTaskId = task.id;
        renderTasks();
      });
      actions.append(edit);
    }

    actions.append(remove);
    item.append(toggle, text, actions);
    taskList.append(item);
  });

  allCount.textContent = String(tasks.length);
  remainingLabel.textContent = `${remainingCount} ${remainingCount === 1 ? "task" : "tasks"} left`;
  taskSummary.textContent = tasks.length === 0
    ? "Let’s make today count."
    : `${completedCount} of ${tasks.length} ${tasks.length === 1 ? "task" : "tasks"} complete`;
  const progress = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);
  progressValue.textContent = `${progress}%`;
  progressRing.style.setProperty("--progress", `${progress}%`);
  progressRing.setAttribute("aria-label", `${progress}% complete`);
  emptyState.classList.toggle("visible", visibleTasks.length === 0);
  clearCompletedButton.hidden = completedCount === 0;
}

function toggleTask(id) {
  tasks = tasks.map((task) => task.id === id ? { ...task, completed: !task.completed } : task);
  saveTasks();
  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter((task) => task.id !== id);
  saveTasks();
  renderTasks();
}

addForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = taskInput.value.trim();
  if (!text) {
    taskInput.focus();
    return;
  }

  tasks.unshift({ id: crypto.randomUUID(), text, completed: false });
  saveTasks();
  activeFilter = "all";
  filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === activeFilter;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  renderTasks();
  addForm.reset();
  taskInput.focus();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((filterButton) => {
      const isActive = filterButton === button;
      filterButton.classList.toggle("active", isActive);
      filterButton.setAttribute("aria-pressed", String(isActive));
    });
    renderTasks();
  });
});

clearCompletedButton.addEventListener("click", () => {
  tasks = tasks.filter((task) => !task.completed);
  saveTasks();
  renderTasks();
});

updateDateLabel();
renderTasks();
