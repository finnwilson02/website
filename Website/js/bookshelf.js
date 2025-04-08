/* bookshelf.js */
let booksData = [];

// fetch books data from API
fetch('/api/data/books')
  .then(response => response.json())
  .then(data => {
    booksData = data;
    initFilters();
    renderBooks();
  })
  .catch(err => console.error('error loading books data:', err));
  
  function initFilters() {
    const genreSelect = document.getElementById('genreFilter');
    const genres = new Set();
    booksData.forEach(book => {
      if (book.genre) {
        book.genre.split(',').forEach(g => {
          const trimmed = g.trim();
          if (trimmed) genres.add(trimmed);
        });
      }
    });
    genres.forEach(genre => {
      const opt = document.createElement('option');
      opt.value = genre;
      opt.textContent = genre;
      genreSelect.appendChild(opt);
    });
    document.getElementById('genreFilter').addEventListener('change', renderBooks);
    document.getElementById('ratingFilter').addEventListener('change', renderBooks);
    document.getElementById('sortOrder').addEventListener('change', renderBooks);
  }
  
function renderBooks() {
    const bookshelf = document.getElementById('bookshelf');
    bookshelf.innerHTML = ''; // clear previous content
  
    const genreFilter = document.getElementById('genreFilter').value;
    const ratingFilter = document.getElementById('ratingFilter').value;
    const sortOrder = document.getElementById('sortOrder').value;
  
    let filtered = booksData.filter(book => {
      const matchGenre = (genreFilter === 'all' || book.genre === genreFilter);
      const matchRating = (ratingFilter === 'all' || book.rating >= parseInt(ratingFilter, 10));
      return matchGenre && matchRating;
    });
  
    if (sortOrder === 'date-asc') {
      filtered = filtered.slice().reverse();
    } else if (sortOrder === 'rating-desc') {
      filtered.sort((a, b) => b.rating - a.rating);
    } else if (sortOrder === 'rating-asc') {
      filtered.sort((a, b) => a.rating - b.rating);
    }
    // default: date-desc
  
    const shelfWidth = bookshelf.clientWidth;
    const gap = 10;
    let currentRow = document.createElement('div');
    currentRow.className = 'books-row';
    let currentRowWidth = 0;
  
    // constants for dynamic width calc
    const verticalPadding = 10;  // in px
    const horizontalPadding = 20; // extra width for padding
    const bookHeight = 240;       // fixed book height from css
    const lineHeight = 20;        // estimated line height in px
    const availableWidth = bookHeight - (2 * verticalPadding); // max width for unrotated text
  
    // helper function: measure how many lines text takes when wrapped to availableWidth
    function measureLines(text) {
      const temp = document.createElement('div');
      temp.style.position = 'absolute';
      temp.style.visibility = 'hidden';
      temp.style.width = availableWidth + 'px';
      temp.style.fontSize = '1rem';   // match .book-spine font-size
      temp.style.lineHeight = lineHeight + 'px';
      temp.style.whiteSpace = 'normal';
      temp.innerText = text;
      document.body.appendChild(temp);
      const height = temp.offsetHeight;
      document.body.removeChild(temp);
      return Math.ceil(height / lineHeight);
    }
  
    filtered.forEach(book => {
      const bookEl = document.createElement('div');
      bookEl.className = 'book';
      bookEl.style.backgroundColor = book.spineColor || '#ddd';
  
      const spine = document.createElement('div');
      spine.className = 'book-spine';
      spine.innerHTML = `<span class="book-title" style="color:${book.titleColor}">${book.title}</span><br>
                         <span class="book-author" style="color:${book.authorColor}">${book.author}</span>`;
      bookEl.appendChild(spine);
  
      // measure the required number of lines for title and author (separately)
      const titleLines = measureLines(book.title);
      const authorLines = measureLines(book.author);
      const totalLines = titleLines + authorLines;
      const finalWidth = (totalLines * lineHeight) + horizontalPadding;
      bookEl.style.width = finalWidth + "px";
  
      // check if adding this book exceeds the shelf width
      if (currentRowWidth + finalWidth + gap > shelfWidth) {
        bookshelf.appendChild(currentRow);
        const shelfBar = document.createElement('div');
        shelfBar.className = 'shelf-bar';
        bookshelf.appendChild(shelfBar);
        currentRow = document.createElement('div');
        currentRow.className = 'books-row';
        currentRowWidth = 0;
      }
  
      bookEl.addEventListener('click', () => openReview(book));
      currentRow.appendChild(bookEl);
      currentRowWidth += finalWidth + gap;
    });
  
    if (currentRow.childNodes.length > 0) {
      bookshelf.appendChild(currentRow);
      const shelfBar = document.createElement('div');
      shelfBar.className = 'shelf-bar';
      bookshelf.appendChild(shelfBar);
    }
  }
  
  
  function openReview(book) {
    console.log("openReview triggered for:", book); // debug log
    document.getElementById('overlayTitle').textContent = book.title;
    document.getElementById('overlayAuthor').textContent = book.author;
    const stars = '★'.repeat(book.rating) + '☆'.repeat(5 - book.rating);
    document.getElementById('overlayDetails').innerHTML =
      `<span>rating: ${stars}</span> 
       <span>genre: ${book.genre}</span> 
       <span>read: ${book.datesRead}</span>`;
    document.getElementById('overlayReviewText').textContent = book.review;
    document.getElementById('reviewOverlay').classList.add('open');
  }
  
  

// helper: measure natural width of an element by cloning it and removing transforms
function measureElementWidth(elem) {
    const clone = elem.cloneNode(true);
    clone.style.transform = "none";
    clone.style.position = "absolute";
    clone.style.visibility = "hidden";
    clone.style.whiteSpace = "nowrap"; // force single-line measurement
    document.body.appendChild(clone);
    const width = clone.offsetWidth;
    document.body.removeChild(clone);
    return width;
}

document.getElementById('closeOverlay').addEventListener('click', () => {
  document.getElementById('reviewOverlay').classList.remove('open');
});

window.addEventListener('resize', renderBooks);
