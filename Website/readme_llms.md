# Website Admin Panel Documentation

## Overview

The admin panel (`admin.html`) provides a comprehensive interface for managing website content including books, photos, projects, trips, CV information, and research publications.

## Website UI Structure

### Header and Footer Loading

The website uses dynamic header and footer loading across all pages:

- **Header**: Loaded dynamically from `includes/header.html` via `js/script.js`
- **Footer**: Loaded dynamically from `footer.html` via `js/script.js`
- **Navigation**: Contact menu item removed from navigation; contact information now only available in footer
- **Consistency**: All pages use `<footer id="footer"></footer>` for uniform footer loading

### Navigation Menu

The main navigation includes:
- Home
- CV
- Research
- Projects
- Bookshelf
- Photography (World Map)
- 3D Globe

**Note**: Contact link was removed from navigation as contact information is consistently available in the footer across all pages.

## Admin Interface Structure

### Main Tabs

The admin panel is organized into the following main tabs:
- **Books**: Manage book collection
- **Photos**: Upload and organize photos with metadata
- **Projects**: Edit project descriptions and details
- **Manage Trips**: Create and edit trip information
- **CV Content**: Manage curriculum vitae sections
- **Edit Research**: Manage research publications

### CV Content Sub-tabs

The CV Content tab contains the following sub-tabs for detailed CV management:

1. **Education** (`data-cv-tab="education"`)
   - Institution (text)
   - Degree (text)  
   - Honours (text)
   - Dates (text)

2. **Work Experience** (`data-cv-tab="work"`)
   - Title (text)
   - Company (text)
   - Dates (text)
   - Description (textarea)

3. **Research** (`data-cv-tab="research"`)
   - Title (text)
   - Description (text)
   - Institution (text)
   - Dates (text)

4. **Skills** (`data-cv-tab="skills"`)
   - Programming (text)
   - Software (text)
   - Technical (text)
   - Note: Skills data is stored as an object, not an array

5. **Achievements** (`data-cv-tab="achievements"`)
   - Title (text)
   - Date (text)
   - Description (text)

6. **Positions** (`data-cv-tab="positions"`)
   - Title (text)
   - Organization (text)
   - Dates (text)

### Research Content Subsections

The Edit Research tab contains forms for managing different types of research publications:

1. **Journal Articles**
   - ID (used for anchors)
   - Title
   - Authors (use **Finn Wilson** for bold name)
   - Venue (journal name)
   - Date
   - Abstract
   - Links (dynamic key-value pairs)

2. **Thesis**
   - Single entry form
   - Same fields as journal articles

3. **Conference Papers**
   - Similar structure to journal articles
   - Listed in table format

4. **Patents**
   - Similar structure to journal articles
   - Listed in table format

## Key Features

### Notifications System
- Fixed position notifications appear in top-right corner
- Types: success (green), error (red), info (blue), warning (yellow)
- Auto-dismiss after 5 seconds with fade animation
- Usage: `showNotification(message, type)`

### Loading Indicator
- Displays spinner with "Loading data..." text
- Toggle with `toggleLoading(true/false)`

### Tab Navigation
- CV sub-tabs use `data-cv-tab` attributes
- Active state managed through `.active` class
- Responsive design collapses to vertical on mobile

## Data Flow

1. All data is loaded on admin panel initialization
2. Forms populate with existing data when editing
3. Save operations update both server and local state
4. After successful saves, data is reloaded from server to ensure sync

## Extension Guidelines

### Adding New CV Sections
1. Add new tab link with `data-cv-tab="newsection"`
2. Create corresponding `.cv-tab-pane` div with ID `cvNewsectionSection`
3. Include table for list display and form for editing
4. Add data handling in `js/admin.js`

### Adding New Research Types
1. Add new subsection div with class `research-admin-subsection`
2. Include table for entries and form for editing
3. Use `showResearchEntryForm(type, index)` for form display
4. Follow existing patterns for consistency

## Security Notes

- Admin panel requires authentication
- Session-based authentication with environment-specific storage
- All API endpoints check authentication status
- Passwords are hashed using bcrypt

## Skill Linking System

### Overview

