// js/admin.js

const ADMIN_PASSWORD = "finnwilson"; // CHANGE THIS!

// EasyMDE instance
let easyMDEInstance = null;

// Selectors for login and content
const loginSection = document.getElementById('loginSection');
const adminContent = document.getElementById('adminContent');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('loginButton');
const loginError = document.getElementById('loginError');

// Book management selectors
const bookTableBody = document.getElementById('bookTableBody');
const bookForm = document.getElementById('bookForm');
const formTitle = document.getElementById('formTitle');
const bookIndex = document.getElementById('bookIndex');
const titleInput = document.getElementById('title');
const authorInput = document.getElementById('author');
const spineColorInput = document.getElementById('spineColor');
const titleColorInput = document.getElementById('titleColor');
const authorColorInput = document.getElementById('authorColor');
const ratingInput = document.getElementById('rating');
const genreInput = document.getElementById('genre');
const datesReadInput = document.getElementById('datesRead');
const reviewInput = document.getElementById('review');
const saveBookBtn = document.getElementById('saveBookBtn');
const cancelBtn = document.getElementById('cancelBtn');

// Photo management selectors
const photoTableBody = document.getElementById('photoTableBody');

// Project management selectors
const projectTableBody = document.getElementById('projectTableBody');
const projectForm = document.getElementById('projectForm');
const projectEditIndex = document.getElementById('projectEditIndex');
const projectIdInput = document.getElementById('projectId');
const projectTitleInput = document.getElementById('projectTitle');
const projectImageInput = document.getElementById('projectImage');
const projectSummaryInput = document.getElementById('projectSummary');
const projectRoleInput = document.getElementById('projectRole');
const projectSkillsInput = document.getElementById('projectSkills');
const projectLinksInput = document.getElementById('projectLinks');
const projectStatusInput = document.getElementById('projectStatus');
const projectDetailMarkdownInput = document.getElementById('projectDetailMarkdown');
const projectSubmitButton = document.getElementById('projectSubmitButton');
const projectCancelButton = document.getElementById('projectCancelButton');

// Store data arrays globally
let books = [];
let photos = [];
let projects = [];

// Flag to prevent multiple initializations
let isInitialized = false;

function initializeMarkdownEditor() {
    if (document.getElementById('projectDetailMarkdown') && !easyMDEInstance) {
        try {
            easyMDEInstance = new EasyMDE({
                element: document.getElementById('projectDetailMarkdown'),
                spellChecker: false,
                minHeight: "250px",
                toolbar: ["bold", "italic", "heading", "|", "quote", "unordered-list", "ordered-list", "|", "link", "image", "code", "table", "|", "preview", "side-by-side", "fullscreen"]
            });
            console.log("EasyMDE Initialized");
        } catch (e) {
            console.error("Failed to initialize EasyMDE:", e);
        }
    }
}

function initializeAdminPanel() {
    if (isInitialized) return; // Don't run multiple times
    console.log("Initializing admin panel data...");
    loadBooks();
    loadPhotos();
    loadProjects();
    initializeMarkdownEditor(); // Initialize the editor
    isInitialized = true;
}

// Login functionality
if (loginButton) {
    loginButton.addEventListener('click', () => {
        if (passwordInput.value === ADMIN_PASSWORD) {
            loginSection.style.display = 'none';
            loginError.style.display = 'none';
            adminContent.style.display = 'block';
            initializeAdminPanel(); // Load data only AFTER successful login
            
            // Setup save buttons AFTER data might be loaded
            setupSaveSection('Books', 'generateBooksJsonButton', 'downloadBooksJsonButton', 'outputBooksJson', books, 'books.json');
            setupSaveSection('Photos', 'generatePhotosJsonButton', 'downloadPhotosJsonButton', 'outputPhotosJson', photos, 'images.json');
            setupSaveSection('Projects', 'generateProjectsJsonButton', 'downloadProjectsJsonButton', 'outputProjectsJson', projects, 'projects.json');
        } else {
            loginError.style.display = 'block';
            passwordInput.value = ''; // Clear password field
        }
    });
}

