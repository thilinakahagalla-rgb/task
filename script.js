// Task Management State
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let editTaskId = null;

// DOM Elements
const taskInput = document.getElementById('taskInput');
const categorySelect = document.getElementById('categorySelect');
const addTaskBtn = document.getElementById('addTaskBtn');
const editModal = document.getElementById('editModal');
const editInput = document.getElementById('editInput');
const saveEditBtn = document.getElementById('saveEdit');
const cancelEditBtn = document.getElementById('cancelEdit');

// Initial Render
renderTasks();

// Event Listeners
addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
});

saveEditBtn.addEventListener('click', saveEdit);
cancelEditBtn.addEventListener('click', () => {
    editModal.classList.remove('active');
    editTaskId = null;
});

// Functions
function addTask() {
    const text = taskInput.value.trim();
    const category = categorySelect.value;

    if (!text) return;

    const newTask = {
        id: Date.now().toString(),
        text: text,
        category: category,
        completed: false,
        createdAt: new Date().toISOString()
    };

    tasks.push(newTask);
    saveToLocalStorage();
    renderTasks();
    taskInput.value = '';
}

function toggleTask(id) {
    tasks = tasks.map(task => 
        task.id === id ? { ...task, completed: !task.completed } : task
    );
    saveToLocalStorage();
    renderTasks();
}

function deleteTask(id) {
    if (confirm('Are you sure you want to delete this task?')) {
        tasks = tasks.filter(task => task.id !== id);
        saveToLocalStorage();
        renderTasks();
    }
}

function openEditModal(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        editTaskId = id;
        editInput.value = task.text;
        editModal.classList.add('active');
        editInput.focus();
    }
}

function saveEdit() {
    const newText = editInput.value.trim();
    if (newText && editTaskId) {
        tasks = tasks.map(task => 
            task.id === editTaskId ? { ...task, text: newText } : task
        );
        saveToLocalStorage();
        renderTasks();
    }
    editModal.classList.remove('active');
    editTaskId = null;
}

function saveToLocalStorage() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function renderTasks() {
    const categories = ['kutuss', 'chemigo', 'other'];
    const counts = { kutuss: 0, chemigo: 0, other: 0 };

    // Clear existing lists
    categories.forEach(cat => {
        const list = document.getElementById(`list-${cat}`);
        list.innerHTML = '';
    });

    // Populate lists
    tasks.forEach(task => {
        const list = document.getElementById(`list-${task.category}`);
        if (!list) return;

        counts[task.category]++;

        const taskElement = document.createElement('div');
        taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
        taskElement.innerHTML = `
            <div class="checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask('${task.id}')">
                <i class="fas fa-check"></i>
            </div>
            <div class="task-text">${task.text}</div>
            <div class="task-actions">
                <button class="action-btn edit" onclick="openEditModal('${task.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete" onclick="deleteTask('${task.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        list.appendChild(taskElement);
    });

    // Update counts
    categories.forEach(cat => {
        document.getElementById(`count-${cat}`).textContent = counts[cat];
    });
}
