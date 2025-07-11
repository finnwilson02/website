// js/admin.js

// EasyMDE instance
let easyMDEInstance = null;

// Coordinate map variables
let coordMap = null;
let coordMarker = null;

// Selectors for login and content
const loginSection = document.getElementById('loginSection');
const adminContent = document.getElementById('adminContent');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('loginButton');
const loginError = document.getElementById('loginError');
const logoutButton = document.getElementById('logoutButton');
const loadingIndicator = document.getElementById('loadingIndicator');
const notificationArea = document.getElementById('adminNotifications');

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
const photoForm = document.getElementById('photoForm');
const photoEditIndex = document.getElementById('photoEditIndex');
const photoThumbnailInput = document.getElementById('photoThumbnail');
const photoTitleInput = document.getElementById('photoTitle');
const photoDateInput = document.getElementById('photoDate');
const photoDescriptionInput = document.getElementById('photoDescription');
const photoLatInput = document.getElementById('photoLat');
const photoLngInput = document.getElementById('photoLng');
const photoRankingInput = document.getElementById('photoRanking');
const photoTagsInput = document.getElementById('photoTags');
const photoTripIdSelect = document.getElementById('photoTripIdSelect');
// Country field removed - will be auto-determined by server
const photoSubmitButton = document.getElementById('photoSubmitButton');
const photoCancelButton = document.getElementById('photoCancelButton');

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
const projectLinksContainer = document.getElementById('projectLinksContainer');
const addProjectLinkButton = document.getElementById('addProjectLinkButton');
const noLinksMsg = document.getElementById('noLinksMsg');
const projectStatusInput = document.getElementById('projectStatus');
const projectDetailMarkdownInput = document.getElementById('projectDetailMarkdown');
const projectSubmitButton = document.getElementById('projectSubmitButton');
const projectCancelButton = document.getElementById('projectCancelButton');

// Function to create a new link row
function createLinkRow(linkType = '', linkUrl = '') {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'project-link-row';
    rowDiv.style.display = 'flex';
    rowDiv.style.marginBottom = '5px';
    rowDiv.style.gap = '5px'; // Add spacing between elements

    // Select dropdown for link type
    const typeSelect = document.createElement('select');
    typeSelect.className = 'project-link-type';
    const types = ['GitHub', 'Demo', 'Research', 'Website', 'Other']; // Define link types
    types.forEach(type => {
        const option = document.createElement('option');
        option.value = type.toLowerCase(); // Use lowercase for consistency
        option.textContent = type;
        if (type.toLowerCase() === linkType.toLowerCase()) {
            option.selected = true;
        }
        typeSelect.appendChild(option);
    });

    // Input for URL
    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.className = 'project-link-url';
    urlInput.placeholder = 'Link URL (e.g., https://...)';
    urlInput.value = linkUrl;
    urlInput.style.flexGrow = '1'; // Allow URL input to take available space

    // Remove button
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.textContent = 'Remove';
    removeButton.className = 'remove-link-button';
    removeButton.onclick = function() { // Attach onclick handler directly
        rowDiv.remove(); // Remove this row div
        // Check if container is empty and show message
        if (projectLinksContainer && projectLinksContainer.querySelectorAll('.project-link-row').length === 0) {
            if(noLinksMsg) noLinksMsg.style.display = 'block';
        }
    };

    rowDiv.appendChild(typeSelect);
    rowDiv.appendChild(urlInput);
    rowDiv.appendChild(removeButton);

    return rowDiv;
}

// Add link button listener
if (addProjectLinkButton && projectLinksContainer) {
    addProjectLinkButton.addEventListener('click', () => {
        const newRow = createLinkRow(); // Create a new blank row
        projectLinksContainer.appendChild(newRow);
        if(noLinksMsg) noLinksMsg.style.display = 'none'; // Hide the 'no links' message
    });
}

// Store data arrays globally
let books = [];
let photos = [];
let projects = [];
let trips = [];
let pageContent = {}; // Global variable to hold loaded page content
let pageContentEditors = {}; // To hold EasyMDE instances for page content

// Helper to upload a file and get the server path
async function uploadFile(fileInputId) {
    const fileInput = document.getElementById(fileInputId);
    console.log(`DEBUG uploadFile: checking for files in ${fileInputId}`);
    
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        console.log(`DEBUG uploadFile: No file selected, returning success with null filePath`);
        return { success: true, filePath: null }; // No file selected, treat as success
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    // 'uploadedImage' MUST match the name expected by multer.single() on the backend
    formData.append('uploadedImage', file);

    console.log(`DEBUG uploadFile: Uploading ${file.name}, size: ${file.size}, type: ${file.type}`);
    // Show uploading indicator to user
    showNotification(`Uploading ${file.name}...`, 'info');

    try {
        console.log(`DEBUG uploadFile: Sending fetch request to /api/upload/image`);
        const response = await fetch('/api/upload/image', {
            method: 'POST',
            body: formData,
            // DO NOT set Content-Type header, browser does it for FormData
            credentials: 'include'  // Sends/receives cookies
        });
        
        console.log(`DEBUG uploadFile: Response received - status: ${response.status}, ok: ${response.ok}`);
        
        const result = await response.json(); // Always try to parse JSON
        console.log(`DEBUG uploadFile: Parsed response:`, result);

        if (!response.ok) {
            // Handle specific errors like 401 (auth) or 400 (validation)
            if (response.status === 401) {
                console.warn("Session expired or invalid during upload. Redirecting to login.");
                showNotification("Your session has expired. Please log in again.", 'error');
                if(adminContent) adminContent.style.display = 'none';
                if(loginSection) loginSection.style.display = 'block';
                if(passwordInput) passwordInput.value = '';
                const returnValue = { success: false, error: 'Unauthorized' };
                console.log(`DEBUG uploadFile: Returning due to unauthorized:`, returnValue);
                return returnValue;
            }
            throw new Error(result.error || `Upload failed with status ${response.status}`);
        }

        if (!result.success || !result.filename) {
            throw new Error(result.error || 'Upload succeeded but no filename returned.');
        }

        console.log('Upload successful, filename:', result.filename);
        const returnValue = { success: true, filename: result.filename };
        console.log(`DEBUG uploadFile: Returning success:`, returnValue);
        showNotification(`File ${file.name} uploaded successfully!`, 'success');
        return returnValue; // Return the filename from server

    } catch (error) {
        console.error('File upload failed:', error);
        showNotification(`Error uploading file: ${error.message}`, 'error');
        const returnValue = { success: false, error: error.message };
        console.log(`DEBUG uploadFile: Returning error:`, returnValue);
        return returnValue;
    } finally {
        console.log(`DEBUG uploadFile: Function completed`);
    }
}

// Helper function for showing notifications
function showNotification(message, type = 'info') {
  if (!notificationArea) return;
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.style.padding = '10px 15px';
  notification.style.marginBottom = '10px';
  notification.style.borderRadius = '4px';
  notification.style.fontSize = '14px';
  notification.style.position = 'relative';
  
  // Set color based on type
  switch(type) {
    case 'success':
      notification.style.backgroundColor = '#d4edda';
      notification.style.color = '#155724';
      notification.style.border = '1px solid #c3e6cb';
      break;
    case 'error':
      notification.style.backgroundColor = '#f8d7da';
      notification.style.color = '#721c24';
      notification.style.border = '1px solid #f5c6cb';
      break;
    case 'warning':
      notification.style.backgroundColor = '#fff3cd';
      notification.style.color = '#856404';
      notification.style.border = '1px solid #ffeeba';
      break;
    case 'info':
    default:
      notification.style.backgroundColor = '#d1ecf1';
      notification.style.color = '#0c5460';
      notification.style.border = '1px solid #bee5eb';
  }
  
  // Add close button
  const closeBtn = document.createElement('span');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.position = 'absolute';
  closeBtn.style.right = '10px';
  closeBtn.style.top = '5px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.fontWeight = 'bold';
  closeBtn.onclick = function() {
    notification.remove();
  };
  
  // Add message
  notification.textContent = message;
  notification.appendChild(closeBtn);
  
  // Add to notification area
  notificationArea.appendChild(notification);
  
  // Auto-remove after 5 seconds for success messages
  if (type === 'success') {
    setTimeout(() => {
      // Fade out effect
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 500); // Remove after fade out
    }, 5000); // Back to 5 seconds with fade effect
  }
}

// Helper function to show/hide loading indicator
function toggleLoading(show) {
  if (loadingIndicator) {
    loadingIndicator.style.display = show ? 'flex' : 'none';
  }
}

// CV data objects
let cvEducation = [];
let cvWork = [];
let cvResearch = [];
let cvProjects = [];
let cvSkills = { programming: [], software: [], technical: [] };
let cvAchievements = [];
let cvPositions = [];

// Research data objects
let researchJournal = [];
let researchThesis = {};
let researchConference = [];
let researchPatent = [];
let researchEditors = {}; // For storing EasyMDE instances

// Flag to prevent multiple initializations
let isInitialized = false;

// Common function to save data to the API
async function saveData(dataType, data, buttonElement = null) {
  console.log(`DEBUG saveData: Function called with dataType = ${dataType}`);
  console.log(`DEBUG saveData: Data structure:`, data);
  console.log(`DEBUG saveData: ButtonElement provided:`, buttonElement ? true : false);

  const endpointMap = {
    books: '/api/save/books',
    images: '/api/save/images',
    projects: '/api/save/projects',
    page_content: '/api/save/page_content',
    'cv/education': '/api/save/cv/education',
    'cv/work': '/api/save/cv/work',
    'cv/research': '/api/save/cv/research',
    'cv/projects': '/api/save/cv/projects',
    'cv/skills': '/api/save/cv/skills',
    'cv/achievements': '/api/save/cv/achievements',
    'cv/positions': '/api/save/cv/positions',
    'research/journal': '/api/save/research/journal',
    'research/thesis': '/api/save/research/thesis',
    'research/conference': '/api/save/research/conference',
    'research/patent': '/api/save/research/patent',
    'trips': '/api/save/trips'
  };
  
  const endpoint = endpointMap[dataType];
  console.log(`DEBUG saveData: Using endpoint: ${endpoint}`);
  
  if (!endpoint) {
    console.error(`Invalid data type for saving: ${dataType}`);
    showNotification(`Error: Cannot save data for type ${dataType}.`, 'error');
    return false; // Indicate failure
  }

  // Store original button text if a button was provided
  let originalButtonText = '';
  if (buttonElement) {
    originalButtonText = buttonElement.textContent || 'Save';
    buttonElement.textContent = 'Saving...';
    buttonElement.disabled = true;
    console.log(`DEBUG saveData: Original button text: "${originalButtonText}"`);
  }

  console.log(`Attempting to save ${dataType} data...`);
  try {
    console.log(`DEBUG saveData: Preparing fetch request to ${endpoint}`);
    console.log(`DEBUG saveData: Data payload size: ${JSON.stringify(data).length} bytes`);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data), // Send the data (array or object depending on type)
      credentials: 'include'  // Sends/receives cookies—add to all fetches
    });
    
    console.log(`DEBUG saveData: Response received - status: ${response.status}, ok: ${response.ok}`);

    if (!response.ok) {
      // Check for unauthorized error (session expired)
      if (response.status === 401) {
          console.warn("Session expired or invalid. Redirecting to login.");
          console.log(`DEBUG saveData: Auth error detected, status 401`);
          showNotification("Your session has expired. Please log in again.", 'error');
          // Hide admin content, show login form
          if(adminContent) adminContent.style.display = 'none';
          if(loginSection) loginSection.style.display = 'block';
          if(passwordInput) passwordInput.value = ''; // Clear password field
          return false; // Indicate save failure
      }
      
      // Handle other errors
      let errorMsg = `HTTP error! Status: ${response.status}`;
      try {
         const errData = await response.json();
         console.log(`DEBUG saveData: Error JSON parsed:`, errData);
         errorMsg += ` - ${errData.error || 'Unknown server error'}`;
      } catch (parseError) { 
         console.log(`DEBUG saveData: Failed to parse error JSON:`, parseError);
         /* Ignore if response wasn't JSON */ 
      }
      throw new Error(errorMsg);
    }

    const result = await response.json();
    console.log(`DEBUG saveData: Success response parsed:`, result);
    console.log(`Save successful for ${dataType}:`, result.message);
    showNotification(`${dataType.charAt(0).toUpperCase() + dataType.slice(1).replace('/', ' ')} data saved successfully.`, 'success');
    return true; // Indicate success

  } catch (error) {
    console.error(`Failed to save ${dataType} data:`, error);
    console.log(`DEBUG saveData: Exception caught:`, error);
    showNotification(`Error saving ${dataType} data: ${error.message}`, 'error');
    return false; // Indicate failure
  } finally {
    // Restore button state regardless of success/failure
    if (buttonElement) {
      console.log(`DEBUG saveData: Restoring button text to "${originalButtonText}"`);
      buttonElement.textContent = originalButtonText;
      buttonElement.disabled = false;
    }
    console.log(`DEBUG saveData: Function completed`);
  }
}

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

async function initializeAdminPanel() {
    if (isInitialized) return; // Don't run multiple times
    console.log("Initializing admin panel data...");
    
    try {
        // Load trips first as photo grouping depends on it
        await loadTrips(); // Ensure trips are loaded first
        
        // Then load photos which depends on trips
        await loadPhotos();
        
        // Load other data in parallel since they're independent
        await Promise.allSettled([
            loadBooks(),
            loadProjects(),
            loadPageContent(), // Load page content for legacy content
            loadCvData(), // Load all CV data from structured files
            loadResearchData() // Load all research data from structured files
        ]);
        
        initializeMarkdownEditor(); // Initialize the editor
        setupTabNavigation(); // Initialize tab navigation
        setupCvTabNavigation(); // Initialize CV sub-tab navigation
    } catch (error) {
        console.error("Error during admin panel initialization:", error);
        showNotification("Failed to initialize all admin data.", "error");
    } finally {
        isInitialized = true;
    }
}

// Tab navigation functionality
function setupTabNavigation() {
    const tabNav = document.querySelector('.admin-tabs ul.tab-nav');

    if (tabNav) {
        tabNav.addEventListener('click', (event) => {
            // Check if the clicked element is a tab link
            if (event.target.matches('a.tab-link')) {
                event.preventDefault(); // Stop browser from following href="#"

                const clickedTab = event.target;
                const targetPaneSelector = clickedTab.dataset.tabTarget;
                const targetPane = document.querySelector(targetPaneSelector);

                if (!targetPane) {
                    console.warn(`Target pane not found for selector: ${targetPaneSelector}`);
                    return;
                }

                // Remove active class from all tabs and panes first
                tabNav.querySelectorAll('.tab-link.active').forEach(tab => {
                    tab.classList.remove('active');
                });
                document.querySelectorAll('.tab-content .tab-pane.active').forEach(pane => {
                    pane.classList.remove('active');
                });

                // Add active class to the clicked tab and its target pane
                clickedTab.classList.add('active');
                targetPane.classList.add('active');

                // Special case: Re-initialize EasyMDE if the Projects tab becomes active
                if (targetPaneSelector === '#projectManagementSection') {
                    // Check if the instance exists and try to refresh or re-init if needed
                    if (easyMDEInstance && typeof easyMDEInstance.codemirror !== 'undefined') {
                        // Might need a slight delay for the element to become fully visible
                        setTimeout(() => {
                            try {
                                easyMDEInstance.codemirror.refresh();
                                console.log("Project EasyMDE refreshed.");
                            } catch (e) { 
                                console.error("Error refreshing Project EasyMDE:", e);
                            }
                        }, 10); // Small delay
                    } else {
                        // If not initialized, try initializing now
                        initializeMarkdownEditor();
                    }
                }
                
                // Refresh page content editors if CV or Research tab becomes active
                if (targetPaneSelector === '#cvContentSection' || targetPaneSelector === '#researchContentSection') {
                    // Get the prefix for the current tab
                    const prefix = targetPaneSelector === '#cvContentSection' ? 'cv_' : 'research_';
                    
                    // Refresh all relevant EasyMDE instances
                    setTimeout(() => {
                        Object.keys(pageContentEditors).forEach(key => {
                            if (key.startsWith(prefix)) {
                                try {
                                    if (pageContentEditors[key] && pageContentEditors[key].codemirror) {
                                        pageContentEditors[key].codemirror.refresh();
                                    }
                                } catch (e) {
                                    console.error(`Error refreshing ${key} editor:`, e);
                                }
                            }
                        });
                        console.log(`${prefix} content editors refreshed.`);
                    }, 10); // Small delay for render
                }
            }
        });
    }
}

