// contactBannerEditor.js
// Handles the contact banner editing UI

(() => { // IIFE guard
  const htmlTa = document.getElementById('bannerHtmlEditor');
  const table = document.getElementById('bannerLinksTable').querySelector('tbody');
  if (!htmlTa || !table) return;

  let bannerData;

  // --- load existing banner ---
  fetch('/api/content/contactBanner')
    .then(r => r.json())
    .then(data => {
      bannerData = data;
      htmlTa.value = data.html;
      renderRows();
    });

  function renderRows() {
    table.innerHTML = '';
    bannerData.links
      .sort((a, b) => a.order - b.order)
      .forEach(link => {
        const row = document.createElement('tr');
        row.dataset.id = link.id;
        row.draggable = true;
        row.innerHTML = `
          <td><img src="/icons/${link.icon}" width="32"></td>
          <td><input value="${link.href}" class="hrefInput"></td>
          <td><button class="delBtn">×</button></td>`;
        table.appendChild(row);
        
        // Make row explicitly draggable and prevent child elements from interfering
        row.draggable = true;
        row.querySelectorAll('input,button').forEach(el => {
          el.draggable = false;
          el.addEventListener('mousedown', e => e.stopPropagation());  // prevent text highlight
        });
      });
    
    // Attach sortable with callback that updates the order property
    makeSortable(table, ids => {
      ids.forEach((id, idx) => {
        bannerData.links.find(l => l.id === id).order = idx;
      });
    });
  }

  // --- add link ---
  document.getElementById('addLinkBtn').onclick = () => {
    document.getElementById('iconUpload').click();
  };
  
  document.getElementById('iconUpload').onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    
    const fd = new FormData();
    fd.append('icon', file);
    
    const res = await fetch('/api/upload/icon', {
      method: 'POST',
      body: fd
    }).then(r => r.json());
    
    if (res.success) {
      bannerData.links.push({
        id: crypto.randomUUID(),
        icon: res.filename,
        href: 'https://',
        order: bannerData.links.length
      });
      renderRows();
    } else {
      alert('Upload failed: ' + (res.error || 'Unknown error'));
    }
  };

  // --- save order callback ---
  function saveOrder(newOrderIds) {
    newOrderIds.forEach((id, idx) => {
      const l = bannerData.links.find(x => x.id === id);
      if (l) l.order = idx;
    });
  }

  // --- live href edits & delete ---
  table.addEventListener('input', e => {
    if (e.target.classList.contains('hrefInput')) {
      const id = e.target.closest('tr').dataset.id;
      bannerData.links.find(l => l.id === id).href = e.target.value;
    }
  });
  
  table.addEventListener('click', e => {
    if (e.target.classList.contains('delBtn')) {
      const id = e.target.closest('tr').dataset.id;
      bannerData.links = bannerData.links.filter(l => l.id !== id);
      renderRows();
    }
  });

  // --- save button ---
  document.getElementById('saveContactBannerBtn').onclick = () => {
    bannerData.html = htmlTa.value;
    fetch('/api/content/contactBanner', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(bannerData)
    }).then(r => {
      if (r.ok) {
        const statusElement = document.getElementById('contactBannerSaveStatus');
        if (statusElement) {
          statusElement.textContent = 'Saved successfully!';
          statusElement.style.color = 'green';
          setTimeout(() => {
            statusElement.textContent = '';
          }, 3000);
        }
        showNotification('Contact banner updated successfully!', 'success');
      } else {
        throw new Error('Failed to save');
      }
    })
    .catch(error => {
      console.error('Error saving contact banner content:', error);
      const statusElement = document.getElementById('contactBannerSaveStatus');
      if (statusElement) {
        statusElement.textContent = 'Error saving!';
        statusElement.style.color = 'red';
      }
      showNotification('Error saving contact banner content. Please try again.', 'error');
    });
  };
  
  // Helper function to show notifications (reusing from other modules)
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
})();