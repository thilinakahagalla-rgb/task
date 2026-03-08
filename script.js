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
const syncBtn = document.getElementById('syncBtn');
const saveFileBtn = document.getElementById('saveFileBtn');
const loadFileBtn = document.getElementById('loadFileBtn');
const syncStatus = document.getElementById('syncStatus');

// Cloud Config (using npoint.io or similar for simple JSON storage)
const BIN_ID_KEY = 'todo_bin_id';
let binId = localStorage.getItem(BIN_ID_KEY);

// Initial Render & Load
renderTasks();
if (binId) {
    autoSync();
}

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

saveFileBtn.addEventListener('click', saveToFile);
loadFileBtn.addEventListener('click', loadFromFile);
syncBtn.addEventListener('click', toggleCloudSync);

// File System Functions
async function saveToFile() {
    try {
        // Try modern File System Access API first
        if ('showSaveFilePicker' in window) {
            const handle = await window.showSaveFilePicker({
                suggestedName: 'tasks.json',
                types: [{
                    description: 'JSON Files',
                    accept: { 'application/json': ['.json'] },
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(JSON.stringify(tasks, null, 2));
            await writable.close();
            updateSyncStatus('Saved to file');
        } else {
            // Fallback: Download as file
            const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'tasks.json';
            a.click();
            URL.revokeObjectURL(url);
            updateSyncStatus('File downloaded');
        }
    } catch (err) {
        console.error('File saving failed:', err);
    }
}

async function loadFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const loadedTasks = JSON.parse(event.target.result);
                if (Array.isArray(loadedTasks)) {
                    tasks = loadedTasks;
                    saveToLocalStorage();
                    renderTasks();
                    updateSyncStatus('Loaded from file');
                }
            } catch (err) {
                alert('Invalid JSON file');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// Cloud Sync Functions (using a simple public bin service)
async function toggleCloudSync() {
    if (!binId) {
        if (confirm('Create a new Cloud Sync ID? This will allow you to sync with your phone.')) {
            await createCloudBin();
        }
    } else {
        const action = confirm(`Syncing with ID: ${binId}\n\n[OK] to Sync Now\n[Cancel] to Reset Cloud ID`);
        if (action) {
            await syncWithCloud();
        } else {
            if (confirm('Reset Cloud ID? You will lose connection to the current sync.')) {
                localStorage.removeItem(BIN_ID_KEY);
                binId = null;
                updateSyncStatus('Cloud Sync disabled');
            }
        }
    }
}

async function createCloudBin() {
    updateSyncStatus('Creating bin...');
    try {
        const response = await fetch('https://api.npoint.io/bins', {
            method: 'POST',
            body: JSON.stringify(tasks)
        });
        const data = await response.json();
        binId = data.binId;
        localStorage.setItem(BIN_ID_KEY, binId);
        alert(`Your Sync ID is: ${binId}\nCopy this to use on your phone!`);
        updateSyncStatus('Cloud Sync active');
    } catch (err) {
        updateSyncStatus('Failed to create bin');
        console.error(err);
    }
}

async function syncWithCloud() {
    if (!binId) return;
    updateSyncStatus('Syncing...');
    try {
        // First, push local data to cloud
        await fetch(`https://api.npoint.io/${binId}`, {
            method: 'POST', // some APIs use POST/PUT
            body: JSON.stringify(tasks)
        });
        updateSyncStatus('Synced to cloud');
    } catch (err) {
        updateSyncStatus('Sync failed');
        console.error(err);
    }
}

async function autoSync() {
    if (!binId) return;
    try {
        const response = await fetch(`https://api.npoint.io/${binId}`);
        const remoteTasks = await response.json();
        if (Array.isArray(remoteTasks)) {
            // Simple merge: if remote has more or different, use it
            // Real merge would be complex, but for a simple todo, we just load remote on start
            tasks = remoteTasks;
            saveToLocalStorage();
            renderTasks();
            updateSyncStatus('Cloud data loaded');
        }
    } catch (err) {
        console.error('Auto-sync failed:', err);
    }
}

function updateSyncStatus(msg) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    syncStatus.textContent = `${msg} (${time})`;
}

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
    saveAndSync();
    renderTasks();
    taskInput.value = '';
}

function saveAndSync() {
    saveToLocalStorage();
    if (binId) {
        syncWithCloud();
    }
}

function toggleTask(id) {
    tasks = tasks.map(task =>
        task.id === id ? { ...task, completed: !task.completed } : task
    );
    saveAndSync();
    renderTasks();
}

function deleteTask(id) {
    if (confirm('Are you sure you want to delete this task?')) {
        tasks = tasks.filter(task => task.id !== id);
        saveAndSync();
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
        saveAndSync();
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
