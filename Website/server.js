// Load environment variables from .env file
require('dotenv').config();

// 1. Import Express and required packages
const express = require('express');
const path = require('path'); // Import the 'path' module to handle file paths
const fs = require('fs').promises; // Use promises version for cleaner async handling
const fsSync = require('fs'); // Standard fs for synchronous operations
const session = require('express-session');
const FileStore = require('session-file-store')(session); // Store sessions in files
const bcrypt = require('bcrypt');
const multer = require('multer'); // For handling multipart/form-data (file uploads)

// 2. Create an Express application instance
const app = express();

// IMPORTANT: Replace with the actual hash generated for the "finnwilson" password
const ADMIN_PASSWORD_HASH = '$2b$10$IhEVxRBIRWx3AW89DUpOU...UFHS/h6aDadCACmnYPfw3ye4oGoCa';
const ADMIN_USERNAME = 'admin'; // Optional username

// Middleware to parse JSON bodies
app.use(express.json({ limit: '10mb' })); // Allow larger payload for potential markdown content

// Session configuration
app.use(session({
  store: new FileStore({
     path: './.sessions', // Directory to store session files
     logFn: function(){} // Suppress verbose logging by session-file-store
   }), 
  // !! IMPORTANT !! Replace with environment variable in production
  // e.g., secret: process.env.SESSION_SECRET || 'fallback-dev-secret',
  secret: 'RyQRKhvC5JnQkzrz3cwRTgApM6eMVJ7r', // Long random string for session security
  resave: false, // Don't save session if unmodified
  saveUninitialized: false, // Don't create session until something stored
  cookie: {
      // Set to true if using HTTPS in production
      // secure: process.env.NODE_ENV === 'production',
      secure: false,
      httpOnly: true, // Prevent client-side JS access to cookie
      maxAge: 1000 * 60 * 60 * 24 // Cookie valid for 1 day
  }
}));

// 3. Define the port the server will listen on
// Use process.env.PORT for compatibility with hosting providers,
// or default to 3000 for local development.
const PORT = process.env.PORT || 3000;

// 4. Serve Static Files
// This tells Express that if a request comes in for a file (like .css, .js, .html, .jpg),
// it should look for that file relative to the project's root directory.
// The directory where server.js lives is considered the root by default with __dirname.
app.use(express.static(path.join(__dirname))); // Serves files from the root project directory

// Optional: Serve specific directories if needed (usually app.use(express.static(__dirname)) is enough)
// app.use('/css', express.static(path.join(__dirname, 'css')));
// app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/img', express.static(path.join(__dirname, 'img'))); // Explicitly serve the image directory
app.use('/icons', express.static(path.join(__dirname, 'icons'))); // Explicitly serve the icons directory
// app.use('/data', express.static(path.join(__dirname, 'data')));

// 5. Optional: Default Route (Good Practice)
// If someone requests the root '/' and express.static didn't find an index.html automatically,
// this explicitly serves your index.html file.
// express.static usually handles index.html automatically, so this might be redundant
// but doesn't hurt.
// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, 'index.html'));
// });

// --- Multer Configuration for Image Uploads ---
const imageStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Ensure the 'img/' directory exists relative to server.js
        const uploadPath = path.join(__dirname, 'img');
        
        // Create directory if it doesn't exist (sync for simplicity)
        try {
            if (!fsSync.existsSync(uploadPath)) {
                fsSync.mkdirSync(uploadPath, { recursive: true });
                console.log(`Created upload directory: ${uploadPath}`);
            }
        } catch (err) {
            console.error(`Error ensuring upload directory exists: ${err.message}`);
        }
        
        cb(null, uploadPath); // Save files to the 'img' directory
    },
    filename: function (req, file, cb) {
        // Create a unique filename to avoid overwrites
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname); // Get original extension
        const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_'); // Sanitize original name
        cb(null, `upload-${uniqueSuffix}${extension}`);
    }
});

// File Filter to accept only images
const imageFileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true); // Accept file
    } else {
        console.warn(`Upload rejected: Invalid mimetype ${file.mimetype}`);
        cb(new Error('Invalid file type. Only images are allowed.'), false); // Reject file
    }
};

// Create Multer instance with configuration
const upload = multer({
     storage: imageStorage,
     fileFilter: imageFileFilter,
     limits: { fileSize: 1024 * 1024 * 5 } // Limit file size to 5MB
});
// --- End Multer Configuration ---

// Middleware function to check if user is authenticated
function requireAuth(req, res, next) {
    if (req.session && req.session.isAuthenticated) {
        // User is authenticated, proceed to the next middleware or route handler
        return next();
    } else {
        // User is not authenticated, send an unauthorized error
        console.warn('Unauthorized access attempt denied.');
        res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }
}

// API Endpoint for Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body; // Get username (optional) and password

    console.log(`Login attempt: user='${username}'`); // Log attempt

    // Basic validation
    if (!password) {
        return res.status(400).json({ success: false, message: 'Password is required.' });
    }

    try {
        const match = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

        if (match) {
            console.log(`Login successful for user: '${ADMIN_USERNAME}'`);
            // Regenerate session ID on login for security
            req.session.regenerate(err => {
                if (err) {
                    console.error("Session regeneration error:", err);
                    return res.status(500).json({ success: false, message: 'Login failed (session error).' });
                }
                // Store authentication status in session
                req.session.isAuthenticated = true;
                req.session.username = ADMIN_USERNAME; // Store username if needed

                // Save the session before sending response
                req.session.save(err => {
                    if (err) {
                        console.error("Session save error:", err);
                        return res.status(500).json({ success: false, message: 'Login failed (session save error).' });
                    }
                    res.json({ success: true, message: 'Login successful.' });
                });
            });
        } else {
            console.log('Login failed: Incorrect password');
            res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ success: false, message: 'An internal error occurred during login.' });
    }
});

