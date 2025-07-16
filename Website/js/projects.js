// js/projects.js

/**
 * Load and display projects from the API
 */
async function loadProjects() {
    try {
        const response = await fetch('/api/data/projects');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const projects = await response.json();
        renderProjects(projects);
    } catch (error) {
        console.error('Error loading projects:', error);
        const container = document.getElementById('projectsContainer');
        if (container) {
            container.innerHTML = '<p>Error loading projects. Please try again later.</p>';
        }
    }
}

/**
 * Render projects in the container
 * @param {Array} projects - Array of project objects
 */
function renderProjects(projects) {
    const container = document.getElementById('projectsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Sort projects by order field
    const sortedProjects = projects.sort((a, b) => (a.order || 0) - (b.order || 0));
    
    sortedProjects.forEach(project => {
        const projectCard = createProjectCard(project);
        container.appendChild(projectCard);
    });
    
    // Add click handlers to project images
    addProjectClickHandlers();
}

/**
 * Create a project card element
 * @param {Object} project - Project object
 * @returns {HTMLElement} Project card element
 */
function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.id = project.id;
    
    // Create skills list HTML
    const skillsHtml = project.skills ? 
        project.skills.map(skill => `<li>${skill}</li>`).join('') : '';
    
    // Create links HTML
    const linksHtml = project.links ? 
        Object.entries(project.links)
            .filter(([key, url]) => url && url !== '#')
            .map(([key, url]) => {
                const linkText = key.charAt(0).toUpperCase() + key.slice(1);
                return `<a href="${url}">[${linkText}]</a>`;
            }).join(' ') : '';
    
    card.innerHTML = `
        <div class="project-image-container">
            <img class="project-image" 
                 src="${project.image || 'img/placeholder.jpg'}" 
                 alt="${project.title}"
                 data-id="${project.id}">
        </div>
        <div class="project-content">
            <h3 class="project-title" data-id="${project.id}">${project.title}</h3>
            <p class="project-summary">${project.summary || ''}</p>
            ${project.role ? `<p class="project-role"><strong>My Role:</strong> ${project.role}</p>` : ''}
            ${skillsHtml ? `
                <div class="project-skills">
                    <h4>Key Skills/Tools:</h4>
                    <ul>${skillsHtml}</ul>
                </div>
            ` : ''}
            ${linksHtml ? `<div class="project-links">${linksHtml}</div>` : ''}
            ${project.status ? `<p class="project-status">Status: ${project.status}</p>` : ''}
        </div>
    `;
    
    return card;
}

/**
 * Add click handlers to project images and titles
 */
function addProjectClickHandlers() {
    // Add click handlers to images
    document.querySelectorAll('.project-image').forEach(img => {
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => {
            const projectId = img.dataset.id;
            window.location.href = `project-detail.html?id=${projectId}`;
        });
    });
    
    // Add click handlers to titles
    document.querySelectorAll('.project-title').forEach(title => {
        title.style.cursor = 'pointer';
        title.addEventListener('click', () => {
            const projectId = title.dataset.id;
            window.location.href = `project-detail.html?id=${projectId}`;
        });
    });
}

// Load projects when the page loads
document.addEventListener('DOMContentLoaded', loadProjects);