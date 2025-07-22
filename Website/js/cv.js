document.addEventListener('DOMContentLoaded', () => {
    console.log("CV page loaded, attempting to load dynamic content...");
    loadDynamicCvContent();
});

async function loadDynamicCvContent() {
    try {
        console.log("Fetching CV data from structured endpoints...");
        
        // Load all CV sections concurrently using Promise.all
        const [education, work, research, projects, skills, achievements, positions] = await Promise.all([
            fetchCvSection('education'),
            fetchCvSection('work'),
            fetchCvSection('research'),
            fetchCvSection('projects'),
            fetchCvSection('skills'),
            fetchCvSection('achievements'),
            fetchCvSection('positions')
        ]);
        
        // Render each section with the retrieved data
        renderEducation(education);
        renderWork(work);
        renderResearch(research);
        renderProjects(projects);
        renderSkills(skills);
        renderAchievements(achievements);
        renderPositions(positions);
        
    } catch (error) {
        console.error('Error loading dynamic CV content:', error);
        // Display error message to user
        const body = document.querySelector('main.container') || document.body;
        const errorDiv = document.createElement('div');
        errorDiv.textContent = `Failed to load CV content: ${error.message}`;
        errorDiv.style.color = 'red';
        errorDiv.style.border = '1px solid red';
        errorDiv.style.padding = '10px';
        errorDiv.style.margin = '10px 0';
        if(body.firstChild) body.insertBefore(errorDiv, body.firstChild); else body.appendChild(errorDiv);
    }
}

// Helper function to fetch a specific CV section
async function fetchCvSection(section) {
    try {
        const response = await fetch(`/api/data/cv/${section}`);
        if (!response.ok) {
            let errorMsg = `Failed to fetch ${section} data: ${response.status}`;
            try { const errData = await response.json(); errorMsg += ` - ${errData.error || 'Unknown'}`; } catch(e){}
            throw new Error(errorMsg);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${section} section:`, error);
        throw error; // Re-throw to be handled by the main function
    }
}

// Render functions for each section

function renderEducation(data) {
    if (!Array.isArray(data) || data.length === 0) {
        console.warn("No education data available or invalid format");
        return;
    }
    
    const container = document.querySelector('#education ul');
    if (!container) return;
    
    container.innerHTML = ''; // Clear loading state
    
    data.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>${item.institution}</strong>, ${item.degree}
            ${item.honours ? `<em>${item.honours}</em>` : ''}
            <span>${item.dates || ''}</span>
        `;
        container.appendChild(li);
    });
}

function renderWork(data) {
    if (!Array.isArray(data) || data.length === 0) {
        console.warn("No work experience data available or invalid format");
        return;
    }
    
    const container = document.querySelector('#work');
    if (!container) return;
    
    // Remove existing placeholder content
    const existingItems = container.querySelectorAll('.experience');
    existingItems.forEach(item => item.remove());
    
    data.forEach(item => {
        const div = document.createElement('div');
        div.className = 'experience';
        
        // Format the header with title, company and dates
        const title = document.createElement('h3');
        title.innerHTML = `${item.title} – ${item.company} <span>(${item.dates})</span>`;
        
        // Create description list from markdown content
        const description = document.createElement('ul');
        
        if (item.description) {
            // Split the markdown bullet points and create list items
            const points = item.description.split('\n').filter(point => point.trim().startsWith('-'));
            
            points.forEach(point => {
                const li = document.createElement('li');
                // Remove the leading dash and trim
                li.textContent = point.substring(1).trim();
                description.appendChild(li);
            });
        }
        
        div.appendChild(title);
        div.appendChild(description);
        container.appendChild(div);
    });
}

