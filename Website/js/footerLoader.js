// footerLoader.js
// Loads the footer content including the contact banner

document.addEventListener('DOMContentLoaded', async function() {
  const footerElement = document.getElementById('footer');
  
  if (!footerElement) {
    console.error('Footer element not found');
    return;
  }
  
  // Add footer-specific CSS
  const style = document.createElement('style');
  style.textContent = `
    .footer-links { margin-top: 10px; }
    .footer-links img { margin: 0 .25rem; width: 32px; height: 32px; }
  `;
  document.head.appendChild(style);
  
  try {
    // First, load the standard footer structure
    footerElement.innerHTML = '<div class="container"></div>';
    const footerContainer = footerElement.querySelector('.container');
    
    // Then fetch contact banner content from API
    try {
      const response = await fetch('/api/content/contactBanner');
      
      if (response.ok) {
        const data = await response.json();
        footerContainer.innerHTML = renderContactBanner(data);
      } else if (response.status === 404) {
        // If the file doesn't exist yet, load fallback content
        console.warn('Contact banner content not found, using fallback');
        footerContainer.innerHTML = getFallbackContactBanner();
      } else {
        console.error('Failed to load contact banner:', response.statusText);
        footerContainer.innerHTML = getFallbackContactBanner();
      }
    } catch (error) {
      console.error('Error loading contact banner:', error);
      footerContainer.innerHTML = getFallbackContactBanner();
    }
  } catch (error) {
    console.error('Error initializing footer:', error);
  }
});

// Render contact banner from JSON data
function renderContactBanner(data) {
  const { html = '', links = [] } = data;
  
  // Sort links by order property
  const sortedLinks = [...links].sort((a, b) => a.order - b.order);
  
  // Create the social links HTML
  const socialLinksHtml = sortedLinks.map(link => {
    return `
      <a href="${link.href}" target="_blank">
        <img src="icons/${link.icon}" alt="${link.icon.split('.')[0]}" />
      </a>
    `;
  }).join('');
  
  // Return the complete contact banner HTML
  return `
    <div class="contact-banner">
      ${html}
      <div class="footer-links">
        ${socialLinksHtml}
      </div>
    </div>
  `;
}

// Fallback contact banner content if API fails
function getFallbackContactBanner() {
  return `
    <div class="contact-banner">
      <p>Email: <a href="mailto:contact@finnwilson.me">contact@finnwilson.me</a> · Phone: +61-400-000-000</p>
      <div class="footer-links">
        <a href="https://github.com/finnwilson02" target="_blank">
          <img src="icons/github.svg" alt="GitHub" />
        </a>
        <a href="https://linkedin.com/in/finn-wilson-73a162177/" target="_blank">
          <img src="icons/linkedin.svg" alt="LinkedIn" />
        </a>
      </div>
    </div>
  `;
}