// Add listener for Enter key on password input
if (passwordInput) {
    passwordInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent potential form submission
            loginButton.click(); // Trigger login button click
        }
    });
}

// --- Book Management Functions ---
async function loadBooks() {
    try {
        const response = await fetch('data/books.json?_=' + new Date().getTime()); // Cache busting
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        books = Array.isArray(data) ? data : [];
        renderBookTable();
    } catch (error) {
        console.error("Could not load books:", error);
        if (bookTableBody) {
            bookTableBody.innerHTML = '<tr><td colspan="4">Error loading books. Check console or data/books.json.</td></tr>';
        }
    }
}

function renderBookTable() {
    if (!bookTableBody) return;
    bookTableBody.innerHTML = '';
    
    books.forEach((book, index) => {
        const row = bookTableBody.insertRow();
        row.insertCell().textContent = book.title || 'No Title';
        row.insertCell().textContent = book.author || 'No Author';
        
        // Create star rating display
        const ratingCell = row.insertCell();
        const rating = parseInt(book.rating) || 0;
        ratingCell.textContent = '★'.repeat(rating) + '☆'.repeat(5 - rating);
        
        // Actions cell with edit and delete buttons
        const actionsCell = row.insertCell();
        actionsCell.innerHTML = `
            <button data-index="${index}" class="edit-book-btn">Edit</button>
            <button data-index="${index}" class="delete-book-btn">Delete</button>
        `;
    });
    
    // Add event listeners to the edit and delete buttons
    document.querySelectorAll('.edit-book-btn').forEach(button => {
        button.addEventListener('click', handleEditBook);
    });
    
    document.querySelectorAll('.delete-book-btn').forEach(button => {
        button.addEventListener('click', handleDeleteBook);
    });
}

function handleEditBook(event) {
    const index = event.target.dataset.index;
    const book = books[index];
    
    formTitle.textContent = 'Edit Book';
    bookIndex.value = index;
    titleInput.value = book.title || '';
    authorInput.value = book.author || '';
    spineColorInput.value = book.spineColor || '#ca0b0b';
    titleColorInput.value = book.titleColor || '#ffffff';
    authorColorInput.value = book.authorColor || '#ffffff';
    ratingInput.value = book.rating || '5';
    genreInput.value = book.genre || '';
    datesReadInput.value = book.datesRead || '';
    reviewInput.value = book.review || '';
    
    // Scroll to the form
    bookForm.scrollIntoView({ behavior: 'smooth' });
}

function handleDeleteBook(event) {
    const index = event.target.dataset.index;
    const book = books[index];
    
    if (confirm(`Are you sure you want to delete "${book.title}" by ${book.author}?`)) {
        books.splice(index, 1);
        renderBookTable();
    }
}

function resetBookForm() {
    formTitle.textContent = 'Add New Book';
    bookIndex.value = '';
    bookForm.reset();
    // Set default colors
    spineColorInput.value = '#ca0b0b';
    titleColorInput.value = '#ffffff';
    authorColorInput.value = '#ffffff';
}

// Book form submission handler
if (bookForm) {
    bookForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const bookData = {
            title: titleInput.value,
            author: authorInput.value,
            spineColor: spineColorInput.value,
            titleColor: titleColorInput.value,
            authorColor: authorColorInput.value,
            rating: parseInt(ratingInput.value),
            genre: genreInput.value,
            datesRead: datesReadInput.value,
            review: reviewInput.value
        };
        
        const index = bookIndex.value;
        if (index === '') {
            // Add new book
            books.push(bookData);
        } else {
            // Update existing book
            books[index] = bookData;
        }
        
        renderBookTable();
        resetBookForm();
    });
}

// Cancel button handler
if (cancelBtn) {
    cancelBtn.addEventListener('click', resetBookForm);
}