// Login functionality with server-side authentication
if (loginButton) {
    loginButton.addEventListener('click', async () => {
        try {
            const password = passwordInput.value;
            
            // Send login request to server
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password }), // Send password to server
                credentials: 'include'  // Sends/receives cookies
            });
            
            if (response.ok) {
                // Login successful
                loginSection.style.display = 'none';
                loginError.style.display = 'none';
                adminContent.style.display = 'block';
                initializeAdminPanel(); // Load data only AFTER successful login
            } else {
                // Login failed
                const errorData = await response.json();
                loginError.textContent = errorData.message || 'Login failed.';
                loginError.style.display = 'block';
                passwordInput.value = ''; // Clear password field
            }
        } catch (error) {
            console.error('Login error:', error);
            loginError.textContent = 'Network error. Please try again.';
            loginError.style.display = 'block';
        }
    });
}

// Logout functionality
if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'  // Sends/receives cookies
            });
            
            if (response.ok) {
                // Clear any loaded data
                books = [];
                photos = [];
                projects = [];
                
                // Show login section, hide admin content
                adminContent.style.display = 'none';
                loginSection.style.display = 'block';
                passwordInput.value = ''; // Clear password field
                loginError.style.display = 'none';
            } else {
                showNotification('Logout failed. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Logout error:', error);
            showNotification('Network error during logout. Please try again.', 'error');
        }
    });
}

// Check authentication status on page load (optional)
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/auth/status');
        if (response.ok) {
            const data = await response.json();
            if (data.isAuthenticated) {
                // User is already authenticated, show admin panel directly
                loginSection.style.display = 'none';
                adminContent.style.display = 'block';
                initializeAdminPanel();
            }
        }
    } catch (error) {
        console.error('Error checking authentication status:', error);
    }
});

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
    toggleLoading(true);
    try {
        const response = await fetch('/api/data/books', {
            credentials: 'include'  // Sends/receives cookies
        });
        if (!response.ok) {
            let errorMsg = `HTTP error! Status: ${response.status}`;
            try { 
                const errData = await response.json(); 
                errorMsg += ` - ${errData.error || 'Unknown'}`; 
            } catch(e) {}
            throw new Error(errorMsg);
        }
        const data = await response.json();
        books = Array.isArray(data) ? data : [];
        renderBookTable();
    } catch (error) {
        console.error("Could not load books:", error);
        showNotification("Error loading books: " + error.message, 'error');
        if (bookTableBody) {
            bookTableBody.innerHTML = '<tr><td colspan="4">Error loading books. Check console or data/books.json.</td></tr>';
        }
    } finally {
        toggleLoading(false);
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
    const index = parseInt(event.target.dataset.index);
    console.log('Editing book at index:', index);
    
    if (typeof index !== 'number' || isNaN(index) || index < 0 || index >= (books?.length || 0)) {
        console.error('Invalid index for editing book:', index);
        showNotification('Invalid book index. Please reload the page.', 'error');
        return;
    }
    
    const book = books[index];
    if (!book || !book.title) {  // Check existence and key props
        console.error('Book data missing or incomplete at index:', index);
        showNotification('Book not found or data incomplete. Reloading...', 'error');
        location.reload();  // Force reload to resync
        return;
    }
    
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

async function handleDeleteBook(event) {
    const index = parseInt(event.target.dataset.index, 10);
    const book = books[index];
    
    if (confirm(`Are you sure you want to delete "${book.title}" by ${book.author}?`)) {
        let isSuccess = false;
        
        // Create a copy and modify it
        const updatedBooks = [...books]; // Create a shallow copy
        if (index >= 0 && index < updatedBooks.length) {
            updatedBooks.splice(index, 1); // Modify the copy
        } else {
            console.error("Invalid index for deleting book:", index);
            showNotification("Error: Could not delete book due to invalid index.", 'error');
            return; // Stop processing
        }
        
        // Attempt to save the ENTIRE updated COPY array
        isSuccess = await saveData('books', updatedBooks);
        
        // Handle result
        if (isSuccess) {
            // Force reload data from server to ensure sync
            await loadBooks();  // Reload to sync
            // Reset form if the deleted item was being edited
            if (parseInt(bookIndex.value, 10) === index) {
                resetBookForm();
            }
        } else {
            // FAILURE: Alert already shown by saveData
            // Do nothing here, original 'books' array is unchanged
            console.log("Delete failed. Local data array remains unchanged.");
        }
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
    bookForm.addEventListener('submit', async function(event) {
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
        
        const editIndex = bookIndex.value === '' ? -1 : parseInt(bookIndex.value, 10);
        let isSuccess = false;
        
        // Create a copy and modify it
        const updatedBooks = [...books]; // Create a shallow copy
        if (editIndex === -1) {
            updatedBooks.unshift(bookData); // Add to beginning of the copy
        } else {
            if (editIndex >= 0 && editIndex < updatedBooks.length) {
                updatedBooks[editIndex] = bookData; // Modify the copy
            } else {
                console.error("Invalid index for editing book:", editIndex);
                showNotification("Error: Could not update book due to invalid index.", 'error');
                return; // Stop processing
            }
        }
        
        // Attempt to save the ENTIRE updated COPY array with button reference
        isSuccess = await saveData('books', updatedBooks, saveBookBtn);
        
        // Handle result
        if (isSuccess) {
            // Force reload data from server to ensure sync
            await loadBooks();  // Reload to sync
            resetBookForm();      // Reset form
        } else {
            // FAILURE: Notification already shown by saveData
            // Do nothing here, original 'books' array is unchanged
            // Form is not reset, allowing user to retry
            console.log("Save failed. Local data array remains unchanged.");
        }
    });
}

// Cancel button handler
if (cancelBtn) {
    cancelBtn.addEventListener('click', resetBookForm);
}

// --- Photo Management Functions ---

// Helper function to remember the open/closed state of trip groups
function getOpenTripGroupStates() {
    const states = {};
    const tripGroups = document.querySelectorAll('#photosGroupContainer details.trip-group');
    tripGroups.forEach(group => {
        if (group.dataset.tripId) {
            states[group.dataset.tripId] = group.open;
        }
    });
    console.log("Remembered trip group states:", states);
    return states;
}

// Helper function to apply remembered open/closed states to trip groups
function applyOpenTripGroupStates(states) {
    if (!states) return;
    const tripGroups = document.querySelectorAll('#photosGroupContainer details.trip-group');
    tripGroups.forEach(group => {
        if (group.dataset.tripId && states.hasOwnProperty(group.dataset.tripId)) {
            group.open = states[group.dataset.tripId];
        }
    });
    console.log("Applied trip group states.");
}

// Function to restore default photo order for a specific trip
async function restoreDefaultPhotoOrder(tripIdToRestore) {
    console.log(`Restoring default order for tripId: ${tripIdToRestore}`);

    // Create a new array with copies of photo objects to avoid modifying the original `photos` array directly
    // until after a successful save.
    const updatedPhotos = photos.map(p => ({ ...p }));

    // Identify photos belonging to the target trip and those not in the trip
    const photosInTrip = [];
    const photosNotInTrip = [];

    updatedPhotos.forEach(photo => {
        if ((photo.tripId || "unassigned") === tripIdToRestore) {
            photosInTrip.push(photo);
        } else {
            photosNotInTrip.push(photo);
        }
    });

    if (photosInTrip.length === 0) {
        showNotification(`No photos found for trip ID: ${tripIdToRestore}`, 'info');
        return;
    }

    // Sort photos within the target trip by date (ascending), then by title (ascending)
    photosInTrip.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();

        if (dateA < dateB) return -1;
        if (dateA > dateB) return 1;
        // Dates are equal (or both empty), sort by title
        if (titleA < titleB) return -1;
        if (titleA > titleB) return 1;
        return 0;
    });

    // Re-assign orderIndex sequentially for this trip's photos
    photosInTrip.forEach((photo, newOrder) => {
        photo.orderIndex = newOrder;
    });

    // Reconstruct the full photos array with updated photosInTrip and original photosNotInTrip
    // This ensures photos in other trips retain their original orderIndex.
    const finalPhotosArray = [...photosInTrip, ...photosNotInTrip];
    // Sort the final array by tripId first (consistent grouping), then by new orderIndex
    finalPhotosArray.sort((a, b) => {
        const tripIdA = a.tripId || "unassigned";
        const tripIdB = b.tripId || "unassigned";
        if (tripIdA.localeCompare(tripIdB) !== 0) {
            return tripIdA.localeCompare(tripIdB);
        }
        return (a.orderIndex || 0) - (b.orderIndex || 0);
    });

    // Save the entire updated photos array
    // Attempt to find the button element for visual feedback during save.
    const buttonElement = document.querySelector(`.restore-order-btn[data-trip-id="${tripIdToRestore}"]`);
    const isSuccess = await saveData("images", finalPhotosArray, buttonElement);

    if (isSuccess) {
        photos = finalPhotosArray; // Update local data with the re-ordered and reconstructed array
        
        const openStates = getOpenTripGroupStates(); // Remember current UI state
        renderGroupedPhotoLists();                  // Refresh the display
        applyOpenTripGroupStates(openStates);       // Restore UI state
        showNotification(`Order restored and saved for trip: ${tripIdToRestore}`, 'success');
    } else {
        showNotification(`Failed to save restored order for trip: ${tripIdToRestore}`, 'error');
    }
}

async function loadPhotos() {
    toggleLoading(true);
    try {
        const response = await fetch('/api/data/images', {
            credentials: 'include'  // Sends/receives cookies
        });
        if (!response.ok) {
            let errorMsg = `HTTP error! Status: ${response.status}`;
            try { 
                const errData = await response.json(); 
                errorMsg += ` - ${errData.error || 'Unknown'}`; 
            } catch(e) {}
            throw new Error(errorMsg);
        }
        const data = await response.json();
        photos = Array.isArray(data) ? data : [];
        renderGroupedPhotoLists();
        return photos; // Return the photos data for promise chaining
    } catch (error) {
        console.error("Could not load photos:", error);
        showNotification("Error loading photos: " + error.message, 'error');
        const container = document.getElementById('photosGroupContainer');
        if (container) {
            container.innerHTML = '<p>Error loading photos. Check console or data/images.json.</p>';
        }
        throw error; // Rethrow to allow proper promise handling
    } finally {
        toggleLoading(false);
    }
}

