from flask import Flask, request, render_template_string, redirect
import json, os, threading, webbrowser
from datetime import datetime

app = Flask(__name__)
json_file = 'data/books.json'

def load_books():
    if os.path.exists(json_file):
        with open(json_file, 'r') as f:
            return json.load(f)
    return []

def save_books(books):
    with open(json_file, 'w') as f:
        json.dump(books, f, indent=2)

def shutdown_server():
    func = request.environ.get('werkzeug.server.shutdown')
    if func:
        func()
    else:
        # force exit if shutdown function isn't available
        os._exit(0)

form_html = '''
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>add a new book</title>
  <style>
    body { font-family: sans-serif; padding: 2rem; }
    label { display: block; margin-bottom: 0.5rem; }
    input, select, textarea { width: 100%; margin-bottom: 1rem; }
    /* inline styling for checkbox label */
    label.inline { display: inline-flex; align-items: center; }
    /* genre tags styling */
    #genreTags { border: 1px solid #ccc; padding: 5px; min-height: 40px; display: flex; flex-wrap: wrap; gap: 5px; }
    .tag { background: #e0e0e0; padding: 3px 8px; border-radius: 4px; }
    #genreInput { border: none; outline: none; flex-grow: 1; }
    /* manual date inputs on same line */
    #manualDateInputs label { display: inline-block; margin-right: 10px; width: auto; }
  </style>
</head>
<body>
  <h1>add a new book</h1>
  <form method="post">
    <label>title:<br><input type="text" name="title" required></label>
    <label>author:<br><input type="text" name="author" required></label>
    <label>spine color:<br><input type="color" name="spineColor" value="#ffffff" required></label>
    <label>title color:<br><input type="color" name="titleColor" value="#000000" required></label>
    <label>author color:<br><input type="color" name="authorColor" value="#000000" required></label>
    <label>rating (1-10):<br><input type="number" name="rating" min="1" max="10" step="0.1" required></label>
    
    <label>genre (separate multiple genres with commas):</label>
    <div id="genreTags">
      <input type="text" id="genreInput" placeholder="type genre(s) and use commas">
    </div>
    <input type="hidden" name="genre" id="genreHidden" required>
    
    <label class="inline">
      <input type="checkbox" name="use_current_date" id="useCurrentDate" checked>
      use current date
    </label>
    <div id="manualDateInputs" style="display: none;">
      <label>month read: <input type="text" name="month" placeholder="month"></label>
      <label>year read: <input type="text" name="year" placeholder="year"></label>
    </div>
    
    <label>review:<br><textarea name="review" required></textarea></label>
    <button type="submit">add book</button>
  </form>

  <script>
    // handle genre tags input using comma as delimiter
    const genreInput = document.getElementById('genreInput');
    const genreTags = document.getElementById('genreTags');
    const genreHidden = document.getElementById('genreHidden');
    let genres = [];
    
    function updateGenreTags() {
      genreTags.innerHTML = '';
      genres.forEach(tag => {
        const span = document.createElement('span');
        span.className = 'tag';
        span.textContent = tag;
        genreTags.appendChild(span);
      });
      genreTags.appendChild(genreInput);
      genreHidden.value = genres.join(', ');
    }
    
    // on input, if comma is detected, split and add each tag
    genreInput.addEventListener('input', function() {
      if (this.value.includes(',')) {
        const parts = this.value.split(',');
        parts.forEach(part => {
          const trimmed = part.trim();
          if (trimmed && !genres.includes(trimmed)) {
            genres.push(trimmed);
          }
        });
        this.value = '';
        updateGenreTags();
      }
    });
    
    // toggle manual date inputs based on checkbox state
    const useCurrentDateCheckbox = document.getElementById('useCurrentDate');
    const manualDateInputs = document.getElementById('manualDateInputs');
    useCurrentDateCheckbox.addEventListener('change', function() {
      manualDateInputs.style.display = this.checked ? 'none' : 'block';
    });
    
    // on window unload, attempt to shutdown server (best-effort)
    window.addEventListener("unload", function() {
      navigator.sendBeacon("/shutdown");
    });
  </script>
</body>
</html>
'''

@app.route('/', methods=['GET', 'POST'])
def add_book():
    if request.method == 'POST':
        if 'use_current_date' in request.form:
            now = datetime.now()
            month = now.strftime("%B").lower()
            year = now.strftime("%Y")
        else:
            month = request.form.get('month', '')
            year = request.form.get('year', '')
        dates_read = month + " " + year
        new_book = {
            "title": request.form['title'],
            "author": request.form['author'],
            "spineColor": request.form['spineColor'],
            "titleColor": request.form['titleColor'],
            "authorColor": request.form['authorColor'],
            "rating": float(request.form['rating']),
            "genre": request.form['genre'],
            "datesRead": dates_read,
            "review": request.form['review']
        }
        books = load_books()
        books.insert(0, new_book)
        save_books(books)
        shutdown_server()
        return "book added. server shutting down."
    return render_template_string(form_html)

@app.route('/shutdown', methods=['POST'])
def shutdown():
    shutdown_server()
    return "server shutting down..."

if __name__ == '__main__':
    port = 5000
    url = f"http://127.0.0.1:{port}/"
    threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    app.run(debug=True, use_reloader=False, port=port)
