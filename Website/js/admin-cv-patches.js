// admin-cv-patches.js
// Add showOnCv functionality to all forms

document.addEventListener('DOMContentLoaded', function() {
    // Initialize event listeners for the checkboxes
    initShowOnCvCheckboxes();
});

function initShowOnCvCheckboxes() {
    // Project form
    const projectForm = document.getElementById('projectForm');
    const projectShowOnCvCheckbox = document.getElementById('projectShowOnCv');
    
    // Check if the original form submit handler exists and patch it
    if (projectForm && projectShowOnCvCheckbox) {
        const originalProjectSubmit = projectForm.onsubmit;
        projectForm.onsubmit = function(event) {
            // Get original result
            const result = originalProjectSubmit ? originalProjectSubmit.call(this, event) : true;
            
            // If original handler didn't prevent default, add our code
            if (result !== false) {
                // Find the project in the global projects array
                const projectIndex = document.getElementById('projectEditIndex').value;
                if (projectIndex !== "-1" && window.projects && window.projects[projectIndex]) {
                    // Add showOnCv to the project
                    window.projects[projectIndex].showOnCv = projectShowOnCvCheckbox.checked;
                }
            }
            
            return result;
        };
    }
    
    // Journal Article form
    const journalForm = document.getElementById('researchJournalForm');
    const journalShowOnCvCheckbox = document.getElementById('journalShowOnCv');
    
    if (journalForm && journalShowOnCvCheckbox) {
        const originalJournalSubmit = journalForm.onsubmit;
        journalForm.onsubmit = function(event) {
            const result = originalJournalSubmit ? originalJournalSubmit.call(this, event) : true;
            
            if (result !== false) {
                const journalIndex = document.getElementById('journalEditIndex').value;
                if (journalIndex !== "-1" && window.journalArticles && window.journalArticles[journalIndex]) {
                    window.journalArticles[journalIndex].showOnCv = journalShowOnCvCheckbox.checked;
                }
            }
            
            return result;
        };
    }
    
    // Thesis form
    const saveThesisButton = document.getElementById('saveThesisButton');
    const thesisShowOnCvCheckbox = document.getElementById('thesisShowOnCv');
    
    if (saveThesisButton && thesisShowOnCvCheckbox) {
        const originalThesisClick = saveThesisButton.onclick;
        saveThesisButton.onclick = function(event) {
            // Update the thesis showOnCv flag
            if (window.thesis) {
                window.thesis.showOnCv = thesisShowOnCvCheckbox.checked;
            }
            
            // Call the original handler
            if (originalThesisClick) {
                return originalThesisClick.call(this, event);
            }
            return true;
        };
    }
    
    // Conference Paper form
    const conferenceForm = document.getElementById('researchConferenceForm');
    const conferenceShowOnCvCheckbox = document.getElementById('conferenceShowOnCv');
    
    if (conferenceForm && conferenceShowOnCvCheckbox) {
        const originalConferenceSubmit = conferenceForm.onsubmit;
        conferenceForm.onsubmit = function(event) {
            const result = originalConferenceSubmit ? originalConferenceSubmit.call(this, event) : true;
            
            if (result !== false) {
                const conferenceIndex = document.getElementById('conferenceEditIndex').value;
                if (conferenceIndex !== "-1" && window.conferencePapers && window.conferencePapers[conferenceIndex]) {
                    window.conferencePapers[conferenceIndex].showOnCv = conferenceShowOnCvCheckbox.checked;
                }
            }
            
            return result;
        };
    }
    
    // Patent form
    const patentForm = document.getElementById('researchPatentForm');
    const patentShowOnCvCheckbox = document.getElementById('patentShowOnCv');
    
    if (patentForm && patentShowOnCvCheckbox) {
        const originalPatentSubmit = patentForm.onsubmit;
        patentForm.onsubmit = function(event) {
            const result = originalPatentSubmit ? originalPatentSubmit.call(this, event) : true;
            
            if (result !== false) {
                const patentIndex = document.getElementById('patentEditIndex').value;
                if (patentIndex !== "-1" && window.patents && window.patents[patentIndex]) {
                    window.patents[patentIndex].showOnCv = patentShowOnCvCheckbox.checked;
                }
            }
            
            return result;
        };
    }
}

// Patch for filling project form
const originalFillProjectForm = window.fillProjectForm;
window.fillProjectForm = function(project) {
    // Call the original function first
    if (originalFillProjectForm) {
        originalFillProjectForm(project);
    }
    
    // Now set showOnCv checkbox
    const showOnCvCheckbox = document.getElementById('projectShowOnCv');
    if (showOnCvCheckbox && project) {
        showOnCvCheckbox.checked = !!project.showOnCv;
    }
};

