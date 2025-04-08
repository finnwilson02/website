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
    if (!container) return;
    
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