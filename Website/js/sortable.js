// sortable.js - Generic draggable list sorting functionality

/**
 * Makes a table body sortable with drag-and-drop functionality
 * @param {string} section - The section identifier ('projects', 'articles', 'theses')
 * @param {HTMLElement} tableBody - The table body element to make sortable
 * @param {Function} saveCallback - Optional callback function to call after saving the new order
 */
function makeSortable(section, tableBody, saveCallback) {
    if (!tableBody) {
        console.error(`Table body for ${section} not found`);
        return;
    }
    
    // Add the sortable class to the table body
    tableBody.classList.add('sortable');
    
    let draggedRow = null;
    let rows = Array.from(tableBody.querySelectorAll('tr'));
    
    // Drag and drop handlers
    function handleDragStart(e) {
        draggedRow = this;
        this.classList.add('dragging');
        // Required for Firefox
        e.dataTransfer.setData('text/plain', '');
        e.dataTransfer.effectAllowed = 'move';
    }
    
    function handleDragOver(e) {
        e.preventDefault();             // Makes drop legal
        const hoveringRow = this;
        if(hoveringRow === draggedRow) return;
        
        const rect = hoveringRow.getBoundingClientRect();
        const halfway = rect.top + rect.height / 2;
        const parent = hoveringRow.parentNode;
        
        if (e.clientY < halfway) {
            parent.insertBefore(draggedRow, hoveringRow);     // move up
        } else {
            parent.insertBefore(draggedRow, hoveringRow.nextSibling); // move down
        }
    }
    
    function handleDrop(e) { 
        e.stopPropagation(); 
    }
    
    function handleDragEnd() {
        this.classList.remove('dragging');
        
        // Collect new order
        const ids = Array.from(this.parentNode.children).map(tr => tr.dataset.id);
        
        // Call the supplied callback
        if (typeof saveCallback === 'function') {
            saveCallback(ids);
        }
        
        // Also save via API if section is provided
        if (section) {
            saveOrder(section, tableBody);
        }
        
        draggedRow = null;
    }
    
    // Add event listeners to each row
    rows.forEach(row => {
        // Add a drag handle to each row
        const handleCell = document.createElement('td');
        handleCell.innerHTML = '&#8942;&#8942;'; // Unicode for vertical ellipsis (⋮⋮)
        handleCell.classList.add('drag-handle');
        handleCell.style.cursor = 'grab';
        
        // Insert the handle at the beginning of the row
        row.insertBefore(handleCell, row.firstChild);
        
        // Add draggable attribute and event listeners
        row.draggable = true;
        row.addEventListener('dragstart', handleDragStart);
        row.addEventListener('dragover', handleDragOver);
        row.addEventListener('drop', handleDrop);
        row.addEventListener('dragend', handleDragEnd);
    });
    
    // Find the closest row based on mouse position
    function findClosestRow(tableBody, clientY) {
        const rows = Array.from(tableBody.querySelectorAll('tr:not(.dragging)'));
        return rows.reduce((closest, row) => {
            const rect = row.getBoundingClientRect();
            const offset = clientY - rect.top - rect.height / 2;
            
            if (closest === null || Math.abs(offset) < Math.abs(closest.offset)) {
                return { offset, element: row };
            } else {
                return closest;
            }
        }, null)?.element;
    }
    
    // Save the new order to the server
    function saveOrder(section, tableBody) {
        const rows = Array.from(tableBody.querySelectorAll('tr'));
        const ids = rows.map(row => row.dataset.id);
        
        // Show loading indicator
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) loadingIndicator.style.display = 'block';
        
        // Send the new order to the server
        fetch(`/api/data/${section}/order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(ids)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to save order: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            showNotification('Order saved successfully', 'success');
            
            // Call the callback if provided
            if (saveCallback && typeof saveCallback === 'function') {
                saveCallback();
            }
        })
        .catch(error => {
            console.error('Error saving order:', error);
            showNotification(`Error saving order: ${error.message}`, 'error');
        })
        .finally(() => {
            // Hide loading indicator
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        });
    }
    
    // Show notification function
    function showNotification(message, type = 'info') {
        const notificationArea = document.getElementById('adminNotifications');
        if (!notificationArea) return;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = message;
        
        // Style based on type
        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#d4edda';
                notification.style.color = '#155724';
                notification.style.borderColor = '#c3e6cb';
                break;
            case 'error':
                notification.style.backgroundColor = '#f8d7da';
                notification.style.color = '#721c24';
                notification.style.borderColor = '#f5c6cb';
                break;
            default:
                notification.style.backgroundColor = '#d1ecf1';
                notification.style.color = '#0c5460';
                notification.style.borderColor = '#bee5eb';
        }
        
        // Add some common styles
        notification.style.padding = '10px';
        notification.style.margin = '5px 0';
        notification.style.borderRadius = '4px';
        notification.style.border = '1px solid';
        
        notificationArea.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s ease';
            
            // Remove from DOM after fade-out
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 5000);
    }
    
    // Add a save button after the table
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save Order';
    saveButton.className = 'save-order-btn';
    saveButton.addEventListener('click', () => {
        saveOrder(section, tableBody);
    });
    
    // Add the save button after the table
    const table = tableBody.closest('table');
    if (table && table.parentNode) {
        table.parentNode.insertBefore(saveButton, table.nextSibling);
    }
}