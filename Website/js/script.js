// Mobile navigation toggle and load common elements
document.addEventListener('DOMContentLoaded', function() {
  // Load header
  fetch("includes/header.html")
    .then(response => response.text())
    .then(data => {
      // Replace the header with our loaded header
      const headerElement = document.querySelector('header');
      if (headerElement) {
        headerElement.outerHTML = data;
        
        // Set active nav item based on current page
        const currentPage = window.location.pathname.split('/').pop();
        const navLinks = document.querySelectorAll('#main-nav a');
        
        if (currentPage === '' || currentPage === 'index.html') {
          document.getElementById('nav-home').classList.add('active');
        } else if (currentPage === 'cv.html') {
          document.getElementById('nav-cv').classList.add('active');
        } else if (currentPage === 'research.html') {
          document.getElementById('nav-research').classList.add('active');
        } else if (currentPage === 'projects.html') {
          document.getElementById('nav-projects').classList.add('active');
        } else if (currentPage === 'bookshelf.html') {
          document.getElementById('nav-bookshelf').classList.add('active');
        } else if (currentPage === 'worldmap.html') {
          document.getElementById('nav-photography').classList.add('active');
        }
        
        // Reattach event listener for nav toggle after header is loaded
        const navToggle = document.getElementById('nav-toggle');
        const mainNav = document.getElementById('main-nav');
        if (navToggle) {
          navToggle.addEventListener('click', function() {
            mainNav.classList.toggle('open');
          });
        }
      }
    })
    .catch(error => console.error("Error loading header:", error));

  // Load footer with dynamic contact banner
  loadContactBanner();
});

/**
 * Loads and renders the contact banner dynamically
 */
async function loadContactBanner() {
  try {
    const response = await fetch('/api/data/contactBanner');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    renderContactBanner(data);
    
  } catch (error) {
    console.error('Error loading contact banner:', error);
    // Load fallback static footer
    loadStaticFooter();
  }
}

/**
 * Renders the contact banner with header text and icons
 * @param {Object} data - Contact banner data with headerText and items
 */
function renderContactBanner(data) {
  const footerElement = document.getElementById("footer");
  if (!footerElement) {
    console.warn("Footer element not found in the page");
    return;
  }
  
  let bannerHTML = '<div class="contact-banner">';
  
  // Add header text if available
  if (data.headerText && data.headerText.trim()) {
    bannerHTML += `<div class="banner-header">${data.headerText}</div>`;
  }
  
  // Add social media icons
  if (data.items && data.items.length > 0) {
    bannerHTML += '<div class="social-icons">';
    
    // Sort items by order
    const sortedItems = [...data.items].sort((a, b) => (a.order || 0) - (b.order || 0));
    
    sortedItems.forEach(item => {
      bannerHTML += `
        <a href="${item.link}" target="_blank" title="${item.label || 'Social Link'}">
          <img src="icons/${item.icon}" alt="${item.label || 'Icon'}" class="social-icon">
        </a>
      `;
    });
    
    bannerHTML += '</div>';
  }
  
  bannerHTML += '</div>';
  
  footerElement.innerHTML = bannerHTML;
}

/**
 * Fallback to load static footer.html if dynamic loading fails
 */
function loadStaticFooter() {
  fetch("footer.html")
    .then(response => response.text())
    .then(data => {
      const footerElement = document.getElementById("footer");
      if (footerElement) {
        footerElement.innerHTML = data;
      }
    })
    .catch(error => console.error("Error loading static footer:", error));
}