function renderGroupedPhotoLists() {
    const container = document.getElementById('photosGroupContainer');
    if (!container) {
        console.log("DEBUG renderGroupedPhotoLists: container not found, exiting");
        return;
    }
    console.log("--- renderGroupedPhotoLists ---"); // Mark entry

    // Log the data arrays being used
    console.log("Global 'trips' array:", JSON.stringify(trips, null, 2)); // Log loaded trips
    console.log("Global 'photos' array (first 5):", JSON.stringify(photos.slice(0, 5), null, 2)); // Log sample photos
    
    container.innerHTML = ''; // Clear loading/previous content

    // --- Group photos by trip ID ---
    const photosByTrip = {};
    const unassignedPhotos = [];

    photos.forEach((photo, index) => {
        photo.originalIndex = index; // Store original index for editing/deleting later
        const tripId = photo.tripId;
        if (tripId && tripId !== "") {
            if (!photosByTrip[tripId]) {
                photosByTrip[tripId] = [];
            }
            photosByTrip[tripId].push(photo);
        } else {
            unassignedPhotos.push(photo);
        }
    });
    
    console.log("Generated 'photosByTrip' object:", JSON.stringify(photosByTrip, (key, value) => key === 'originalIndex' ? undefined : value, 2)); // Log grouped photos (hide originalIndex for clarity)
    console.log("Generated 'unassignedPhotos' count:", unassignedPhotos.length);
    
    // Sort photos within each trip group by orderIndex first, then by date
    Object.keys(photosByTrip).forEach(tripId => {
        photosByTrip[tripId].sort((a, b) => {
            // Sort by orderIndex if both have it
            if (a.orderIndex !== undefined && b.orderIndex !== undefined) {
                return a.orderIndex - b.orderIndex;
            }
            // Fall back to date sorting
            return (a.date || '').localeCompare(b.date || '');
        });
    });
    
    // Sort unassigned photos by date
    unassignedPhotos.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    // --- Render Function for a Single Table ---
    function createPhotoTable(photoList, tripId) {
        const table = document.createElement('table');
        table.style.width = '100%';
        table.innerHTML = `<thead><tr><th>Thumbnail</th><th>Title</th><th>Coords</th><th>Date</th><th>Ranking</th><th>Actions</th></tr></thead>`;
        const tbody = table.createTBody();
        
        photoList.forEach(photo => {
            const row = tbody.insertRow();
            
            // Make the row draggable for reordering
            row.draggable = true;
            row.dataset.photoIndex = photo.originalIndex;
            row.dataset.tripId = photo.tripId || 'unassigned';
            row.classList.add('photo-list-row');
            
            // Thumbnail cell
            const imgSrc = photo.thumbnail || '';
            const imgPath = imgSrc ? `img/${imgSrc}` : '';
            const thumbCell = row.insertCell();
            thumbCell.innerHTML = imgSrc ? 
                `<img src="${imgPath}" alt="thumbnail" width="50" height="50" style="object-fit: cover;" data-slug="${imgSrc}">` : 
                'No thumb';
            
            // Other data cells
            row.insertCell().textContent = photo.title || 'N/A';
            
            const lat = photo.lat !== undefined ? parseFloat(photo.lat) : NaN;
            const lng = photo.lng !== undefined ? parseFloat(photo.lng) : NaN;
            row.insertCell().textContent = (!isNaN(lat) && !isNaN(lng)) ? 
                `${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'N/A';
            
            row.insertCell().textContent = photo.date || 'N/A';
            row.insertCell().textContent = photo.ranking !== undefined ? photo.ranking : 'N/A';
            
            // Actions cell with original index
            const actionsCell = row.insertCell();
            actionsCell.innerHTML = `
                <div style="margin-bottom: 8px;">
                  <button class="rotL" data-slug="${imgSrc}" title="Rotate Left">⟲ Left</button>
                  <button class="rotR" data-slug="${imgSrc}" title="Rotate Right">Right ⟳</button>
                </div>
                <button data-index="${photo.originalIndex}" class="edit-photo-btn">Edit</button>
                <button data-index="${photo.originalIndex}" class="delete-photo-btn">Delete</button>
            `;
        });
        
        return table;
    }

    // --- Render Trip Sections ---
    let hasContent = false;
    console.log(`Iterating through ${trips.length} loaded trips to render sections...`); // Log start of loop
    trips.forEach(trip => {
        const tripId = trip.id;
        const tripName = trip.name;
        console.log(` Checking Trip: ID='${tripId}', Name='${tripName}'`); // Log current trip

        const tripPhotos = photosByTrip[tripId]; // Get photos using the trip ID as the key

        console.log(`  Photos found for this trip ID in photosByTrip?`, tripPhotos ? `Yes (${tripPhotos.length})` : 'No'); // Log if photos were found

        if (tripPhotos && tripPhotos.length > 0) {
            console.log(`  -> Rendering section for ${tripName}`); // Log section render start
            hasContent = true;
            const details = document.createElement('details');
            details.className = 'trip-group';
            details.dataset.tripId = tripId; // Add dataset attribute for state preservation
            const summary = document.createElement('summary');
            summary.innerHTML = `
                <strong>${trip.name || 'Unnamed Trip'}</strong>
                (${trip.dateRange || 'No Date'}) - ${tripPhotos.length} photo(s)
                <button type="button" class="restore-order-btn admin-small-button" data-trip-id="${trip.id}" title="Restore default date/name order">Reset Order</button>
            `;
            summary.style.cursor = 'pointer';
            summary.style.padding = '5px 0';
            summary.style.fontWeight = 'bold';

            const table = createPhotoTable(tripPhotos, tripId);
            details.appendChild(summary);
            details.appendChild(table);
            container.appendChild(details);
        } else {
            console.log(`  -> Skipping section for ${tripName} (no photos found in group)`); // Log skipped section
        }
    });

    // --- Render Unassigned Section ---
    if (unassignedPhotos.length > 0) {
        hasContent = true;
        const details = document.createElement('details');
        details.className = 'trip-group';
        details.dataset.tripId = 'unassigned'; // Add dataset attribute for state preservation
        details.open = true; // Open unassigned by default
        const summary = document.createElement('summary');
        summary.innerHTML = `
            <strong>Unassigned Photos</strong> - ${unassignedPhotos.length} photo(s)
            <button type="button" class="restore-order-btn admin-small-button" data-trip-id="unassigned" title="Restore default date/name order">Reset Order</button>
        `;
        summary.style.cursor = 'pointer';
        summary.style.padding = '5px 0';
        summary.style.fontWeight = 'bold';

        const table = createPhotoTable(unassignedPhotos);
        details.appendChild(summary);
        details.appendChild(table);
        container.appendChild(details);
    }

    if (!hasContent) {
        container.innerHTML = '<p>No photos found.</p>';
    }

    setupGroupedPhotoActionListeners(); // Set up event listeners via delegation
}
// Handler for image rotation
document.addEventListener('click', async e => {
    if (e.target.classList.contains('rotL') || e.target.classList.contains('rotR')) {
        const slug = e.target.dataset.slug;
        if (!slug) {
            console.error('No slug found on rotation button');
            showNotification('Error: Cannot identify image to rotate', 'error');
            return;
        }
        const dir = e.target.classList.contains('rotL') ? 'left' : 'right';
        
        // Show loading indicator
        const button = e.target;
        const originalText = button.innerHTML;
        button.innerHTML = '⟳'; // Show loading indicator
        button.disabled = true;
        
        try {
            const response = await fetch(`/api/images/${slug}/rotate`, {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({dir}),
                credentials: 'include'  // Sends/receives cookies
            });
            
            if (response.ok) {
                // Bust cache on all instances of this image
                const cacheBuster = Date.now();
                const imgElements = document.querySelectorAll(`img[src*="${slug}"]`);
                if (imgElements.length > 0) {
                    imgElements.forEach(img => {
                        img.src = img.src.split('?')[0] + '?v=' + cacheBuster;
                    });
                    showNotification(`Image rotated ${dir === 'left' ? 'counterclockwise' : 'clockwise'}`, 'success');
                } else {
                    console.warn('No image elements found to refresh after rotation');
                    showNotification('Image rotated, but thumbnail not refreshed', 'warning');
                }
            } else {
                const errorMsg = response.status === 401 ? 'Authentication required' : 'Server error';
                showNotification(`Failed to rotate image: ${errorMsg}`, 'error');
            }
        } catch (err) {
            console.error('Error rotating image:', err);
            showNotification('Error rotating image: ' + err.message, 'error');
        } finally {
            // Restore button
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }
});

function setupGroupedPhotoActionListeners() {
    const container = document.getElementById("photosGroupContainer");
    if (!container) return;

    // Remove old listener if exists (to prevent duplicates)
    if (container.dataset.listenerAttached === "true") return; // Already attached

    // Click event listener for buttons
    container.addEventListener("click", function(event) {
        const target = event.target;
        if (target.classList.contains("edit-photo-btn")) {
            handleEditPhoto({target: target}); // Pass event-like object with target
        } else if (target.classList.contains("delete-photo-btn")) {
            handleDeletePhoto({target: target}); // Pass event-like object with target
        } else if (target.classList.contains("restore-order-btn")) {
            const tripId = target.dataset.tripId;
            if (tripId) {
                console.log(`Restore order button clicked for trip: ${tripId}`);
                restoreDefaultPhotoOrder(tripId); // Call the restore function
            } else {
                console.warn("Restore button clicked but no tripId found in dataset.");
            }
        }
    });

    // Drag and drop listeners for photo reordering
    let draggedItemIndex = null;
    let draggedItemTripId = null;
    
    container.addEventListener("dragstart", function(event) {
        const row = event.target.closest(".photo-list-row");
        if (!row) return;
        
        draggedItemIndex = parseInt(row.dataset.photoIndex, 10);
        draggedItemTripId = row.dataset.tripId;
        event.dataTransfer.effectAllowed = "move";
        
        // Add a class to style the row being dragged
        row.classList.add("dragging");
    });
    
    container.addEventListener("dragover", function(event) {
        const targetRow = event.target.closest(".photo-list-row");
        if (!targetRow) return;
        
        const targetTripId = targetRow.dataset.tripId;
        
        // Only allow dropping within the same trip group
        if (draggedItemTripId === targetTripId) {
            event.preventDefault(); // Allow drop
            event.dataTransfer.dropEffect = "move";
            
            // Add visual indicator
            document.querySelectorAll(".photo-list-row.dragging-over").forEach(el => {
                el.classList.remove("dragging-over");
            });
            targetRow.classList.add("dragging-over");
        }
    });
    
    container.addEventListener("dragleave", function(event) {
        const row = event.target.closest(".photo-list-row");
        if (row) {
            row.classList.remove("dragging-over");
        }
    });
    
    container.addEventListener("drop", async function(event) {
        event.preventDefault();
        const targetRow = event.target.closest(".photo-list-row");
        if (!targetRow) return;
        
        // Get source and target photo indices
        const sourceIdx = draggedItemIndex;
        const targetIdx = parseInt(targetRow.dataset.photoIndex, 10);
        const targetTripId = targetRow.dataset.tripId;
        
        if (sourceIdx === targetIdx) return; // No change needed
        
        // Remove visual indicators
        document.querySelectorAll(".photo-list-row.dragging-over").forEach(el => {
            el.classList.remove("dragging-over");
        });
        
        // Find photos in the source array
        const sourcePhoto = photos.find(p => p.originalIndex === sourceIdx);
        const targetPhoto = photos.find(p => p.originalIndex === targetIdx);
        
        if (!sourcePhoto || !targetPhoto) {
            console.error("Could not find source or target photo");
            return;
        }
        
        // Find all photos in this trip for reordering
        const tripPhotos = photos.filter(p => (p.tripId || "unassigned") === targetTripId);
        
        // Sort by current orderIndex
        tripPhotos.sort((a, b) => {
            if (a.orderIndex !== undefined && b.orderIndex !== undefined) {
                return a.orderIndex - b.orderIndex;
            }
            return 0;
        });
        
        // Find positions in the sorted array
        const sourceArrIdx = tripPhotos.findIndex(p => p.originalIndex === sourceIdx);
        const targetArrIdx = tripPhotos.findIndex(p => p.originalIndex === targetIdx);
        
        if (sourceArrIdx === -1 || targetArrIdx === -1) {
            console.error("Could not find photos in trip array");
            return;
        }
        
        // Remove source photo and insert at target position
        const [movedPhoto] = tripPhotos.splice(sourceArrIdx, 1);
        tripPhotos.splice(targetArrIdx > sourceArrIdx ? targetArrIdx - 1 : targetArrIdx, 0, movedPhoto);
        
        // Update orderIndex values sequentially
        tripPhotos.forEach((photo, idx) => {
            photo.orderIndex = idx;
            photo.sortIndex = idx; // Set new sortIndex also (matches orderIndex for compatibility)
        });
        
        // Create updated photos array for saving
        const updatedPhotos = [...photos]; // Create a copy
        
        // Save the updated photos to the main images endpoint
        const isSuccess = await saveData("images", updatedPhotos);
        
        // Also send data to the dedicated reorder endpoint
        const items = tripPhotos.map(photo => {
            const slug = photo.imageFull || photo.thumbnail;
            return {
                slug: slug,
                idx: photo.sortIndex
            };
        });
        
        // Send new sort order to the dedicated reorder endpoint
        try {
            const response = await fetch('/api/images/reorder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',  // Sends/receives cookies
                body: JSON.stringify(items)
            });
            
            if (!response.ok) {
                console.error(`Failed to update sort order via /api/images/reorder: ${response.status}`);
            }
        } catch (error) {
            console.error('Error sending sort order update:', error);
        }
        
        if (isSuccess) {
            photos = updatedPhotos; // Update local data
            
            const openStates = getOpenTripGroupStates(); // Remember state BEFORE re-render
            renderGroupedPhotoLists();                  // Refresh the display
            applyOpenTripGroupStates(openStates);       // Apply state AFTER re-render
        }
    });
    
    container.addEventListener("dragend", function(event) {
        // Clean up
        document.querySelectorAll(".photo-list-row.dragging").forEach(el => {
            el.classList.remove("dragging");
        });
        document.querySelectorAll(".photo-list-row.dragging-over").forEach(el => {
            el.classList.remove("dragging-over");
        });
        draggedItemIndex = null;
        draggedItemTripId = null;
    });
    
    container.dataset.listenerAttached = "true"; // Mark as attached
}
// Keep the old function for compatibility, but make it call the new one
function renderPhotoTable() {
    console.log("DEBUG renderPhotoTable: Redirecting to renderGroupedPhotoLists");
    renderGroupedPhotoLists();
}

function handleEditPhoto(event) {
    const index = parseInt(event.target.dataset.index);
    console.log('Editing photo at index:', index);
    
    if (typeof index !== 'number' || isNaN(index) || index < 0 || index >= (photos?.length || 0)) {
        console.error('Invalid photo index:', index);
        showNotification('Invalid photo index. Reload page.', 'error');
        return;
    }
    
    const photo = photos[index];
    if (!photo || !photo.thumbnail) {
        console.error('Photo data missing or incomplete:', photo);
        showNotification('Photo not found. Reloading...', 'error');
        location.reload();
        return;
    }
    
    photoEditIndex.value = index;
    // Store the existing path in the hidden input
    document.getElementById("currentPhotoThumbnail").value = photo.thumbnail || "";
    // Clear the file input field
    document.getElementById("photoFile").value = null;
    
    photoTitleInput.value = photo.title || "";
    photoDateInput.value = photo.date || "";
    photoDescriptionInput.value = photo.description || "";
    photoLatInput.value = photo.lat || "";
    photoLngInput.value = photo.lng || "";
    photoRankingInput.value = photo.ranking || "5";
    photoTagsInput.value = Array.isArray(photo.tags) ? photo.tags.join(', ') : '';
    
    // Set country field
    // Country field removed - will be auto-determined by server
    
    // Set trip dropdown selection
    populateTripDropdown('photoTripIdSelect', photo.tripId);
    
    photoSubmitButton.textContent = 'Update Photo';
    photoCancelButton.style.display = 'inline-block';
    
    photoForm.scrollIntoView({ behavior: 'smooth' });
}

async function handleDeletePhoto(event) {
    const index = parseInt(event.target.dataset.index, 10);
    const photo = photos[index];
    
    if (confirm(`Are you sure you want to delete the photo "${photo.title || 'Untitled'}"?`)) {
        let isSuccess = false;
        
        // Create a copy and modify it
        const updatedPhotos = [...photos]; // Create a shallow copy
        if (index >= 0 && index < updatedPhotos.length) {
            updatedPhotos.splice(index, 1); // Modify the copy
        } else {
            console.error("Invalid index for deleting photo:", index);
            showNotification("Error: Could not delete photo due to invalid index.", 'error');
            return; // Stop processing
        }
        
        // Attempt to save the ENTIRE updated COPY array
        isSuccess = await saveData('images', updatedPhotos);
        
        // Handle result
        if (isSuccess) {
            // Force reload data from server to ensure sync
            await loadPhotos();  // Reload to sync
            
            const openStates = getOpenTripGroupStates(); // Remember state BEFORE re-render
            renderGroupedPhotoLists();                  // Re-render table
            applyOpenTripGroupStates(openStates);       // Apply state AFTER re-render
            
            // Reset form if the deleted item was being edited
            if (parseInt(photoEditIndex.value, 10) === index) {
                resetPhotoForm();
            }
        } else {
            // FAILURE: Alert already shown by saveData
            // Do nothing here, original 'photos' array is unchanged
            console.log("Delete failed. Local data array remains unchanged.");
        }
    }
}

function resetPhotoForm() {
    photoEditIndex.value = '-1';
    photoForm.reset();
    photoRankingInput.value = '5'; // Set default ranking
    
    // Clear the file input and current path
    document.getElementById('photoFile').value = null;
    document.getElementById('currentPhotoThumbnail').value = '';
    
    // Clear the width and height values
    document.getElementById('photoFullWidth').value = '';
    document.getElementById('photoFullHeight').value = '';
    
    // Reset the trip dropdown to "No Trip"
    photoTripIdSelect.value = '';
    
    // Country field removed - will be auto-determined by server
    
    photoSubmitButton.textContent = 'Add Photo';
    photoCancelButton.style.display = 'none';
}

// === Trip Management Functions ===

// Selectors for trip management
const tripTableBody = document.getElementById('tripTableBody');
const tripForm = document.getElementById('tripForm');
const tripFormTitle = document.getElementById('tripFormTitle');
const tripEditIndex = document.getElementById('tripEditIndex');
const tripNameInput = document.getElementById('tripName');
const tripDateRangeInput = document.getElementById('tripDateRange');
const tripIdInput = document.getElementById('tripId');
const tripSubmitButton = document.getElementById('tripSubmitButton');
const tripCancelButton = document.getElementById('tripCancelButton');

// Load trips data from server
async function loadTrips() {
    toggleLoading(true);
    try {
        console.log("loadTrips: Fetching trips data from server...");
        const response = await fetch('/api/data/trips', {
            credentials: 'include'  // Sends/receives cookies
        });
        if (!response.ok) {
            let errorMsg = `HTTP error! Status: ${response.status}`;
            try { 
                const errData = await response.json(); 
                errorMsg += ` - ${errData.error || 'Unknown'}`; 
            } catch(e) {}
            throw new Error(errorMsg);
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
            throw new Error("Invalid format: trips data is not an array");
        }
        
        console.log("loadTrips: Received trips data:", JSON.stringify(data, null, 2));
        trips = data;
        console.log(`Successfully loaded/updated ${trips.length} trips.`);
        console.log("loadTrips: Stored in global 'trips' array:", JSON.stringify(trips, null, 2));
        
        // --- Re-render dependent UI components ---
        renderTripTable(); // Update the trip management table
        populateTripDropdown('photoTripIdSelect'); // Update dropdown in photo form
        renderGroupedPhotoLists(); // Re-render the photo groups view
        // --- End re-rendering ---
        
        return trips; // Return the trips data for promise chaining
    } catch (error) {
        console.error("Could not load trips:", error);
        showNotification("Error loading trips: " + error.message, 'error');
        
        // Update UI to show error state
        if (tripTableBody) {
            tripTableBody.innerHTML = '<tr><td colspan="4">Error loading trips. Check console or data/trips.json.</td></tr>';
        }
        if (document.getElementById('photosGroupContainer')) {
            document.getElementById('photosGroupContainer').innerHTML = '<p>Error loading trip data, cannot display photos by group.</p>';
        }
        
        throw error; // Rethrow to allow proper promise handling
    } finally {
        toggleLoading(false);
    }
}

// Render the trips table
function renderTripTable() {
    if (!tripTableBody) return;
    
    tripTableBody.innerHTML = '';
    
    trips.forEach((trip, index) => {
        const row = tripTableBody.insertRow();
        row.insertCell().textContent = trip.name || 'N/A';
        row.insertCell().textContent = trip.dateRange || '';
        row.insertCell().textContent = trip.id || '';
        
        const actionsCell = row.insertCell();
        actionsCell.innerHTML = `
            <button data-index="${index}" class="edit-trip-btn">Edit</button>
            <button data-index="${index}" class="delete-trip-btn">Delete</button>
        `;
    });
    
    // Add event listeners to the buttons
    document.querySelectorAll('.edit-trip-btn').forEach(button => {
        button.addEventListener('click', handleEditTrip);
    });
    
    document.querySelectorAll('.delete-trip-btn').forEach(button => {
        button.addEventListener('click', handleDeleteTrip);
    });
}

// Handle edit trip button
function handleEditTrip(event) {
    const index = event.target.dataset.index;
    const trip = trips[index];
    
    tripEditIndex.value = index;
    tripNameInput.value = trip.name || '';
    tripDateRangeInput.value = trip.dateRange || '';
    tripIdInput.value = trip.id || '';
    tripIdInput.readOnly = true; // Make ID read-only when editing
    
    tripFormTitle.textContent = 'Edit Trip';
    tripSubmitButton.textContent = 'Update Trip';
    tripCancelButton.style.display = 'inline-block';
    
    tripForm.scrollIntoView({ behavior: 'smooth' });
}

// Handle delete trip button
async function handleDeleteTrip(event) {
    const index = parseInt(event.target.dataset.index, 10);
    const trip = trips[index];
    
    if (confirm(`Are you sure you want to delete the trip "${trip.name || 'Untitled'}"?`)) {
        // Create a copy and modify it
        const updatedTrips = [...trips]; // Create a shallow copy
        if (index >= 0 && index < updatedTrips.length) {
            updatedTrips.splice(index, 1); // Modify the copy
        } else {
            console.error("Invalid index for deleting trip:", index);
            showNotification("Error: Could not delete trip due to invalid index.", 'error');
            return; // Stop processing
        }
        
        // Attempt to save the ENTIRE updated COPY array
        const isSuccess = await saveData('trips', updatedTrips);
        
        // Handle result
        if (isSuccess) {
            await loadTrips(); // Reload trips data and update all UI components
            // Reset form if the deleted item was being edited
            if (parseInt(tripEditIndex.value, 10) === index) {
                resetTripForm();
            }
        } else {
            // FAILURE: Alert already shown by saveData
            console.log("Delete failed. Local data array remains unchanged.");
        }
    }
}

// Reset trip form to default state
function resetTripForm() {
    tripEditIndex.value = '-1';
    tripForm.reset();
    tripIdInput.readOnly = false; // Make ID editable again for new trips
    
    tripFormTitle.textContent = 'Add New Trip';
    tripSubmitButton.textContent = 'Add Trip';
    tripCancelButton.style.display = 'none';
}

// Trip form submission handler
if (tripForm) {
    tripForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const tripData = {
            id: tripIdInput.value,
            name: tripNameInput.value,
            dateRange: tripDateRangeInput.value
        };
        
        const editIndex = tripEditIndex.value === '-1' ? -1 : parseInt(tripEditIndex.value, 10);
        let isSuccess = false;
        
        // Create a copy and modify it
        const updatedTrips = [...trips]; // Create a shallow copy
        if (editIndex === -1) {
            updatedTrips.push(tripData); // Add to end of the copy
        } else {
            if (editIndex >= 0 && editIndex < updatedTrips.length) {
                updatedTrips[editIndex] = tripData; // Modify the copy
            } else {
                console.error("Invalid index for editing trip:", editIndex);
                showNotification("Error: Could not update trip due to invalid index.", 'error');
                return; // Stop processing
            }
        }
        
        // Attempt to save the ENTIRE updated COPY array
        isSuccess = await saveData('trips', updatedTrips, tripSubmitButton);
        
        // Handle result
        if (isSuccess) {
            await loadTrips(); // Reload trips data and update all UI components
            resetTripForm();   // Reset form
        } else {
            // FAILURE: Alert already shown by saveData
            // Do nothing here, original 'trips' array is unchanged
            console.log("Save failed. Local data array remains unchanged.");
        }
    });
}

// Trip dropdown population
function populateTripDropdown(selectElementId, selectedTripId = null) {
    const selectElement = document.getElementById(selectElementId);
    if (!selectElement) return;
    
    console.log(`populateTripDropdown: Populating dropdown ${selectElementId} with trips, selected=${selectedTripId}`);
    
    // Clear existing options except the first "No Trip" option
    while (selectElement.options.length > 1) {
        selectElement.remove(1);
    }
    
    // Add options for each trip
    trips.forEach(trip => {
        const option = document.createElement('option');
        option.value = trip.id;
        option.textContent = `${trip.name} (${trip.id})`;
        console.log(`  Added trip option: value="${trip.id}", text="${option.textContent}"`);
        
        // Set as selected if it matches the selectedTripId
        if (trip.id === selectedTripId) {
            option.selected = true;
            console.log(`  Selected this option because ${trip.id} === ${selectedTripId}`);
        }
        
        selectElement.appendChild(option);
    });
}

// Add cancel button handler for trip form
if (tripCancelButton) {
    tripCancelButton.addEventListener('click', resetTripForm);
}

// Photo form submission handler
if (photoForm) {
    photoForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        console.log("DEBUG photoForm: Form submission started");
        
        // First, handle the file upload if a file is selected
        console.log("DEBUG photoForm: Calling uploadFile('photoFile')");
        const uploadResult = await uploadFile('photoFile');
        console.log("DEBUG photoForm: Upload Result:", uploadResult);
        
        // If upload failed, stop processing. Error notification already shown by uploadFile
        if (!uploadResult.success && uploadResult.error !== undefined) {
            console.log("DEBUG photoForm: Upload failed, stopping form processing");
            return;
        }
        
        // Get the existing filename from hidden input
        const existingFilename = document.getElementById('currentPhotoThumbnail').value;
        console.log("DEBUG photoForm: Existing Filename:", existingFilename);
        
        // Determine the thumbnail filename to use
        let thumbnailFilename;
        if (uploadResult.filename) {
            // If a new file was uploaded, use its filename
            thumbnailFilename = uploadResult.filename;
            console.log("DEBUG photoForm: Using new uploaded filename");
        } else {
            // If no new file, use the existing filename from hidden input
            thumbnailFilename = existingFilename;
            console.log("DEBUG photoForm: Using existing filename (no new file)");
        }
        console.log("DEBUG photoForm: Final Thumbnail Filename:", thumbnailFilename);
        
        // Read dimensions from hidden inputs
        const widthVal = document.getElementById('photoFullWidth').value;
        const heightVal = document.getElementById('photoFullHeight').value;
        const fullWidth = parseInt(widthVal, 10) || null; // Use null if not available
        const fullHeight = parseInt(heightVal, 10) || null;
        
        const editIndex = photoEditIndex.value === '-1' ? -1 : parseInt(photoEditIndex.value, 10);
        console.log("DEBUG photoForm: Edit Index:", editIndex, "isNew:", editIndex === -1);
        
        // Get existing photo for editing case
        const existingPhoto = (editIndex === -1) ? null : photos[editIndex];
        
        const photoData = {
            thumbnail: thumbnailFilename, // Just storing the filename
            imageFull: thumbnailFilename, // Using same file for full image
            title: photoTitleInput.value,
            date: photoDateInput.value,
            description: photoDescriptionInput.value,
            lat: parseFloat(photoLatInput.value) || 0,
            lng: parseFloat(photoLngInput.value) || 0,
            ranking: parseInt(photoRankingInput.value) || 5,
            fullWidth: fullWidth, // Add width from hidden input
            fullHeight: fullHeight, // Add height from hidden input
            tags: photoTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag),
            tripId: photoTripIdSelect.value === '' ? null : photoTripIdSelect.value,
            country: null, // Will be auto-determined by server based on coordinates
            // Assign orderIndex and sortIndex: use existing if editing, else use appropriate defaults
            orderIndex: existingPhoto?.orderIndex ?? Date.now(), // Use existing or timestamp for new
            sortIndex: existingPhoto?.sortIndex ?? (photos.length) // Use existing or append to end
        };
        console.log("DEBUG photoForm: Photo Data Object:", photoData);
        
        let isSuccess = false;
        
        // Create a copy and modify it
        const updatedPhotos = [...photos]; // Create a shallow copy
        if (editIndex === -1) {
            console.log("DEBUG photoForm: Adding new photo to beginning of array");
            updatedPhotos.unshift(photoData); // Add to beginning of the copy
        } else {
            if (editIndex >= 0 && editIndex < updatedPhotos.length) {
                console.log("DEBUG photoForm: Updating existing photo at index", editIndex);
                updatedPhotos[editIndex] = photoData; // Modify the copy
            } else {
                console.error("Invalid index for editing photo:", editIndex);
                showNotification("Error: Could not update photo due to invalid index.", 'error');
                console.log("DEBUG photoForm: Invalid index, stopping processing");
                return; // Stop processing
            }
        }
        
        // Attempt to save the ENTIRE updated COPY array with button reference
        console.log("DEBUG photoForm: Calling saveData with updated photos array");
        isSuccess = await saveData('images', updatedPhotos, photoSubmitButton);
        console.log("DEBUG photoForm: Save result:", isSuccess);
        
        // Handle result
        if (isSuccess) {
            console.log("DEBUG photoForm: Save successful, updating local array and UI");
            // Force reload data from server to ensure sync
            await loadPhotos();  // Reload to sync
            
            const openStates = getOpenTripGroupStates(); // Remember state BEFORE re-render
            renderGroupedPhotoLists();                  // Re-render table
            applyOpenTripGroupStates(openStates);       // Apply state AFTER re-render
            
            resetPhotoForm();       // Reset form
        } else {
            // FAILURE: Notification already shown by saveData
            // Do nothing here, original 'photos' array is unchanged
            // Form is not reset, allowing user to retry
            console.log("DEBUG photoForm: Save failed. Local data array remains unchanged.");
        }
    });
}

// Photo cancel button handler
if (photoCancelButton) {
    photoCancelButton.addEventListener('click', resetPhotoForm);
}

// --- Project Management Functions ---
async function loadProjects() {
    toggleLoading(true);
    try {
        // Try to load projects.json, create it if it doesn't exist
        const response = await fetch('/api/data/projects', {
            credentials: 'include'  // Sends/receives cookies
        });
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
        showNotification("Error loading projects: " + error.message, 'error');
        projects = []; // Use empty array
        if (projectTableBody) {
            projectTableBody.innerHTML = `<tr><td colspan="3">Error loading projects. Check console or ensure 'data/projects.json' exists and is valid JSON. ${error.message}</td></tr>`;
        }
    } finally {
        toggleLoading(false);
    }
}

function renderProjectList() {
    console.log("DEBUG renderProjectList: Starting to render project list");
    if (!projectTableBody) {
        console.log("DEBUG renderProjectList: projectTableBody not found, exiting");
        return;
    }
    projectTableBody.innerHTML = '';
    
    console.log(`DEBUG renderProjectList: Projects array length: ${projects.length}`);
    if (projects.length === 0) {
        console.log("DEBUG renderProjectList: No projects found");
        projectTableBody.innerHTML = '<tr><td colspan="3">No projects found. Use "Generate Projects JSON" to create initial data.</td></tr>';
        return;
    }
    
    projects.forEach((project, index) => {
        console.log(`DEBUG renderProjectList: Rendering project at index ${index}:`, project);
        console.log(`DEBUG renderProjectList: Project image path: "${project.image}"`);
        
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
    
    // Store the existing path in the hidden input
    document.getElementById('currentProjectImage').value = project.image || '';
    // Clear the file input field
    document.getElementById('projectFile').value = null;
    
    projectSummaryInput.value = project.summary || '';
    projectRoleInput.value = project.role || '';
    projectSkillsInput.value = Array.isArray(project.skills) ? project.skills.join(', ') : '';
    projectStatusInput.value = project.status || '';
    
    // Populate dynamic links
    projectLinksContainer.innerHTML = ''; // Clear existing rows first
    let hasLinks = false;
    if (project.links && typeof project.links === 'object') {
        Object.entries(project.links).forEach(([type, url]) => {
            if (url) { // Only create rows for links that have a URL
                const linkRow = createLinkRow(type, url);
                projectLinksContainer.appendChild(linkRow);
                hasLinks = true;
            }
        });
    }
    // Show/hide the 'no links' message
    if(noLinksMsg) noLinksMsg.style.display = hasLinks ? 'none' : 'block';
    
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

async function handleDeleteProject(event) {
    const index = parseInt(event.target.dataset.index, 10);
    const project = projects[index];
    
    if (confirm(`Are you sure you want to delete the project "${project.title}"?`)) {
        let isSuccess = false;
        
        // Create a copy and modify it
        const updatedProjects = [...projects]; // Create a shallow copy
        if (index >= 0 && index < updatedProjects.length) {
            updatedProjects.splice(index, 1); // Modify the copy
        } else {
            console.error("Invalid index for deleting project:", index);
            showNotification("Error: Could not delete project due to invalid index.", 'error');
            return; // Stop processing
        }
        
        // Attempt to save the ENTIRE updated COPY array
        isSuccess = await saveData('projects', updatedProjects);
        
        // Handle result
        if (isSuccess) {
            // Force reload data from server to ensure sync
            await loadProjects();  // Reload to sync
            // Reset form if the deleted item was being edited
            if (parseInt(projectEditIndex.value, 10) === index) {
                resetProjectForm();
            }
        } else {
            // FAILURE: Alert already shown by saveData
            // Do nothing here, original 'projects' array is unchanged
            console.log("Delete failed. Local data array remains unchanged.");
        }
    }
}

function resetProjectForm() {
    projectEditIndex.value = '-1';
    projectForm.reset();
    
    // Clear the file input and current path
    document.getElementById('projectFile').value = null;
    document.getElementById('currentProjectImage').value = '';
    
    // Clear the width and height values
    document.getElementById('projectFullWidth').value = '';
    document.getElementById('projectFullHeight').value = '';
    
    // Clear the EasyMDE editor
    if (easyMDEInstance) {
        easyMDEInstance.value('');
    }
    
    // Clear dynamic links
    if (projectLinksContainer) projectLinksContainer.innerHTML = '';
    if(noLinksMsg) noLinksMsg.style.display = 'block'; // Show 'no links' message
    
    // Reset button text and hide cancel button
    projectSubmitButton.textContent = 'Add Project';
    projectCancelButton.style.display = 'none';
}

// Add event listeners for the project form
if (projectForm) {
    projectForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        console.log("DEBUG projectForm: Form submission started");
        
        try {
            // First, handle the file upload if a file is selected
            console.log("DEBUG projectForm: Calling uploadFile('projectFile')");
            const uploadResult = await uploadFile('projectFile');
            console.log("DEBUG projectForm: Upload Result:", uploadResult);
            
            // If upload failed, stop processing. Error notification already shown by uploadFile
            if (!uploadResult.success && uploadResult.error !== undefined) {
                console.log("DEBUG projectForm: Upload failed, stopping form processing");
                return;
            }
            
            // Get the existing filename from hidden input
            const existingFilename = document.getElementById('currentProjectImage').value;
            console.log("DEBUG projectForm: Existing Filename:", existingFilename);
            
            // Determine the image filename to use
            let imageFilename;
            if (uploadResult.filename) {
                // If a new file was uploaded, use its filename
                imageFilename = uploadResult.filename;
                console.log("DEBUG projectForm: Using new uploaded filename");
            } else {
                // If no new file, use the existing filename from hidden input
                imageFilename = existingFilename;
                console.log("DEBUG projectForm: Using existing filename (no new file)");
            }
            console.log("DEBUG projectForm: Final Image Filename:", imageFilename);
            
            // Parse skills string to array
            const skillsArray = projectSkillsInput.value
                .split(',')
                .map(skill => skill.trim())
                .filter(skill => skill !== '');
            console.log("DEBUG projectForm: Skills Array:", skillsArray);
            
            // Collect links from dynamic UI
            const collectedLinks = {};
            const linkRows = projectLinksContainer.querySelectorAll('.project-link-row');
            linkRows.forEach(rowDiv => {
                const typeSelect = rowDiv.querySelector('.project-link-type');
                const urlInput = rowDiv.querySelector('.project-link-url');
                if (typeSelect && urlInput) {
                    const linkType = typeSelect.value; // e.g., 'github', 'demo'
                    const linkUrl = urlInput.value.trim();
                    if (linkUrl) { // Only add if URL is not empty
                        collectedLinks[linkType] = linkUrl;
                    }
                }
            });
            console.log("DEBUG projectForm: Collected Links:", collectedLinks);
            
            // Get markdown content from EasyMDE
            const markdownContent = easyMDEInstance ? easyMDEInstance.value() : '';
            console.log("DEBUG projectForm: Markdown Content Length:", markdownContent.length);
            
            // Read dimensions from hidden inputs
            const widthVal = document.getElementById('projectFullWidth').value;
            const heightVal = document.getElementById('projectFullHeight').value;
            const fullWidth = parseInt(widthVal, 10) || null; // Use null if not available
            const fullHeight = parseInt(heightVal, 10) || null;
            
            // Create project data object
            const projectData = {
                id: projectIdInput.value,
                title: projectTitleInput.value,
                image: imageFilename, // Just storing the filename
                summary: projectSummaryInput.value,
                role: projectRoleInput.value,
                skills: skillsArray,
                links: collectedLinks,
                status: projectStatusInput.value,
                fullWidth: fullWidth, // Add width from hidden input
                fullHeight: fullHeight, // Add height from hidden input
                detailMarkdown: markdownContent
            };
            console.log("DEBUG projectForm: Project Data Object:", projectData);
            
            const editIndex = projectEditIndex.value === '-1' ? -1 : parseInt(projectEditIndex.value, 10);
            console.log("DEBUG projectForm: Edit Index:", editIndex, "isNew:", editIndex === -1);
            let isSuccess = false;
            
            // Create a copy and modify it
            const updatedProjects = [...projects]; // Create a shallow copy
            if (editIndex === -1) {
                console.log("DEBUG projectForm: Adding new project to beginning of array");
                updatedProjects.unshift(projectData); // Add to beginning of the copy
            } else {
                if (editIndex >= 0 && editIndex < updatedProjects.length) {
                    console.log("DEBUG projectForm: Updating existing project at index", editIndex);
                    updatedProjects[editIndex] = projectData; // Modify the copy
                } else {
                    console.error("Invalid index for editing project:", editIndex);
                    showNotification("Error: Could not update project due to invalid index.", 'error');
                    console.log("DEBUG projectForm: Invalid index, stopping processing");
                    return; // Stop processing
                }
            }
            
            // Attempt to save the ENTIRE updated COPY array with button reference
            console.log("DEBUG projectForm: Calling saveData with updated projects array");
            isSuccess = await saveData('projects', updatedProjects, projectSubmitButton);
            console.log("DEBUG projectForm: Save result:", isSuccess);
            
            // Handle result
            if (isSuccess) {
                console.log("DEBUG projectForm: Save successful, updating local array and UI");
                // Force reload data from server to ensure sync
                await loadProjects();  // Reload to sync
                resetProjectForm();         // Reset form
            } else {
                // FAILURE: Notification already shown by saveData
                // Do nothing here, original 'projects' array is unchanged
                // Form is not reset, allowing user to retry
                console.log("DEBUG projectForm: Save failed. Local data array remains unchanged.");
            }
        } catch (error) {
            console.error('Error saving project:', error);
            showNotification('An error occurred while saving the project: ' + error.message, 'error');
            console.log("DEBUG projectForm: Exception caught:", error);
        }
    });
}

if (projectCancelButton) {
    projectCancelButton.addEventListener('click', resetProjectForm);
}

// Manual save section has been removed as we now save directly to the API

// CV Management Functions
async function loadCvData() {
    console.log("Loading CV data...");
    toggleLoading(true);
    try {
        const results = await Promise.allSettled([
            fetchCvSection('education'),
            fetchCvSection('work'),
            fetchCvSection('research'),
            fetchCvSection('projects'),
            fetchCvSection('skills'),
            fetchCvSection('achievements'),
            fetchCvSection('positions')
        ]);

        // Process results and show errors if any
        let errors = [];
        results.forEach((result, index) => {
            const sections = ['education', 'work', 'research', 'projects', 'skills', 'achievements', 'positions'];
            const section = sections[index];
            
            if (result.status === 'fulfilled') {
                console.log(`Successfully loaded CV ${section} data`);
            } else {
                console.error(`Failed to load CV ${section} data:`, result.reason);
                errors.push(`${section}: ${result.reason.message}`);
            }
        });

        // Show error notification if any
        if (errors.length > 0) {
            showNotification(`Error loading some CV data: ${errors.join('; ')}`, 'error');
        }

        // Render the tables now that data is loaded
        renderCvEducationTable();
        renderCvWorkTable();
        renderCvResearchTable();
        renderCvProjectsTable();
        renderCvSkillsForm();
        renderCvAchievementsTable();
        renderCvPositionsTable();

    } catch (error) {
        console.error("Failed to load CV data:", error);
        showNotification(`Error loading CV data: ${error.message}`, 'error');
    } finally {
        toggleLoading(false);
    }
}

async function fetchCvSection(section) {
    try {
        const response = await fetch(`/api/data/cv/${section}`, {
            credentials: 'include'  // Sends/receives cookies
        });
        if (!response.ok) {
            let errorMsg = `HTTP error! Status: ${response.status}`;
            try { 
                const errData = await response.json(); 
                errorMsg += ` - ${errData.error || 'Unknown'}`; 
            } catch(e) {}
            throw new Error(errorMsg);
        }
        
        const data = await response.json();
        
        // Update the global variable based on the section
        switch(section) {
            case 'education':
                cvEducation = Array.isArray(data) ? data : [];
                break;
            case 'work':
                cvWork = Array.isArray(data) ? data : [];
                break;
            case 'research':
                cvResearch = Array.isArray(data) ? data : [];
                break;
            case 'projects':
                cvProjects = Array.isArray(data) ? data : [];
                break;
            case 'skills':
                cvSkills = (typeof data === 'object' && data !== null) ? data : { programming: [], software: [], technical: [] };
                break;
            case 'achievements':
                cvAchievements = Array.isArray(data) ? data : [];
                break;
            case 'positions':
                cvPositions = Array.isArray(data) ? data : [];
                break;
        }
        
        return data;
    } catch (error) {
        console.error(`Error fetching CV ${section} data:`, error);
        // Show error in the corresponding table
        const tableBody = document.getElementById(`${section}TableBody`);
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="4">Error loading ${section} data: ${error.message}</td></tr>`;
        }
        throw error; // Re-throw to propagate
    }
}

// Function to save a specific CV section
async function saveCvData(section, data, buttonElement = null) {
    return await saveData(`cv/${section}`, data, buttonElement);
}

// Helper function to setup CV sub-tab navigation
function setupCvTabNavigation() {
    const cvTabNav = document.querySelector('.cv-tab-nav');
    
    if (cvTabNav) {
        cvTabNav.addEventListener('click', (event) => {
            // Check if the clicked element is a CV tab link
            if (event.target.matches('a.cv-tab-link')) {
                event.preventDefault();
                
                const clickedTab = event.target;
                const targetTab = clickedTab.dataset.cvTab;
                
                // Remove active class from all CV tabs and panes
                cvTabNav.querySelectorAll('.cv-tab-link').forEach(tab => {
                    tab.classList.remove('active');
                });
                document.querySelectorAll('.cv-tab-pane').forEach(pane => {
                    pane.classList.remove('active');
                });
                
                // Add active class to clicked tab and corresponding pane
                clickedTab.classList.add('active');
                document.getElementById(`cv${targetTab.charAt(0).toUpperCase() + targetTab.slice(1)}Section`).classList.add('active');
            }
        });
    }
}

// --- Education Management ---
function renderCvEducationTable() {
    const tableBody = document.getElementById('educationTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    cvEducation.forEach((item, index) => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = item.institution || 'N/A';
        row.insertCell().textContent = item.degree || 'N/A';
        row.insertCell().textContent = item.dates || 'N/A';
        
        const actionsCell = row.insertCell();
        actionsCell.innerHTML = `
            <button data-index="${index}" class="edit-education-btn">Edit</button>
            <button data-index="${index}" class="delete-education-btn">Delete</button>
        `;
    });
    
    // Add event listeners
    document.querySelectorAll('.edit-education-btn').forEach(btn => {
        btn.addEventListener('click', handleEditEducation);
    });
    
    document.querySelectorAll('.delete-education-btn').forEach(btn => {
        btn.addEventListener('click', handleDeleteEducation);
    });
}

