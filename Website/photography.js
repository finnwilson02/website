// photography.js - Combined map and globe functionality

// Global variables for photos and trips
let gAllPhotos = [];
let gAllTrips = [];
let gCurrentView = 'map'; // Tracks current view: 'map' or 'globe'
let gGlobeInitialized = false; // Tracks if globe has been initialized

// DOM elements
const mapView = document.getElementById('photoMapView');
const globeView = document.getElementById('photoGlobeView');
const mapToggle = document.getElementById('mapToggle');
const globeToggle = document.getElementById('globeToggle');
const mapContainer = document.getElementById('map');
const globeContainer = document.getElementById('cesiumContainer');

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
  // Initialize map view by default
  initializeMap();
  
  // Set up view toggle
  setupViewToggle();
  
  // Load photos data
  loadPhotosData();
});

// Set up view toggle buttons
function setupViewToggle() {
  // Map button click handler
  mapToggle.addEventListener('click', () => {
    switchView('map');
  });
  
  // Globe button click handler
  globeToggle.addEventListener('click', () => {
    switchView('globe');
  });
}

// Switch between map and globe views
function switchView(view) {
  if (view === gCurrentView) return;
  
  gCurrentView = view;
  
  // Update button states
  mapToggle.classList.toggle('active', view === 'map');
  globeToggle.classList.toggle('active', view === 'globe');
  
  // Show/hide containers
  mapView.style.display = view === 'map' ? 'block' : 'none';
  globeView.style.display = view === 'globe' ? 'block' : 'none';
  
  // Initialize globe if needed
  if (view === 'globe') {
    const loadingOverlay = document.getElementById('globeLoadingOverlay');
    
    if (!gGlobeInitialized) {
      // Show loading overlay
      if (loadingOverlay) loadingOverlay.style.display = 'flex';
      
      // Initialize globe with a slight delay to allow UI to update
      setTimeout(() => {
        initializeGlobe()
          .then(() => {
            // Hide loading overlay when done
            if (loadingOverlay) loadingOverlay.style.display = 'none';
          })
          .catch(error => {
            // Show error notification
            showNotification('Error loading 3D globe: ' + error.message, 'error');
            if (loadingOverlay) loadingOverlay.style.display = 'none';
          });
      }, 100);
    } else {
      // Globe already initialized, make sure it's properly displayed
      const cesiumContainer = document.getElementById('cesiumContainer');
      if (cesiumContainer) {
        cesiumContainer.style.display = 'block';
      }
    }
  }
}

// Load photos data
async function loadPhotosData() {
  try {
    // Load photos and trips in parallel
    const [photosResponse, tripsResponse] = await Promise.all([
      fetch('/api/data/images'),
      fetch('/api/data/trips')
    ]);
    
    // Handle photos response
    if (!photosResponse.ok) {
      throw new Error(`Failed to fetch photos: ${photosResponse.status}`);
    }
    
    // Handle trips response
    if (!tripsResponse.ok) {
      throw new Error(`Failed to fetch trips: ${tripsResponse.status}`);
    }
    
    // Parse response data
    gAllPhotos = await photosResponse.json();
    gAllTrips = await tripsResponse.json();
    
    // Initialize map with photos
    populateMap();
    populateFilters();
    
    // If globe is already visible, initialize it
    if (gCurrentView === 'globe') {
      initializeGlobe();
    }
    
  } catch (error) {
    // Display error to user
    showNotification(`Error loading photos: ${error.message}`, 'error');
  }
}

// Helper function to get photo caption consistently
function getPhotoCaption(photo) {
  let caption = photo.title || '';
  
  if (photo.description) {
    caption += caption ? ` – ${photo.description}` : photo.description;
  }
  
  return caption;
}

// ======= MAP FUNCTIONALITY =======

let map, markers, markerCluster;