The skill linking system automatically derives skills from projects, work experience, and research roles, maintaining a unified skill cache across all CV data. This ensures consistency and enables automatic skill discovery while tracking skill sources.

### Data Model

**cv_skills.json Structure:**
```json
{
  "programming": [
    {"name": "Python", "projects": ["uav-deterrence", "mine-sampling"]}
  ],
  "software": [...],
  "technical": [...],
  "uncategorized": [
    {"name": "New Skill", "projects": ["project-id"], "source": "role"}
  ],
  "allSkillsCache": ["Sorted", "list", "of", "all", "skills"]
}
```

**projects.json Fields:**
- `skills`: Array of skill names (or comma-separated string)
- `showOnCv`: Boolean to control CV visibility
- `order`: Number for display ordering
- `fullWidth`: Image width (nullable)
- `fullHeight`: Image height (nullable)

**cv_work.json & cv_research.json Fields:**
- `skills`: Array of skill names associated with the role
- Skills from these sources are added to uncategorized with `source: "role"`

### Server-Side Functions

**deriveSkillsFromProjects(projects)**
- **Input**: Array of project objects
- **Output**: Object mapping skills to project IDs
- **Purpose**: Extracts skills from all projects and builds associations

**updateCvSkillsCache()**
- **Input**: None (reads from disk)
- **Output**: Updated cv_skills.json file
- **Purpose**: Merges manual and derived skills from projects, work, and research
- **When called**: After any project, work experience, research, or manual skill update
- **Features**: 
  - Derives skills from project skills arrays
  - Processes work and research role skills
  - Adds role-only skills to uncategorized with source tracking
  - Maintains allSkillsCache for autocomplete

### API Endpoints

**GET /api/data/cv/skills**
- Returns current cv_skills.json content
- No authentication required

**POST /api/save/cv/skills**
- Saves updated skills data
- Requires authentication
- Triggers cache update automatically

### Extension Points

1. **Adding New Skill Categories**
   - Add category to cv_skills.json
   - Update deriveSkillsFromProjects logic
   - Extend frontend forms

2. **Custom Skill Sources**
   - Modify deriveSkillsFromProjects to pull from additional sources
   - Update cache logic to handle new sources

3. **Skill Validation**
   - Add validation in updateCvSkillsCache
   - Implement skill name normalization

### Testing

Run unit tests with:
```bash
pytest tests/test_skill_linking.py -v
```

Tests cover:
- Skill derivation from various formats
- Cache update logic
- Duplicate prevention
- Data integrity

## Drag-and-Drop Reordering

### Overview

The admin panel supports drag-and-drop reordering for various content types, starting with projects. The implementation uses Sortable.js for smooth drag interactions.

### Implementation Details

**Frontend Components:**
- **HTML**: Tables with class="sortable" and drag handle columns
- **CSS**: `.sortable-row`, `.drag-handle` classes for visual feedback
- **JS**: Sortable initialization and reorder event handling

**How to Initialize Sortable:**
```javascript
new Sortable(tbody, {
    handle: '.drag-handle',  // Only allow dragging via handle
    animation: 150,          // Smooth animation
    onEnd: handleReorder     // Callback after drop
});
```

**Reorder Handler Pattern:**
```javascript
async function handleReorder(evt) {
    // Collect new order
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const reorderedData = rows.map((row, idx) => ({
        id: row.dataset.id,
        idx: idx
    }));
    
    // Send to server
    await fetch('/api/[entity]/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(reorderedData)
    });
}
```

### API Endpoints

**POST /api/projects/reorder**
- **Input**: Array of `{id: string, idx: number}` objects
- **Output**: 204 No Content on success
- **Behavior**: Updates "order" field in projects.json
- **Authentication**: Required

### Skills Drag-and-Drop

The CV Skills section uses a different drag-and-drop pattern optimized for categorization:

**Implementation:**
- Skills are displayed as draggable boxes within category containers
- Uses shared Sortable group to allow cross-category dragging
- No explicit reorder endpoint - saves entire skills structure on move