// API Endpoint for Logout
app.post('/api/logout', (req, res) => {
    console.log('Logout attempt...');
    if (req.session) {
        req.session.destroy(err => {
            if (err) {
                console.error("Error destroying session:", err);
                return res.status(500).json({ success: false, message: 'Logout failed.' });
            }
            // Clears the cookie set by express-session
            res.clearCookie('connect.sid'); // Use the default cookie name or your configured name
            console.log('Logout successful.');
            res.json({ success: true, message: 'Logged out successfully.' });
        });
    } else {
        console.log('Logout successful (no session existed).');
        res.json({ success: true, message: 'Logged out successfully.' }); // Or handle as needed
    }
});

// Optional: Add an endpoint to check auth status for frontend use
app.get('/api/auth/status', (req, res) => {
    if (req.session && req.session.isAuthenticated) {
        res.json({ isAuthenticated: true, username: req.session.username });
    } else {
        res.json({ isAuthenticated: false });
    }
});

// API Endpoint to get Books data
app.get('/api/data/books', async (req, res) => {
  const filePath = path.join(__dirname, 'data', 'books.json');
  console.log(`GET /api/data/books - Reading: ${filePath}`); // Server log
  try {
    const fileContent = await fs.readFile(filePath, 'utf8');
    const jsonData = JSON.parse(fileContent);
    
    // Validate that we have an array
    if (!Array.isArray(jsonData)) {
      throw new Error('Invalid format: Expected array of books.');
    }
    
    console.log(`Successfully read books data (${jsonData.length} books)`);
    res.json(jsonData); // Send parsed JSON data
  } catch (error) {
    console.error(`Error reading or parsing ${filePath}:`, error);
    if (error.code === 'ENOENT') {
      res.status(404).json({ 
        success: false, 
        error: `Data file not found: ${path.basename(filePath)}` 
      });
    } else if (error instanceof SyntaxError || error.message.includes('Invalid format')) {
      res.status(500).json({ 
        success: false, 
        error: `Failed to parse data file. Invalid JSON format in ${path.basename(filePath)}.` 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: `Internal server error while processing books data.` 
      });
    }
  }
});

// API Endpoint to get Images data
app.get('/api/data/images', async (req, res) => {
  const filePath = path.join(__dirname, 'data', 'images.json');
  console.log(`GET /api/data/images - Reading: ${filePath}`);
  try {
    const fileContent = await fs.readFile(filePath, 'utf8');
    const jsonData = JSON.parse(fileContent);
    res.json(jsonData);
  } catch (error) {
    console.error(`Error reading or parsing ${filePath}:`, error);
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Images data file not found.' });
    } else if (error instanceof SyntaxError) {
      res.status(500).json({ error: 'Failed to parse images data file. Invalid JSON.'});
    } else {
      res.status(500).json({ error: 'Failed to retrieve images data.' });
    }
  }
});

// API Endpoint to get Projects data
app.get('/api/data/projects', async (req, res) => {
  const filePath = path.join(__dirname, 'data', 'projects.json');
  console.log(`GET /api/data/projects - Reading: ${filePath}`);
  try {
    const fileContent = await fs.readFile(filePath, 'utf8');
    const jsonData = JSON.parse(fileContent);
    res.json(jsonData);
  } catch (error) {
    console.error(`Error reading or parsing ${filePath}:`, error);
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Projects data file not found.' });
    } else if (error instanceof SyntaxError) {
      res.status(500).json({ error: 'Failed to parse projects data file. Invalid JSON.'});
    } else {
      res.status(500).json({ error: 'Failed to retrieve projects data.' });
    }
  }
});

// API Endpoint to SAVE Books data
app.post('/api/save/books', requireAuth, async (req, res) => {
  const filePath = path.join(__dirname, 'data', 'books.json');
  const backupFilePath = filePath + '.bak'; // Backup file path
  console.log(`POST /api/save/books - Saving to: ${filePath}`);

  // Basic Array Validation
  const books = req.body;
  if (!Array.isArray(books)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid data format. Expected an array of books.' 
    });
  }

  // Item Validation
  console.log(`Validating ${books.length} books...`);
  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    // Check if book is an object
    if (!book || typeof book !== 'object' || Array.isArray(book)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid item format at index ${i}. Expected an object.` 
      });
    }
    
    // Required fields validation
    if (!book.title || typeof book.title !== 'string' || book.title.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: `Missing or invalid 'title' at index ${i}.` 
      });
    }
    if (!book.author || typeof book.author !== 'string' || book.author.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: `Missing or invalid 'author' at index ${i}.` 
      });
    }
    
    // Optional fields validation (with defaults if missing)
    if (book.rating !== undefined && (typeof book.rating !== 'number' || book.rating < 1 || book.rating > 5)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid 'rating' at index ${i}. Expected a number between 1 and 5.` 
      });
    }
  }
  console.log("Book validation passed successfully");

  try {
    // Backup existing file before overwriting
    try {
       await fs.copyFile(filePath, backupFilePath);
       console.log(`Backup created: ${backupFilePath}`);
    } catch (backupError) {
       // If backup fails (e.g., first time saving), log warning but continue
       if (backupError.code !== 'ENOENT') { // Ignore if original doesn't exist yet
           console.warn(`Warning: Could not create backup for ${filePath}:`, backupError);
       }
    }

    // Convert received data back to JSON string
    const jsonString = JSON.stringify(books, null, 2); // Pretty print

    // Write the new data to the file
    await fs.writeFile(filePath, jsonString, 'utf8');
    console.log(`Successfully wrote ${books.length} books to ${path.basename(filePath)}`);

    // Send success response
    res.status(200).json({ 
      success: true, 
      message: 'Books data saved successfully.' 
    });

  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    res.status(500).json({ 
      success: false, 
      error: `Failed to save books data: ${error.message}` 
    });
  }
});