function renderResearch(data) {
    if (!Array.isArray(data) || data.length === 0) {
        console.warn("No research data available or invalid format");
        return;
    }
    
    const container = document.querySelector('#research');
    if (!container) return;
    
    // Remove existing placeholder content
    const existingItems = container.querySelectorAll('.experience');
    existingItems.forEach(item => item.remove());
    
    data.forEach(item => {
        const div = document.createElement('div');
        div.className = 'experience';
        
        const title = document.createElement('h3');
        
        // Check if this research has associated links
        let linksHtml = '';
        // Handle both array format and object format for links
        if (Array.isArray(item.links)) {
            // Array format
            item.links.forEach(link => {
                linksHtml += ` <a href="${link.url}" class="small-link">[${link.text}]</a>`;
            });
        } else if (item.links && typeof item.links === 'object') {
            // Object format
            if (item.links.research) {
                linksHtml += ` <a href="${item.links.research}" class="small-link">[Research]</a>`;
            }
            if (item.links.project) {
                linksHtml += ` <a href="${item.links.project}" class="small-link">[Project]</a>`;
            }
        }
        
        title.innerHTML = `${item.title} – ${item.organization} <span>(${item.dates})</span>${linksHtml}`;
        
        // Create description list from markdown content
        const description = document.createElement('ul');
        
        if (item.description) {
            // Split the markdown bullet points and create list items
            const points = item.description.split('\n').filter(point => point.trim().startsWith('-'));
            
            points.forEach(point => {
                const li = document.createElement('li');
                // Remove the leading dash and trim
                li.textContent = point.substring(1).trim();
                description.appendChild(li);
            });
        }
        
        div.appendChild(title);
        div.appendChild(description);
        container.appendChild(div);
    });
}

/**
 * Renders CV projects by fetching from projects.json and filtering by showOnCv flag.
 * Uses cvSummary if available, otherwise falls back to general summary.
 * @param {Array} data - Legacy parameter, not used (fetches fresh data)
 */
async function renderProjects(data) {
    // Fetch projects from projects.json instead of cv_projects.json
    try {
        const response = await fetch('/api/data/projects');
        if (!response.ok) {
            throw new Error('Failed to fetch projects');
        }
        
        const allProjects = await response.json();
        // Filter and sort projects that should show on CV
        const cvProjects = allProjects
            .filter(p => p.showOnCv === true)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
        
        const container = document.querySelector('#projects .project-list');
        if (!container) return;
        
        // Clear existing content
        container.innerHTML = '';
        
        if (cvProjects.length === 0) {
            container.innerHTML = '<p>No projects available.</p>';
            return;
        }
        
        cvProjects.forEach(project => {
            // Create clickable project item container
            const projectDiv = document.createElement('div');
            projectDiv.className = 'project-item';
            projectDiv.dataset.id = project.id;
            projectDiv.style.cursor = 'pointer';
            projectDiv.style.marginBottom = '20px';
            
            const title = document.createElement('h3');
            
            // Handle status display
            let statusHtml = project.status ? ` <span style="font-weight: normal; font-size: 0.9em;">(${project.status})</span>` : '';
            
            // Handle links
            let linkHtml = '';
            if (project.links && typeof project.links === 'object') {
                Object.entries(project.links).forEach(([type, url]) => {
                    if (url && url !== '#') {
                        linkHtml += ` <a href="${url}" class="small-link" onclick="event.stopPropagation()">[${type.charAt(0).toUpperCase() + type.slice(1)}]</a>`;
                    }
                });
            }
            
            title.innerHTML = `${project.title}${statusHtml}${linkHtml}`;
            
            // Use CV-specific summary if available, otherwise fall back to general summary
            const summary = document.createElement('p');
            summary.textContent = project.cvSummary || project.summary || '';
            summary.style.marginTop = '5px';
            
            projectDiv.appendChild(title);
            projectDiv.appendChild(summary);
            
            // Add click handler for project detail navigation
            projectDiv.addEventListener('click', (e) => {
                // Don't navigate if clicking on a link
                if (e.target.tagName !== 'A') {
                    window.location.href = `project-detail.html?id=${project.id}`;
                }
            });
            
            // Add hover effect
            projectDiv.addEventListener('mouseenter', () => {
                projectDiv.style.backgroundColor = '#f5f5f5';
            });
            projectDiv.addEventListener('mouseleave', () => {
                projectDiv.style.backgroundColor = '';
            });
            
            container.appendChild(projectDiv);
        });
    } catch (error) {
        console.error('Error loading projects:', error);
        const container = document.querySelector('#projects .project-list');
        if (container) {
            container.innerHTML = '<p style="color: red;">Failed to load projects.</p>';
        }
    }
}