function handleEditEducation(event) {
    const index = event.target.dataset.index;
    const item = cvEducation[index];
    
    document.getElementById('educationEditIndex').value = index;
    document.getElementById('educationInstitution').value = item.institution || '';
    document.getElementById('educationDegree').value = item.degree || '';
    document.getElementById('educationHonours').value = item.honours || '';
    document.getElementById('educationDates').value = item.dates || '';
    
    document.getElementById('educationSubmitButton').textContent = 'Update Entry';
    document.getElementById('educationCancelButton').style.display = 'inline-block';
    
    document.getElementById('educationForm').scrollIntoView({ behavior: 'smooth' });
}

async function handleDeleteEducation(event) {
    const index = parseInt(event.target.dataset.index);
    const item = cvEducation[index];
    
    if (confirm(`Are you sure you want to delete the education entry for "${item.institution || 'Unknown Institution'}"?`)) {
        const updatedEducation = [...cvEducation];
        updatedEducation.splice(index, 1);
        
        const isSuccess = await saveCvData('education', updatedEducation);
        
        if (isSuccess) {
            cvEducation = updatedEducation;
            renderCvEducationTable();
            
            if (parseInt(document.getElementById('educationEditIndex').value) === index) {
                resetEducationForm();
            }
        }
    }
}

