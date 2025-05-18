/**
 * projects.js - Dynamically renders project cards on the projects page
 */

document.addEventListener('DOMContentLoaded', () => {
    const projectsGrid = document.querySelector('.projects-grid');
    if (!projectsGrid) return;

    // Display loading indicator
    projectsGrid.innerHTML = '<div class="loading-indicator">Loading projects...</div>';

    fetch('/api/data/projects')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(projects => {
            if (!Array.isArray(projects)) {
                projectsGrid.innerHTML = '<p>Error: Project data is not in the expected format.</p>';
                return;
            }
            
            if (projects.length === 0) {
                projectsGrid.innerHTML = '<p>No projects to display at this time.</p>';
                return;
            }
            
            // Sort projects by order field if it exists
            projects.sort((a, b) => (a.order || 0) - (b.order || 0));

            projectsGrid.innerHTML = ''; // Clear any placeholders

            projects.forEach(project => {
                const card = document.createElement('div');
                card.className = 'project-card';
                card.id = project.id || ''; // For deep linking

                // Build skills list HTML
                const skillsHTML = Array.isArray(project.skills) && project.skills.length > 0
                    ? `<ul>${project.skills.map(skill => `<li>${skill}</li>`).join('')}</ul>`
                    : '<ul><li>Not specified</li></ul>';

                // Build links HTML
                let linksHTML = '';
                if (project.links && typeof project.links === 'object') {
                    linksHTML = Object.entries(project.links)
                        .filter(([type, url]) => url && url.trim())
                        .map(([type, url]) => {
                            const label = type.charAt(0).toUpperCase() + type.slice(1);
                            return `<a href="${url}" target="_blank">[${label}]</a>`;
                        })
                        .join(' ');
                }

                card.innerHTML = `
                    <a href="project-detail.html?id=${project.id}">
                        <img class="project-image" src="img/${project.image || 'placeholder.jpg'}" alt="${project.title || 'Project Image'}" onerror="this.src='img/placeholder.jpg'">
                    </a>
                    <div class="project-content">
                        <a href="project-detail.html?id=${project.id}" style="text-decoration: none; color: inherit;">
                            <h3 class="project-title">${project.title || 'Untitled Project'}</h3>
                        </a>
                        <p class="project-summary">${project.summary || ''}</p>
                        <p class="project-role"><strong>My Role:</strong> ${project.role || 'Not specified'}</p>
                        <div class="project-skills">
                            <h4>Key Skills/Tools:</h4>
                            ${skillsHTML}
                        </div>
                        <div class="project-links">
                            ${linksHTML}
                        </div>
                        ${project.status ? `<p class="project-status">Status: ${project.status}</p>` : ''}
                    </div>
                `;
                
                projectsGrid.appendChild(card);
            });
        })
        .catch(error => {
            console.error('Error fetching projects:', error);
            projectsGrid.innerHTML = '<p>Error loading projects. Please try again later.</p>';
        });
});