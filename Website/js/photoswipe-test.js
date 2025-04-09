// Simple script to test PhotoSwipe library loading
document.addEventListener('DOMContentLoaded', function() {
  console.log("PhotoSwipe test script loaded");
  console.log("PhotoSwipe present:", typeof PhotoSwipe);
  console.log("PhotoSwipeLightbox present:", typeof PhotoSwipeLightbox);
  
  // Check if the library objects have the expected properties
  if (typeof PhotoSwipe \!== 'undefined') {
    console.log("PhotoSwipe properties:", {
      name: PhotoSwipe.name,
      isFunction: typeof PhotoSwipe === 'function',
      prototype: PhotoSwipe.prototype ? Object.keys(PhotoSwipe.prototype).slice(0, 5) : 'No prototype'
    });
  }
  
  if (typeof PhotoSwipeLightbox \!== 'undefined') {
    console.log("PhotoSwipeLightbox properties:", {
      name: PhotoSwipeLightbox.name,
      isFunction: typeof PhotoSwipeLightbox === 'function',
      prototype: PhotoSwipeLightbox.prototype ? Object.keys(PhotoSwipeLightbox.prototype).slice(0, 5) : 'No prototype'
    });
  }
});