// Patch for gathering project form data
const originalGatherProjectFormData = window.gatherProjectFormData;
window.gatherProjectFormData = function() {
    // Get the original data
    const projectData = originalGatherProjectFormData ? originalGatherProjectFormData() : {};
    
    // Add showOnCv
    const showOnCvCheckbox = document.getElementById('projectShowOnCv');
    if (showOnCvCheckbox) {
        projectData.showOnCv = showOnCvCheckbox.checked;
    }
    
    return projectData;
};

// Patch for filling journal form
const originalFillJournalForm = window.fillJournalForm;
window.fillJournalForm = function(article) {
    // Call the original function first
    if (originalFillJournalForm) {
        originalFillJournalForm(article);
    }
    
    // Now set showOnCv checkbox
    const showOnCvCheckbox = document.getElementById('journalShowOnCv');
    if (showOnCvCheckbox && article) {
        showOnCvCheckbox.checked = !!article.showOnCv;
    }
};

// Patch for gathering journal form data
const originalGatherJournalFormData = window.gatherJournalFormData;
window.gatherJournalFormData = function() {
    // Get the original data
    const journalData = originalGatherJournalFormData ? originalGatherJournalFormData() : {};
    
    // Add showOnCv
    const showOnCvCheckbox = document.getElementById('journalShowOnCv');
    if (showOnCvCheckbox) {
        journalData.showOnCv = showOnCvCheckbox.checked;
    }
    
    return journalData;
};

// Patch for filling thesis form
const originalFillThesisForm = window.fillThesisForm;
window.fillThesisForm = function(thesis) {
    // Call the original function first
    if (originalFillThesisForm) {
        originalFillThesisForm(thesis);
    }
    
    // Now set showOnCv checkbox
    const showOnCvCheckbox = document.getElementById('thesisShowOnCv');
    if (showOnCvCheckbox && thesis) {
        showOnCvCheckbox.checked = !!thesis.showOnCv;
    }
};

// Patch for gathering thesis form data
const originalGatherThesisFormData = window.gatherThesisFormData;
window.gatherThesisFormData = function() {
    // Get the original data
    const thesisData = originalGatherThesisFormData ? originalGatherThesisFormData() : {};
    
    // Add showOnCv
    const showOnCvCheckbox = document.getElementById('thesisShowOnCv');
    if (showOnCvCheckbox) {
        thesisData.showOnCv = showOnCvCheckbox.checked;
    }
    
    return thesisData;
};

// Patch for filling conference form
const originalFillConferenceForm = window.fillConferenceForm;
window.fillConferenceForm = function(paper) {
    // Call the original function first
    if (originalFillConferenceForm) {
        originalFillConferenceForm(paper);
    }
    
    // Now set showOnCv checkbox
    const showOnCvCheckbox = document.getElementById('conferenceShowOnCv');
    if (showOnCvCheckbox && paper) {
        showOnCvCheckbox.checked = !!paper.showOnCv;
    }
};

// Patch for gathering conference form data
const originalGatherConferenceFormData = window.gatherConferenceFormData;
window.gatherConferenceFormData = function() {
    // Get the original data
    const conferenceData = originalGatherConferenceFormData ? originalGatherConferenceFormData() : {};
    
    // Add showOnCv
    const showOnCvCheckbox = document.getElementById('conferenceShowOnCv');
    if (showOnCvCheckbox) {
        conferenceData.showOnCv = showOnCvCheckbox.checked;
    }
    
    return conferenceData;
};

// Patch for filling patent form
const originalFillPatentForm = window.fillPatentForm;
window.fillPatentForm = function(patent) {
    // Call the original function first
    if (originalFillPatentForm) {
        originalFillPatentForm(patent);
    }
    
    // Now set showOnCv checkbox
    const showOnCvCheckbox = document.getElementById('patentShowOnCv');
    if (showOnCvCheckbox && patent) {
        showOnCvCheckbox.checked = !!patent.showOnCv;
    }
};

// Patch for gathering patent form data
const originalGatherPatentFormData = window.gatherPatentFormData;
window.gatherPatentFormData = function() {
    // Get the original data
    const patentData = originalGatherPatentFormData ? originalGatherPatentFormData() : {};
    
    // Add showOnCv
    const showOnCvCheckbox = document.getElementById('patentShowOnCv');
    if (showOnCvCheckbox) {
        patentData.showOnCv = patentShowOnCvCheckbox.checked;
    }
    
    return patentData;
};