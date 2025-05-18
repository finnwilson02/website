// homepageEditor.js
// Lazy loads homepage markdown content when the editor becomes visible

document.addEventListener('DOMContentLoaded', () => {
  const ta = document.getElementById('homepageEditor');
  if (!ta) return;  // guard
  
  let loaded = false;

  function updatePreview() {
    const pv = document.getElementById('homepagePreview');
    if(pv) pv.innerHTML = marked.parse(ta.value);
  }
  
  function loadIfNeeded() {
    if (loaded || ta.offsetParent === null) return; // only when shown
    
    fetch('/api/content/homepage')
      .then(r => r.text())
      .then(md => {
        ta.value = md;
        updatePreview();  // Update preview immediately
        loaded = true;
      });
  }
  
  // Add input event listener to update preview while typing
  ta.addEventListener('input', updatePreview);
  
  // Check on initial load
  loadIfNeeded();
  
  // Listen for generic tab change events
  document.addEventListener('tabChanged', loadIfNeeded);
  
  // Also check when tab links are clicked (in case tabChanged isn't dispatched)
  document.querySelectorAll('.tab-link').forEach(tabLink => {
    tabLink.addEventListener('click', () => {
      // Small delay to allow DOM to update
      setTimeout(loadIfNeeded, 50);
    });
  });
});