// API Endpoint to SAVE Images data
app.post('/api/save/images', requireAuth, async (req, res) => {
   const filePath = path.join(__dirname, 'data', 'images.json');
   const backupFilePath = filePath + '.bak';
   console.log(`POST /api/save/images - Saving to: ${filePath}`);
   if (!Array.isArray(req.body)) {
     return res.status(400).json({ error: 'Invalid data format. Expected an array.' });
   }
   try {
     try { await fs.copyFile(filePath, backupFilePath); console.log(`Backup created: ${backupFilePath}`); }
     catch (backupError) { if (backupError.code !== 'ENOENT') console.warn(`Warning: Could not create backup for ${filePath}:`, backupError); }

     const jsonString = JSON.stringify(req.body, null, 2);
     await fs.writeFile(filePath, jsonString, 'utf8');
     res.status(200).json({ message: 'Images data saved successfully.' });
   } catch (error) {
     console.error(`Error writing ${filePath}:`, error);
     res.status(500).json({ error: 'Failed to save images data.' });
   }
});

// API Endpoint to SAVE Projects data
app.post('/api/save/projects', requireAuth, async (req, res) => {
   const filePath = path.join(__dirname, 'data', 'projects.json');
   const backupFilePath = filePath + '.bak';
   console.log(`POST /api/save/projects - Saving to: ${filePath}`);
   if (!Array.isArray(req.body)) {
     return res.status(400).json({ error: 'Invalid data format. Expected an array.' });
   }
   try {
     try { await fs.copyFile(filePath, backupFilePath); console.log(`Backup created: ${backupFilePath}`); }
     catch (backupError) { if (backupError.code !== 'ENOENT') console.warn(`Warning: Could not create backup for ${filePath}:`, backupError); }

     const jsonString = JSON.stringify(req.body, null, 2);
     await fs.writeFile(filePath, jsonString, 'utf8');
     res.status(200).json({ message: 'Projects data saved successfully.' });
   } catch (error) {
     console.error(`Error writing ${filePath}:`, error);
     res.status(500).json({ error: 'Failed to save projects data.' });
   }
});

// === CV API Endpoints ===

// GET CV Education Data
app.get('/api/data/cv/education', async (req, res) => {
    const filePath = path.join(__dirname, 'data', 'cv_education.json');
    console.log(`GET /api/data/cv/education - Reading: ${filePath}`);
    try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);
        if (!Array.isArray(jsonData)) throw new Error('Invalid format: Expected array.');
        res.json(jsonData);
    } catch (error) {
        console.error(`Error reading or parsing ${filePath}:`, error);
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'CV Education data file not found.' });
        } else if (error instanceof SyntaxError || error.message.includes('Expected array')) {
            res.status(500).json({ error: 'Failed to parse CV Education data file. Invalid JSON array format.'});
        } else {
            res.status(500).json({ error: 'Failed to retrieve CV Education data.' });
        }
    }
});

// SAVE CV Education Data (Authenticated)
app.post('/api/save/cv/education', requireAuth, async (req, res) => {
    const filePath = path.join(__dirname, 'data', 'cv_education.json');
    const backupFilePath = filePath + '.bak';
    console.log(`POST /api/save/cv/education - Saving to: ${filePath}`);
    if (!Array.isArray(req.body)) {
        return res.status(400).json({ error: 'Invalid data format. Expected an array.' });
    }
    try {
        // Backup logic
        try { 
            await fs.copyFile(filePath, backupFilePath); 
            console.log(`Backup created: ${backupFilePath}`); 
        } catch (backupError) { 
            if (backupError.code !== 'ENOENT') 
                console.warn(`Warning: Could not create backup for ${filePath}:`, backupError); 
        }
        
        const jsonString = JSON.stringify(req.body, null, 2);
        await fs.writeFile(filePath, jsonString, 'utf8');
        res.status(200).json({ message: 'CV Education data saved successfully.' });
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
        res.status(500).json({ error: 'Failed to save CV Education data.' });
    }
});

// GET CV Work Data
app.get('/api/data/cv/work', async (req, res) => {
    const filePath = path.join(__dirname, 'data', 'cv_work.json');
    console.log(`GET /api/data/cv/work - Reading: ${filePath}`);
    try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);
        if (!Array.isArray(jsonData)) throw new Error('Invalid format: Expected array.');
        res.json(jsonData);
    } catch (error) {
        console.error(`Error reading or parsing ${filePath}:`, error);
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'CV Work data file not found.' });
        } else if (error instanceof SyntaxError || error.message.includes('Expected array')) {
            res.status(500).json({ error: 'Failed to parse CV Work data file. Invalid JSON array format.'});
        } else {
            res.status(500).json({ error: 'Failed to retrieve CV Work data.' });
        }
    }
});

