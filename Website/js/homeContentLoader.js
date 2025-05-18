// homeContentLoader.js
// Loads the homepage content from the API and renders markdown
// Also contains editor functionality for admin panel

document.addEventListener('DOMContentLoaded', async function() {
  // Check if we're on the homepage
  const homeContent = document.getElementById('homeContent');
  
  if (homeContent) {
    // We're on the homepage, load content for display
    loadHomeContent(homeContent);
  }
  
  // Check if we're on the admin content page
  if (document.body.dataset.page === 'content') {
    // We're on the admin content page, nothing to do here as editors are initialized separately
  }
});

// Function to load the marked library dynamically if not already loaded
function loadMarkedLibrary() {
  return new Promise((resolve, reject) => {
    if (window.marked) {
      resolve(); // Library already loaded
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load marked.js library'));
    document.head.appendChild(script);
  });
}

// Function to load the homepage content for display
async function loadHomeContent(homeContent) {
  // Add the GitHub markdown CSS if not already added
  if (!document.querySelector('link[href*="github-markdown-css"]')) {
    const markdownStylesheet = document.createElement('link');
    markdownStylesheet.rel = 'stylesheet';
    markdownStylesheet.href = 'https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.2.0/github-markdown-light.min.css';
    document.head.appendChild(markdownStylesheet);
  }
  
  try {
    // Show a loading state
    homeContent.innerHTML = '<div style="text-align: center; padding: 20px;"><p>Loading content...</p></div>';
    
    // Load the marked library if needed
    await loadMarkedLibrary();
    
    // Fetch homepage content from API
    const response = await fetch('/api/content/homepage');
    
    if (response.ok) {
      const markdownContent = await response.text();
      
      // Apply the markdown-body class to the container
      homeContent.className = 'content-section markdown-body';
      
      // Set some reasonable CSS margins and padding
      homeContent.style.padding = '20px';
      homeContent.style.maxWidth = '960px';
      homeContent.style.margin = '0 auto';
      
      // Convert markdown to HTML and set the content
      homeContent.innerHTML = marked.parse(markdownContent);
    } else {
      // If API request fails, load a fallback content
      console.error('Failed to load homepage content:', response.statusText);
      homeContent.innerHTML = `
        <section id="intro">
          <h2>Hello! I'm Finn.</h2>
          <p>
            Welcome to my website. Please check back later as we're experiencing some technical difficulties.
          </p>
          <p>
            In the meantime, feel free to explore the other sections of the site.
          </p>
        </section>
      `;
    }
  } catch (error) {
    // Handle any errors that occur during fetching
    console.error('Error loading homepage content:', error);
    homeContent.innerHTML = `
      <section id="intro">
        <h2>Hello! I'm Finn.</h2>
        <p>
          Welcome to my website. Please check back later as we're experiencing some technical difficulties.
        </p>
        <p>
          In the meantime, feel free to explore the other sections of the site.
        </p>
      </section>
    `;
  }
}

// Initialize the homepage editor in admin panel
function initHomepageEditor() {
  // Check if the editor exists regardless of page
  const homepageEditor = document.getElementById('homepageEditor');
  const markdownPreview = document.getElementById('markdownPreview');
  const saveHomepageBtn = document.getElementById('saveHomepageBtn');
  const homepageSaveStatus = document.getElementById('homepageSaveStatus');
  
  if (!homepageEditor || !markdownPreview || !saveHomepageBtn) {
    console.error('Homepage editor elements not found');
    return;
  }
  
  // Initialize EasyMDE (content loading is handled by homepageEditor.js)
  const easyMDE = new EasyMDE({
    element: homepageEditor,
    spellChecker: false,
    autosave: {
      enabled: true,
      delay: 1000,
      uniqueId: 'homepageContent'
    },
    previewRender: function(plainText) {
      return marked.parse(plainText);
    },
    hideIcons: ['side-by-side', 'fullscreen']
  });
  
  // Update preview on input
  easyMDE.codemirror.on('change', () => {
    if (markdownPreview) {
      markdownPreview.innerHTML = marked.parse(easyMDE.value());
    }
  });
  
  // Initial preview render will happen after content is loaded by homepageEditor.js
  
  // Save homepage content
  saveHomepageBtn.addEventListener('click', () => {
    saveHomepage(easyMDE.value(), homepageSaveStatus);
  });
}

// Save homepage content
function saveHomepage(content, statusElement) {
  if (!statusElement) return;
  
  statusElement.textContent = 'Saving...';
  statusElement.style.color = '#666';
  
  fetch('/api/content/homepage', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain'
    },
    body: content
  })
    .then(response => {
      if (response.ok) {
        statusElement.textContent = 'Saved successfully!';
        statusElement.style.color = 'green';
        showNotification('Homepage content updated successfully!', 'success');
        setTimeout(() => {
          statusElement.textContent = '';
        }, 3000);
      } else {
        throw new Error('Failed to save');
      }
    })
    .catch(error => {
      console.error('Error saving homepage content:', error);
      statusElement.textContent = 'Error saving!';
      statusElement.style.color = 'red';
      showNotification('Error saving homepage content. Please try again.', 'error');
    });
}

