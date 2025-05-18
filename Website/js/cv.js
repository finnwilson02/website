document.addEventListener('DOMContentLoaded', () => {
    console.log("CV page loaded, attempting to load dynamic content...");
    loadDynamicCvContent();
});

async function loadDynamicCvContent() {
    try {
        console.log("Fetching CV data from combined endpoint...");
        
        // Fetch combined CV data
        const response = await fetch('/api/data/cv');
        if (!response.ok) {
            let errorMsg = `Failed to fetch CV data: ${response.status}`;
            try { const errData = await response.json(); errorMsg += ` - ${errData.error || 'Unknown'}`; } catch(e){}
            throw new Error(errorMsg);
        }
        
        const cvData = await response.json();
        console.log("CV data loaded successfully", cvData);
        
        // Render each section with the retrieved data
        renderEducation(cvData.education);
        renderWork(cvData.work);
        renderResearch(cvData.research);
        
        // Store full projects data globally for skill tooltips
        window.projectsData = cvData.projectsData || [];
        
        // Filter projects and research items by showOnCv flag
        // Add logging to debug showOnCv values
        console.log("Checking projects for showOnCv status:", cvData.projectsData);
        
        const projectsToShow = cvData.projectsData ? 
            cvData.projectsData.filter(project => {
                console.log(`Project ${project.title}: showOnCv = ${project.showOnCv}, type: ${typeof project.showOnCv}`);
                return project.showOnCv === true; // Explicitly check for boolean true
            }) : [];
            
        const articlesToShow = cvData.researchData && cvData.researchData.articles ? 
            cvData.researchData.articles.filter(article => article.showOnCv === true) : [];
            
        const thesesToShow = cvData.researchData && cvData.researchData.theses ? 
            cvData.researchData.theses.filter(thesis => thesis.showOnCv === true) : [];
            
        const researchToShow = [...articlesToShow, ...thesesToShow];
        
        // Log what's being displayed for debugging
        console.log(`Displaying ${projectsToShow.length} projects and ${researchToShow.length} research items (${articlesToShow.length} articles, ${thesesToShow.length} theses)`);
        
        // Render the items that should be shown
        renderProjectItems(projectsToShow);
        renderResearchItems(researchToShow);
        
        renderSkills(cvData.skills);
        renderAchievements(cvData.achievements);
        renderPositions(cvData.positions);
        
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
    
    const container = document.querySelector('#experience ul');
    if (!container) return;
    
    container.innerHTML = '';
    
    data.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>${item.company}</strong>, ${item.title}
            <span>${item.dates || ''}</span>
            <div>${item.description || ''}</div>
        `;
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
    
    container.innerHTML = '';
    
    data.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>${item.position}</strong>, ${item.organization}
            <span>${item.dates || ''}</span>
            ${item.description ? `<div>${item.description}</div>` : ''}
        `;
        container.appendChild(li);
    });
}