// Initialize the Leaflet map
function initializeMap() {
  // Create map
  map = L.map('map').setView([20, 0], 2);
  
  // Add base tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  
  // Initialize marker group
  markers = L.layerGroup();
  
  // Initialize marker cluster
  markerCluster = L.markerClusterGroup({
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    disableClusteringAtZoom: 18
  });
  
  // Add cluster to map
  map.addLayer(markerCluster);
}

// Populate map with photo markers
function populateMap() {
  // Clear existing markers
  markerCluster.clearLayers();
  
  // Create and add markers for each photo
  gAllPhotos.forEach(photo => {
    // Skip photos without coordinates
    if (!photo.lat || !photo.lng) return;
    
    // Create marker
    const marker = L.marker([photo.lat, photo.lng], {
      title: photo.title || 'Photo'
    });
    
    // Create popup content
    const popupContent = createPhotoPopup(photo);
    marker.bindPopup(popupContent);
    
    // Add to cluster
    markerCluster.addLayer(marker);
    
    // Add click event
    marker.on('click', () => {
      openPhotoGallery(photo);
    });
  });
}

// Create popup content for a photo marker
function createPhotoPopup(photo) {
  // Create popup HTML
  let popup = document.createElement('div');
  popup.className = 'photo-popup';
  
  // Add thumbnail if available
  if (photo.thumbnail) {
    const img = document.createElement('img');
    img.src = `img/${photo.thumbnail}`;
    img.alt = photo.title || 'Photo';
    popup.appendChild(img);
  }
  
  // Add info content
  const content = document.createElement('div');
  content.className = 'popup-content';
  
  // Add title
  if (photo.title) {
    const title = document.createElement('h3');
    title.textContent = photo.title;
    content.appendChild(title);
  }
  
  // Add date if available
  if (photo.date) {
    const date = document.createElement('p');
    date.textContent = photo.date;
    date.className = 'photo-date';
    content.appendChild(date);
  }
  
  // Add location if available
  if (photo.location || photo.country) {
    const location = document.createElement('p');
    location.textContent = [photo.location, photo.country].filter(Boolean).join(', ');
    location.className = 'photo-location';
    content.appendChild(location);
  }
  
  // Add view button
  const button = document.createElement('button');
  button.textContent = 'View Photo';
  button.className = 'view-photo-btn';
  content.appendChild(button);
  
  popup.appendChild(content);
  
  return popup;
}

// Populate filter dropdowns
function populateFilters() {
  // Get filter elements
  const tripSelector = document.getElementById('tripSelector');
  const countrySelector = document.getElementById('countrySelector');
  
  if (!tripSelector || !countrySelector) return;
  
  // Extract unique trip IDs
  const tripIds = new Set();
  gAllPhotos.forEach(photo => {
    if (photo.tripId) tripIds.add(photo.tripId);
  });
  
  // Extract unique countries
  const countries = new Set();
  gAllPhotos.forEach(photo => {
    if (photo.country) countries.add(photo.country);
  });
  
  // Populate trip dropdown
  tripSelector.innerHTML = '<option value="">-- All Trips --</option>';
  gAllTrips.forEach(trip => {
    if (tripIds.has(trip.id)) {
      const option = document.createElement('option');
      option.value = trip.id;
      option.textContent = trip.name || `Trip #${trip.id}`;
      tripSelector.appendChild(option);
    }
  });
  
  // Populate country dropdown
  countrySelector.innerHTML = '<option value="">-- All Countries --</option>';
  Array.from(countries).sort().forEach(country => {
    const option = document.createElement('option');
    option.value = country;
    option.textContent = country;
    countrySelector.appendChild(option);
  });
  
  // Add filter change handlers
  const filterDateStart = document.getElementById('filterDateStart');
  const filterDateEnd = document.getElementById('filterDateEnd');
  const filterApplyButton = document.getElementById('filterApplyButton');
  const filterClearButton = document.getElementById('filterClearButton');
  
  if (filterApplyButton) {
    filterApplyButton.addEventListener('click', applyFilters);
  }
  
  if (filterClearButton) {
    filterClearButton.addEventListener('click', () => {
      // Clear filter inputs
      if (filterDateStart) filterDateStart.value = '';
      if (filterDateEnd) filterDateEnd.value = '';
      if (tripSelector) tripSelector.value = '';
      if (countrySelector) countrySelector.value = '';
      
      // Reapply filters (which will show all photos)
      applyFilters();
    });
  }
}

