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
        
        // Add comprehensive logging of the received data
        console.log("Full cvData received by js/cv.js:", JSON.stringify(cvData, null, 2)); 
        // Specifically log the parts expected for each section:
        console.log("Education data for rendering:", cvData.education);
        console.log("Work data for rendering:", cvData.work);
        console.log("Research Experience (CV specific) data for rendering:", cvData.research); 
        console.log("Achievements data for rendering:", cvData.achievements);
        console.log("Positions data for rendering:", cvData.positions);
        console.log("Skills data for rendering:", cvData.skills);
        console.log("Projects (for CV) data for rendering:", cvData.projectsData);
        console.log("Research Publications (for CV) data:", cvData.researchData);
        
        // Store full projects data globally for skill tooltips
        window.projectsData = cvData.projectsData || [];
        
        // Render each section with the retrieved data
        renderEducation(cvData.education);
        renderWork(cvData.work);
        // Use cvData.research directly for Research Experience section - this is from cv_research.json
        renderResearch(cvData.research);
        
        // Filter projects by showOnCv flag
        console.log("Checking projects for showOnCv status:", cvData.projectsData);
        const projectsToShow = cvData.projectsData ? 
            cvData.projectsData.filter(project => {
                console.log(`Project ${project.title}: showOnCv = ${project.showOnCv}, type: ${typeof project.showOnCv}`);
                return project.showOnCv === true; // Explicitly check for boolean true
            }) : [];
        
        // Filter all types of publications by showOnCv flag
        const articlesToShow = cvData.researchData?.articles?.filter(item => item.showOnCv === true) || [];
        const thesesToShow = cvData.researchData?.theses?.filter(item => item.showOnCv === true) || [];
        const conferenceToShow = cvData.researchData?.conference?.filter(item => item.showOnCv === true) || [];
        const patentsToShow = cvData.researchData?.patent?.filter(item => item.showOnCv === true) || [];
        
        // Combine all publication types into single array
        const publicationsToShow = [...articlesToShow, ...thesesToShow, ...conferenceToShow, ...patentsToShow];
        
        // Log what's being displayed for debugging
        console.log(`Displaying on CV: ${projectsToShow.length} projects and ${publicationsToShow.length} publications`, {
            articles: articlesToShow.length,
            theses: thesesToShow.length,
            conference: conferenceToShow.length,
            patents: patentsToShow.length
        });
        
        // Render projects and publications sections
        renderProjectItems(projectsToShow);
        renderPublications(publicationsToShow);
        
        // Render remaining CV sections
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
    console.log("renderEducation received:", data);
    if (!Array.isArray(data) || data.length === 0) {
        console.warn("No education data for renderEducation or invalid format");
        // Ensure placeholder or "No data" message is shown if container exists
        const container = document.querySelector('#education ul');
        if (container) container.innerHTML = '<li>No education details available.</li>';
        return;
    }
    
    const container = document.querySelector('#education ul');
    if (!container) {
        console.error("Education container '#education ul' not found in cv.html!");
        return;
    }
    
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
    console.log("renderWork received:", data);
    if (!Array.isArray(data) || data.length === 0) {
        console.warn("No work experience data available or invalid format");
        // Ensure placeholder or "No data" message is shown if container exists
        const container = document.querySelector('#work ul');
        if (container) container.innerHTML = '<li>No work experience details available.</li>';
        return;
    }
    
    let container = document.querySelector('#work > ul');
    if (!container) {
        console.log("Work container '#work > ul' not found, creating one");
        // Create a ul element if it doesn't exist
        const workSection = document.querySelector('#work');
        if (workSection) {
            container = document.createElement('ul');
            workSection.appendChild(container);
        } else {
            console.error("Work section '#work' not found in cv.html!");
            return;
        }
    }
    
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
    console.log("renderPositions received:", data);
    if (!Array.isArray(data) || data.length === 0) {
        console.warn("No positions data available or invalid format");
        // Ensure placeholder or "No data" message is shown if container exists
        const container = document.querySelector('#positions ul');
        if (container) container.innerHTML = '<li>No positions details available.</li>';
        return;
    }
    
    const container = document.querySelector('#positions ul');
    if (!container) {
        console.error("Positions container '#positions ul' not found in cv.html!");
        return;
    }
    
    container.innerHTML = '';
    
    data.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>${item.role || item.position || 'Untitled Position'}</strong>, ${item.organization || 'Unknown Organization'}
            <span>${item.dates || ''}</span>
            ${item.description ? `<div>${item.description}</div>` : ''}
        `;
        container.appendChild(li);
    });
}

function renderProjectItems(projects) {
    console.log("renderProjectItems received:", projects);
    // Find the container in the 'projects' section
    // Use the .project-list div instead of a direct ul
    const container = document.querySelector('#projects .project-list');
    if (!container) {
        console.error("Projects container '#projects .project-list' not found in cv.html!");
        return;
    }
    
    container.innerHTML = '';
    
    if (!Array.isArray(projects) || projects.length === 0) {
        container.innerHTML = '<ul><li class="no-items">No projects to display</li></ul>';
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
    
    // Create ul element to hold the project items
    const ul = document.createElement('ul');
    container.appendChild(ul);
    
    console.log(`Creating ${projects.length} project items for CV display`);
    
    // Create project list items
    projects.forEach(project => {
        const li = document.createElement('li');
        console.log(`Adding project to CV: ${project.id} - ${project.title}`);
        
        // Project title with link to project detail
        if (project.id) {
            li.innerHTML = `<a href="project-detail.html?id=${project.id}">${project.title || 'Untitled Project'}</a>`;
        } else {
            li.innerHTML = `<strong>${project.title || 'Untitled Project'}</strong>`;
        }
        
        // Add summary if available
        if (project.summary || project.short) {
            li.innerHTML += ` – ${project.summary || project.short}`;
        }
        
        ul.appendChild(li);
    });
}

function renderPublications(publications) {
    console.log("renderPublications received:", publications);
    const container = document.querySelector('#publications .publication-list');
    if (!container) {
        console.error("Publications container '#publications .publication-list' not found in cv.html!");
        return;
    }
    container.innerHTML = ''; // Clear any placeholders

    if (!Array.isArray(publications) || publications.length === 0) {
        container.innerHTML = '<ul><li>No selected publications to display.</li></ul>';
        return;
    }

    // Sort publications (most recent first, then by type)
    publications.sort((a, b) => {
        // Sort by year/date descending
        const yearA = a.year || a.date || '0';
        const yearB = b.year || b.date || '0';
        return yearB.localeCompare(yearA);
    });
    
    const ul = document.createElement('ul');
    publications.forEach(item => {
        const li = document.createElement('li');
        
        // Determine publication type and linkHref
        let pubType = '';
        let linkHref = '#';
        
        if (item.hasOwnProperty('degree')) {
            pubType = 'thesis';
            linkHref = 'research.html#thesis';
        } else if (item.hasOwnProperty('conferenceName') || (item.venue && item.venue.includes('Conference'))) {
            pubType = 'conference';
            linkHref = `research.html#${item.id || 'conference'}`;
        } else if (item.hasOwnProperty('patentStatus') || (item.venue && item.venue.includes('Patent'))) {
            pubType = 'patent';
            linkHref = `research.html#${item.id || 'patent'}`;
        } else {
            pubType = 'article';
            linkHref = `research.html#${item.id || 'articles'}`;
        }
        
        // Use item.id for specific anchor if available
        if (item.id) {
            linkHref = `research.html#${item.id}`;
        }
        
        // Format citation based on type
        let authorsText = typeof item.authors === 'string' ? item.authors : formatAuthors(item.authors);
        const year = item.year || item.date || '';
        const venue = item.venue || item.publication || item.university || '';
        
        li.innerHTML = `<a href="${linkHref}">${item.title}</a> – ${authorsText}${year ? ` (${year})` : ''}, ${venue}`;
        ul.appendChild(li);
    });
    container.appendChild(ul);
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
    console.log("renderAchievements received:", data);
    if (!Array.isArray(data) || data.length === 0) {
        console.warn("No achievements data available or invalid format");
        // Ensure placeholder or "No data" message is shown if container exists
        const container = document.querySelector('#achievements ul');
        if (container) container.innerHTML = '<li>No achievements details available.</li>';
        return;
    }
    
    const container = document.querySelector('#achievements ul');
    if (!container) {
        console.error("Achievements container '#achievements ul' not found in cv.html!");
        return;
    }
    
    container.innerHTML = '';
    
    data.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>${item.award || item.title || 'Untitled Achievement'}</strong>
            ${item.year ? `<span>(${item.year})</span>` : ''}
            ${item.description ? `<div>${item.description}</div>` : ''}
        `;
        container.appendChild(li);
    });
}

function renderResearch(data) {
    console.log("renderResearch received:", data);
    if (!Array.isArray(data) || data.length === 0) {
        console.warn("No research data available or invalid format");
        // Ensure placeholder or "No data" message is shown if container exists
        const container = document.querySelector('#research > ul');
        if (!container) {
            // Create a ul element if it doesn't exist
            const researchSection = document.querySelector('#research');
            if (researchSection) {
                const ul = document.createElement('ul');
                researchSection.appendChild(ul);
                ul.innerHTML = '<li>No research experience details available.</li>';
            }
        } else {
            container.innerHTML = '<li>No research experience details available.</li>';
        }
        return;
    }
    
    // Create or get the container
    let container = document.querySelector('#research > ul');
    if (!container) {
        // Create a ul element if it doesn't exist
        const researchSection = document.querySelector('#research');
        if (researchSection) {
            container = document.createElement('ul');
            researchSection.appendChild(container);
        } else {
            console.error("Research container '#research' not found in cv.html!");
            return;
        }
    }
    
    container.innerHTML = ''; // Clear existing content
    
    // Render each research experience item
    data.forEach(item => {
        const li = document.createElement('li');
        
        let html = '';
        if (item.title) {
            html += `<strong>${item.title}</strong>`;
        }
        if (item.organization) {
            html += `, ${item.organization}`;
        }
        if (item.dates) {
            html += ` <span>(${item.dates})</span>`;
        }
        if (item.description) {
            html += `<div>${item.description}</div>`;
        }
        
        // Add links if available (e.g., to related research papers or projects)
        if (Array.isArray(item.links) && item.links.length > 0) {
            const linksDiv = document.createElement('div');
            linksDiv.className = 'research-links';
            
            item.links.forEach(link => {
                if (!link.url) return;
                
                const linkEl = document.createElement('a');
                linkEl.href = link.url;
                linkEl.textContent = link.text || link.type.charAt(0).toUpperCase() + link.type.slice(1);
                linkEl.className = 'small-link';
                linksDiv.appendChild(linkEl);
                linksDiv.appendChild(document.createTextNode(' '));
            });
            
            if (linksDiv.children.length > 0) {
                li.innerHTML = html;
                li.appendChild(linksDiv);
            } else {
                li.innerHTML = html;
            }
        } else {
            li.innerHTML = html;
        }
        
        container.appendChild(li);
    });
}

function renderSkills(data) {
    console.log("renderSkills received:", data);
    if (typeof data !== 'object' || data === null) {
        console.warn("No skills data available or invalid format");
        // Ensure placeholder or "No data" message is shown if container exists
        const container = document.querySelector('#skills ul');
        if (container) container.innerHTML = '<li>No skills data available.</li>';
        return;
    }
    
    const container = document.querySelector('#skills ul');
    if (!container) {
        console.error("Skills container '#skills ul' not found - check that the selector #skills ul exists in cv.html");
        return;
    }
    
    container.innerHTML = ''; // Clear existing content
    
    // Global cache of projects for tooltip display
    let projectsData = window.projectsData || []; // Use globally loaded projects data if available
    
    // Define which categories to show and their display titles
    const categoriesToShow = {
        programming: "Programming Languages",
        software: "Software & Tools",
        technical: "Technical Skills"
        // Deliberately NOT including 'uncategorized' here
    };
    
    // Flag to track if we found any skills to display
    let hasSkillsToShow = false;
    
    // Helper function to show projects for a clicked skill
    function showProjectsForSkill(skillName, projectIds) {
        // Find projects with these IDs
        const relatedProjects = projectsData.filter(project => projectIds.includes(project.id));
        
        if (relatedProjects.length === 0) {
            alert(`Skill "${skillName}" is used in projects, but specific project details could not be found.`);
            return;
        }
        
        // Format project info for alert
        const projectInfo = relatedProjects.map(project => 
            `• ${project.title}${project.summary ? ` - ${project.summary.substring(0, 60)}${project.summary.length > 60 ? '...' : ''}` : ''}`
        ).join('\n');
        
        alert(`Skill "${skillName}" is used in the following projects:\n\n${projectInfo}\n\nClick on a project in the Projects section to see details.`);
    }
    
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
                span.title = `Used in ${skillProjects.length} project(s). Click for details.`;
                
                // Add click handler to show related projects
                span.addEventListener('click', () => {
                    showProjectsForSkill(skillName, skillProjects);
                });
                
                // Add tooltip UI that appears on hover
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
    
    // Iterate through the categories we want to display
    for (const [category, displayTitle] of Object.entries(categoriesToShow)) {
        // Skip empty categories
        if (!Array.isArray(data[category]) || data[category].length === 0) {
            continue;
        }
        
        hasSkillsToShow = true; // We found at least one category with skills
        
        const categoryItem = document.createElement('li');
        const categoryHeader = document.createElement('strong');
        categoryHeader.textContent = `${displayTitle}: `;
        categoryItem.appendChild(categoryHeader);
        
        // Create and append skill elements for this category
        const skillElements = createSkillElements(data[category]);
        skillElements.forEach((element, index) => {
            categoryItem.appendChild(element);
            
            // Add a space after each element (except the last) for better spacing
            if (index < skillElements.length - 1) {
                categoryItem.appendChild(document.createTextNode(' '));
            }
        });
        
        container.appendChild(categoryItem);
    }
    
    // If no skills were found in any of the displayed categories
    if (!hasSkillsToShow) {
        container.innerHTML = '<li>No skills currently listed.</li>';
    }
}