// SAVE CV Work Data (Authenticated)
app.post('/api/save/cv/work', requireAuth, async (req, res) => {
    const filePath = path.join(__dirname, 'data', 'cv_work.json');
    const backupFilePath = filePath + '.bak';
    console.log(`POST /api/save/cv/work - Saving to: ${filePath}`);
    if (!Array.isArray(req.body)) {
        return res.status(400).json({ error: 'Invalid data format. Expected an array.' });
    }
    try {
        // Backup logic
        try { 
            await fs.copyFile(filePath, backupFilePath); 
            console.log(`Backup created: ${backupFilePath}`); 
        } catch (backupError) { 
            if (backupError.code !== 'ENOENT') 
                console.warn(`Warning: Could not create backup for ${filePath}:`, backupError); 
        }
        
        const jsonString = JSON.stringify(req.body, null, 2);
        await fs.writeFile(filePath, jsonString, 'utf8');
        res.status(200).json({ message: 'CV Work data saved successfully.' });
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
        res.status(500).json({ error: 'Failed to save CV Work data.' });
    }
});

// GET CV Research Data
app.get('/api/data/cv/research', async (req, res) => {
    const filePath = path.join(__dirname, 'data', 'cv_research.json');
    console.log(`GET /api/data/cv/research - Reading: ${filePath}`);
    try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);
        if (!Array.isArray(jsonData)) throw new Error('Invalid format: Expected array.');
        res.json(jsonData);
    } catch (error) {
        console.error(`Error reading or parsing ${filePath}:`, error);
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'CV Research data file not found.' });
        } else if (error instanceof SyntaxError || error.message.includes('Expected array')) {
            res.status(500).json({ error: 'Failed to parse CV Research data file. Invalid JSON array format.'});
        } else {
            res.status(500).json({ error: 'Failed to retrieve CV Research data.' });
        }
    }
});

// SAVE CV Research Data (Authenticated)
app.post('/api/save/cv/research', requireAuth, async (req, res) => {
    const filePath = path.join(__dirname, 'data', 'cv_research.json');
    const backupFilePath = filePath + '.bak';
    console.log(`POST /api/save/cv/research - Saving to: ${filePath}`);
    if (!Array.isArray(req.body)) {
        return res.status(400).json({ error: 'Invalid data format. Expected an array.' });
    }
    try {
        // Backup logic
        try { 
            await fs.copyFile(filePath, backupFilePath); 
            console.log(`Backup created: ${backupFilePath}`); 
        } catch (backupError) { 
            if (backupError.code !== 'ENOENT') 
                console.warn(`Warning: Could not create backup for ${filePath}:`, backupError); 
        }
        
        const jsonString = JSON.stringify(req.body, null, 2);
        await fs.writeFile(filePath, jsonString, 'utf8');
        res.status(200).json({ message: 'CV Research data saved successfully.' });
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
        res.status(500).json({ error: 'Failed to save CV Research data.' });
    }
});

// GET CV Projects Data
app.get('/api/data/cv/projects', async (req, res) => {
    const filePath = path.join(__dirname, 'data', 'cv_projects.json');
    console.log(`GET /api/data/cv/projects - Reading: ${filePath}`);
    try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);
        if (!Array.isArray(jsonData)) throw new Error('Invalid format: Expected array.');
        res.json(jsonData);
    } catch (error) {
        console.error(`Error reading or parsing ${filePath}:`, error);
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'CV Projects data file not found.' });
        } else if (error instanceof SyntaxError || error.message.includes('Expected array')) {
            res.status(500).json({ error: 'Failed to parse CV Projects data file. Invalid JSON array format.'});
        } else {
            res.status(500).json({ error: 'Failed to retrieve CV Projects data.' });
        }
    }
});

// SAVE CV Projects Data (Authenticated)
app.post('/api/save/cv/projects', requireAuth, async (req, res) => {
    const filePath = path.join(__dirname, 'data', 'cv_projects.json');
    const backupFilePath = filePath + '.bak';
    console.log(`POST /api/save/cv/projects - Saving to: ${filePath}`);
    if (!Array.isArray(req.body)) {
        return res.status(400).json({ error: 'Invalid data format. Expected an array.' });
    }
    try {
        // Backup logic
        try { 
            await fs.copyFile(filePath, backupFilePath); 
            console.log(`Backup created: ${backupFilePath}`); 
        } catch (backupError) { 
            if (backupError.code !== 'ENOENT') 
                console.warn(`Warning: Could not create backup for ${filePath}:`, backupError); 
        }
        
        const jsonString = JSON.stringify(req.body, null, 2);
        await fs.writeFile(filePath, jsonString, 'utf8');
        res.status(200).json({ message: 'CV Projects data saved successfully.' });
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
        res.status(500).json({ error: 'Failed to save CV Projects data.' });
    }
});

// GET CV Skills Data
app.get('/api/data/cv/skills', async (req, res) => {
    const filePath = path.join(__dirname, 'data', 'cv_skills.json');
    console.log(`GET /api/data/cv/skills - Reading: ${filePath}`);
    try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);
        if (typeof jsonData !== 'object' || jsonData === null || Array.isArray(jsonData)) 
            throw new Error('Invalid format: Expected object.');
        res.json(jsonData);
    } catch (error) {
        console.error(`Error reading or parsing ${filePath}:`, error);
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'CV Skills data file not found.' });
        } else if (error instanceof SyntaxError || error.message.includes('Expected object')) {
            res.status(500).json({ error: 'Failed to parse CV Skills data file. Invalid JSON object format.'});
        } else {
            res.status(500).json({ error: 'Failed to retrieve CV Skills data.' });
        }
    }
});