function renderProjectItems(projects) {
    // Find the container, usually in the 'projects' section
    const container = document.querySelector('#projects > ul');
    if (!container) {
        console.warn('Projects container not found in CV page');
        return;
    }
    
    container.innerHTML = '';
    
    if (!Array.isArray(projects) || projects.length === 0) {
        container.innerHTML = '<li class="no-items">No projects to display</li>';
        return;
    }
    
    // Sort projects by some criteria - likely date or importance
    projects.sort((a, b) => {
        // Sort by order field if available, otherwise try dates or default to alphabetical
        if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
        }
        return (a.title || '').localeCompare(b.title || '');
    });
    
    // Create project list items
    projects.forEach(project => {
        const li = document.createElement('li');
        
        // Project title - add link to project detail if available
        const titleEl = document.createElement('strong');
        if (project.id) {
            const link = document.createElement('a');
            link.href = `project-detail.html?id=${project.id}`;
            link.textContent = project.title || 'Untitled Project';
            titleEl.appendChild(link);
        } else {
            titleEl.textContent = project.title || 'Untitled Project';
        }
        li.appendChild(titleEl);
        
        // Dates or other identifying info
        if (project.dates) {
            const dates = document.createElement('span');
            dates.textContent = ` (${project.dates})`;
            li.appendChild(dates);
        }
        
        // Project summary
        if (project.summary) {
            const summary = document.createElement('div');
            summary.className = 'project-summary';
            summary.textContent = project.summary;
            li.appendChild(summary);
        }
        
        // Links to project resources (e.g., github, website, etc.)
        if (project.links && Object.keys(project.links).length > 0) {
            const linksContainer = document.createElement('div');
            linksContainer.className = 'project-links';
            
            Object.entries(project.links).forEach(([type, url]) => {
                if (!url) return;
                
                const link = document.createElement('a');
                link.href = url;
                link.textContent = type.charAt(0).toUpperCase() + type.slice(1);
                link.className = 'small-link';
                link.target = '_blank';
                linksContainer.appendChild(link);
                linksContainer.appendChild(document.createTextNode(' '));
            });
            
            li.appendChild(linksContainer);
        }
        
        container.appendChild(li);
    });
}

function renderResearchItems(items) {
    const container = document.querySelector('#research > ul');
    if (!container) {
        console.warn('Research container not found in CV page');
        return;
    }
    
    container.innerHTML = '';
    
    if (!Array.isArray(items) || items.length === 0) {
        container.innerHTML = '<li class="no-items">No research items to display</li>';
        return;
    }
    
    // Sort research items (maybe by date, publication importance, etc.)
    items.sort((a, b) => {
        // Sort by year descending (most recent first)
        const yearA = a.year || a.date || '0';
        const yearB = b.year || b.date || '0';
        return yearB.localeCompare(yearA);
    });
    
    items.forEach(item => {
        const li = document.createElement('li');
        
        // Citation style rendering based on type
        let citationHTML = '';
        const authorsHTML = formatAuthors(item.authors);
        
        // Common citation fields
        const title = item.title || 'Untitled';
        const publication = item.publication || item.venue || '';
        const year = item.year || item.date || '';
        
        // Format differently based on research type
        if (item.type === 'thesis') {
            citationHTML = `
                <strong>${authorsHTML}</strong> (${year}). "${title}".
                <em>${item.university || ''}</em>.
            `;
        } else {
            // Default format for articles, conference papers, etc.
            citationHTML = `
                <strong>${authorsHTML}</strong> (${year}). "${title}".
                <em>${publication}</em>.
                ${item.volume ? `Volume ${item.volume}.` : ''}
                ${item.pages ? `Pages ${item.pages}.` : ''}
            `;
        }
        
        // Add the citation content
        li.innerHTML = citationHTML;
        
        // Add links to research papers, DOI, etc.
        if (item.links && Object.keys(item.links).length > 0) {
            const linksContainer = document.createElement('div');
            linksContainer.className = 'research-links';
            
            Object.entries(item.links).forEach(([type, url]) => {
                if (!url) return;
                
                const link = document.createElement('a');
                link.href = url;
                link.textContent = type.charAt(0).toUpperCase() + type.slice(1);
                link.className = 'small-link';
                link.target = '_blank';
                linksContainer.appendChild(link);
                linksContainer.appendChild(document.createTextNode(' '));
            });
            
            li.appendChild(linksContainer);
        }
        
        container.appendChild(li);
    });
}

// Helper function for research to format authors with potential highlighting
function formatAuthors(authors) {
    if (!authors) return '';
    
    // If authors is a string, return as is
    if (typeof authors === 'string') return authors;
    
    // If authors is an array, format with highlighting of own name
    if (Array.isArray(authors)) {
        return authors.map(author => {
            // Check if this is the CV owner (typically contains 'Wilson')
            const isOwner = author.toLowerCase().includes('wilson');
            return isOwner ? `<strong>${author}</strong>` : author;
        }).join(', ');
    }
    
    return '';
}

