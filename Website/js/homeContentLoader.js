// js/homeContentLoader.js

/**
 * Loads and renders homepage content from homepage.md
 */
async function loadHomeContent() {
    try {
        const response = await fetch('/api/data/homepage');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check if marked.js is available for Markdown parsing
        if (typeof marked !== 'undefined') {
            const htmlContent = marked.parse(data.content);
            insertHomeContent(htmlContent);
        } else {
            // Fallback: insert as plain text with basic formatting
            console.warn('marked.js not loaded, using plain text fallback');
            const plainContent = data.content.replace(/\n/g, '<br>');
            insertHomeContent(plainContent);
        }
        
    } catch (error) {
        console.error('Error loading homepage content:', error);
        // Show a fallback message
        const fallbackContent = `
            <h1>Welcome</h1>
            <p>Welcome to my portfolio website. Please check back later for updated content.</p>
        `;
        insertHomeContent(fallbackContent);
    }
}

/**
 * Inserts the parsed content into the homepage
 * @param {string} htmlContent - The HTML content to insert
 */
function insertHomeContent(htmlContent) {
    // Look for common container IDs/classes where homepage content should go
    const containers = [
        document.getElementById('homeContent'),
        document.getElementById('mainContent'),
        document.querySelector('.home-content'),
        document.querySelector('.main-content'),
        document.querySelector('main'),
        document.querySelector('.container')
    ];
    
    // Find the first available container
    const container = containers.find(el => el !== null);
    
    if (container) {
        container.innerHTML = htmlContent;
    } else {
        console.warn('No suitable container found for homepage content');
        // Create a container and append to body as fallback
        const fallbackContainer = document.createElement('div');
        fallbackContainer.id = 'homeContent';
        fallbackContainer.innerHTML = htmlContent;
        document.body.appendChild(fallbackContainer);
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