// Apply filters to photos
function applyFilters() {
  // Get filter values
  const startDate = document.getElementById('filterDateStart')?.value;
  const endDate = document.getElementById('filterDateEnd')?.value;
  const tripId = document.getElementById('tripSelector')?.value;
  const country = document.getElementById('countrySelector')?.value;
  
  // Filter photos
  const filteredPhotos = gAllPhotos.filter(photo => {
    // Date filter
    if (startDate && (!photo.date || photo.date < startDate)) return false;
    if (endDate && (!photo.date || photo.date > endDate)) return false;
    
    // Trip filter
    if (tripId && photo.tripId !== tripId) return false;
    
    // Country filter
    if (country && photo.country !== country) return false;
    
    return true;
  });
  
  // Update map with filtered photos
  updateMap(filteredPhotos);
}

// Update map with filtered photos
function updateMap(photos) {
  // Clear existing markers
  markerCluster.clearLayers();
  
  // Add filtered photos to map
  photos.forEach(photo => {
    // Skip photos without coordinates
    if (!photo.lat || !photo.lng) return;
    
    // Create marker
    const marker = L.marker([photo.lat, photo.lng], {
      title: photo.title || 'Photo'
    });
    
    // Create popup content
    const popupContent = createPhotoPopup(photo);
    marker.bindPopup(popupContent);
    
    // Add to cluster
    markerCluster.addLayer(marker);
    
    // Add click event
    marker.on('click', () => {
      openPhotoGallery(photo);
    });
  });
  
  // Show message if no photos match filters
  if (photos.length === 0) {
    showNotification('No photos match your filters', 'info');
  }
}

// Open photo gallery
function openPhotoGallery(clickedPhoto) {
  // Skip if no photo provided
  if (!clickedPhoto) {
    showNotification('Error loading photo', 'error');
    return;
  }
  
  // Find context for gallery (trip or country)
  const contextKey = clickedPhoto.tripId ? 'trip' : 'country';
  const contextId = clickedPhoto.tripId || clickedPhoto.country;
  
  // Find photos in the same context
  let galleryPhotos = [];
  
  if (contextKey === 'trip' && contextId) {
    galleryPhotos = gAllPhotos.filter(photo => photo.tripId === contextId);
    
    // Sort by date if available
    galleryPhotos.sort((a, b) => {
      if (a.date && b.date) return a.date.localeCompare(b.date);
      return 0;
    });
  } else if (contextKey === 'country' && contextId) {
    galleryPhotos = gAllPhotos.filter(photo => photo.country === contextId);
  } else {
    // Fallback to single photo
    galleryPhotos = [clickedPhoto];
  }
  
  // Show error if no photos in context
  if (galleryPhotos.length === 0) {
    showNotification('No photos found in this context', 'error');
    return;
  }
  
  // Find index of clicked photo in gallery
  const clickedIndex = galleryPhotos.findIndex(photo => photo === clickedPhoto);
  
  // Show error if clicked photo not found in gallery
  if (clickedIndex === -1) {
    galleryPhotos = [clickedPhoto];
  }
  
  // Create GLightbox element data
  const galleryElements = galleryPhotos.map(photo => {
    return {
      href: `img/${photo.imageFull || photo.thumbnail}`,
      type: 'image',
      title: photo.title || 'Untitled',
      description: getPhotoCaption(photo),
      alt: photo.title || 'Photo',
    };
  });
  
  // Create and open GLightbox
  const lightbox = GLightbox({
    elements: galleryElements,
    startAt: Math.max(0, clickedIndex),
    touchNavigation: true,
    loop: true,
    preload: true,
    openEffect: 'zoom',
    closeEffect: 'fade',
    slideEffect: 'slide'
  });
  
  lightbox.open();
}