function renderAchievements(data) {
    if (!Array.isArray(data) || data.length === 0) {
        console.warn("No achievements data available or invalid format");
        return;
    }
    
    const container = document.querySelector('#achievements ul');
    if (!container) return;
    
    container.innerHTML = '';
    
    data.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>${item.title}</strong>
            ${item.year ? `<span>(${item.year})</span>` : ''}
            ${item.description ? `<div>${item.description}</div>` : ''}
        `;
        container.appendChild(li);
    });
}

function renderResearch(data) {
    // Check if this is being rendered directly or if we are using renderResearchItems later
    // This function handles the basic section setup, not the detailed items
    
    // Verification is handled in renderResearchItems
}

function renderSkills(data) {
    if (typeof data !== 'object' || data === null) {
        console.warn("No skills data available or invalid format");
        return;
    }
    
    const container = document.querySelector('#skills ul');
    if (!container) {
        console.error("Skills container not found - check that the selector #skills ul exists");
        return;
    }
    
    container.innerHTML = ''; // Clear existing content
    
    // Global cache of projects for tooltip display
    let projectsData = window.projectsData || []; // Use globally loaded projects data if available
    
    // Helper function to create interactive skill spans
    function createSkillElements(skillsArray) {
        if (!Array.isArray(skillsArray)) return [];
        
        // Create an array of skill span elements
        return skillsArray.map(skill => {
            // Handle both string and object formats
            const skillName = typeof skill === 'object' ? skill.name : skill;
            const skillProjects = typeof skill === 'object' && Array.isArray(skill.projects) ? skill.projects : [];
            const isProjectDerived = typeof skill === 'object' && skill.source === 'project';
            
            const span = document.createElement('span');
            span.className = 'skill-item';
            span.textContent = skillName;
            
            // Add data attributes and classes for project-derived skills
            if (isProjectDerived && skillProjects.length > 0) {
                span.classList.add('project-derived-skill');
                span.dataset.projects = JSON.stringify(skillProjects);
                
                // Create tooltip element with project info
                const tooltip = document.createElement('div');
                tooltip.className = 'skill-tooltip';
                
                const header = document.createElement('h4');
                header.textContent = 'Related Projects';
                tooltip.appendChild(header);
                
                const list = document.createElement('ul');
                // Try to find related projects by ID
                const relatedProjects = projectsData.filter(project => 
                    skillProjects.includes(project.id)
                );
                
                if (relatedProjects.length > 0) {
                    relatedProjects.forEach(project => {
                        const item = document.createElement('li');
                        if (project.id) {
                            const link = document.createElement('a');
                            link.href = `project-detail.html?id=${project.id}`;
                            link.textContent = project.title || project.id;
                            item.appendChild(link);
                        } else {
                            item.textContent = project.title || 'Unknown project';
                        }
                        list.appendChild(item);
                    });
                } else {
                    // If we don't have full project data, just list the IDs
                    skillProjects.forEach(projectId => {
                        const item = document.createElement('li');
                        item.textContent = projectId;
                        list.appendChild(item);
                    });
                }
                
                tooltip.appendChild(list);
                span.appendChild(tooltip);
            }
            
            return span;
        });
    }
    
    // Function to render a category section
    function renderCategory(category, title) {
        if (Array.isArray(data[category]) && data[category].length > 0) {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${title}:</strong> `;
            
            // Create and append skill elements for this category
            const skillElements = createSkillElements(data[category]);
            skillElements.forEach(element => {
                li.appendChild(element);
                // Add a space after each element for better spacing
                li.appendChild(document.createTextNode(' '));
            });
            
            container.appendChild(li);
        }
    }
    
    // Render each category
    renderCategory('programming', 'Programming Languages');
    renderCategory('software', 'Software & Tools');
    renderCategory('technical', 'Technical Skills');
    renderCategory('uncategorized', 'Other Skills');
}