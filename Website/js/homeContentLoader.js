// js/homeContentLoader.js

/**
 * Loads and renders homepage content from homepage.json including image and content
 */
async function loadHomeContent() {
    try {
        const response = await fetch('/api/data/homepage');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Homepage data loaded:', data); // TEMP LOG
        
        let htmlContent = '';
        
        // 1. Add content parsed from Markdown first.
        if (typeof marked !== 'undefined') {
            htmlContent += marked.parse(data.content || '');
        } else {
            console.warn('marked.js not loaded, using plain text fallback');
            htmlContent += (data.content || '').replace(/\n/g, '<br>');
        }

        // 2. Add the image after the text content.
        if (data.image && data.image.trim() !== '') {
            const imageSrc = `img/${data.image}`;
            console.log('Rendering image src:', imageSrc); // TEMP LOG
            htmlContent += `<img src="${imageSrc}" class="profile-pic" alt="Homepage Image">`;
        } else {
            console.log('No image in data:', data); // TEMP LOG
        }
        
        insertHomeContent(htmlContent);
        
    } catch (error) {
        console.error('Error loading homepage content:', error);
        // Show a fallback message
        const fallbackContent = `<h1>Welcome</h1><p>Welcome to my portfolio website. Please check back later for updated content.</p>`;
        insertHomeContent(fallbackContent);
    }
}

/**
 * Inserts the parsed content into the homepage, replacing existing content
 * @param {string} htmlContent - The HTML content to insert
 */
function insertHomeContent(htmlContent) {
    const container = document.getElementById('homeContent');
    
    if (container) {
        container.innerHTML = htmlContent;
        console.log('Homepage content loaded successfully');
    } else {
        console.error('Container with ID "homeContent" not found for homepage content.');
    }
}

// Auto-load homepage content when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Only load on homepage (index.html or root path)
    const path = window.location.pathname;
    const isHomepage = path === '/' || path === '/index.html' || path.endsWith('/index.html');
    
    if (isHomepage) {
        loadHomeContent();
    }
});

// Export for manual usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { loadHomeContent, insertHomeContent };
}