// ======= GLOBE FUNCTIONALITY =======

let viewer;

// Initialize the Cesium globe
function initializeGlobe() {
  return new Promise(async (resolve, reject) => {
    try {
      // Check if Cesium is already loaded
      if (typeof Cesium === 'undefined') {
        // Load Cesium dynamically
        await loadCesium();
      }
      
      // Get Cesium access token
      const token = await getCesiumToken();
      
      // Configure Cesium with token
      Cesium.Ion.defaultAccessToken = token;
      
      // Create Cesium viewer
      viewer = new Cesium.Viewer('cesiumContainer', {
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        navigationHelpButton: false,
        navigationInstructionsInitiallyVisible: false,
        scene3DOnly: true,
        skyBox: false,
        imageryProvider: new Cesium.OpenStreetMapImageryProvider({
          url: 'https://a.tile.openstreetmap.org/'
        })
      });
      
      // Add photo markers to globe
      await addPhotoMarkersToGlobe(gAllPhotos);
      
      // Set initial view
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(0, 20, 20000000),
        duration: 0
      });
      
      // Mark globe as initialized
      gGlobeInitialized = true;
      
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

// Load Cesium library dynamically
function loadCesium() {
  return new Promise((resolve, reject) => {
    // Create script tag
    const script = document.createElement('script');
    script.src = 'https://cesium.com/downloads/cesiumjs/releases/1.95/Build/Cesium/Cesium.js';
    script.onload = resolve;
    script.onerror = reject;
    
    // Create link tag for CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cesium.com/downloads/cesiumjs/releases/1.95/Build/Cesium/Widgets/widgets.css';
    
    // Add to head
    document.head.appendChild(link);
    document.head.appendChild(script);
  });
}

// Get Cesium access token
function getCesiumToken() {
  return new Promise((resolve) => {
    // Using a default token for demo purposes
    // In production, this would fetch from server
    resolve('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0YTMxNTI2Yi1kYTg4LTRhZjAtOGNmNy0xZjE3MmRhNzEzYzAiLCJpZCI6MjU5LCJpYXQiOjE2ODc5MTk4ODh9.0KZYi2fCCjczQ6Qe6tKfKIvLNQwC8hn2jySUNmDmqcw');
  });
}

// Add photo markers to globe
async function addPhotoMarkersToGlobe(photos) {
  try {
    // Create markers for each photo
    const entityPromises = photos
      .filter(photo => photo.lat && photo.lng)
      .map(async (photo) => {
        try {
          // Create entity
          const entity = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(photo.lng, photo.lat),
            billboard: {
              image: `img/${photo.thumbnail}`,
              width: 32,
              height: 32,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              scale: 1.0
            },
            label: {
              text: photo.title || 'Photo',
              font: '12px Helvetica',
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: Cesium.VerticalOrigin.TOP,
              pixelOffset: new Cesium.Cartesian2(0, -36),
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              show: false
            }
          });
          
          // Add click handler
          entity.photo = photo;
          
          return entity;
        } catch (error) {
          return null;
        }
      });
    
    // Wait for all entities to be created
    await Promise.all(entityPromises);
    
    // Add click handler to globe
    viewer.screenSpaceEventHandler.setInputAction((click) => {
      const pickedObject = viewer.scene.pick(click.position);
      
      if (Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id.photo) {
        const photo = pickedObject.id.photo;
        
        // Open gallery for clicked photo
        openPhotoGallery(photo);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    
    return entityPromises.length;
  } catch (error) {
    throw error;
  }
}

// ======= UTILITY FUNCTIONS =======

// Show notification
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Add to body
  document.body.appendChild(notification);
  
  // Remove after delay
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s ease';
    
    // Remove from DOM after fade
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 500);
  }, 3000);
}

// Log message (utility function for debugging)
function log(message, type = 'info') {
  // Empty function in production
}