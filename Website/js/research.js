document.addEventListener('DOMContentLoaded', () => {
    console.log("Research page loaded, attempting to load dynamic content...");
    loadDynamicResearchContent();
});

async function loadDynamicResearchContent() {
    try {
        console.log("Fetching research data from structured endpoints...");
        
        // Load all research sections concurrently using Promise.all
        const [journalData, thesisData, conferenceData, patentData] = await Promise.all([
            fetchResearchSection('journal'),
            fetchResearchSection('thesis'),
            fetchResearchSection('conference'),
            fetchResearchSection('patent')
        ]);
        
        // Render each section with the retrieved data
        renderJournalEntries(journalData);
        renderThesis(thesisData);
        renderConferenceEntries(conferenceData);
        renderPatentEntries(patentData);
        
    } catch (error) {
        console.error('Error loading dynamic research content:', error);
        // Display error message to user
        const body = document.querySelector('main.container') || document.body;
        const errorDiv = document.createElement('div');
        errorDiv.textContent = `Failed to load research content: ${error.message}`;
        errorDiv.style.color = 'red';
        errorDiv.style.border = '1px solid red';
        errorDiv.style.padding = '10px';
        errorDiv.style.margin = '10px 0';
        if(body.firstChild) body.insertBefore(errorDiv, body.firstChild); else body.appendChild(errorDiv);
    }
}

