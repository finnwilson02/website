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

  // Load footer
  fetch("footer.html")
    .then(response => response.text())
    .then(data => {
      const footerElement = document.getElementById("footer");
      if (footerElement) {
        footerElement.innerHTML = data;
      } else {
        console.warn("Footer element not found in the page");
      }
    })
    .catch(error => console.error("Error loading footer:", error));
});