// SAVE CV Skills Data (Authenticated)
app.post('/api/save/cv/skills', requireAuth, async (req, res) => {
    const filePath = path.join(__dirname, 'data', 'cv_skills.json');
    const backupFilePath = filePath + '.bak';
    console.log(`POST /api/save/cv/skills - Saving to: ${filePath}`);
    if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
        return res.status(400).json({ error: 'Invalid data format. Expected an object.' });
    }
    try {
        // Backup logic
        try { 
            await fs.copyFile(filePath, backupFilePath); 
            console.log(`Backup created: ${backupFilePath}`); 
        } catch (backupError) { 
            if (backupError.code !== 'ENOENT') 
                console.warn(`Warning: Could not create backup for ${filePath}:`, backupError); 
        }
        
        const jsonString = JSON.stringify(req.body, null, 2);
        await fs.writeFile(filePath, jsonString, 'utf8');
        res.status(200).json({ message: 'CV Skills data saved successfully.' });
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
        res.status(500).json({ error: 'Failed to save CV Skills data.' });
    }
});

// GET CV Achievements Data
app.get('/api/data/cv/achievements', async (req, res) => {
    const filePath = path.join(__dirname, 'data', 'cv_achievements.json');
    console.log(`GET /api/data/cv/achievements - Reading: ${filePath}`);
    try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);
        if (!Array.isArray(jsonData)) throw new Error('Invalid format: Expected array.');
        res.json(jsonData);
    } catch (error) {
        console.error(`Error reading or parsing ${filePath}:`, error);
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'CV Achievements data file not found.' });
        } else if (error instanceof SyntaxError || error.message.includes('Expected array')) {
            res.status(500).json({ error: 'Failed to parse CV Achievements data file. Invalid JSON array format.'});
        } else {
            res.status(500).json({ error: 'Failed to retrieve CV Achievements data.' });
        }
    }
});

// SAVE CV Achievements Data (Authenticated)
app.post('/api/save/cv/achievements', requireAuth, async (req, res) => {
    const filePath = path.join(__dirname, 'data', 'cv_achievements.json');
    const backupFilePath = filePath + '.bak';
    console.log(`POST /api/save/cv/achievements - Saving to: ${filePath}`);
    if (!Array.isArray(req.body)) {
        return res.status(400).json({ error: 'Invalid data format. Expected an array.' });
    }
    try {
        // Backup logic
        try { 
            await fs.copyFile(filePath, backupFilePath); 
            console.log(`Backup created: ${backupFilePath}`); 
        } catch (backupError) { 
            if (backupError.code !== 'ENOENT') 
                console.warn(`Warning: Could not create backup for ${filePath}:`, backupError); 
        }
        
        const jsonString = JSON.stringify(req.body, null, 2);
        await fs.writeFile(filePath, jsonString, 'utf8');
        res.status(200).json({ message: 'CV Achievements data saved successfully.' });
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
        res.status(500).json({ error: 'Failed to save CV Achievements data.' });
    }
});

// GET CV Positions Data
app.get('/api/data/cv/positions', async (req, res) => {
    const filePath = path.join(__dirname, 'data', 'cv_positions.json');
    console.log(`GET /api/data/cv/positions - Reading: ${filePath}`);
    try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);
        if (!Array.isArray(jsonData)) throw new Error('Invalid format: Expected array.');
        res.json(jsonData);
    } catch (error) {
        console.error(`Error reading or parsing ${filePath}:`, error);
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'CV Positions data file not found.' });
        } else if (error instanceof SyntaxError || error.message.includes('Expected array')) {
            res.status(500).json({ error: 'Failed to parse CV Positions data file. Invalid JSON array format.'});
        } else {
            res.status(500).json({ error: 'Failed to retrieve CV Positions data.' });
        }
    }
});

// SAVE CV Positions Data (Authenticated)
app.post('/api/save/cv/positions', requireAuth, async (req, res) => {
    const filePath = path.join(__dirname, 'data', 'cv_positions.json');
    const backupFilePath = filePath + '.bak';
    console.log(`POST /api/save/cv/positions - Saving to: ${filePath}`);
    if (!Array.isArray(req.body)) {
        return res.status(400).json({ error: 'Invalid data format. Expected an array.' });
    }
    try {
        // Backup logic
        try { 
            await fs.copyFile(filePath, backupFilePath); 
            console.log(`Backup created: ${backupFilePath}`); 
        } catch (backupError) { 
            if (backupError.code !== 'ENOENT') 
                console.warn(`Warning: Could not create backup for ${filePath}:`, backupError); 
        }
        
        const jsonString = JSON.stringify(req.body, null, 2);
        await fs.writeFile(filePath, jsonString, 'utf8');
        res.status(200).json({ message: 'CV Positions data saved successfully.' });
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
        res.status(500).json({ error: 'Failed to save CV Positions data.' });
    }
});

// GET Endpoint for Page Content
app.get('/api/data/page_content', async (req, res) => {
  const filePath = path.join(__dirname, 'data', 'page_content.json');
  console.log(`GET /api/data/page_content - Reading: ${filePath}`);
  try {
    const fileContent = await fs.readFile(filePath, 'utf8');
    const jsonData = JSON.parse(fileContent);
     // Ensure it's an object, not an array etc.
    if (typeof jsonData !== 'object' || jsonData === null || Array.isArray(jsonData)) {
         throw new Error('Invalid page content format: Expected a JSON object.');
    }
    res.json(jsonData);
  } catch (error) {
    console.error(`Error reading or parsing ${filePath}:`, error);
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Page content data file not found.' });
    } else if (error instanceof SyntaxError || error.message.includes('Expected a JSON object')) {
       res.status(500).json({ error: 'Failed to parse page content data file. Invalid JSON object format.'});
    } else {
      res.status(500).json({ error: 'Failed to retrieve page content data.' });
    }
  }
});