function resetEducationForm() {
    document.getElementById('educationEditIndex').value = '-1';
    document.getElementById('educationForm').reset();
    document.getElementById('educationSubmitButton').textContent = 'Add Entry';
    document.getElementById('educationCancelButton').style.display = 'none';
}

// Education form submit handler
const educationForm = document.getElementById('educationForm');
if (educationForm) {
    educationForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const formData = {
            institution: document.getElementById('educationInstitution').value,
            degree: document.getElementById('educationDegree').value,
            honours: document.getElementById('educationHonours').value,
            dates: document.getElementById('educationDates').value
        };
        
        const editIndex = document.getElementById('educationEditIndex').value;
        const index = editIndex === '-1' ? -1 : parseInt(editIndex);
        
        const updatedEducation = [...cvEducation];
        
        if (index === -1) {
            updatedEducation.unshift(formData);
        } else {
            updatedEducation[index] = formData;
        }
        
        const isSuccess = await saveCvData('education', updatedEducation);
        
        if (isSuccess) {
            cvEducation = updatedEducation;
            renderCvEducationTable();
            resetEducationForm();
        }
    });
}

// Education cancel button
const educationCancelButton = document.getElementById('educationCancelButton');
if (educationCancelButton) {
    educationCancelButton.addEventListener('click', resetEducationForm);
}

// --- Work Experience Management ---
function renderCvWorkTable() {
    const tableBody = document.getElementById('workTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    cvWork.forEach((item, index) => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = item.title || 'N/A';
        row.insertCell().textContent = item.company || 'N/A';
        row.insertCell().textContent = item.dates || 'N/A';
        
        const actionsCell = row.insertCell();
        actionsCell.innerHTML = `
            <button data-index="${index}" class="edit-work-btn">Edit</button>
            <button data-index="${index}" class="delete-work-btn">Delete</button>
        `;
    });
    
    // Add event listeners
    document.querySelectorAll('.edit-work-btn').forEach(btn => {
        btn.addEventListener('click', handleEditWork);
    });
    
    document.querySelectorAll('.delete-work-btn').forEach(btn => {
        btn.addEventListener('click', handleDeleteWork);
    });
}

function handleEditWork(event) {
    const index = event.target.dataset.index;
    const item = cvWork[index];
    
    document.getElementById('workEditIndex').value = index;
    document.getElementById('workTitle').value = item.title || '';
    document.getElementById('workCompany').value = item.company || '';
    document.getElementById('workDates').value = item.dates || '';
    document.getElementById('workDescription').value = item.description || '';
    
    document.getElementById('workSubmitButton').textContent = 'Update Entry';
    document.getElementById('workCancelButton').style.display = 'inline-block';
    
    document.getElementById('workForm').scrollIntoView({ behavior: 'smooth' });
}

async function handleDeleteWork(event) {
    const index = parseInt(event.target.dataset.index);
    const item = cvWork[index];
    
    if (confirm(`Are you sure you want to delete the work entry "${item.title || 'Unknown Position'}" at "${item.company || 'Unknown Company'}"?`)) {
        const updatedWork = [...cvWork];
        updatedWork.splice(index, 1);
        
        const isSuccess = await saveCvData('work', updatedWork);
        
        if (isSuccess) {
            cvWork = updatedWork;
            renderCvWorkTable();
            
            if (parseInt(document.getElementById('workEditIndex').value) === index) {
                resetWorkForm();
            }
        }
    }
}

function resetWorkForm() {
    document.getElementById('workEditIndex').value = '-1';
    document.getElementById('workForm').reset();
    document.getElementById('workSubmitButton').textContent = 'Add Entry';
    document.getElementById('workCancelButton').style.display = 'none';
}

// Work form submit handler
const workForm = document.getElementById('workForm');
if (workForm) {
    workForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const formData = {
            title: document.getElementById('workTitle').value,
            company: document.getElementById('workCompany').value,
            dates: document.getElementById('workDates').value,
            description: document.getElementById('workDescription').value
        };
        
        const editIndex = document.getElementById('workEditIndex').value;
        const index = editIndex === '-1' ? -1 : parseInt(editIndex);
        
        const updatedWork = [...cvWork];
        
        if (index === -1) {
            updatedWork.unshift(formData);
        } else {
            updatedWork[index] = formData;
        }
        
        const isSuccess = await saveCvData('work', updatedWork);
        
        if (isSuccess) {
            cvWork = updatedWork;
            renderCvWorkTable();
            resetWorkForm();
        }
    });
}

// Work cancel button
const workCancelButton = document.getElementById('workCancelButton');
if (workCancelButton) {
    workCancelButton.addEventListener('click', resetWorkForm);
}

// --- Research Experience Management ---
function renderCvResearchTable() {
    const tableBody = document.getElementById('researchTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    cvResearch.forEach((item, index) => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = item.title || 'N/A';
        row.insertCell().textContent = item.organization || 'N/A';
        row.insertCell().textContent = item.dates || 'N/A';
        
        const actionsCell = row.insertCell();
        actionsCell.innerHTML = `
            <button data-index="${index}" class="edit-research-btn">Edit</button>
            <button data-index="${index}" class="delete-research-btn">Delete</button>
        `;
    });
    
    // Add event listeners
    document.querySelectorAll('.edit-research-btn').forEach(btn => {
        btn.addEventListener('click', handleEditResearch);
    });
    
    document.querySelectorAll('.delete-research-btn').forEach(btn => {
        btn.addEventListener('click', handleDeleteResearch);
    });
}

function handleEditResearch(event) {
    const index = event.target.dataset.index;
    const item = cvResearch[index];
    
    document.getElementById('researchEditIndex').value = index;
    document.getElementById('researchTitle').value = item.title || '';
    document.getElementById('researchOrganization').value = item.organization || '';
    document.getElementById('researchDates').value = item.dates || '';
    document.getElementById('researchDescription').value = item.description || '';
    
    document.getElementById('researchSubmitButton').textContent = 'Update Entry';
    document.getElementById('researchCancelButton').style.display = 'inline-block';
    
    document.getElementById('researchForm').scrollIntoView({ behavior: 'smooth' });
}

async function handleDeleteResearch(event) {
    const index = parseInt(event.target.dataset.index);
    const item = cvResearch[index];
    
    if (confirm(`Are you sure you want to delete the research entry "${item.title || 'Unknown Position'}" at "${item.organization || 'Unknown Organization'}"?`)) {
        const updatedResearch = [...cvResearch];
        updatedResearch.splice(index, 1);
        
        const isSuccess = await saveCvData('research', updatedResearch);
        
        if (isSuccess) {
            cvResearch = updatedResearch;
            renderCvResearchTable();
            
            if (parseInt(document.getElementById('researchEditIndex').value) === index) {
                resetResearchForm();
            }
        }
    }
}

function resetResearchForm() {
    document.getElementById('researchEditIndex').value = '-1';
    document.getElementById('researchForm').reset();
    document.getElementById('researchSubmitButton').textContent = 'Add Entry';
    document.getElementById('researchCancelButton').style.display = 'none';
}

// Research form submit handler
const researchForm = document.getElementById('researchForm');
if (researchForm) {
    researchForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const formData = {
            title: document.getElementById('researchTitle').value,
            organization: document.getElementById('researchOrganization').value,
            dates: document.getElementById('researchDates').value,
            description: document.getElementById('researchDescription').value
        };
        
        const editIndex = document.getElementById('researchEditIndex').value;
        const index = editIndex === '-1' ? -1 : parseInt(editIndex);
        
        const updatedResearch = [...cvResearch];
        
        if (index === -1) {
            updatedResearch.unshift(formData);
        } else {
            updatedResearch[index] = formData;
        }
        
        const isSuccess = await saveCvData('research', updatedResearch);
        
        if (isSuccess) {
            cvResearch = updatedResearch;
            renderCvResearchTable();
            resetResearchForm();
        }
    });
}

// Research cancel button
const researchCancelButton = document.getElementById('researchCancelButton');
if (researchCancelButton) {
    researchCancelButton.addEventListener('click', resetResearchForm);
}

// --- Projects Management ---
function renderCvProjectsTable() {
    const tableBody = document.getElementById('cvProjectsTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    cvProjects.forEach((item, index) => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = item.title || 'N/A';
        row.insertCell().textContent = item.dates || 'N/A';
        
        const actionsCell = row.insertCell();
        actionsCell.innerHTML = `
            <button data-index="${index}" class="edit-cvprojects-btn">Edit</button>
            <button data-index="${index}" class="delete-cvprojects-btn">Delete</button>
        `;
    });
    
    // Add event listeners
    document.querySelectorAll('.edit-cvprojects-btn').forEach(btn => {
        btn.addEventListener('click', handleEditCvProjects);
    });
    
    document.querySelectorAll('.delete-cvprojects-btn').forEach(btn => {
        btn.addEventListener('click', handleDeleteCvProjects);
    });
}