**Key Components:**
```javascript
// Initialize sortable with shared group
new Sortable(container, {
    group: 'skills',     // Allows dragging between categories
    animation: 150,
    onAdd: handleMove,   // Fires when moved to new category
    onSort: handleMove   // Fires when reordered within category
});

// Handler reconstructs data from DOM
function handleSkillMove(evt) {
    // Collect skills from each category's DOM
    categories.forEach(category => {
        const boxes = container.querySelectorAll('.skill-box');
        updatedSkills[category] = Array.from(boxes).map(box => ({
            name: box.dataset.name,
            projects: box.dataset.projects.split(',')
        }));
    });
    // Save entire structure
}
```

**Manual Skill Addition:**
- Form allows adding new skills with category selection
- Default category is "uncategorized" (not shown on CV)
- Includes optional project association

### Extending to Other Sections

To add drag-and-drop to other data types:

1. **For List/Table Reordering** (like Projects):
   - Add drag handle column to table
   - Add `sortable-row` class to rows
   - Add `data-id` attribute to rows
   - Initialize Sortable after rendering
   - Create reorder API endpoint

2. **For Categorization** (like Skills):
   - Create category containers with `.sortable` class
   - Use shared Sortable group for cross-container dragging
   - Save entire data structure on move
   - No separate reorder endpoint needed

3. **Example for CV Education**:
   ```javascript
   // In renderEducationList()
   row.className = 'sortable-row';
   row.dataset.id = edu.id || `edu-${index}`;
   
   // After rendering
   new Sortable(educationTableBody, {
       handle: '.drag-handle',
       animation: 150,
       onEnd: handleEducationReorder
   });
   ```

## Unified Projects System

### Overview

All projects across the website (main projects page, CV projects, and admin) are managed through a single `projects.json` file. This eliminates duplication and ensures consistency across all views. Projects can be configured with CV-specific fields and detailed markdown content for comprehensive display.

### Projects Page Features

**Dynamic Loading:**
- Projects page loads dynamically from `/api/data/projects`
- Renders projects based on order field
- Clickable images and titles navigate to detailed project pages
- Responsive grid layout with project cards

**Project Detail Pages:**
- Individual detail pages accessible via `project-detail.html?id={project-id}`
- Displays full project information including markdown writeup
- Shows project banner image, status, and external links
- Markdown content parsed using Marked.js library

### CV Projects Integration

CV Projects are managed directly through the main Projects tab, eliminating duplication. Projects can be configured with CV-specific fields to control their appearance on the CV page.

### Admin Features

**Main Projects Form:**
- **CV Summary**: Optional CV-specific summary field (falls back to general summary if empty)
- **Show on CV**: Checkbox to control CV visibility (defaults to checked for new projects)
- All CV-related fields are saved alongside project data in projects.json
- Drag-and-drop reordering affects both main projects list and CV display

**Implementation Details:**
```javascript
// Project data includes CV fields
const projectData = {
    id: projectIdInput.value,
    title: projectTitleInput.value,
    summary: projectSummaryInput.value,
    cvSummary: document.getElementById('projectCvSummary').value || '', 
    showOnCv: document.getElementById('projectShowOnCv').checked,
    // ... other fields
};

// CV page filters and displays projects
const cvProjects = allProjects
    .filter(p => p.showOnCv === true)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
```

### Client-Side Linking

**CV Page Features:**
- Projects are clickable and navigate to detail pages
- Uses `data-id` attribute for project identification
- External links open in same tab with event propagation stopped
- Hover effects for better UX

**Click Handler Pattern:**
```javascript
projectDiv.addEventListener('click', (e) => {
    if (e.target.tagName !== 'A') {
        window.location.href = `project-detail.html?id=${project.id}`;
    }
});
```

### Data Model

**projects.json Structure:**
```json
[
  {
    "id": "uav-deterrence",
    "title": "Autonomous UAV Bird Herding Swarm",
    "image": "img/placeholder_uav.jpg",
    "summary": "Short description for listings",
    "cvSummary": "Optional CV-specific summary",
    "role": "My specific role in this project",
    "skills": ["C++", "Python", "ROS"],
    "links": {
      "github": "https://github.com/user/repo",
      "demo": "#",
      "research": "/research.html#paper"
    },
    "status": "Research Published (In Prep)",
    "showOnCv": true,
    "order": 0,
    "detailMarkdown": "# Full Project Writeup\n\nDetailed markdown content..."
  }
]
```

