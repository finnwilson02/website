/* bookshelf.js - Enhanced bookshelf with dynamic loading, filtering, and overlay */

// Global books array to store fetched data
let books = [];

/**
 * Fetches and loads books from JSON API
 */
async function loadBooks() {
    try {
        const response = await fetch('/api/data/books');
        if (!response.ok) {
            throw new Error(`Failed to fetch books: ${response.status}`);
        }
        
        books = await response.json();
        console.log(`Loaded ${books.length} books`);
        
        // Initialize filters with dynamic genre options
        initFilters();
        
        // Initial render
        filterAndSortBooks();
        
    } catch (error) {
        console.error('Error loading books:', error);
        // Show error message to user
        const booksRow = document.getElementById('books-row');
        if (booksRow) {
            booksRow.innerHTML = '<p style="color: red; padding: 20px;">Error loading books. Please try again later.</p>';
        }
    }
}

/**
 * Initializes filter dropdowns with dynamic options
 */
function initFilters() {
    const genreSelect = document.getElementById('genreFilter');
    
    // Clear existing options except "all genres"
    const allOption = genreSelect.querySelector('option[value="all"]');
    genreSelect.innerHTML = '';
    genreSelect.appendChild(allOption);
    
    // Extract unique genres from books
    const genres = new Set();
    books.forEach(book => {
        if (book.genre) {
            // Handle comma-separated genres
            book.genre.split(',').forEach(g => {
                const trimmed = g.trim();
                if (trimmed) genres.add(trimmed);
            });
        }
    });
    
    // Add genre options to dropdown
    [...genres].sort().forEach(genre => {
        const option = document.createElement('option');
        option.value = genre;
        option.textContent = genre;
        genreSelect.appendChild(option);
    });
    
    // Add event listeners for filter changes
    document.getElementById('genreFilter').addEventListener('change', filterAndSortBooks);
    document.getElementById('ratingFilter').addEventListener('change', filterAndSortBooks);
    document.getElementById('sortOrder').addEventListener('change', filterAndSortBooks);
}

/**
 * Filters and sorts books based on current filter selections, then renders them
 */
function filterAndSortBooks() {
    const genreFilter = document.getElementById('genreFilter').value;
    const ratingFilter = document.getElementById('ratingFilter').value;
    const sortOrder = document.getElementById('sortOrder').value;
    
    // Filter books
    let filteredBooks = books.filter(book => {
        // Genre filter
        const matchGenre = genreFilter === 'all' || 
            (book.genre && book.genre.includes(genreFilter));
        
        // Rating filter
        const matchRating = ratingFilter === 'all' || 
            book.rating >= parseInt(ratingFilter, 10);
        
        return matchGenre && matchRating;
    });
    
    // Sort books
    switch (sortOrder) {
        case 'date-desc':
            filteredBooks.sort((a, b) => new Date(b.datesRead || 0) - new Date(a.datesRead || 0));
            break;
        case 'date-asc':
            filteredBooks.sort((a, b) => new Date(a.datesRead || 0) - new Date(b.datesRead || 0));
            break;
        case 'rating-desc':
            filteredBooks.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            break;
        case 'rating-asc':
            filteredBooks.sort((a, b) => (a.rating || 0) - (b.rating || 0));
            break;
        default:
            // Default to date-desc
            filteredBooks.sort((a, b) => new Date(b.datesRead || 0) - new Date(a.datesRead || 0));
    }
    
    // Render filtered and sorted books
    renderBooks(filteredBooks);
}

/**
 * Renders books as cards in the books-row container
 * @param {Array} booksToRender - Array of book objects to render
 */
function renderBooks(booksToRender) {
    const booksRow = document.getElementById('books-row');
    if (!booksRow) {
        console.error('books-row element not found');
        return;
    }
    
    // Clear existing books
    booksRow.innerHTML = '';
    
    if (!booksToRender || booksToRender.length === 0) {
        booksRow.innerHTML = '<p style="padding: 20px; color: #666;">No books match the current filters.</p>';
        return;
    }
    
    // Create book cards
    booksToRender.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.className = 'book-card';
        bookCard.onclick = () => openOverlay(book);
        
        // Generate star rating display
        const stars = '★'.repeat(book.rating || 0) + '☆'.repeat(5 - (book.rating || 0));
        
        // Create card content
        bookCard.innerHTML = `
            <div class="book-card-content">
                <h3 class="book-title">${escapeHtml(book.title || 'Untitled')}</h3>
                <p class="book-author">${escapeHtml(book.author || 'Unknown Author')}</p>
                <div class="book-rating">${stars}</div>
                <p class="book-genre">${escapeHtml(book.genre || '')}</p>
            </div>
        `;
        
        booksRow.appendChild(bookCard);
    });
    
    console.log(`Rendered ${booksToRender.length} books`);
}

/**
 * Opens the review overlay popup with book details
 * @param {Object} book - Book object containing title, author, rating, etc.
 */
function openOverlay(book) {
    console.log("Opening overlay for:", book.title);
    
    // Set overlay content
    document.getElementById('overlayTitle').textContent = book.title || 'Untitled';
    document.getElementById('overlayAuthor').textContent = book.author || 'Unknown Author';
    
    // Create details string with rating, genre, and read date
    const stars = '★'.repeat(book.rating || 0) + '☆'.repeat(5 - (book.rating || 0));
    const details = [
        `Rating: ${stars}`,
        book.genre ? `Genre: ${book.genre}` : '',
        book.datesRead ? `Read: ${book.datesRead}` : ''
    ].filter(Boolean).join(' | ');
    
    document.getElementById('overlayDetails').textContent = details;
    
    // Set review text (escape HTML for security)
    const reviewElement = document.getElementById('overlayReviewText');
    reviewElement.textContent = book.review || 'No review available.';
    
    // Show overlay
    const overlay = document.getElementById('reviewOverlay');
    overlay.style.display = 'block';
}

/**
 * Closes the review overlay popup
 */
function closeOverlay() {
    const overlay = document.getElementById('reviewOverlay');
    overlay.style.display = 'none';
}

/**
 * Escapes HTML characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load books when page loads
    loadBooks();
    
    // Close overlay event listeners
    const closeButton = document.getElementById('closeOverlay');
    if (closeButton) {
        closeButton.addEventListener('click', closeOverlay);
    }
    
    // Close overlay when clicking outside content
    const overlay = document.getElementById('reviewOverlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeOverlay();
            }
        });
    }
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (books.length > 0) {
            filterAndSortBooks();
        }
    });
});

// Close overlay with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeOverlay();
    }
});