function handleEditCvProjects(event) {
    const index = event.target.dataset.index;
    const item = cvProjects[index];
    
    document.getElementById('cvProjectsEditIndex').value = index;
    document.getElementById('cvProjectsTitle').value = item.title || '';
    document.getElementById('cvProjectsDates').value = item.dates || '';
    document.getElementById('cvProjectsDescription').value = item.description || '';
    
    document.getElementById('cvProjectsSubmitButton').textContent = 'Update Entry';
    document.getElementById('cvProjectsCancelButton').style.display = 'inline-block';
    
    document.getElementById('cvProjectsForm').scrollIntoView({ behavior: 'smooth' });
}

async function handleDeleteCvProjects(event) {
    const index = parseInt(event.target.dataset.index);
    const item = cvProjects[index];
    
    if (confirm(`Are you sure you want to delete the project entry "${item.title || 'Unknown Project'}"?`)) {
        const updatedProjects = [...cvProjects];
        updatedProjects.splice(index, 1);
        
        const isSuccess = await saveCvData('projects', updatedProjects);
        
        if (isSuccess) {
            cvProjects = updatedProjects;
            renderCvProjectsTable();
            
            if (parseInt(document.getElementById('cvProjectsEditIndex').value) === index) {
                resetCvProjectsForm();
            }
        }
    }
}

function resetCvProjectsForm() {
    document.getElementById('cvProjectsEditIndex').value = '-1';
    document.getElementById('cvProjectsForm').reset();
    document.getElementById('cvProjectsSubmitButton').textContent = 'Add Entry';
    document.getElementById('cvProjectsCancelButton').style.display = 'none';
}

// CV Projects form submit handler
const cvProjectsForm = document.getElementById('cvProjectsForm');
if (cvProjectsForm) {
    cvProjectsForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const formData = {
            title: document.getElementById('cvProjectsTitle').value,
            dates: document.getElementById('cvProjectsDates').value,
            description: document.getElementById('cvProjectsDescription').value
        };
        
        const editIndex = document.getElementById('cvProjectsEditIndex').value;
        const index = editIndex === '-1' ? -1 : parseInt(editIndex);
        
        const updatedProjects = [...cvProjects];
        
        if (index === -1) {
            updatedProjects.unshift(formData);
        } else {
            updatedProjects[index] = formData;
        }
        
        const isSuccess = await saveCvData('projects', updatedProjects);
        
        if (isSuccess) {
            cvProjects = updatedProjects;
            renderCvProjectsTable();
            resetCvProjectsForm();
        }
    });
}

// CV Projects cancel button
const cvProjectsCancelButton = document.getElementById('cvProjectsCancelButton');
if (cvProjectsCancelButton) {
    cvProjectsCancelButton.addEventListener('click', resetCvProjectsForm);
}

// --- Skills Management ---
function renderCvSkillsForm() {
    const programmingSkillsInput = document.getElementById('programmingSkills');
    const softwareSkillsInput = document.getElementById('softwareSkills');
    const technicalSkillsInput = document.getElementById('technicalSkills');
    
    if (programmingSkillsInput) {
        programmingSkillsInput.value = cvSkills.programming ? cvSkills.programming.join(', ') : '';
    }
    
    if (softwareSkillsInput) {
        softwareSkillsInput.value = cvSkills.software ? cvSkills.software.join(', ') : '';
    }
    
    if (technicalSkillsInput) {
        technicalSkillsInput.value = cvSkills.technical ? cvSkills.technical.join(', ') : '';
    }
}

// Skills form submit handler
const skillsForm = document.getElementById('skillsForm');
if (skillsForm) {
    skillsForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const programmingSkills = document.getElementById('programmingSkills').value.split(',').map(s => s.trim()).filter(s => s);
        const softwareSkills = document.getElementById('softwareSkills').value.split(',').map(s => s.trim()).filter(s => s);
        const technicalSkills = document.getElementById('technicalSkills').value.split(',').map(s => s.trim()).filter(s => s);
        
        const updatedSkills = {
            programming: programmingSkills,
            software: softwareSkills,
            technical: technicalSkills
        };
        
        const submitButton = document.getElementById('saveSkillsButton');
        const isSuccess = await saveCvData('skills', updatedSkills, submitButton);
        
        if (isSuccess) {
            cvSkills = updatedSkills;
            // Notification shown by saveData function
        }
    });
}

// --- Achievements Management ---
function renderCvAchievementsTable() {
    const tableBody = document.getElementById('achievementsTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    cvAchievements.forEach((item, index) => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = item.award || 'N/A';
        row.insertCell().textContent = item.year || 'N/A';
        
        const actionsCell = row.insertCell();
        actionsCell.innerHTML = `
            <button data-index="${index}" class="edit-achievements-btn">Edit</button>
            <button data-index="${index}" class="delete-achievements-btn">Delete</button>
        `;
    });
    
    // Add event listeners
    document.querySelectorAll('.edit-achievements-btn').forEach(btn => {
        btn.addEventListener('click', handleEditAchievements);
    });
    
    document.querySelectorAll('.delete-achievements-btn').forEach(btn => {
        btn.addEventListener('click', handleDeleteAchievements);
    });
}

function handleEditAchievements(event) {
    const index = event.target.dataset.index;
    const item = cvAchievements[index];
    
    document.getElementById('achievementsEditIndex').value = index;
    document.getElementById('achievementTitle').value = item.award || '';
    document.getElementById('achievementYear').value = item.year || '';
    
    document.getElementById('achievementsSubmitButton').textContent = 'Update Entry';
    document.getElementById('achievementsCancelButton').style.display = 'inline-block';
    
    document.getElementById('achievementsForm').scrollIntoView({ behavior: 'smooth' });
}

async function handleDeleteAchievements(event) {
    const index = parseInt(event.target.dataset.index);
    const item = cvAchievements[index];
    
    if (confirm(`Are you sure you want to delete the achievement "${item.award || 'Unknown Achievement'}"?`)) {
        const updatedAchievements = [...cvAchievements];
        updatedAchievements.splice(index, 1);
        
        const isSuccess = await saveCvData('achievements', updatedAchievements);
        
        if (isSuccess) {
            cvAchievements = updatedAchievements;
            renderCvAchievementsTable();
            
            if (parseInt(document.getElementById('achievementsEditIndex').value) === index) {
                resetAchievementsForm();
            }
        }
    }
}

function resetAchievementsForm() {
    document.getElementById('achievementsEditIndex').value = '-1';
    document.getElementById('achievementsForm').reset();
    document.getElementById('achievementsSubmitButton').textContent = 'Add Entry';
    document.getElementById('achievementsCancelButton').style.display = 'none';
}

// Achievements form submit handler
const achievementsForm = document.getElementById('achievementsForm');
if (achievementsForm) {
    achievementsForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const formData = {
            award: document.getElementById('achievementTitle').value,
            year: document.getElementById('achievementYear').value
        };
        
        const editIndex = document.getElementById('achievementsEditIndex').value;
        const index = editIndex === '-1' ? -1 : parseInt(editIndex);
        
        const updatedAchievements = [...cvAchievements];
        
        if (index === -1) {
            updatedAchievements.unshift(formData);
        } else {
            updatedAchievements[index] = formData;
        }
        
        const isSuccess = await saveCvData('achievements', updatedAchievements);
        
        if (isSuccess) {
            cvAchievements = updatedAchievements;
            renderCvAchievementsTable();
            resetAchievementsForm();
        }
    });
}

// Achievements cancel button
const achievementsCancelButton = document.getElementById('achievementsCancelButton');
if (achievementsCancelButton) {
    achievementsCancelButton.addEventListener('click', resetAchievementsForm);
}

// --- Positions Management ---
function renderCvPositionsTable() {
    const tableBody = document.getElementById('positionsTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    cvPositions.forEach((item, index) => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = item.role || 'N/A';
        row.insertCell().textContent = item.organization || 'N/A';
        row.insertCell().textContent = item.dates || 'N/A';
        
        const actionsCell = row.insertCell();
        actionsCell.innerHTML = `
            <button data-index="${index}" class="edit-positions-btn">Edit</button>
            <button data-index="${index}" class="delete-positions-btn">Delete</button>
        `;
    });
    
    // Add event listeners
    document.querySelectorAll('.edit-positions-btn').forEach(btn => {
        btn.addEventListener('click', handleEditPositions);
    });
    
    document.querySelectorAll('.delete-positions-btn').forEach(btn => {
        btn.addEventListener('click', handleDeletePositions);
    });
}

function handleEditPositions(event) {
    const index = event.target.dataset.index;
    const item = cvPositions[index];
    
    document.getElementById('positionsEditIndex').value = index;
    document.getElementById('positionTitle').value = item.role || '';
    document.getElementById('positionOrganization').value = item.organization || '';
    document.getElementById('positionDates').value = item.dates || '';
    document.getElementById('positionDescription').value = item.description || '';
    
    document.getElementById('positionsSubmitButton').textContent = 'Update Entry';
    document.getElementById('positionsCancelButton').style.display = 'inline-block';
    
    document.getElementById('positionsForm').scrollIntoView({ behavior: 'smooth' });
}

async function handleDeletePositions(event) {
    const index = parseInt(event.target.dataset.index);
    const item = cvPositions[index];
    
    if (confirm(`Are you sure you want to delete the position "${item.role || 'Unknown Position'}" at "${item.organization || 'Unknown Organization'}"?`)) {
        const updatedPositions = [...cvPositions];
        updatedPositions.splice(index, 1);
        
        const isSuccess = await saveCvData('positions', updatedPositions);
        
        if (isSuccess) {
            cvPositions = updatedPositions;
            renderCvPositionsTable();
            
            if (parseInt(document.getElementById('positionsEditIndex').value) === index) {
                resetPositionsForm();
            }
        }
    }
}

function resetPositionsForm() {
    document.getElementById('positionsEditIndex').value = '-1';
    document.getElementById('positionsForm').reset();
    document.getElementById('positionsSubmitButton').textContent = 'Add Entry';
    document.getElementById('positionsCancelButton').style.display = 'none';
}

// Positions form submit handler
const positionsForm = document.getElementById('positionsForm');
if (positionsForm) {
    positionsForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const formData = {
            role: document.getElementById('positionTitle').value,
            organization: document.getElementById('positionOrganization').value,
            dates: document.getElementById('positionDates').value,
            description: document.getElementById('positionDescription').value
        };
        
        const editIndex = document.getElementById('positionsEditIndex').value;
        const index = editIndex === '-1' ? -1 : parseInt(editIndex);
        
        const updatedPositions = [...cvPositions];
        
        if (index === -1) {
            updatedPositions.unshift(formData);
        } else {
            updatedPositions[index] = formData;
        }
        
        const isSuccess = await saveCvData('positions', updatedPositions);
        
        if (isSuccess) {
            cvPositions = updatedPositions;
            renderCvPositionsTable();
            resetPositionsForm();
        }
    });
}

// Positions cancel button
const positionsCancelButton = document.getElementById('positionsCancelButton');
if (positionsCancelButton) {
    positionsCancelButton.addEventListener('click', resetPositionsForm);
}

// Legacy Page Content Functions - Kept for Research tab
async function loadPageContent() {
    console.log("Loading page content...");
    try {
        const response = await fetch('/api/data/page_content', {
            credentials: 'include'  // Sends/receives cookies
        });
        if (!response.ok) {
            // Try parsing error from backend
            let errorMsg = `HTTP error! Status: ${response.status}`;
             try { const errData = await response.json(); errorMsg += ` - ${errData.error || 'Unknown'}`; } catch(e){}
            throw new Error(errorMsg);
        }
        pageContent = await response.json();
        console.log("Page content loaded:", pageContent);
        populateContentEditors(); // Populate editors AFTER content is loaded
    } catch (error) {
        console.error("Failed to load page content:", error);
        alert(`Error loading page content: ${error.message}`);
        // Display error in editor containers
        const researchContainer = document.getElementById('researchEditorContainer');
        if (researchContainer) researchContainer.innerHTML = `<p style="color:red;">Failed to load Research content.</p>`;
    }
}

function populateContentEditors() {
    const researchContainer = document.getElementById('researchEditorContainer');

    if (!researchContainer) {
         console.error("Research editor container not found!");
         return;
    }
    researchContainer.innerHTML = '';
    pageContentEditors = {}; // Clear old instances

    // Sort keys for consistent order
    const sortedKeys = Object.keys(pageContent).sort();

    sortedKeys.forEach(key => {
        if (!key.startsWith('research_')) return; // Skip non-research keys
        
        const container = researchContainer;
        const editorWrapper = document.createElement('div');
        editorWrapper.style.marginBottom = '15px';

        const label = document.createElement('label');
        label.textContent = `Content for: ${key}`; // Use key as label
        label.style.fontWeight = 'bold';
        label.style.display = 'block';
        label.style.marginBottom = '5px';
        label.htmlFor = `page-content-${key}`;

        const textarea = document.createElement('textarea');
        textarea.id = `page-content-${key}`;

        editorWrapper.appendChild(label);
        editorWrapper.appendChild(textarea);
        container.appendChild(editorWrapper);

        // Initialize EasyMDE for this textarea
        try {
            const editorInstance = new EasyMDE({
                element: textarea,
                spellChecker: false,
                minHeight: '150px',
            });
            editorInstance.value(pageContent[key] || ''); // Set initial value
            pageContentEditors[key] = editorInstance; // Store the instance
        } catch (e) {
            console.error(`Failed to initialize EasyMDE for key ${key}:`, e);
            // Optionally display an error message instead of the editor
            textarea.value = `Error initializing editor for ${key}.`;
            textarea.disabled = true;
        }
    });
    console.log("Populated research content editors", pageContentEditors);
}

// Save button handler for research content
document.addEventListener('DOMContentLoaded', () => {
    // Research content save button
    const saveResearchContentButton = document.getElementById('saveResearchContentButton');
    if (saveResearchContentButton) {
        saveResearchContentButton.addEventListener('click', async () => {
            // Create a copy of the current content
            const updatedContent = { ...pageContent };
            
            // Update Research-related keys
            Object.keys(pageContentEditors).forEach(key => {
                if (key.startsWith('research_')) {
                    updatedContent[key] = pageContentEditors[key].value();
                }
            });
            
            // Save to server with button reference
            const isSuccess = await saveData('page_content', updatedContent, saveResearchContentButton);
            if (isSuccess) {
                // Update our local copy (notification shown by saveData)
                pageContent = updatedContent;
            }
        });
    }
});

// === Research Management Functions ===

// Load all research data from APIs
async function loadResearchData() {
    console.log("Loading research data...");
    toggleLoading(true);
    try {
        const results = await Promise.allSettled([
            fetchResearchSection('journal'),
            fetchResearchSection('thesis'),
            fetchResearchSection('conference'),
            fetchResearchSection('patent')
        ]);

        // Process results and show errors if any
        let errors = [];
        results.forEach((result, index) => {
            const sections = ['journal', 'thesis', 'conference', 'patent'];
            const section = sections[index];
            
            if (result.status === 'fulfilled') {
                console.log(`Successfully loaded research ${section} data`);
            } else {
                console.error(`Failed to load research ${section} data:`, result.reason);
                errors.push(`${section}: ${result.reason.message}`);
            }
        });

        // Show error notification if any
        if (errors.length > 0) {
            showNotification(`Error loading some research data: ${errors.join('; ')}`, 'error');
        }

        // Render the tables now that data is loaded
        renderResearchJournalTable();
        renderResearchThesisForm();
        renderResearchConferenceTable();
        renderResearchPatentTable();

    } catch (error) {
        console.error("Failed to load research data:", error);
        showNotification(`Error loading research data: ${error.message}`, 'error');
    } finally {
        toggleLoading(false);
    }
}