/**
 * Renders skill names with clickable items and tooltips showing linked projects.
 * Filters out uncategorized skills from display.
 * @param {Object} data - Skills data object with categories containing skill objects
 */
function renderSkills(data) {
    if (typeof data !== 'object' || data === null) {
        console.warn("No skills data available or invalid format");
        return;
    }
    
    const container = document.querySelector('#skills ul');
    if (!container) return;
    
    container.innerHTML = ''; // Clear existing content
    
    // Helper function to render skills from a category
    const renderSkillCategory = (categoryName, displayName, skills) => {
        if (!Array.isArray(skills) || skills.length === 0) return;
        
        const li = document.createElement('li');
        const categorySpan = document.createElement('span');
        categorySpan.innerHTML = `<strong>${displayName}:</strong> `;
        li.appendChild(categorySpan);
        
        // Create clickable skill items
        const skillSpans = skills.map((skill, index) => {
            const span = document.createElement('span');
            span.className = 'skill-item';
            span.textContent = typeof skill === 'object' ? skill.name : skill;
            
            // Store project data if available and add linked-skill class
            if (skill.projects && skill.projects.length > 0) {
                span.classList.add('linked-skill');
                span.dataset.projects = JSON.stringify(skill.projects);
                span.dataset.skillName = skill.name;
            }
            
            return span;
        });
        
        // Add skill spans with comma separators
        skillSpans.forEach((span, index) => {
            li.appendChild(span);
            if (index < skillSpans.length - 1) {
                li.appendChild(document.createTextNode(', '));
            }
        });
        
        container.appendChild(li);
    };
    
    // Render each category (excluding uncategorized)
    renderSkillCategory('programming', 'Programming Languages', data.programming);
    renderSkillCategory('software', 'Software &amp; Tools', data.software);
    renderSkillCategory('technical', 'Technical Skills', data.technical);
    
    // Add click handlers and tooltips after rendering
    addSkillInteractions();
}

/**
 * Adds click handlers and hover tooltips to skill items.
 * Shows linked projects on hover and opens modal with clickable links on click.
 */
function addSkillInteractions() {
    const skillItems = document.querySelectorAll('.skill-item[data-projects]');
    let currentTooltip = null;
    
    // Setup modal close handlers
    const modal = document.getElementById('skillModal');
    const closeBtn = document.querySelector('.close');
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    skillItems.forEach(item => {
        const projects = JSON.parse(item.dataset.projects || '[]');
        const skillName = item.dataset.skillName;
        
        if (projects.length === 0) return;
        
        // Add hover tooltip
        item.addEventListener('mouseenter', (e) => {
            // Remove any existing tooltip
            if (currentTooltip) {
                currentTooltip.remove();
            }
            
            // Create tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'skill-tooltip';
            tooltip.textContent = `Projects: ${projects.join(', ')}`;
            
            // Position tooltip
            const rect = item.getBoundingClientRect();
            tooltip.style.position = 'absolute';
            tooltip.style.left = rect.left + 'px';
            tooltip.style.top = (rect.bottom + 5) + 'px';
            tooltip.style.background = '#333';
            tooltip.style.color = '#fff';
            tooltip.style.padding = '5px 10px';
            tooltip.style.borderRadius = '3px';
            tooltip.style.fontSize = '0.9em';
            tooltip.style.zIndex = '1000';
            tooltip.style.whiteSpace = 'nowrap';
            
            document.body.appendChild(tooltip);
            currentTooltip = tooltip;
        });
        
        item.addEventListener('mouseleave', () => {
            if (currentTooltip) {
                currentTooltip.remove();
                currentTooltip = null;
            }
        });
        
        // Add click handler to open modal
        item.addEventListener('click', () => {
            openSkillModal(skillName, projects);
        });
    });
}

/**
 * Opens modal with skill details and clickable project links.
 * @param {string} skillName - The name of the skill
 * @param {Array} projects - Array of project IDs associated with the skill
 */
