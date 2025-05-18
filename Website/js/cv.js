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
        
        // Filter projects and research items by showOnCv flag
        const projectsToShow = cvData.projectsData ? 
            cvData.projectsData.filter(project => project.showOnCv) : [];
            
        const articlesToShow = cvData.researchData && cvData.researchData.articles ? 
            cvData.researchData.articles.filter(article => article.showOnCv) : [];
            
        const thesesToShow = cvData.researchData && cvData.researchData.theses ? 
            cvData.researchData.theses.filter(thesis => thesis.showOnCv) : [];
            
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

// New functions to render projects and research with showOnCv flag
function renderProjectItems(projects) {
    if (!Array.isArray(projects) || projects.length === 0) {
        console.warn("No projects with showOnCv=true available");
        return;
    }
    
    const container = document.querySelector('#projects .project-list');
    if (!container) {
        console.error("Projects container not found - check that the selector #projects .project-list exists");
        return;
    }
    
    // Clear existing content
    container.innerHTML = '';
    
    // Sort projects by order field
    const sortedProjects = [...projects].sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
        }
        return 0;
    });
    
    // Create a list element for the projects
    const ul = document.createElement('ul');
    container.appendChild(ul);
    
    // Render each project
    sortedProjects.forEach(project => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="projects.html#${project.id}">${project.title}</a> – ${project.short || ''}`;
        ul.appendChild(li);
    });
}

function renderResearchItems(researchItems) {
    if (!Array.isArray(researchItems) || researchItems.length === 0) {
        console.warn("No research items with showOnCv=true available");
        return;
    }
    
    // Find or create research references container
    let container = document.querySelector('#research-references');
    if (!container) {
        const research = document.querySelector('#research');
        if (!research) {
            console.error("Research section not found - check that the selector #research exists");
            return;
        }
        
        container = document.createElement('div');
        container.id = 'research-references';
        research.appendChild(container);
    }
    
    // Clear existing content
    container.innerHTML = '<h3>Publications</h3>';
    
    // Categorize research items
    const articles = researchItems.filter(item => item.id && item.id.includes('paper'));
    const theses = researchItems.filter(item => item.id && item.id.includes('thesis'));
    
    // Sort the items by order
    const sortedItems = [...researchItems].sort((a, b) => {
        // Group by type first
        if ((a.id && a.id.includes('paper')) !== (b.id && b.id.includes('paper'))) {
            return a.id.includes('paper') ? -1 : 1; // Articles first
        }
        
        // Then sort by order
        if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
        }
        return 0;
    });
    
    // Create a list for the publications
    const ul = document.createElement('ul');
    
    // Render each research item
    sortedItems.forEach(item => {
        const li = document.createElement('li');
        const isArticle = item.id && item.id.includes('paper');
        
        // Format link based on item type
        const linkHref = isArticle ? 
            `research.html#${item.id}` : 
            'research.html#thesis';
            
        li.innerHTML = `<a href="${linkHref}">${item.title}</a> – ${item.short || ''}`;
        ul.appendChild(li);
    });
    
    container.appendChild(ul);
}

// Keep the original functions for backward compatibility
function renderProjectReferences(references, projectsData) {
    if (!Array.isArray(references) || references.length === 0) {
        console.warn("No project references available or invalid format");
        // Use the old method as fallback
        if (Array.isArray(projectsData)) {
            renderProjects(projectsData);
        }
        return;
    }
    
    // Filter projects that have showOnCv flag
    const cvProjects = Array.isArray(projectsData) ? 
        projectsData.filter(project => project.showOnCv) : [];
        
    if (cvProjects.length > 0) {
        renderProjectItems(cvProjects);
        return;
    }
    
    const container = document.querySelector('#projects .project-list');
    if (!container) return;
    
    // Clear existing content
    container.innerHTML = '';
    
    // Sort references by the order field in the full project data
    const projects = references
        .map(ref => {
            // Find the full project data for this reference
            const fullProject = Array.isArray(projectsData) ? 
                projectsData.find(p => p.id === ref.id) : null;
                
            return fullProject || null;
        })
        .filter(Boolean) // Remove nulls
        .sort((a, b) => {
            // Sort by order if available, otherwise keep original order
            if (a.order !== undefined && b.order !== undefined) {
                return a.order - b.order;
            }
            return 0;
        });
    
    // Render projects
    projects.forEach(project => {
        const li = document.createElement('li');
        
        // Use the short description from the project data
        li.innerHTML = `<a href="projects.html#${project.id}">${project.title}</a> – ${project.short || ''}`;
        
        // Add the list item to a <ul> element
        let ul = container.querySelector('ul');
        if (!ul) {
            ul = document.createElement('ul');
            container.appendChild(ul);
        }
        
        ul.appendChild(li);
    });
}