// Fetch a specific research section from the API
async function fetchResearchSection(section) {
    try {
        const response = await fetch(`/api/data/research/${section}`, {
            credentials: 'include'  // Sends/receives cookies
        });
        if (!response.ok) {
            let errorMsg = `HTTP error! Status: ${response.status}`;
            try { 
                const errData = await response.json(); 
                errorMsg += ` - ${errData.error || 'Unknown'}`; 
            } catch(e) {}
            throw new Error(errorMsg);
        }
        
        const data = await response.json();
        
        // Update the global variable based on the section
        switch(section) {
            case 'journal':
                researchJournal = Array.isArray(data) ? data : [];
                break;
            case 'thesis':
                researchThesis = (typeof data === 'object' && data !== null) ? data : {};
                break;
            case 'conference':
                researchConference = Array.isArray(data) ? data : [];
                break;
            case 'patent':
                researchPatent = Array.isArray(data) ? data : [];
                break;
        }
        
        return data;
    } catch (error) {
        console.error(`Error fetching research ${section} data:`, error);
        // Show error in the corresponding table
        const tableId = section === 'thesis' ? null : `research${section.charAt(0).toUpperCase() + section.slice(1)}TableBody`;
        if (tableId) {
            const tableBody = document.getElementById(tableId);
            if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="4">Error loading ${section} data: ${error.message}</td></tr>`;
            }
        }
        throw error; // Re-throw to propagate
    }
}

// Function to save a specific research section
async function saveResearchData(section, data) {
    return await saveData(`research/${section}`, data);
}

// Create a research link row for the form
function createResearchLinkRow(type = '', url = '') {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'research-link-row';
    rowDiv.style.display = 'flex';
    rowDiv.style.marginBottom = '5px';
    rowDiv.style.gap = '5px'; // Add spacing between elements

    // Input for type
    const typeInput = document.createElement('input');
    typeInput.type = 'text';
    typeInput.className = 'research-link-type';
    typeInput.placeholder = 'Type (e.g., pdf, code, project)';
    typeInput.value = type;
    typeInput.style.width = '30%';

    // Input for URL
    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.className = 'research-link-url';
    urlInput.placeholder = 'Link URL (e.g., https://...)';
    urlInput.value = url;
    urlInput.style.flexGrow = '1'; // Allow URL input to take available space

    // Remove button
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.textContent = 'Remove';
    removeButton.className = 'remove-link-button';
    removeButton.onclick = function() { 
        rowDiv.remove(); // Remove this row div
        // Check if container is empty and show message
        const parentId = rowDiv.parentNode.id;
        const noLinksMsg = document.getElementById(parentId.replace('Container', 'NoLinksMsg'));
        if (noLinksMsg && rowDiv.parentNode.querySelectorAll('.research-link-row').length === 0) {
            noLinksMsg.style.display = 'block';
        }
    };

    rowDiv.appendChild(typeInput);
    rowDiv.appendChild(urlInput);
    rowDiv.appendChild(removeButton);

    return rowDiv;
}

// Initialize EasyMDE for research form abstract fields
function initializeResearchEditors() {
    // Journal Abstract
    if (document.getElementById('journalAbstract') && !researchEditors.journal) {
        try {
            researchEditors.journal = new EasyMDE({
                element: document.getElementById('journalAbstract'),
                spellChecker: false,
                minHeight: "200px",
                toolbar: ["bold", "italic", "heading", "|", "quote", "unordered-list", "ordered-list", "|", "link", "code", "|", "preview", "side-by-side", "fullscreen"]
            });
        } catch (e) {
            console.error("Failed to initialize Journal EasyMDE:", e);
        }
    }
    
    // Thesis Abstract
    if (document.getElementById('thesisAbstract') && !researchEditors.thesis) {
        try {
            researchEditors.thesis = new EasyMDE({
                element: document.getElementById('thesisAbstract'),
                spellChecker: false,
                minHeight: "200px",
                toolbar: ["bold", "italic", "heading", "|", "quote", "unordered-list", "ordered-list", "|", "link", "code", "|", "preview", "side-by-side", "fullscreen"]
            });
        } catch (e) {
            console.error("Failed to initialize Thesis EasyMDE:", e);
        }
    }
    
    // Conference Abstract
    if (document.getElementById('conferenceAbstract') && !researchEditors.conference) {
        try {
            researchEditors.conference = new EasyMDE({
                element: document.getElementById('conferenceAbstract'),
                spellChecker: false,
                minHeight: "200px",
                toolbar: ["bold", "italic", "heading", "|", "quote", "unordered-list", "ordered-list", "|", "link", "code", "|", "preview", "side-by-side", "fullscreen"]
            });
        } catch (e) {
            console.error("Failed to initialize Conference EasyMDE:", e);
        }
    }
    
    // Patent Abstract
    if (document.getElementById('patentAbstract') && !researchEditors.patent) {
        try {
            researchEditors.patent = new EasyMDE({
                element: document.getElementById('patentAbstract'),
                spellChecker: false,
                minHeight: "200px",
                toolbar: ["bold", "italic", "heading", "|", "quote", "unordered-list", "ordered-list", "|", "link", "code", "|", "preview", "side-by-side", "fullscreen"]
            });
        } catch (e) {
            console.error("Failed to initialize Patent EasyMDE:", e);
        }
    }
}

// Refresh EasyMDE editors when tab becomes visible
function refreshResearchEditors() {
    Object.keys(researchEditors).forEach(key => {
        if (researchEditors[key] && researchEditors[key].codemirror) {
            try {
                setTimeout(() => {
                    researchEditors[key].codemirror.refresh();
                    console.log(`${key} editor refreshed`);
                }, 10);
            } catch (e) {
                console.error(`Error refreshing ${key} editor:`, e);
            }
        }
    });
}

// --- Journal Articles Functions ---

function renderResearchJournalTable() {
    const tableBody = document.getElementById('researchJournalTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (researchJournal.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4">No journal articles found. Use the "Add Journal Article" button below.</td></tr>';
        return;
    }
    
    researchJournal.forEach((item, index) => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = item.title || 'N/A';
        row.insertCell().textContent = item.venue || 'N/A';
        row.insertCell().textContent = item.date || 'N/A';
        
        const actionsCell = row.insertCell();
        actionsCell.innerHTML = `
            <button data-index="${index}" class="edit-journal-btn">Edit</button>
            <button data-index="${index}" class="delete-journal-btn">Delete</button>
        `;
    });
    
    // Add event listeners
    document.querySelectorAll('.edit-journal-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            showResearchEntryForm('journal', index);
        });
    });
    
    document.querySelectorAll('.delete-journal-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            handleDeleteResearchEntry('journal', index);
        });
    });
}

// Journal Add Link button listener
const addJournalLinkButton = document.getElementById('addJournalLinkButton');
if (addJournalLinkButton) {
    addJournalLinkButton.addEventListener('click', function() {
        const container = document.getElementById('journalLinksContainer');
        const noLinksMsg = document.getElementById('journalNoLinksMsg');
        if (container) {
            const newRow = createResearchLinkRow(); // Create a new blank row
            container.appendChild(newRow);
            if (noLinksMsg) noLinksMsg.style.display = 'none'; // Hide the 'no links' message
        }
    });
}

// --- Thesis Functions ---

function renderResearchThesisForm() {
    // Initialize the editor first to avoid UI glitches
    if (!researchEditors.thesis) {
        initializeResearchEditors();
    }
    
    // Populate form fields
    const titleInput = document.getElementById('thesisTitle');
    const authorsInput = document.getElementById('thesisAuthors');
    const venueInput = document.getElementById('thesisVenue');
    const dateInput = document.getElementById('thesisDate');
    const linksContainer = document.getElementById('thesisLinksContainer');
    const noLinksMsg = document.getElementById('thesisNoLinksMsg');
    
    if (titleInput) titleInput.value = researchThesis.title || '';
    if (authorsInput) authorsInput.value = researchThesis.authors || '';
    if (venueInput) venueInput.value = researchThesis.venue || '';
    if (dateInput) dateInput.value = researchThesis.date || '';
    
    // Set abstract content if the editor is initialized
    if (researchEditors.thesis) {
        researchEditors.thesis.value(researchThesis.abstract || '');
    }
    
    // Clear and repopulate links
    if (linksContainer) {
        linksContainer.innerHTML = '';
        
        // Add the "no links" message back
        if (noLinksMsg) linksContainer.appendChild(noLinksMsg);
        
        // If there are links, add them as rows and hide the no links message
        let hasLinks = false;
        if (researchThesis.links && typeof researchThesis.links === 'object') {
            Object.entries(researchThesis.links).forEach(([type, url]) => {
                if (url) { // Only create rows for links that have a URL
                    const linkRow = createResearchLinkRow(type, url);
                    linksContainer.appendChild(linkRow);
                    hasLinks = true;
                }
            });
        }
        
        // Show/hide the 'no links' message
        if (noLinksMsg) noLinksMsg.style.display = hasLinks ? 'none' : 'block';
    }
}

// Thesis Add Link button listener
const addThesisLinkButton = document.getElementById('addThesisLinkButton');
if (addThesisLinkButton) {
    addThesisLinkButton.addEventListener('click', function() {
        const container = document.getElementById('thesisLinksContainer');
        const noLinksMsg = document.getElementById('thesisNoLinksMsg');
        if (container) {
            const newRow = createResearchLinkRow(); // Create a new blank row
            container.appendChild(newRow);
            if (noLinksMsg) noLinksMsg.style.display = 'none'; // Hide the 'no links' message
        }
    });
}

// Thesis Save button listener
const saveThesisButton = document.getElementById('saveThesisButton');
if (saveThesisButton) {
    saveThesisButton.addEventListener('click', async function() {
        // Gather form data
        const title = document.getElementById('thesisTitle').value;
        const authors = document.getElementById('thesisAuthors').value;
        const venue = document.getElementById('thesisVenue').value;
        const date = document.getElementById('thesisDate').value;
        const abstract = researchEditors.thesis ? researchEditors.thesis.value() : '';
        
        // Validate required fields
        if (!title || !authors || !venue) {
            showNotification("Please fill in all required fields.", 'error');
            return;
        }
        
        // Collect links
        const links = {};
        const linkRows = document.querySelectorAll('#thesisLinksContainer .research-link-row');
        linkRows.forEach(row => {
            const typeInput = row.querySelector('.research-link-type');
            const urlInput = row.querySelector('.research-link-url');
            if (typeInput && urlInput && typeInput.value && urlInput.value) {
                links[typeInput.value] = urlInput.value;
            }
        });
        
        // Create updated thesis data
        const updatedThesis = {
            title,
            authors,
            venue,
            date,
            abstract,
            links
        };
        
        // Save the data
        const isSuccess = await saveResearchData('thesis', updatedThesis);
        
        // Handle result
        if (isSuccess) {
            researchThesis = updatedThesis; // Update the local copy
            showNotification('Thesis data saved successfully!', 'success');
        }
    });
}

// --- Conference Papers Functions ---

function renderResearchConferenceTable() {
    const tableBody = document.getElementById('researchConferenceTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (researchConference.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4">No conference papers found. Use the "Add Conference Paper" button below.</td></tr>';
        return;
    }
    
    researchConference.forEach((item, index) => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = item.title || 'N/A';
        row.insertCell().textContent = item.venue || 'N/A';
        row.insertCell().textContent = item.date || 'N/A';
        
        const actionsCell = row.insertCell();
        actionsCell.innerHTML = `
            <button data-index="${index}" class="edit-conference-btn">Edit</button>
            <button data-index="${index}" class="delete-conference-btn">Delete</button>
        `;
    });
    
    // Add event listeners
    document.querySelectorAll('.edit-conference-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            showResearchEntryForm('conference', index);
        });
    });
    
    document.querySelectorAll('.delete-conference-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            handleDeleteResearchEntry('conference', index);
        });
    });
}

// Conference Add Link button listener
const addConferenceLinkButton = document.getElementById('addConferenceLinkButton');
if (addConferenceLinkButton) {
    addConferenceLinkButton.addEventListener('click', function() {
        const container = document.getElementById('conferenceLinksContainer');
        const noLinksMsg = document.getElementById('conferenceNoLinksMsg');
        if (container) {
            const newRow = createResearchLinkRow(); // Create a new blank row
            container.appendChild(newRow);
            if (noLinksMsg) noLinksMsg.style.display = 'none'; // Hide the 'no links' message
        }
    });
}

// --- Patent Functions ---

function renderResearchPatentTable() {
    const tableBody = document.getElementById('researchPatentTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (researchPatent.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4">No patents found. Use the "Add Patent" button below.</td></tr>';
        return;
    }
    
    researchPatent.forEach((item, index) => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = item.title || 'N/A';
        row.insertCell().textContent = item.venue || 'N/A';
        row.insertCell().textContent = item.date || 'N/A';
        
        const actionsCell = row.insertCell();
        actionsCell.innerHTML = `
            <button data-index="${index}" class="edit-patent-btn">Edit</button>
            <button data-index="${index}" class="delete-patent-btn">Delete</button>
        `;
    });
    
    // Add event listeners
    document.querySelectorAll('.edit-patent-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            showResearchEntryForm('patent', index);
        });
    });
    
    document.querySelectorAll('.delete-patent-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            handleDeleteResearchEntry('patent', index);
        });
    });
}

// Patent Add Link button listener
const addPatentLinkButton = document.getElementById('addPatentLinkButton');
if (addPatentLinkButton) {
    addPatentLinkButton.addEventListener('click', function() {
        const container = document.getElementById('patentLinksContainer');
        const noLinksMsg = document.getElementById('patentNoLinksMsg');
        if (container) {
            const newRow = createResearchLinkRow(); // Create a new blank row
            container.appendChild(newRow);
            if (noLinksMsg) noLinksMsg.style.display = 'none'; // Hide the 'no links' message
        }
    });
}

// --- Generic Research Entry Form Functions ---

// Show the form for adding or editing a research entry
function showResearchEntryForm(type, index = -1) {
    // Get form and relevant data
    const formId = `research${type.charAt(0).toUpperCase() + type.slice(1)}Form`;
    const form = document.getElementById(formId);
    const dataArray = type === 'journal' ? researchJournal : 
                      type === 'conference' ? researchConference : 
                      type === 'patent' ? researchPatent : [];
                      
    // Initialize the editor if not already done
    if (!researchEditors[type]) {
        initializeResearchEditors();
    }
    
    if (!form) return;
    
    // Make form visible
    form.style.display = 'block';
    
    // Set up form for add or edit
    const editIndexInput = document.getElementById(`${type}EditIndex`);
    if (editIndexInput) editIndexInput.value = index;
    
    // Clear form or populate with existing data
    if (index === -1) {
        // Adding new entry - clear form
        resetResearchEntryForm(type);
    } else {
        // Editing existing entry - populate form
        const item = dataArray[index];
        if (!item) {
            console.error(`Invalid index ${index} for ${type} data`);
            return;
        }
        
        // Fill in the form fields
        document.getElementById(`${type}Id`).value = item.id || '';
        document.getElementById(`${type}Title`).value = item.title || '';
        document.getElementById(`${type}Authors`).value = item.authors || '';
        document.getElementById(`${type}Venue`).value = item.venue || '';
        document.getElementById(`${type}Date`).value = item.date || '';
        
        // Set abstract content in EasyMDE
        if (researchEditors[type]) {
            researchEditors[type].value(item.abstract || '');
        }
        
        // Clear and repopulate links
        const linksContainer = document.getElementById(`${type}LinksContainer`);
        const noLinksMsg = document.getElementById(`${type}NoLinksMsg`);
        if (linksContainer) {
            linksContainer.innerHTML = '';
            
            // Add the "no links" message back
            if (noLinksMsg) linksContainer.appendChild(noLinksMsg);
            
            // Add link rows for existing links
            let hasLinks = false;
            if (item.links && typeof item.links === 'object') {
                Object.entries(item.links).forEach(([linkType, url]) => {
                    if (url) { // Only create rows for links that have a URL
                        const linkRow = createResearchLinkRow(linkType, url);
                        linksContainer.appendChild(linkRow);
                        hasLinks = true;
                    }
                });
            }
            
            // Show/hide the 'no links' message
            if (noLinksMsg) noLinksMsg.style.display = hasLinks ? 'none' : 'block';
        }
        
        // Update submit button text
        const submitButton = document.getElementById(`${type}SubmitButton`);
        if (submitButton) {
            submitButton.textContent = `Update ${type.charAt(0).toUpperCase() + type.slice(1)}`;
        }
        
        // Show cancel button
        const cancelButton = document.getElementById(`${type}CancelButton`);
        if (cancelButton) {
            cancelButton.style.display = 'inline-block';
        }
    }
    
    // Refresh the EasyMDE editor to ensure it's visible and rendered properly
    if (researchEditors[type] && researchEditors[type].codemirror) {
        setTimeout(() => {
            researchEditors[type].codemirror.refresh();
        }, 10);
    }
    
    // Scroll to the form
    form.scrollIntoView({ behavior: 'smooth' });
}

// Reset a research entry form to default state
function resetResearchEntryForm(type) {
    const formId = `research${type.charAt(0).toUpperCase() + type.slice(1)}Form`;
    const form = document.getElementById(formId);
    const editIndexInput = document.getElementById(`${type}EditIndex`);
    
    if (!form || !editIndexInput) return;
    
    // Reset form state
    form.reset();
    editIndexInput.value = '-1';
    
    // Clear EasyMDE content
    if (researchEditors[type]) {
        researchEditors[type].value('');
    }
    
    // Clear links container
    const linksContainer = document.getElementById(`${type}LinksContainer`);
    const noLinksMsg = document.getElementById(`${type}NoLinksMsg`);
    if (linksContainer) {
        linksContainer.innerHTML = '';
        
        // Add the "no links" message back
        if (noLinksMsg) {
            linksContainer.appendChild(noLinksMsg);
            noLinksMsg.style.display = 'block';
        }
    }
    
    // Update submit button text
    const submitButton = document.getElementById(`${type}SubmitButton`);
    if (submitButton) {
        submitButton.textContent = `Save ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    }
    
    // Hide cancel button
    const cancelButton = document.getElementById(`${type}CancelButton`);
    if (cancelButton) {
        cancelButton.style.display = 'none';
    }
}

// Handle deleting a research entry
async function handleDeleteResearchEntry(type, index) {
    // Determine which data array to use
    let dataArray, renderFunction;
    switch (type) {
        case 'journal':
            dataArray = researchJournal;
            renderFunction = renderResearchJournalTable;
            break;
        case 'conference':
            dataArray = researchConference;
            renderFunction = renderResearchConferenceTable;
            break;
        case 'patent':
            dataArray = researchPatent;
            renderFunction = renderResearchPatentTable;
            break;
        default:
            console.error(`Invalid research type: ${type}`);
            return;
    }
    
    const item = dataArray[index];
    if (!item) {
        console.error(`Invalid index ${index} for ${type} data`);
        return;
    }
    
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete "${item.title || 'Untitled'}"?`)) {
        return;
    }
    
    // Create a copy of the array and remove the item
    const updatedArray = [...dataArray];
    updatedArray.splice(index, 1);
    
    // Save the updated array
    const isSuccess = await saveResearchData(type, updatedArray);
    
    // Handle result
    if (isSuccess) {
        // Update the local data and re-render
        switch (type) {
            case 'journal': researchJournal = updatedArray; break;
            case 'conference': researchConference = updatedArray; break;
            case 'patent': researchPatent = updatedArray; break;
        }
        
        renderFunction();
        
        // Reset form if currently editing the deleted item
        const editIndexInput = document.getElementById(`${type}EditIndex`);
        if (editIndexInput && parseInt(editIndexInput.value) === index) {
            resetResearchEntryForm(type);
            
            // Also hide the form
            const form = document.getElementById(`research${type.charAt(0).toUpperCase() + type.slice(1)}Form`);
            if (form) form.style.display = 'none';
        }
    }
}

// Set up form submit handlers for research entries
document.addEventListener('DOMContentLoaded', function() {
    // Journal form submit
    const journalForm = document.getElementById('researchJournalForm');
    if (journalForm) {
        journalForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            await handleResearchFormSubmit('journal');
        });
    }
    
    // Conference form submit
    const conferenceForm = document.getElementById('researchConferenceForm');
    if (conferenceForm) {
        conferenceForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            await handleResearchFormSubmit('conference');
        });
    }
    
    // Patent form submit
    const patentForm = document.getElementById('researchPatentForm');
    if (patentForm) {
        patentForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            await handleResearchFormSubmit('patent');
        });
    }
    
    // Cancel buttons
    const cancelButtons = {
        journal: document.getElementById('journalCancelButton'),
        conference: document.getElementById('conferenceCancelButton'),
        patent: document.getElementById('patentCancelButton')
    };
    
    Object.entries(cancelButtons).forEach(([type, button]) => {
        if (button) {
            button.addEventListener('click', function() {
                resetResearchEntryForm(type);
                
                // Hide the form
                const form = document.getElementById(`research${type.charAt(0).toUpperCase() + type.slice(1)}Form`);
                if (form) form.style.display = 'none';
            });
        }
    });
    
    // Make research editors refresh when the tab is shown
    document.querySelectorAll('[data-tab-target="#researchContentSection"]').forEach(tab => {
        tab.addEventListener('click', function() {
            setTimeout(refreshResearchEditors, 50);
            
            // Initialize editors if they haven't been created yet
            if (!researchEditors.journal) {
                initializeResearchEditors();
            }
        });
    });
});

// Handle form submission for research entries
async function handleResearchFormSubmit(type) {
    // Get form and field elements
    const idInput = document.getElementById(`${type}Id`);
    const titleInput = document.getElementById(`${type}Title`);
    const authorsInput = document.getElementById(`${type}Authors`);
    const venueInput = document.getElementById(`${type}Venue`);
    const dateInput = document.getElementById(`${type}Date`);
    const editIndexInput = document.getElementById(`${type}EditIndex`);
    const linksContainer = document.getElementById(`${type}LinksContainer`);
    
    // Validate required fields
    if (!idInput.value || !titleInput.value || !authorsInput.value || !venueInput.value) {
        showNotification("Please fill in all required fields.", 'error');
        return;
    }
    
    // Collect links
    const links = {};
    const linkRows = linksContainer.querySelectorAll('.research-link-row');
    linkRows.forEach(row => {
        const typeInput = row.querySelector('.research-link-type');
        const urlInput = row.querySelector('.research-link-url');
        if (typeInput && urlInput && typeInput.value && urlInput.value) {
            links[typeInput.value] = urlInput.value;
        }
    });
    
    // Create research entry object
    const entry = {
        id: idInput.value,
        title: titleInput.value,
        authors: authorsInput.value,
        venue: venueInput.value,
        date: dateInput.value,
        abstract: researchEditors[type] ? researchEditors[type].value() : '',
        links: links
    };
    
    // Determine if adding or editing
    const index = editIndexInput.value === '-1' ? -1 : parseInt(editIndexInput.value);
    
    // Get the correct data array and render function
    let dataArray, renderFunction;
    switch (type) {
        case 'journal':
            dataArray = researchJournal;
            renderFunction = renderResearchJournalTable;
            break;
        case 'conference':
            dataArray = researchConference;
            renderFunction = renderResearchConferenceTable;
            break;
        case 'patent':
            dataArray = researchPatent;
            renderFunction = renderResearchPatentTable;
            break;
        default:
            console.error(`Invalid research type: ${type}`);
            return;
    }
    
    // Create updated array
    const updatedArray = [...dataArray];
    
    if (index === -1) {
        // Adding new entry
        updatedArray.unshift(entry);
    } else {
        // Editing existing entry
        if (index >= 0 && index < updatedArray.length) {
            updatedArray[index] = entry;
        } else {
            console.error(`Invalid index ${index} for ${type} data`);
            showNotification(`Error: Invalid index ${index}.`, 'error');
            return;
        }
    }
    
    // Save the updated array
    const isSuccess = await saveResearchData(type, updatedArray);
    
    // Handle result
    if (isSuccess) {
        // Update the local data and re-render
        switch (type) {
            case 'journal': researchJournal = updatedArray; break;
            case 'conference': researchConference = updatedArray; break;
            case 'patent': researchPatent = updatedArray; break;
        }
        
        renderFunction();
        
        // Reset and hide the form
        resetResearchEntryForm(type);
        const form = document.getElementById(`research${type.charAt(0).toUpperCase() + type.slice(1)}Form`);
        if (form) form.style.display = 'none';
    }
}

// Map and EXIF functionality for photo coordinates

// Initialize the coordinate selection map
function initializeCoordMap() {
    if (!coordMap && document.getElementById('coordMap')) { // Initialize only once
        coordMap = L.map('coordMap').setView([20, 0], 2); // Initial view
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18, attribution: '© OSM'
        }).addTo(coordMap);

        coordMap.on('click', function(e) {
            const lat = e.latlng.lat.toFixed(6);
            const lng = e.latlng.lng.toFixed(6);
            document.getElementById('photoLat').value = lat;
            document.getElementById('photoLng').value = lng;

            if (!coordMarker) {
                coordMarker = L.marker(e.latlng).addTo(coordMap);
            } else {
                coordMarker.setLatLng(e.latlng);
            }
             coordMap.panTo(e.latlng); // Center map on click
        });
        console.log("Coordinate map initialized.");
    } else if (coordMap) {
        // If map exists but was hidden, invalidate its size
        setTimeout(() => coordMap.invalidateSize(), 0);
    }
}

// Function to update map marker when lat/lng inputs change manually
function updateMapMarkerFromInputs() {
    if (!coordMap) return; // Don't do anything if map isn't visible/init

    const lat = parseFloat(document.getElementById('photoLat').value);
    const lng = parseFloat(document.getElementById('photoLng').value);

    if (!isNaN(lat) && !isNaN(lng)) {
        const latLng = L.latLng(lat, lng);
        if (!coordMarker) {
            coordMarker = L.marker(latLng).addTo(coordMap);
        } else {
            coordMarker.setLatLng(latLng);
        }
        // Only pan/zoom if the map is actually visible
        if (document.getElementById('coordMap').style.display !== 'none') {
            coordMap.setView(latLng, coordMap.getZoom() < 10 ? 10 : coordMap.getZoom()); // Zoom in if needed
        }
    } else {
        // If inputs invalid, remove marker
        if (coordMarker) {
            coordMap.removeLayer(coordMarker);
            coordMarker = null;
        }
    }
}

// Helper to convert DMS array to decimal degrees
function dmsToDecimal(dms, ref) {
    if (!dms || dms.length !== 3) return NaN;
    var degrees = dms[0].numerator ? dms[0].numerator / dms[0].denominator : dms[0];
    var minutes = dms[1].numerator ? dms[1].numerator / dms[1].denominator : dms[1];
    var seconds = dms[2].numerator ? dms[2].numerator / dms[2].denominator : dms[2];
    var dd = degrees + minutes / 60 + seconds / 3600;
    // Reference: N/S/E/W
    if (ref === 'S' || ref === 'W') {
        dd *= -1;
    }
    return dd;
}

// Add DOM Ready function for map and EXIF functionality
document.addEventListener('DOMContentLoaded', function() {
    // Show/Hide Map Button
    const showMapButton = document.getElementById('showCoordMapButton');
    const coordMapDiv = document.getElementById('coordMap');
    if (showMapButton && coordMapDiv) {
        showMapButton.addEventListener('click', () => {
            const isHidden = coordMapDiv.style.display === 'none';
            coordMapDiv.style.display = isHidden ? 'block' : 'none';
            if (isHidden) {
                initializeCoordMap(); // Initialize or invalidate size
            }
        });
    }

    // Listen to manual input changes to update map marker
    const latInput = document.getElementById('photoLat');
    const lngInput = document.getElementById('photoLng');
    if(latInput) latInput.addEventListener('change', updateMapMarkerFromInputs);
    if(lngInput) lngInput.addEventListener('change', updateMapMarkerFromInputs);

    // Listener for file input change to read EXIF and dimensions
    const photoFileInput = document.getElementById('photoFile');
    if (photoFileInput) {
        photoFileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            // Clear previous dimensions
            document.getElementById('photoFullWidth').value = '';
            document.getElementById('photoFullHeight').value = '';
            
            // Read image dimensions using FileReader
            const reader = new FileReader();
            const img = new Image();
            
            img.onload = function() {
                console.log(`Read dimensions for ${file.name}: ${this.naturalWidth} x ${this.naturalHeight}`);
                document.getElementById('photoFullWidth').value = this.naturalWidth;
                document.getElementById('photoFullHeight').value = this.naturalHeight;
                URL.revokeObjectURL(this.src); // Clean up blob URL
            };
            
            img.onerror = function() {
                console.error(`Could not load image ${file.name} to read dimensions.`);
                // Clear dimensions if loading failed
                document.getElementById('photoFullWidth').value = '';
                document.getElementById('photoFullHeight').value = '';
                showNotification(`Error reading dimensions for ${file.name}.`, 'error');
                URL.revokeObjectURL(this.src); // Clean up blob URL
            };
            
            reader.onload = function(event) {
                img.src = event.target.result; // Load image data into Image object
            };
            
            reader.onerror = function() {
                console.error(`FileReader error for ${file.name}.`);
                showNotification(`Error reading file ${file.name}.`, 'error');
            };
            
            reader.readAsDataURL(file); // Read file as Data URL

            EXIF.getData(file, function() {
                // Extract GPS data
                const lat = EXIF.getTag(this, 'GPSLatitude');
                const latRef = EXIF.getTag(this, 'GPSLatitudeRef');
                const lng = EXIF.getTag(this, 'GPSLongitude');
                const lngRef = EXIF.getTag(this, 'GPSLongitudeRef');

                console.log("EXIF GPS Data:", { lat, latRef, lng, lngRef }); // Debug

                // Process GPS data if available
                if (lat && latRef && lng && lngRef) {
                    const decLat = dmsToDecimal(lat, latRef);
                    const decLng = dmsToDecimal(lng, lngRef);

                    console.log("EXIF Coords found:", decLat, decLng);

                    if (!isNaN(decLat) && !isNaN(decLng)) {
                        document.getElementById('photoLat').value = decLat.toFixed(6);
                        document.getElementById('photoLng').value = decLng.toFixed(6);
                        showNotification('GPS Coordinates automatically extracted from photo EXIF data.', 'info');
                        updateMapMarkerFromInputs(); // Update map with EXIF coords
                        // Ensure map is visible if we found coords
                        if (coordMapDiv && coordMapDiv.style.display === 'none') {
                            showMapButton.click(); // Simulate click to show map
                        } else if (coordMap) {
                            // Map already visible, just pan/zoom
                            coordMap.setView([decLat, decLng], coordMap.getZoom() < 10 ? 10 : coordMap.getZoom());
                        }

                    } else {
                        console.warn("Could not convert EXIF GPS data to decimal.");
                    }
                } else {
                    console.log("No GPS data found in EXIF.");
                    // Maybe show a message? Or do nothing.
                }
                
                // --- Extract Date/Time Information ---
                const dateTimeOriginal = EXIF.getTag(this, "DateTimeOriginal");
                const dateTimeDigitized = EXIF.getTag(this, "DateTimeDigitized");
                // Use DateTimeOriginal first, fall back to DateTimeDigitized
                const photoDateTime = dateTimeOriginal || dateTimeDigitized;

                console.log("EXIF DateTimeOriginal:", dateTimeOriginal);
                console.log("EXIF DateTimeDigitized:", dateTimeDigitized);

                if (photoDateTime && typeof photoDateTime === 'string') {
                    // EXIF format is often 'YYYY:MM:DD HH:MM:SS'
                    // We need 'YYYY-MM-DD' for the input field
                    console.log("EXIF DateTime found:", photoDateTime);
                    // Extract the date part and replace colons with hyphens
                    const datePart = photoDateTime.split(' ')[0]; // Get 'YYYY:MM:DD'
                    if (datePart && datePart.length === 10) {
                        const formattedDate = datePart.replace(/:/g, '-'); // Replace ':' with '-'
                        // Check if format looks correct
                        if (formattedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                            document.getElementById('photoDate').value = formattedDate;
                            console.log("Formatted Date from EXIF:", formattedDate);
                            showNotification('Capture date automatically extracted from photo EXIF data.', 'info');
                        } else {
                            console.warn("Could not format extracted EXIF date correctly:", datePart);
                        }
                    } else {
                        console.warn("Unexpected EXIF date format:", datePart);
                    }
                } else {
                    console.log("No suitable DateTime EXIF tag found.");
                }
            });
        });
    }
    
    // Listener for project file input to read dimensions
    const projectFileInput = document.getElementById('projectFile');
    if (projectFileInput) {
        projectFileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            // Clear previous dimensions
            document.getElementById('projectFullWidth').value = '';
            document.getElementById('projectFullHeight').value = '';
            
            // Read image dimensions using FileReader
            const reader = new FileReader();
            const img = new Image();
            
            img.onload = function() {
                console.log(`Read project image dimensions for ${file.name}: ${this.naturalWidth} x ${this.naturalHeight}`);
                document.getElementById('projectFullWidth').value = this.naturalWidth;
                document.getElementById('projectFullHeight').value = this.naturalHeight;
                URL.revokeObjectURL(this.src); // Clean up blob URL
            };
            
            img.onerror = function() {
                console.error(`Could not load project image ${file.name} to read dimensions.`);
                // Clear dimensions if loading failed
                document.getElementById('projectFullWidth').value = '';
                document.getElementById('projectFullHeight').value = '';
                showNotification(`Error reading dimensions for ${file.name}.`, 'error');
                URL.revokeObjectURL(this.src); // Clean up blob URL
            };
            
            reader.onload = function(event) {
                img.src = event.target.result; // Load image data into Image object
            };
            
            reader.onerror = function() {
                console.error(`FileReader error for ${file.name}.`);
                showNotification(`Error reading file ${file.name}.`, 'error');
            };
            
            reader.readAsDataURL(file); // Read file as Data URL
        });
    }
});