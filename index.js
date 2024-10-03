import { getTasks, createNewTask, patchTask, putTask, deleteTask } from './utils/taskFunctions.js';
import { initialData } from './initialData.js';



// Function checks if local storage already has data, if not it loads initialData to localStorage
function initializeData() {
  try {
    if (!localStorage.getItem('tasks')) {
      localStorage.setItem('tasks', JSON.stringify(initialData)); 
      localStorage.setItem('showSideBar', 'true');
    } else {
      console.log('Data already exists in localStorage');
    }
  } catch (error) {
    console.error('initialize data failed:', error);
  }
}

initializeData();


// TASK: Get elements from the DOM
const elements = {
  showSideBarBtn: document.getElementById('show-side-bar-btn'),
  hideSideBarBtn: document.getElementById('hide-side-bar-btn'),
  headerBoardName: document.getElementById('header-board-name'),
  addNewTaskBtn: document.getElementById('add-new-task-btn'),
  createNewTaskBtn: document.getElementById('create-task-btn'),
  cancelAddTaskBtn: document.getElementById('cancel-add-task-btn'),
  filterDiv: document.getElementById('filterDiv'),
  modalWindow: document.getElementById('new-task-modal-window'),
  editTaskModal: document.querySelector('.edit-task-modal-window'),
  themeSwitch: document.getElementById('switch'),
  columnDivs: document.querySelectorAll('.column-div'),
  logo: document.getElementById('logo'),
};

let activeBoard = "";

// *** FETCH AND DISPLAY DATA ***

// Extracts unique board names from tasks
function fetchAndDisplayBoardsAndTasks() {
  const tasks = getTasks();
  const boards = [...new Set(tasks.map(task => task.board).filter(Boolean))];
  displayBoards(boards);
  if (boards.length > 0) {
    const localStorageBoard = JSON.parse(localStorage.getItem("activeBoard"));
    activeBoard = localStorageBoard ? localStorageBoard : boards[0]; 
    elements.headerBoardName.textContent = activeBoard;
    styleActiveBoard(activeBoard);
    refreshTasksUI();
  }
}

// Creates different boards in the DOM
function displayBoards(boards) {
  const boardsContainer = document.getElementById("boards-nav-links-div");
  boardsContainer.innerHTML = '';
  boards.forEach(board => {
    const boardElement = document.createElement("button");
    boardElement.textContent = board;
    boardElement.classList.add("board-btn");
    boardElement.addEventListener('click', () => { 
      elements.headerBoardName.textContent = board;
      filterAndDisplayTasksByBoard(board);
      activeBoard = board; //assigns active board
      localStorage.setItem("activeBoard", JSON.stringify(activeBoard));
      styleActiveBoard(activeBoard);
    });
    boardsContainer.appendChild(boardElement);
  });
}

// Filters tasks corresponding to the board name and displays them on the DOM.
function filterAndDisplayTasksByBoard(boardName) {
  const tasks = getTasks(); // Fetch tasks from a simulated local storage function
  const filteredTasks = tasks.filter(task => task.board === boardName);

  elements.columnDivs.forEach(column => {
    const status = column.getAttribute("data-status");
    // Reset column content while preserving the column title
    column.innerHTML = `<div class="column-head-div">
                          <span class="dot" id="${status}-dot"></span>
                          <h4 class="columnHeader">${status.toUpperCase()}</h4>
                        </div>`;

    const tasksContainer = document.createElement("div");
    column.appendChild(tasksContainer);

    filteredTasks.filter(task => task.status === status).forEach(task => { 
      const taskElement = document.createElement("div");
      taskElement.classList.add("task-div");
      taskElement.textContent = task.title;
      taskElement.setAttribute('data-task-id', task.id);

      taskElement.addEventListener('click', () => { 
        openEditTaskModal(task);
      });
      tasksContainer.appendChild(taskElement);
    });
  });
}

function refreshTasksUI() {
  filterAndDisplayTasksByBoard(activeBoard);
}