// POST Endpoint to SAVE Page Content (Authenticated)
app.post('/api/save/page_content', requireAuth, async (req, res) => {
  const filePath = path.join(__dirname, 'data', 'page_content.json');
  const backupFilePath = filePath + '.bak';
  console.log(`POST /api/save/page_content - Saving to: ${filePath}`);

  // Validation: Ensure body is a non-null object
  if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Invalid data format. Expected a JSON object.' });
  }

  try {
    // Optional Backup
    try { await fs.copyFile(filePath, backupFilePath); console.log(`Backup created: ${backupFilePath}`); }
    catch (backupError) { if (backupError.code !== 'ENOENT') console.warn(`Warning: Could not create backup for ${filePath}:`, backupError); }

    const jsonString = JSON.stringify(req.body, null, 2);
    await fs.writeFile(filePath, jsonString, 'utf8');
    res.status(200).json({ message: 'Page content saved successfully.' });
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    res.status(500).json({ error: 'Failed to save page content.' });
  }
});

// === Research API Endpoints ===

// GET Research Journal Data
app.get('/api/data/research/journal', async (req, res) => {
    const filePath = path.join(__dirname, 'data', 'research_journal.json');
    console.log(`GET /api/data/research/journal - Reading: ${filePath}`);
    try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);
        
        // Validate data format
        if (!Array.isArray(jsonData)) {
            throw new Error('Invalid format: Expected array of journal articles.');
        }
        
        console.log(`Successfully read research journal data (${jsonData.length} articles)`);
        res.json(jsonData);
    } catch (error) {
        console.error(`Error reading or parsing ${filePath}:`, error);
        if (error.code === 'ENOENT') {
            res.status(404).json({ 
                success: false, 
                error: `Data file not found: ${path.basename(filePath)}` 
            });
        } else if (error instanceof SyntaxError || error.message.includes('Invalid format')) {
            res.status(500).json({ 
                success: false, 
                error: `Failed to parse data file. Invalid JSON format in ${path.basename(filePath)}.` 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: `Internal server error while processing research journal data.` 
            });
        }
    }
});

// SAVE Research Journal Data (Authenticated)
app.post('/api/save/research/journal', requireAuth, async (req, res) => {
    const filePath = path.join(__dirname, 'data', 'research_journal.json');
    const backupFilePath = filePath + '.bak';
    console.log(`POST /api/save/research/journal - Saving to: ${filePath}`);
    
    // Basic array validation
    const journalArticles = req.body;
    if (!Array.isArray(journalArticles)) {
        return res.status(400).json({ 
            success: false, 
            error: 'Invalid data format. Expected an array of journal articles.' 
        });
    }
    
    // Item validation
    console.log(`Validating ${journalArticles.length} journal articles...`);
    for (let i = 0; i < journalArticles.length; i++) {
        const article = journalArticles[i];
        // Check if article is an object
        if (!article || typeof article !== 'object' || Array.isArray(article)) {
            return res.status(400).json({ 
                success: false, 
                error: `Invalid item format at index ${i}. Expected an object.` 
            });
        }
        
        // Required fields validation
        if (!article.id || typeof article.id !== 'string' || article.id.trim() === '') {
            return res.status(400).json({ 
                success: false, 
                error: `Missing or invalid 'id' at index ${i}. Required for anchor linking.` 
            });
        }
        
        if (!article.title || typeof article.title !== 'string' || article.title.trim() === '') {
            return res.status(400).json({ 
                success: false, 
                error: `Missing or invalid 'title' at index ${i}.` 
            });
        }
        
        if (!article.authors || typeof article.authors !== 'string' || article.authors.trim() === '') {
            return res.status(400).json({ 
                success: false, 
                error: `Missing or invalid 'authors' at index ${i}.` 
            });
        }
        
        if (!article.venue || typeof article.venue !== 'string' || article.venue.trim() === '') {
            return res.status(400).json({ 
                success: false, 
                error: `Missing or invalid 'venue' at index ${i}.` 
            });
        }
        
        // Check links is an object if present
        if (article.links !== undefined && (typeof article.links !== 'object' || Array.isArray(article.links) || article.links === null)) {
            return res.status(400).json({ 
                success: false, 
                error: `Invalid 'links' at index ${i}. Expected an object of key-value pairs.` 
            });
        }
    }
    console.log("Journal article validation passed successfully");
    
    try {
        // Backup logic
        try { 
            await fs.copyFile(filePath, backupFilePath); 
            console.log(`Backup created: ${backupFilePath}`); 
        } catch (backupError) { 
            if (backupError.code !== 'ENOENT') 
                console.warn(`Warning: Could not create backup for ${filePath}:`, backupError); 
        }
        
        const jsonString = JSON.stringify(journalArticles, null, 2);
        await fs.writeFile(filePath, jsonString, 'utf8');
        console.log(`Successfully wrote ${journalArticles.length} journal articles to ${path.basename(filePath)}`);
        
        res.status(200).json({ 
            success: true, 
            message: 'Research Journal data saved successfully.' 
        });
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
        res.status(500).json({ 
            success: false, 
            error: `Failed to save Research Journal data: ${error.message}` 
        });
    }
});

// GET Research Thesis Data
app.get('/api/data/research/thesis', async (req, res) => {
    const filePath = path.join(__dirname, 'data', 'research_thesis.json');
    console.log(`GET /api/data/research/thesis - Reading: ${filePath}`);
    try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);
        
        // Validate format
        if (typeof jsonData !== 'object' || jsonData === null || Array.isArray(jsonData)) {
            throw new Error('Invalid format: Expected thesis object.');
        }
        
        console.log("Successfully read thesis data");
        res.json(jsonData);
    } catch (error) {
        console.error(`Error reading or parsing ${filePath}:`, error);
        if (error.code === 'ENOENT') {
            res.status(404).json({ 
                success: false, 
                error: `Data file not found: ${path.basename(filePath)}` 
            });
        } else if (error instanceof SyntaxError || error.message.includes('Invalid format')) {
            res.status(500).json({ 
                success: false, 
                error: `Failed to parse data file. Invalid JSON format in ${path.basename(filePath)}.` 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: `Internal server error while processing thesis data.` 
            });
        }
    }
});