// Initialize the contact banner editor in admin panel
function initContactBannerEditor() {
  // Check if the editor exists regardless of page
  const contactBannerEditor = document.getElementById('contactBannerEditor');
  const saveContactBannerBtn = document.getElementById('saveContactBannerBtn');
  const contactBannerSaveStatus = document.getElementById('contactBannerSaveStatus');
  
  if (!contactBannerEditor || !saveContactBannerBtn) {
    console.error('Contact banner editor elements not found');
    return;
  }
  
  // Load contact banner content
  fetch('/api/content/contactBanner')
    .then(response => response.text())
    .then(content => {
      // Set initial content
      contactBannerEditor.value = content;
      
      // Save contact banner content
      saveContactBannerBtn.addEventListener('click', () => {
        saveContactBanner(contactBannerEditor.value, contactBannerSaveStatus);
      });
    })
    .catch(error => {
      console.error('Error loading contact banner content:', error);
      contactBannerEditor.value = 'Error loading content. Please try again.';
    });
}

// Save contact banner content
function saveContactBanner(content, statusElement) {
  if (!statusElement) return;
  
  statusElement.textContent = 'Saving...';
  statusElement.style.color = '#666';
  
  fetch('/api/content/contactBanner', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain'
    },
    body: content
  })
    .then(response => {
      if (response.ok) {
        statusElement.textContent = 'Saved successfully!';
        statusElement.style.color = 'green';
        showNotification('Contact banner updated successfully!', 'success');
        setTimeout(() => {
          statusElement.textContent = '';
        }, 3000);
      } else {
        throw new Error('Failed to save');
      }
    })
    .catch(error => {
      console.error('Error saving contact banner content:', error);
      statusElement.textContent = 'Error saving!';
      statusElement.style.color = 'red';
      showNotification('Error saving contact banner content. Please try again.', 'error');
    });
}

// Helper function to show notifications
function showNotification(message, type = 'info') {
  const notificationArea = document.getElementById('adminNotifications');
  if (!notificationArea) return;
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = message;
  
  // Style based on type
  switch (type) {
    case 'success':
      notification.style.backgroundColor = '#d4edda';
      notification.style.color = '#155724';
      notification.style.borderColor = '#c3e6cb';
      break;
    case 'error':
      notification.style.backgroundColor = '#f8d7da';
      notification.style.color = '#721c24';
      notification.style.borderColor = '#f5c6cb';
      break;
    default:
      notification.style.backgroundColor = '#d1ecf1';
      notification.style.color = '#0c5460';
      notification.style.borderColor = '#bee5eb';
  }
  
  // Add some common styles
  notification.style.padding = '10px';
  notification.style.margin = '5px 0';
  notification.style.borderRadius = '4px';
  notification.style.border = '1px solid';
  
  notificationArea.appendChild(notification);
  
  // Remove after 5 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s ease';
    
    // Remove from DOM after fade-out
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 500);
  }, 5000);
}

// Setup HTML content tab navigation
function setupHTMLContentTabNavigation() {
  const htmlTabNav = document.querySelector('.html-tab-nav');
  
  if (htmlTabNav) {
    htmlTabNav.addEventListener('click', (event) => {
      // Check if the clicked element is a tab link
      if (event.target.matches('.html-tab-link')) {
        event.preventDefault(); // Stop browser from following href="#"
        
        const clickedTab = event.target;
        const targetTabId = clickedTab.dataset.htmlTab;
        
        // Remove active class from all tabs and panes first
        document.querySelectorAll('.html-tab-link').forEach(tab => {
          tab.classList.remove('active');
        });
        document.querySelectorAll('.html-tab-pane').forEach(pane => {
          pane.classList.remove('active');
        });
        
        // Add active class to the clicked tab
        clickedTab.classList.add('active');
        
        // Set the appropriate pane as active
        if (targetTabId === 'homepage') {
          const targetPane = document.getElementById('homepageHTMLEditor');
          if (targetPane) targetPane.classList.add('active');
        } else if (targetTabId === 'contactBanner') {
          const targetPane = document.getElementById('contactBannerHTMLEditor');
          if (targetPane) targetPane.classList.add('active');
        }
      }
    });
  }
}

// Initialize the editor components when the document is ready
document.addEventListener('DOMContentLoaded', function() {
  // Initialize editors if they exist on the page
  initHomepageEditor();
  initContactBannerEditor();
  
  // Setup tab navigation for HTML content section
  setupHTMLContentTabNavigation();
});