// Helper function to fetch a specific research section
async function fetchResearchSection(section) {
    try {
        const response = await fetch(`/api/data/research/${section}`);
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

function renderJournalEntries(data) {
    if (!Array.isArray(data) || data.length === 0) {
        console.warn("No journal article data available or invalid format");
        return;
    }
    
    const container = document.getElementById('journal-articles');
    if (!container) return;
    
    // Clear any existing content
    container.innerHTML = '<h2>Journal Articles</h2>';
    
    data.forEach(entry => {
        // Create the entry container
        const entryDiv = document.createElement('div');
        entryDiv.className = 'research-entry';
        if (entry.id) entryDiv.id = entry.id;
        
        // Create and add the title
        const title = document.createElement('h3');
        title.className = 'entry-title';
        title.textContent = entry.title;
        entryDiv.appendChild(title);
        
        // Create and add the authors
        const authors = document.createElement('p');
        authors.className = 'entry-authors';
        // Parse Markdown for authors (to handle bold formatting for your name)
        authors.innerHTML = marked.parse(entry.authors || '');
        entryDiv.appendChild(authors);
        
        // Create and add the venue
        const venue = document.createElement('p');
        venue.className = 'entry-venue';
        venue.textContent = entry.venue;
        entryDiv.appendChild(venue);
        
        // Create and add the date
        const date = document.createElement('p');
        date.className = 'entry-date';
        date.textContent = entry.date || '';
        entryDiv.appendChild(date);
        
        // Create and add the abstract
        const abstract = document.createElement('div');
        abstract.className = 'entry-abstract';
        abstract.innerHTML = marked.parse(entry.abstract || '');
        entryDiv.appendChild(abstract);
        
        // Create and add the links
        const links = document.createElement('div');
        links.className = 'entry-links';
        
        if (entry.links && typeof entry.links === 'object') {
            Object.entries(entry.links).forEach(([type, url]) => {
                if (url) {
                    const link = document.createElement('a');
                    link.href = url;
                    link.textContent = `[${type.charAt(0).toUpperCase() + type.slice(1)}]`;
                    links.appendChild(link);
                    // Add a space after the link
                    links.appendChild(document.createTextNode(' '));
                }
            });
        }
        
        entryDiv.appendChild(links);
        
        // Add the complete entry to the container
        container.appendChild(entryDiv);
    });
}

function renderThesis(data) {
    if (!Array.isArray(data) || data.length === 0) {
        console.warn("No thesis data available or invalid format");
        return;
    }
    
    const container = document.getElementById('thesis');
    if (!container) return;
    
    // Clear any existing content
    container.innerHTML = '<h2>Theses</h2>';
    
    // Sort theses by order
    const sortedTheses = [...data].sort((a, b) => (a.order || 0) - (b.order || 0));
    
    // Process each thesis
    sortedTheses.forEach(thesisData => {
        // Create the entry container
        const entryDiv = document.createElement('div');
        entryDiv.className = 'research-entry';
        if (thesisData.id) {
            entryDiv.id = thesisData.id;
        }
        
        // Create and add the title
        const title = document.createElement('h3');
        title.className = 'entry-title';
        title.textContent = thesisData.title || 'Thesis Title';
        entryDiv.appendChild(title);
        
        // Create and add the authors
        const authors = document.createElement('p');
        authors.className = 'entry-authors';
        authors.innerHTML = marked.parse(thesisData.authors || '**Finn Wilson**');
        entryDiv.appendChild(authors);
        
        // Create and add the venue
        const venue = document.createElement('p');
        venue.className = 'entry-venue';
        venue.textContent = thesisData.venue || '';
        entryDiv.appendChild(venue);
        
        // Create and add the date
        const date = document.createElement('p');
        date.className = 'entry-date';
        date.textContent = thesisData.date || '';
        entryDiv.appendChild(date);
        
        // Create and add the abstract
        const abstract = document.createElement('div');
        abstract.className = 'entry-abstract';
        abstract.innerHTML = marked.parse(thesisData.abstract || '');
        entryDiv.appendChild(abstract);
        
        // Create and add the links
        const links = document.createElement('div');
        links.className = 'entry-links';
        
        if (thesisData.links && typeof thesisData.links === 'object') {
            Object.entries(thesisData.links).forEach(([type, url]) => {
                if (url) {
                    const link = document.createElement('a');
                    link.href = url;
                    
                    // Format the link text based on the type
                    let linkText;
                    if (type.startsWith('project_')) {
                        linkText = `[Related Project: ${type.substring(8).charAt(0).toUpperCase() + type.substring(9)}]`;
                    } else {
                        linkText = `[${type.charAt(0).toUpperCase() + type.slice(1)}]`;
                    }
                    
                    link.textContent = linkText;
                    links.appendChild(link);
                    // Add a space after the link
                    links.appendChild(document.createTextNode(' '));
                }
            });
        }
        
        entryDiv.appendChild(links);
        
        // Add the complete entry to the container
        container.appendChild(entryDiv);
    });
}

function renderConferenceEntries(data) {
    if (!Array.isArray(data) || data.length === 0) {
        console.warn("No conference paper data available or invalid format");
        return;
    }
    
    const container = document.getElementById('conference-papers');
    if (!container) return;
    
    // Clear any existing content
    container.innerHTML = '<h2>Conference Papers</h2>';
    
    data.forEach(entry => {
        // Create the entry container
        const entryDiv = document.createElement('div');
        entryDiv.className = 'research-entry';
        if (entry.id) entryDiv.id = entry.id;
        
        // Create and add the title
        const title = document.createElement('h3');
        title.className = 'entry-title';
        title.textContent = entry.title;
        entryDiv.appendChild(title);
        
        // Create and add the authors
        const authors = document.createElement('p');
        authors.className = 'entry-authors';
        authors.innerHTML = marked.parse(entry.authors || '');
        entryDiv.appendChild(authors);
        
        // Create and add the venue
        const venue = document.createElement('p');
        venue.className = 'entry-venue';
        venue.textContent = entry.venue;
        entryDiv.appendChild(venue);
        
        // Create and add the date
        const date = document.createElement('p');
        date.className = 'entry-date';
        date.textContent = entry.date || '';
        entryDiv.appendChild(date);
        
        // Create and add the abstract
        const abstract = document.createElement('div');
        abstract.className = 'entry-abstract';
        abstract.innerHTML = marked.parse(entry.abstract || '');
        entryDiv.appendChild(abstract);
        
        // Create and add the links
        const links = document.createElement('div');
        links.className = 'entry-links';
        
        if (entry.links && typeof entry.links === 'object') {
            Object.entries(entry.links).forEach(([type, url]) => {
                if (url) {
                    const link = document.createElement('a');
                    link.href = url;
                    link.textContent = `[${type.charAt(0).toUpperCase() + type.slice(1)}]`;
                    links.appendChild(link);
                    // Add a space after the link
                    links.appendChild(document.createTextNode(' '));
                }
            });
        }
        
        entryDiv.appendChild(links);
        
        // Add the complete entry to the container
        container.appendChild(entryDiv);
    });
}

function renderPatentEntries(data) {
    if (!Array.isArray(data) || data.length === 0) {
        console.warn("No patent data available or invalid format");
        return;
    }
    
    const container = document.getElementById('patents');
    if (!container) return;
    
    // Clear any existing content
    container.innerHTML = '<h2>Patents</h2>';
    
    data.forEach(entry => {
        // Create the entry container
        const entryDiv = document.createElement('div');
        entryDiv.className = 'research-entry';
        if (entry.id) entryDiv.id = entry.id;
        
        // Create and add the title
        const title = document.createElement('h3');
        title.className = 'entry-title';
        title.textContent = entry.title;
        entryDiv.appendChild(title);
        
        // Create and add the authors
        const authors = document.createElement('p');
        authors.className = 'entry-authors';
        authors.innerHTML = marked.parse(entry.authors || '');
        entryDiv.appendChild(authors);
        
        // Create and add the venue (status for patents)
        const venue = document.createElement('p');
        venue.className = 'entry-venue';
        venue.textContent = entry.venue;
        entryDiv.appendChild(venue);
        
        // Create and add the date
        const date = document.createElement('p');
        date.className = 'entry-date';
        date.textContent = entry.date || '';
        entryDiv.appendChild(date);
        
        // Create and add the abstract
        const abstract = document.createElement('div');
        abstract.className = 'entry-abstract';
        abstract.innerHTML = marked.parse(entry.abstract || '');
        entryDiv.appendChild(abstract);
        
        // Create and add the links
        const links = document.createElement('div');
        links.className = 'entry-links';
        
        if (entry.links && typeof entry.links === 'object') {
            Object.entries(entry.links).forEach(([type, url]) => {
                if (url) {
                    const link = document.createElement('a');
                    link.href = url;
                    link.textContent = `[${type.charAt(0).toUpperCase() + type.slice(1)}]`;
                    links.appendChild(link);
                    // Add a space after the link
                    links.appendChild(document.createTextNode(' '));
                }
            });
        }
        
        entryDiv.appendChild(links);
        
        // Add the complete entry to the container
        container.appendChild(entryDiv);
    });
}