// --- Photo Management Functions ---
async function loadPhotos() {
    try {
        const response = await fetch('data/images.json?_=' + new Date().getTime()); // Cache busting
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        photos = Array.isArray(data) ? data : [];
        renderPhotoTable();
    } catch (error) {
        console.error("Could not load photos:", error);
        if (photoTableBody) {
            photoTableBody.innerHTML = '<tr><td colspan="4">Error loading photos. Check console or data/images.json.</td></tr>';
        }
    }
}

function renderPhotoTable() {
    if (!photoTableBody) return;
    photoTableBody.innerHTML = '';
    photos.forEach((photo, index) => {
        const row = photoTableBody.insertRow();
        // Example: Show thumbnail, title, coords
        const thumbCell = row.insertCell();
        // Note: Adjust path if needed. Assumes images are relative to root 'img/'
        thumbCell.innerHTML = photo.thumbnail ? `<img src="img/${photo.thumbnail}" alt="thumbnail" width="50" height="50" style="object-fit: cover;">` : 'No thumb';
        row.insertCell().textContent = photo.title || 'N/A';
        row.insertCell().textContent = (photo.lat && photo.lng) ? `${photo.lat.toFixed(4)}, ${photo.lng.toFixed(4)}` : 'N/A';
        const actionsCell = row.insertCell();
        actionsCell.innerHTML = `
            <button data-index="${index}" class="edit-photo-btn" disabled>Edit</button>
            <button data-index="${index}" class="delete-photo-btn" disabled>Delete</button>
        `;
    });
}

// --- Project Management Functions ---
async function loadProjects() {
    try {
        // Try to load projects.json, create it if it doesn't exist
        const response = await fetch('data/projects.json?_=' + new Date().getTime()); // Cache busting
        if (!response.ok) {
            console.log("projects.json not found, using empty array");
            projects = [];
        } else {
            const data = await response.json();
            projects = Array.isArray(data) ? data : [];
        }
        renderProjectList();
    } catch (error) {
        console.error("Could not load projects:", error);
        projects = []; // Use empty array
        if (projectTableBody) {
            projectTableBody.innerHTML = `<tr><td colspan="3">Error loading projects. Check console or ensure 'data/projects.json' exists and is valid JSON. ${error.message}</td></tr>`;
        }
    }
}

function renderProjectList() {
    if (!projectTableBody) return;
    projectTableBody.innerHTML = '';
    
    if (projects.length === 0) {
        projectTableBody.innerHTML = '<tr><td colspan="3">No projects found. Use "Generate Projects JSON" to create initial data.</td></tr>';
        return;
    }
    
    projects.forEach((project, index) => {
        const row = projectTableBody.insertRow();
        row.insertCell().textContent = project.title || 'N/A';
        row.insertCell().textContent = project.status || 'N/A';
        const actionsCell = row.insertCell();
        actionsCell.innerHTML = `
            <button data-index="${index}" class="edit-project-btn">Edit</button>
            <button data-index="${index}" class="delete-project-btn">Delete</button>
        `;
    });
    
    // Add event listeners to the buttons
    document.querySelectorAll('.edit-project-btn').forEach(button => {
        button.addEventListener('click', handleEditProject);
    });
    
    document.querySelectorAll('.delete-project-btn').forEach(button => {
        button.addEventListener('click', handleDeleteProject);
    });
}

function handleEditProject(event) {
    const index = event.target.dataset.index;
    const project = projects[index];
    
    // Set form fields
    projectEditIndex.value = index;
    projectIdInput.value = project.id || '';
    projectTitleInput.value = project.title || '';
    projectImageInput.value = project.image || '';
    projectSummaryInput.value = project.summary || '';
    projectRoleInput.value = project.role || '';
    projectSkillsInput.value = Array.isArray(project.skills) ? project.skills.join(', ') : '';
    projectLinksInput.value = project.links ? JSON.stringify(project.links, null, 2) : '{}';
    projectStatusInput.value = project.status || '';
    
    // Set the EasyMDE content
    if (easyMDEInstance) {
        easyMDEInstance.value(project.detailMarkdown || '');
    }
    
    // Change button text and show cancel button
    projectSubmitButton.textContent = 'Update Project';
    projectCancelButton.style.display = 'inline-block';
    
    // Scroll to the form
    projectForm.scrollIntoView({ behavior: 'smooth' });
}