**Key Fields:**
- `id`: Unique identifier for linking across pages
- `title`: Project title displayed everywhere
- `image`: Banner image path for project cards and detail pages
- `summary`: Brief description for project cards and CV
- `cvSummary`: Optional CV-specific summary (falls back to general summary)
- `role`: Description of personal involvement
- `skills`: Array of skill names for skill linking system
- `links`: Object with external links (github, demo, research, etc.)
- `status`: Current project status
- `showOnCv`: Boolean to control CV visibility
- `order`: Number for sort order across all views
- `detailMarkdown`: Full markdown content for detail pages

### Implementation Details

**Projects Page (projects.html):**
```javascript
// Dynamic loading and rendering
async function loadProjects() {
    const response = await fetch('/api/data/projects');
    const projects = await response.json();
    renderProjects(projects);
}

// Click handlers for navigation
function addProjectClickHandlers() {
    document.querySelectorAll('.project-image').forEach(img => {
        img.addEventListener('click', () => {
            window.location.href = `project-detail.html?id=${img.dataset.id}`;
        });
    });
}
```

**Project Detail Page (project-detail.html):**
```javascript
// Load project by ID from URL parameter
async function loadProjectDetails(projectId) {
    const response = await fetch('/api/data/projects');
    const projects = await response.json();
    const project = projects.find(p => p.id === projectId);
    
    // Parse markdown and display
    const htmlContent = marked.parse(project.detailMarkdown);
    document.getElementById('projectBody').innerHTML = htmlContent;
}
```

### Extension Points

1. **Additional Project Types**: Add categories or tags for project filtering
2. **Bulk Operations**: Enable/disable multiple projects for CV
3. **Preview Mode**: Show CV preview while editing
4. **Project Templates**: Quick-add common project types
5. **Project Gallery**: Add multiple images per project
6. **Project Search**: Add search and filtering capabilities

## CV Skills Rendering

### Overview

Skills on the CV page are displayed as interactive elements with project associations. The system automatically filters out uncategorized skills and provides tooltips and click interactions.

### Implementation Details

**Skills Data Structure:**
```javascript
{
  "programming": [
    {"name": "Python", "projects": ["uav-deterrence", "mine-sampling"]},
    {"name": "C++", "projects": ["uav-deterrence"]}
  ],
  "software": [...],
  "technical": [...],
  "uncategorized": [...] // Not displayed on CV
}
```

**Rendering Features:**
- Skills display as comma-separated lists by category
- Only skills with linked projects are clickable (underlined)
- Skills without projects have no underline (not interactive)
- Hover shows tooltip with project list
- Click opens modal with detailed information:
  - Project links with titles (not just IDs)
  - Associated work experience roles
  - Associated research roles
- Modal fetches all data dynamically for accurate display

**Code Example:**
```javascript
// Render skills with interactions
function renderSkills(data) {
    // Filter out uncategorized
    renderSkillCategory('programming', 'Programming Languages', data.programming);
    renderSkillCategory('software', 'Software & Tools', data.software);
    renderSkillCategory('technical', 'Technical Skills', data.technical);
    
    // Add interactions
    addSkillInteractions();
}
```

### Admin Panel Features

**Color-Coded Skills:**
- Blue background (`skill-derived`): Skills with associated projects
- Green background (`skill-manual`): Manually added skills without projects
- Red background (`skill-role-only`): Skills derived only from work/research roles
- Visual distinction helps identify skill sources at a glance

**Skills Autocomplete:**
- Available on project, work, and research forms
- Suggests from `allSkillsCache` to prevent duplicates
- Works with comma-separated input
- Updates suggestions as you type
- New skills from roles are automatically added to uncategorized

### Extension Points

1. **Source Tracking**: Add explicit "source" field to track skill origin
2. **Position Links**: Add position associations similar to projects
3. **Skill Merging**: UI to merge duplicate skills across categories
4. **Bulk Import**: Import skills from external sources

## Future Enhancements

The structure is prepared for:
- Bulk operations on entries
- Import/export functionality
- Advanced filtering and search
- Skill categorization suggestions
- Project-skill relationship visualization
- Extended drag-and-drop to all list types
- Real-time CV preview while editing