// SAVE Research Thesis Data (Authenticated)
app.post('/api/save/research/thesis', requireAuth, async (req, res) => {
    const filePath = path.join(__dirname, 'data', 'research_thesis.json');
    const backupFilePath = filePath + '.bak';
    console.log(`POST /api/save/research/thesis - Saving to: ${filePath}`);
    
    // Object validation
    const thesis = req.body;
    if (typeof thesis !== 'object' || thesis === null || Array.isArray(thesis)) {
        return res.status(400).json({ 
            success: false, 
            error: 'Invalid data format. Expected a thesis object.' 
        });
    }
    
    // Required fields validation
    console.log("Validating thesis data...");
    if (!thesis.title || typeof thesis.title !== 'string' || thesis.title.trim() === '') {
        return res.status(400).json({ 
            success: false, 
            error: `Missing or invalid 'title' in thesis.` 
        });
    }
    
    if (!thesis.authors || typeof thesis.authors !== 'string' || thesis.authors.trim() === '') {
        return res.status(400).json({ 
            success: false, 
            error: `Missing or invalid 'authors' in thesis.` 
        });
    }
    
    if (!thesis.venue || typeof thesis.venue !== 'string' || thesis.venue.trim() === '') {
        return res.status(400).json({ 
            success: false, 
            error: `Missing or invalid 'venue' in thesis.` 
        });
    }
    
    // Check links is an object if present
    if (thesis.links !== undefined && (typeof thesis.links !== 'object' || Array.isArray(thesis.links) || thesis.links === null)) {
        return res.status(400).json({ 
            success: false, 
            error: `Invalid 'links' in thesis. Expected an object of key-value pairs.` 
        });
    }
    
    console.log("Thesis validation passed successfully");
    
    try {
        // Backup logic
        try { 
            await fs.copyFile(filePath, backupFilePath); 
            console.log(`Backup created: ${backupFilePath}`); 
        } catch (backupError) { 
            if (backupError.code !== 'ENOENT') 
                console.warn(`Warning: Could not create backup for ${filePath}:`, backupError); 
        }
        
        const jsonString = JSON.stringify(thesis, null, 2);
        await fs.writeFile(filePath, jsonString, 'utf8');
        console.log(`Successfully wrote thesis data to ${path.basename(filePath)}`);
        
        res.status(200).json({ 
            success: true, 
            message: 'Research Thesis data saved successfully.' 
        });
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
        res.status(500).json({ 
            success: false, 
            error: `Failed to save Research Thesis data: ${error.message}` 
        });
    }
});

// GET Research Conference Data
app.get('/api/data/research/conference', async (req, res) => {
    const filePath = path.join(__dirname, 'data', 'research_conference.json');
    console.log(`GET /api/data/research/conference - Reading: ${filePath}`);
    try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);
        if (!Array.isArray(jsonData)) throw new Error('Invalid format: Expected array.');
        res.json(jsonData);
    } catch (error) {
        console.error(`Error reading or parsing ${filePath}:`, error);
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'Research Conference data file not found.' });
        } else if (error instanceof SyntaxError || error.message.includes('Expected array')) {
            res.status(500).json({ error: 'Failed to parse Research Conference data file. Invalid JSON array format.'});
        } else {
            res.status(500).json({ error: 'Failed to retrieve Research Conference data.' });
        }
    }
});

// SAVE Research Conference Data (Authenticated)
app.post('/api/save/research/conference', requireAuth, async (req, res) => {
    const filePath = path.join(__dirname, 'data', 'research_conference.json');
    const backupFilePath = filePath + '.bak';
    console.log(`POST /api/save/research/conference - Saving to: ${filePath}`);
    if (!Array.isArray(req.body)) {
        return res.status(400).json({ error: 'Invalid data format. Expected an array.' });
    }
    try {
        // Backup logic
        try { 
            await fs.copyFile(filePath, backupFilePath); 
            console.log(`Backup created: ${backupFilePath}`); 
        } catch (backupError) { 
            if (backupError.code !== 'ENOENT') 
                console.warn(`Warning: Could not create backup for ${filePath}:`, backupError); 
        }
        
        const jsonString = JSON.stringify(req.body, null, 2);
        await fs.writeFile(filePath, jsonString, 'utf8');
        res.status(200).json({ message: 'Research Conference data saved successfully.' });
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
        res.status(500).json({ error: 'Failed to save Research Conference data.' });
    }
});

// GET Research Patent Data
app.get('/api/data/research/patent', async (req, res) => {
    const filePath = path.join(__dirname, 'data', 'research_patent.json');
    console.log(`GET /api/data/research/patent - Reading: ${filePath}`);
    try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);
        if (!Array.isArray(jsonData)) throw new Error('Invalid format: Expected array.');
        res.json(jsonData);
    } catch (error) {
        console.error(`Error reading or parsing ${filePath}:`, error);
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'Research Patent data file not found.' });
        } else if (error instanceof SyntaxError || error.message.includes('Expected array')) {
            res.status(500).json({ error: 'Failed to parse Research Patent data file. Invalid JSON array format.'});
        } else {
            res.status(500).json({ error: 'Failed to retrieve Research Patent data.' });
        }
    }
});