// Styles the active board by adding an active class
function styleActiveBoard(boardName) {
  document.querySelectorAll('.board-btn').forEach(btn => { 
    if (btn.textContent === boardName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// *** TASK MANAGEMENT ***

let originalTask = null;

function addTaskToUI(task) {
  const column = document.querySelector(`.column-div[data-status="${task.status}"]`); 
  if (!column) {
    console.error(`Column not found for status: ${task.status}`);
    return;
  }

  let tasksContainer = column.querySelector('.tasks-container');
  if (!tasksContainer) {
    console.warn(`Tasks container not found for status: ${task.status}, creating one.`);
    tasksContainer = document.createElement('div');
    tasksContainer.className = 'tasks-container';
    column.appendChild(tasksContainer);
  }

  const taskElement = document.createElement('div');
  taskElement.className = 'task-div';
  taskElement.textContent = task.title; 
  taskElement.setAttribute('data-task-id', task.id);
  
  tasksContainer.appendChild(taskElement); 
}

function addTask(event) {
  event.preventDefault(); 
  
  const titleInput = document.getElementById('title-input').value.trim();
  const descriptionInput = document.getElementById('desc-input').value;
  const statusInput = document.getElementById('select-status').value;

  // Validate title input
  if (!titleInput) {
      alert('The title field cannot be empty!');
      return; 
  }

  const task = {
      title: titleInput,
      description: descriptionInput,
      status: statusInput,
      id: Date.now().toString(), 
      board: activeBoard
  };

  // Create a new task and update the UI
  const newTask = createNewTask(task);
  if (newTask) {
      addTaskToUI(newTask);
      toggleModal(false);
      elements.filterDiv.style.display = 'none'; // Hide the filter overlay
      event.target.reset(); // Reset the form
      refreshTasksUI();
  }
}

function openEditTaskModal(task) {
  originalTask = { ...task };
  // Set task details in modal inputs
  document.getElementById('edit-task-title-input').value = task.title;
  document.getElementById('edit-task-desc-input').value = task.description;
  document.getElementById('edit-select-status').value = task.status;

  // Get button elements from the task modal
  const saveChangesBtn = document.getElementById('save-task-changes-btn');
  const deleteTaskBtn = document.getElementById('delete-task-btn');

  // Call saveTaskChanges upon click of Save Changes button
  saveChangesBtn.onclick = () => saveTaskChanges(task.id);

  // Delete task using a helper function and close the task modal
  deleteTaskBtn.onclick = () => {
    deleteTask(task.id);
    toggleModal(false, elements.editTaskModal);
    refreshTasksUI();
  };

  toggleModal(true, elements.editTaskModal); // Show the edit task modal
}

function hasTaskChanged() {
  const titleInput = document.getElementById('edit-task-title-input').value;
  const descriptionInput = document.getElementById('edit-task-desc-input').value;
  const statusInput = document.getElementById('edit-select-status').value;

  return (
    titleInput !== originalTask.title ||
    descriptionInput !== originalTask.description ||
    statusInput !== originalTask.status
  );
}

function saveTaskChanges(taskId) {
  const titleInput = document.getElementById('edit-task-title-input');

  if (titleInput.value.trim() === '') {
    alert('The title field cannot be empty!');
    return;
  }

  const updatedTask = {
    title: document.getElementById('edit-task-title-input').value,
    description: document.getElementById('edit-task-desc-input').value,
    status: document.getElementById('edit-select-status').value,
    id: taskId,
    board: activeBoard
  };

  // Use putTask instead of patchTask to fully replace the task
  putTask(taskId, updatedTask);

  // Close the modal and refresh the UI to reflect the changes
  toggleModal(false, elements.editTaskModal);
  refreshTasksUI();
}

// *** BOARD MANAGEMENT ***

// Get modal elements
const editBoardModal = document.getElementById('edit-board-modal');
const closeEditBoardModal = document.getElementById('close-edit-board-modal');
const editBoardBtn = document.getElementById('edit-board-btn');
const addBoardBtn = document.getElementById('addBoardBtn');
const newBoardNameInput = document.getElementById('new-board-name');
const boardList = document.getElementById('board-list');

// Function to add a new board
function addBoard(boardName) {
  let tasks = getTasks();
  tasks.push({
      id: Date.now().toString(),
      title: 'New Task',
      description: '',
      status: 'todo',
      board: boardName
  });
  localStorage.setItem('tasks', JSON.stringify(tasks));
  fetchAndDisplayBoardsAndTasks();
}

// Function to delete a board
function deleteBoard(boardName) {
  let tasks = getTasks();
  tasks = tasks.filter(task => task.board !== boardName);
  localStorage.setItem('tasks', JSON.stringify(tasks));
  fetchAndDisplayBoardsAndTasks();
  populateBoardList(); // Refresh the board list in the modal
}

// Function to populate the board list
function populateBoardList() {
  const tasks = getTasks();
  const boards = [...new Set(tasks.map(task => task.board).filter(Boolean))];
  boardList.innerHTML = ''; // Clear the list
  boards.forEach(board => {
      const boardItem = document.createElement('div');
      boardItem.className = 'board-item';
      boardItem.innerHTML = `
          <span>${board}</span>
          <button class="editBtns" data-board="${board}">Delete</button>
      `;
      boardList.appendChild(boardItem);
  });
}


// *** UI FUNCTIONS ***

function toggleModal(show, modal = elements.modalWindow) {
  modal.style.display = show ? 'block' : 'none'; 
}

function toggleSidebar(show) {
  const sidebar = document.getElementById('side-bar-div');
  sidebar.style.display = show ? 'block' : 'none';
  elements.showSideBarBtn.style.display = show ? 'none' : 'block';
}

function toggleTheme() {
  const isLightTheme = elements.themeSwitch.checked;
  document.body.classList.toggle('light-theme', isLightTheme);
  localStorage.setItem('light-theme', isLightTheme ? 'enabled' : 'disabled');
  elements.logo.src = isLightTheme ? './assets/logo-light.svg' : './assets/logo-dark.svg';
}

//  *** EVENT LISTENERS ***


function setupEventListeners() {
  // Cancel editing task event listener
  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  cancelEditBtn.addEventListener('click', () => toggleModal(false, elements.editTaskModal));

  // Cancel adding new task event listener
  elements.cancelAddTaskBtn.addEventListener('click', () => {
    toggleModal(false);
    elements.filterDiv.style.display = 'none'; 
  });

   // Show sidebar event listener
   elements.hideSideBarBtn.addEventListener('click', () => toggleSidebar(false));
   elements.showSideBarBtn.addEventListener('click', () => toggleSidebar(true));

    // Theme switch event listener
  elements.themeSwitch.addEventListener('change', toggleTheme);


  // Clicking outside the modal to close it
  elements.filterDiv.addEventListener('click', () => {
    toggleModal(false);
    elements.filterDiv.style.display = 'none'; 
  });

   // Show Add New Task Modal event listener
  elements.addNewTaskBtn.addEventListener('click', () => {
    if (elements.editTaskModal.style.display === 'block' && hasTaskChanged()) {
      alert('You have unsaved changes. Please save your changes before adding a new task.');
    } else {
      toggleModal(false, elements.editTaskModal); // Close the edit task modal if open
      toggleModal(true);
      elements.filterDiv.style.display = 'block'; // Also show the filter overlay
    }
  });

  // Add new task form submission event listener
  elements.modalWindow.addEventListener('submit', (event) => {
    addTask(event);
});
}

// Event delegation for delete buttons
boardList.addEventListener('click', (event) => {
    if (event.target.tagName === 'BUTTON' && event.target.dataset.board) {
        const boardName = event.target.dataset.board;
        deleteBoard(boardName);
    }
});

// Close the modal when clicking outside of it
window.addEventListener('click', (event) => {
    if (event.target === editBoardModal) {
        editBoardModal.style.display = 'none';
    }
});

// Event listener to open the modal
editBoardBtn.addEventListener('click', () => {
  populateBoardList();
  editBoardModal.style.display = 'block';
});

// Event listener to close the modal
closeEditBoardModal.addEventListener('click', () => {
  editBoardModal.style.display = 'none';
});

// Event listener to add a new board
addBoardBtn.addEventListener('click', () => {
  const newBoardName = newBoardNameInput.value.trim();
  if (newBoardName) {
      addBoard(newBoardName);
      newBoardNameInput.value = '';
      editBoardModal.style.display = 'none';
  } else {
      alert('Board name cannot be empty');
  }
});


// *** INITIALIZE ***

document.addEventListener('DOMContentLoaded', function() {
  init(); // init is called after the DOM is fully loaded
});

function init() {
  setupEventListeners();
  const showSidebar = localStorage.getItem('showSideBar') === 'true';
  toggleSidebar(showSidebar);
  const isLightTheme = localStorage.getItem('light-theme') === 'enabled';
  document.body.classList.toggle('light-theme', isLightTheme);
  elements.logo.src = isLightTheme ? './assets/logo-light.svg' : './assets/logo-dark.svg';
  fetchAndDisplayBoardsAndTasks(); // Initial display of boards and tasks
}