function renderResearchReferences(references, researchData) {
    if (!Array.isArray(references) || references.length === 0) {
        console.warn("No research references available or invalid format");
        return;
    }
    
    // Filter research items with showOnCv flag
    let cvResearchItems = [];
    
    if (researchData && researchData.articles && Array.isArray(researchData.articles)) {
        const articlesWithCvFlag = researchData.articles.filter(article => article.showOnCv);
        cvResearchItems = cvResearchItems.concat(articlesWithCvFlag);
    }
    
    if (researchData && researchData.theses && Array.isArray(researchData.theses)) {
        const thesesWithCvFlag = researchData.theses.filter(thesis => thesis.showOnCv);
        cvResearchItems = cvResearchItems.concat(thesesWithCvFlag);
    }
    
    if (cvResearchItems.length > 0) {
        renderResearchItems(cvResearchItems);
        return;
    }
    
    const container = document.querySelector('#research-references');
    if (!container) {
        // Create the container if it doesn't exist
        const research = document.querySelector('#research');
        if (!research) return;
        
        const referenceContainer = document.createElement('div');
        referenceContainer.id = 'research-references';
        
        const title = document.createElement('h3');
        title.textContent = 'Publications';
        referenceContainer.appendChild(title);
        
        research.appendChild(referenceContainer);
    }
    
    // Clear existing content
    container.innerHTML = '<h3>Publications</h3>';
    
    // Collect all publication data
    const publications = [];
    
    // Process each reference
    references.forEach(ref => {
        let fullPublication = null;
        
        // Find the full publication data based on the ID
        if (ref.id.includes('paper')) {
            // Journal article
            fullPublication = researchData.articles && Array.isArray(researchData.articles) ? 
                researchData.articles.find(a => a.id === ref.id) : null;
        } else if (ref.id.includes('thesis')) {
            // Thesis
            fullPublication = researchData.theses && Array.isArray(researchData.theses) ? 
                researchData.theses.find(t => t.id === ref.id) : null;
        }
        
        if (fullPublication) {
            // Add the publication type for sorting
            fullPublication.pubType = ref.id.includes('paper') ? 'article' : 'thesis';
            publications.push(fullPublication);
        }
    });
    
    // Sort publications by order if available
    publications.sort((a, b) => {
        // Group by publication type first
        if (a.pubType !== b.pubType) {
            return a.pubType === 'article' ? -1 : 1; // Articles first
        }
        
        // Then sort by order within each type
        if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
        }
        return 0;
    });
    
    // Create a list for the publications
    const ul = document.createElement('ul');
    
    // Render each publication
    publications.forEach(pub => {
        const li = document.createElement('li');
        
        // Format differently based on publication type
        if (pub.pubType === 'article') {
            li.innerHTML = `<a href="research.html#${pub.id}">${pub.title}</a> – ${pub.short || ''}`;
        } else {
            li.innerHTML = `<a href="research.html#thesis">${pub.title}</a> – ${pub.short || ''}`;
        }
        
        ul.appendChild(li);
    });
    
    container.appendChild(ul);
}

function renderProjects(data) {
    if (!Array.isArray(data) || data.length === 0) {
        console.warn("No projects data available or invalid format");
        return;
    }
    
    const container = document.querySelector('#projects .project-list');
    if (!container) return;
    
    // Clear existing content
    container.innerHTML = '';
    
    data.forEach(item => {
        const title = document.createElement('h3');
        
        // Check if this project has an associated link
        let linkHtml = '';
        
        // Handle different link formats
        if (Array.isArray(item.links)) {
            // Array format
            item.links.forEach(link => {
                linkHtml += ` <a href="${link.url}" class="small-link">[${link.text}]</a>`;
            });
        } else if (item.links && typeof item.links === 'object') {
            // Object format with multiple links
            Object.entries(item.links).forEach(([type, url]) => {
                linkHtml += ` <a href="${url}" class="small-link">[${type.charAt(0).toUpperCase() + type.slice(1)}]</a>`;
            });
        } else if (item.link && item.link.url) {
            // Single link object format
            linkHtml = ` <a href="${item.link.url}" class="small-link">[${item.link.text || 'Details'}]</a>`;
        }
        
        title.innerHTML = `${item.title} <span>(${item.dates})</span>${linkHtml}`;
        
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
        
        container.appendChild(title);
        container.appendChild(description);
    });
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
    
    // Programming Languages
    if (Array.isArray(data.programming) && data.programming.length > 0) {
        const li = document.createElement('li');
        li.innerHTML = `<strong>Programming Languages:</strong> ${data.programming.join(', ')}`;
        container.appendChild(li);
    }
    
    // Software & Tools
    if (Array.isArray(data.software) && data.software.length > 0) {
        const li = document.createElement('li');
        li.innerHTML = `<strong>Software &amp; Tools:</strong> ${data.software.join(', ')}`;
        container.appendChild(li);
    }
    
    // Technical Skills
    if (Array.isArray(data.technical) && data.technical.length > 0) {
        const li = document.createElement('li');
        li.innerHTML = `<strong>Technical Skills:</strong> ${data.technical.join(', ')}`;
        container.appendChild(li);
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