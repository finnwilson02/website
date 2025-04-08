// js/project-detail.js

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    if (!projectId) {
        displayError("Project ID missing from URL.");
        return;
    }
    loadProjectDetails(projectId);
});

async function loadProjectDetails(projectId) {
    try {
        const response = await fetch('/api/data/projects');
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const projects = await response.json();

        // Ensure projects is an array before searching
        if (!Array.isArray(projects)) throw new Error("Invalid project data format.");

        const projectData = projects.find(p => p.id === projectId);

        if (projectData) {
            displayProjectDetails(projectData);
        } else {
            displayError(`Project with ID "${projectId}" not found.`);
        }
    } catch (error) {
        console.error('Error loading project details:', error);
        displayError(`Failed to load project data. ${error.message}`);
    }
}

function displayProjectDetails(project) {
    // Set page title
    document.title = `${project.title || 'Project Detail'} - Finn Wilson`;

    // Set heading
    const titleElement = document.getElementById('projectTitle');
    if (titleElement) titleElement.textContent = project.title || 'Untitled Project';

    // Set meta info
    const statusElement = document.getElementById('projectStatus');
    if (statusElement) statusElement.textContent = project.status || 'N/A';

    const linksElement = document.getElementById('projectLinks');
    if (linksElement && project.links) {
        linksElement.innerHTML = ''; // Clear existing
        Object.entries(project.links).forEach(([key, url]) => {
            if (url && url !== '#') { // Only show valid links
                const link = document.createElement('a');
                link.href = url;
                // Capitalize key for display
                link.textContent = `[${key.charAt(0).toUpperCase() + key.slice(1)}]`;
                link.target = url.startsWith('http') ? '_blank' : '_self'; // Open external links in new tab
                link.rel = 'noopener noreferrer';
                link.style.marginRight = '10px';
                linksElement.appendChild(link);
            }
        });
    }

    // Set banner image
    const bannerImg = document.getElementById('projectBannerImage');
    if (bannerImg && project.image) {
        // Prepend the img/ directory to the filename stored in project.image
        bannerImg.src = `img/${project.image}`; // Add img/ prefix to filename
        bannerImg.alt = project.title + " Banner";
        bannerImg.style.display = 'block';
    } else if (bannerImg) {
        bannerImg.style.display = 'none'; // Hide if no image
    }

    // Convert Markdown and inject
    const bodyElement = document.getElementById('projectBody');
    if (bodyElement) {
        try {
            // Configure marked for better rendering
            marked.setOptions({ 
                breaks: true,
                gfm: true
            });
            
            const htmlContent = marked.parse(project.detailMarkdown || '');
            bodyElement.innerHTML = htmlContent;
        } catch (e) {
            console.error("Error parsing Markdown:", e);
            bodyElement.innerHTML = "<p style='color: red;'>Error displaying project content.</p>";
        }
    }
}

function displayError(message) {
    const titleElement = document.getElementById('projectTitle');
    if (titleElement) titleElement.textContent = 'Error';
    
    const bodyElement = document.getElementById('projectBody');
    if (bodyElement) bodyElement.innerHTML = `<p style="color: red;">${message}</p>`;
    
    console.error(message);
}