function handleDeleteProject(event) {
    const index = event.target.dataset.index;
    const project = projects[index];
    
    if (confirm(`Are you sure you want to delete the project "${project.title}"?`)) {
        projects.splice(index, 1);
        renderProjectList();
    }
}

function resetProjectForm() {
    projectEditIndex.value = '-1';
    projectForm.reset();
    
    // Clear the EasyMDE editor
    if (easyMDEInstance) {
        easyMDEInstance.value('');
    }
    
    // Reset button text and hide cancel button
    projectSubmitButton.textContent = 'Add Project';
    projectCancelButton.style.display = 'none';
}

// Add event listeners for the project form
if (projectForm) {
    projectForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        try {
            // Parse skills string to array
            const skillsArray = projectSkillsInput.value
                .split(',')
                .map(skill => skill.trim())
                .filter(skill => skill !== '');
            
            // Parse links JSON string to object
            let linksObject = {};
            try {
                linksObject = JSON.parse(projectLinksInput.value);
            } catch (e) {
                console.error('Error parsing links JSON:', e);
                alert('Error parsing links. Please check the JSON format.');
                return;
            }
            
            // Get markdown content from EasyMDE
            const markdownContent = easyMDEInstance ? easyMDEInstance.value() : '';
            
            // Create project data object
            const projectData = {
                id: projectIdInput.value,
                title: projectTitleInput.value,
                image: projectImageInput.value,
                summary: projectSummaryInput.value,
                role: projectRoleInput.value,
                skills: skillsArray,
                links: linksObject,
                status: projectStatusInput.value,
                detailMarkdown: markdownContent
            };
            
            const index = projectEditIndex.value;
            if (index === '-1') {
                // Add new project
                projects.push(projectData);
            } else {
                // Update existing project
                projects[index] = projectData;
            }
            
            renderProjectList();
            resetProjectForm();
        } catch (error) {
            console.error('Error saving project:', error);
            alert('An error occurred while saving the project. Please try again.');
        }
    });
}

if (projectCancelButton) {
    projectCancelButton.addEventListener('click', resetProjectForm);
}

// --- Helper function for JSON generation/download ---
function setupSaveSection(dataType, generateBtnId, downloadBtnId, outputAreaId, dataArray, fileName) {
    const generateBtn = document.getElementById(generateBtnId);
    const downloadBtn = document.getElementById(downloadBtnId);
    const outputArea = document.getElementById(outputAreaId);

    if (generateBtn && outputArea) {
        generateBtn.addEventListener('click', () => {
            try {
                // Optional: Add sorting here if needed before stringify
                const jsonString = JSON.stringify(dataArray, null, 2);
                outputArea.value = jsonString;
                outputArea.style.display = 'block';
                if (downloadBtn) downloadBtn.disabled = false; // Enable download
            } catch (error) {
                console.error(`Error generating ${dataType} JSON:`, error);
                outputArea.value = `Error generating ${dataType} JSON. See console.`;
                outputArea.style.display = 'block';
                if (downloadBtn) downloadBtn.disabled = true;
            }
        });
    }

    if (downloadBtn && outputArea) {
        downloadBtn.disabled = true; // Start disabled
        downloadBtn.addEventListener('click', () => {
            const jsonString = outputArea.value;
            if (!jsonString || jsonString.startsWith("Error")) {
                alert(`Please generate the ${dataType} JSON first or resolve errors.`);
                return;
            }
            const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        });
    }
    // Hide textareas initially
    if(outputArea) outputArea.style.display = 'none';
}