async function openSkillModal(skillName, projects) {
    const modal = document.getElementById('skillModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalList = document.getElementById('modalList');
    
    // Set title
    modalTitle.textContent = `${skillName} - Associated Items`;
    
    // Clear previous content
    modalList.innerHTML = '';
    
    // Create a loading message
    const loadingLi = document.createElement('li');
    loadingLi.textContent = 'Loading...';
    modalList.appendChild(loadingLi);
    
    // Show modal immediately
    modal.style.display = 'flex';
    
    try {
        // Fetch all data in parallel
        const [projectsData, workData, researchData] = await Promise.all([
            fetch('/api/data/projects').then(r => r.json()).catch(() => []),
            fetch('/api/data/cv/work').then(r => r.json()).catch(() => []),
            fetch('/api/data/cv/research').then(r => r.json()).catch(() => [])
        ]);
        
        // Clear loading message
        modalList.innerHTML = '';
        
        let hasItems = false;
        
        // Add project links with titles
        if (projects && projects.length > 0) {
            const projectHeader = document.createElement('li');
            projectHeader.innerHTML = '<strong>Projects:</strong>';
            modalList.appendChild(projectHeader);
            
            projects.forEach(projectId => {
                const project = projectsData.find(p => p.id === projectId);
                const li = document.createElement('li');
                const link = document.createElement('a');
                link.href = `project-detail.html?id=${projectId}`;
                link.textContent = project ? project.title : projectId;
                li.appendChild(link);
                modalList.appendChild(li);
                hasItems = true;
            });
        }
        
        // Add work roles with skills
        const workRoles = workData.filter(role => 
            role.skills && role.skills.includes(skillName)
        );
        if (workRoles.length > 0) {
            const workHeader = document.createElement('li');
            workHeader.innerHTML = '<strong>Work Experience:</strong>';
            workHeader.style.marginTop = hasItems ? '10px' : '0';
            modalList.appendChild(workHeader);
            
            workRoles.forEach(role => {
                const li = document.createElement('li');
                li.textContent = `${role.title} - ${role.company}`;
                modalList.appendChild(li);
                hasItems = true;
            });
        }
        
        // Add research roles with skills
        const researchRoles = researchData.filter(role => 
            role.skills && role.skills.includes(skillName)
        );
        if (researchRoles.length > 0) {
            const researchHeader = document.createElement('li');
            researchHeader.innerHTML = '<strong>Research Experience:</strong>';
            researchHeader.style.marginTop = hasItems ? '10px' : '0';
            modalList.appendChild(researchHeader);
            
            researchRoles.forEach(role => {
                const li = document.createElement('li');
                li.textContent = `${role.title} - ${role.organization}`;
                modalList.appendChild(li);
                hasItems = true;
            });
        }
        
        if (!hasItems) {
            const li = document.createElement('li');
            li.textContent = 'No associated items found';
            modalList.appendChild(li);
        }
        
    } catch (error) {
        console.error('Error loading skill details:', error);
        modalList.innerHTML = '<li>Error loading details</li>';
    }
}

function renderAchievements(data) {
    if (!Array.isArray(data) || data.length === 0) {
        console.warn("No achievements data available or invalid format");
        return;
    }
    
    const container = document.querySelector('#achievements ul');
    if (!container) return;
    
    container.innerHTML = ''; // Clear existing content
    
    data.forEach(item => {
        const li = document.createElement('li');
        
        if (item.award.toLowerCase().startsWith('notable') || item.award.toLowerCase().includes('academic results')) {
            // For "Notable Academic Results", add emphasis
            li.innerHTML = `<em>${item.award}</em>`;
        } else {
            // Regular awards
            li.textContent = item.year ? `${item.award} (${item.year})` : item.award;
        }
        
        container.appendChild(li);
    });
}

function renderPositions(data) {
    if (!Array.isArray(data) || data.length === 0) {
        console.warn("No positions data available or invalid format");
        return;
    }
    
    const container = document.querySelector('#positions ul');
    if (!container) return;
    
    container.innerHTML = ''; // Clear existing content
    
    data.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>${item.role}</strong>, ${item.organization} <em>(${item.dates})</em> – ${item.description}
        `;
        container.appendChild(li);
    });
}