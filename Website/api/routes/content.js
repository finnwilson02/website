// api/routes/content.js
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();
const DOMPurify = require('dompurify'); // Import DOMPurify for XSS protection
const { JSDOM } = require('jsdom'); // Required for DOMPurify server-side

// Create a DOMPurify instance using JSDOM's window
const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Middleware to check if user is authenticated (this should match the server's requireAuth)
function requireAuth(req, res, next) {
  if (req.session && req.session.isAuthenticated) {
    return next();
  } else {
    console.warn('Unauthorized content access attempt denied.');
    res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
}

// GET /api/content/homepage - Get homepage HTML content
router.get('/homepage', async (req, res) => {
  try {
    const filePath = path.join(__dirname, '../../data/homepage.html');
    console.log(`GET /api/content/homepage - Reading: ${filePath}`);
    
    const content = await fs.readFile(filePath, 'utf8');
    res.send(content); // Send raw HTML string
  } catch (error) {
    console.error('Error reading homepage content:', error);
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Homepage content file not found.' });
    } else {
      res.status(500).json({ error: 'Failed to retrieve homepage content.' });
    }
  }
});

// POST /api/content/homepage - Save homepage HTML content (requires authentication)
router.post('/homepage', requireAuth, async (req, res) => {
  try {
    const filePath = path.join(__dirname, '../../data/homepage.html');
    const backupPath = filePath + '.bak';
    console.log(`POST /api/content/homepage - Saving to: ${filePath}`);
    
    // Get HTML content from request body
    const { html } = req.body;
    
    if (!html || typeof html !== 'string') {
      return res.status(400).json({ error: 'Invalid input. HTML content is required.' });
    }
    
    // Sanitize HTML to prevent XSS attacks
    const sanitizedHtml = purify.sanitize(html);
    
    // Create a backup of the existing file
    try {
      const existingContent = await fs.readFile(filePath, 'utf8');
      await fs.writeFile(backupPath, existingContent, 'utf8');
      console.log(`Backup created: ${backupPath}`);
    } catch (backupError) {
      if (backupError.code !== 'ENOENT') {
        console.warn(`Warning: Could not create backup of homepage content:`, backupError);
      }
    }
    
    // Write sanitized content to file
    await fs.writeFile(filePath, sanitizedHtml, 'utf8');
    console.log('Homepage content saved successfully');
    
    res.json({ success: true, message: 'Homepage content saved successfully.' });
  } catch (error) {
    console.error('Error saving homepage content:', error);
    res.status(500).json({ error: 'Failed to save homepage content.' });
  }
});

// GET /api/content/contactBanner - Get contact banner JSON data
router.get('/contactBanner', async (req, res) => {
  try {
    const filePath = path.join(__dirname, '../../data/contactBanner.json');
    console.log(`GET /api/content/contactBanner - Reading: ${filePath}`);
    
    const content = await fs.readFile(filePath, 'utf8');
    res.json(JSON.parse(content)); // Parse and send as JSON
  } catch (error) {
    console.error('Error reading contact banner content:', error);
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Contact banner content file not found.' });
    } else {
      res.status(500).json({ error: 'Failed to retrieve contact banner content.' });
    }
  }
});

// POST /api/content/contactBanner - Save contact banner JSON content (requires authentication)
router.post('/contactBanner', requireAuth, async (req, res) => {
  try {
    const filePath = path.join(__dirname, '../../data/contactBanner.json');
    const backupPath = filePath + '.bak';
    console.log(`POST /api/content/contactBanner - Saving to: ${filePath}`);
    
    // Get JSON content from request body
    const { links, emails } = req.body;
    
    if (!links || !Array.isArray(links) || !emails || !Array.isArray(emails)) {
      return res.status(400).json({ 
        error: 'Invalid input. JSON data with links and emails arrays is required.' 
      });
    }
    
    const contactBannerData = { links, emails };
    
    // Create a backup of the existing file
    try {
      const existingContent = await fs.readFile(filePath, 'utf8');
      await fs.writeFile(backupPath, existingContent, 'utf8');
      console.log(`Backup created: ${backupPath}`);
    } catch (backupError) {
      if (backupError.code !== 'ENOENT') {
        console.warn(`Warning: Could not create backup of contact banner content:`, backupError);
      }
    }
    
    // Write JSON content to file
    await fs.writeFile(filePath, JSON.stringify(contactBannerData, null, 2), 'utf8');
    console.log('Contact banner content saved successfully');
    
    res.json({ success: true, message: 'Contact banner content saved successfully.' });
  } catch (error) {
    console.error('Error saving contact banner content:', error);
    res.status(500).json({ error: 'Failed to save contact banner content.' });
  }
});

// POST /api/data/projects/order - Update project order (requires authentication)
router.post('/data/:section/order', requireAuth, async (req, res) => {
  try {
    const { section } = req.params;
    const ids = req.body;
    
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'Invalid input. Expected array of IDs.' });
    }
    
    console.log(`POST /api/data/${section}/order - Updating order for ${section}`);
    
    // Map sections to file paths
    const sectionToFile = {
      'projects': '../../data/projects.json',
      'journal': '../../data/research_journal.json',
      'conference': '../../data/research_conference.json',
      'thesis': '../../data/research_thesis.json',
      'patent': '../../data/research_patent.json'
    };
    
    if (!sectionToFile[section]) {
      return res.status(400).json({ error: `Invalid section: ${section}` });
    }
    
    const filePath = path.join(__dirname, sectionToFile[section]);
    const backupPath = filePath + '.bak';
    
    // Read the current data
    let data = [];
    try {
      const content = await fs.readFile(filePath, 'utf8');
      data = JSON.parse(content);
      
      // Create a backup
      await fs.writeFile(backupPath, content, 'utf8');
      console.log(`Backup created: ${backupPath}`);
    } catch (error) {
      console.error(`Error reading ${section} data:`, error);
      return res.status(500).json({ error: `Failed to read ${section} data.` });
    }
    
    // Create a map of id to item for quick lookup
    const itemMap = {};
    data.forEach(item => {
      itemMap[item.id] = item;
    });
    
    // Check if all ids exist
    const missingIds = ids.filter(id => !itemMap[id]);
    if (missingIds.length > 0) {
      return res.status(400).json({ 
        error: `Some ids do not exist: ${missingIds.join(', ')}` 
      });
    }
    
    // Update order
    const newData = ids.map((id, index) => {
      const item = itemMap[id];
      item.order = index;
      return item;
    });
    
    // Save the updated data
    try {
      await fs.writeFile(filePath, JSON.stringify(newData, null, 2), 'utf8');
      console.log(`${section} order updated successfully`);
      res.json({ success: true, message: `${section} order updated successfully.` });
    } catch (error) {
      console.error(`Error saving ${section} data:`, error);
      res.status(500).json({ error: `Failed to save ${section} data.` });
    }
  } catch (error) {
    console.error(`Error updating order:`, error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;