// SAVE Research Patent Data (Authenticated)
app.post('/api/save/research/patent', requireAuth, async (req, res) => {
    const filePath = path.join(__dirname, 'data', 'research_patent.json');
    const backupFilePath = filePath + '.bak';
    console.log(`POST /api/save/research/patent - Saving to: ${filePath}`);
    if (!Array.isArray(req.body)) {
        return res.status(400).json({ error: 'Invalid data format. Expected an array.' });
    }
    try {
        // Backup logic
        try { 
            await fs.copyFile(filePath, backupFilePath); 
            console.log(`Backup created: ${backupFilePath}`); 
        } catch (backupError) { 
            if (backupError.code !== 'ENOENT') 
                console.warn(`Warning: Could not create backup for ${filePath}:`, backupError); 
        }
        
        const jsonString = JSON.stringify(req.body, null, 2);
        await fs.writeFile(filePath, jsonString, 'utf8');
        res.status(200).json({ message: 'Research Patent data saved successfully.' });
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
        res.status(500).json({ error: 'Failed to save Research Patent data.' });
    }
});

// API Endpoint for Image Upload (Authenticated)
app.post('/api/upload/image', requireAuth, (req, res) => {
    // Use upload.single middleware. It adds req.file and req.body.
    // We need to handle potential multer errors specifically.
    upload.single('uploadedImage')(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred (e.g., file size limit)
            console.error('Multer error during upload:', err);
            return res.status(400).json({ 
                success: false, 
                error: `File upload error: ${err.message}` 
            });
        } else if (err) {
            // An unknown error occurred or file filter rejected
            console.error('Unknown error during upload:', err);
            // Check if it's our custom filter error
            if (err.message.includes('Invalid file type')) {
                 return res.status(400).json({ 
                    success: false, 
                    error: err.message 
                });
            }
            return res.status(500).json({ 
                success: false, 
                error: 'File upload failed.' 
            });
        }

        // If file upload was successful, req.file contains file info
        if (!req.file) {
            console.warn('Upload endpoint called but no file received.');
            return res.status(400).json({ 
                success: false, 
                error: 'No image file provided.' 
            });
        }

        console.log('File uploaded successfully:', req.file);

        // Send back just the filename (not the full path)
        res.status(200).json({ 
            success: true, 
            filename: req.file.filename 
        });
    });
});

// GET Trips Data
app.get('/api/data/trips', async (req, res) => {
    const filePath = path.join(__dirname, 'data', 'trips.json');
    console.log(`GET ${filePath}`);
    try {
        const d = await fs.readFile(filePath, 'utf8');
        const j = JSON.parse(d);
        if (!Array.isArray(j)) throw new Error('Invalid format: Expected array.');
        // Optional: Sort trips by date or name before sending
        // j.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        res.json(j);
    } catch (error) { /* Standard error handling -> 404 / 500 */
         console.error(`Error reading or parsing ${filePath}:`, error);
         // Simplified error sending
         if (error.code === 'ENOENT') { res.status(404).json({ success: false, error: 'Trips data not found.'}); }
         else { res.status(500).json({ success: false, error: 'Failed to retrieve trips data.' }); }
    }
});

// SAVE Trips Data (Authenticated)
app.post('/api/save/trips', requireAuth, async (req, res) => {
    const filePath = path.join(__dirname, 'data', 'trips.json');
    const trips = req.body;
    console.log(`POST ${filePath}`);
    if (!Array.isArray(trips)) {
        return res.status(400).json({ success: false, error: 'Invalid data format. Expected an array.' });
    }
    // Basic validation of trip objects
    for (let i = 0; i < trips.length; i++) {
         const trip = trips[i];
         if (!trip || typeof trip !== 'object') return res.status(400).json({ success: false, error: `Invalid item format at index ${i}. Expected an object.` });
         if (!trip.id || typeof trip.id !== 'string' || trip.id.trim() === '') return res.status(400).json({ success: false, error: `Missing or invalid 'id' at index ${i}.` });
         if (!trip.name || typeof trip.name !== 'string' || trip.name.trim() === '') return res.status(400).json({ success: false, error: `Missing or invalid 'name' at index ${i}.` });
         // dateRange is optional maybe? Or check it's a string.
    }

    try {
        // Backup logic here... try/catch around copyFile
        const backupFilePath = filePath + '.bak';
        try { await fs.copyFile(filePath, backupFilePath); console.log(`Backup created: ${backupFilePath}`); }
        catch (backupError) { if (backupError.code !== 'ENOENT') console.warn(`Warning: Could not create backup for ${filePath}:`, backupError); }

        await fs.writeFile(filePath, JSON.stringify(trips, null, 2), 'utf8');
        res.status(200).json({ success: true, message: 'Trips data saved successfully.' });
    } catch (error) { /* Standard error handling -> 500 */
         console.error(`Error writing ${filePath}:`, error);
         res.status(500).json({ success: false, error: 'Failed to save trips data.' });
    }
});

// API Endpoint to provide the Cesium Ion Token to the frontend securely
app.get('/api/config/cesium-token', (req, res) => {
  const token = process.env.CESIUM_ION_TOKEN;
  if (!token) {
    console.error("FATAL ERROR: CESIUM_ION_TOKEN environment variable is not set!");
    // Don't send detailed error to client
    return res.status(500).json({ error: 'Server configuration error.' });
  }
  // Only send the token, nothing else
  res.json({ token: token });
});

// 6. Start the Server
app.listen(PORT, () => {
  console.log(`Server is running!`);
  console.log(`Static files served from: ${path.join(__dirname)}`);
  console.log(`Access your site at: http://localhost:${PORT}`);
});
