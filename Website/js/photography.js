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
  console.log('Photography page loaded, initializing...');
  
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
  if (view === 'globe' && !gGlobeInitialized) {
    initializeGlobe();
  }
}

// Load photos data
async function loadPhotosData() {
  try {
    // Show loading indication (could add a spinner)
    console.log('Loading photos data...');
    
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
    
    console.log(`Loaded ${gAllPhotos.length} photos and ${gAllTrips.length} trips`);
    
    // Initialize map with photos
    populateMap();
    populateFilters();
    
    // If globe is already visible, initialize it
    if (gCurrentView === 'globe') {
      initializeGlobe();
    }
    
  } catch (error) {
    console.error('Error loading photos data:', error);
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
  console.log('Initializing map...');
  
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
  console.log('Populating map with photos...');
  
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

// Create HTML content for photo popup
function createPhotoPopup(photo) {
  // Get thumbnail URL
  const thumbnailUrl = photo.thumbnail ? `img/${photo.thumbnail}` : '';
  
  // Find trip name if available
  let tripName = '';
  if (photo.tripId) {
    const trip = gAllTrips.find(t => t.id === photo.tripId);
    if (trip) {
      tripName = `<div><strong>Trip:</strong> ${trip.name}</div>`;
    }
  }
  
  // Create HTML content
  return `
    <div class="photo-popup">
      ${thumbnailUrl ? `<img src="${thumbnailUrl}" alt="${photo.title || 'Photo'}" style="max-width: 150px;">` : ''}
      <div class="popup-content">
        <h3>${photo.title || 'Untitled'}</h3>
        ${photo.description ? `<p>${photo.description}</p>` : ''}
        ${photo.date ? `<div><strong>Date:</strong> ${photo.date}</div>` : ''}
        ${photo.country ? `<div><strong>Country:</strong> ${photo.country}</div>` : ''}
        ${tripName}
        <button class="view-photo-btn">View Gallery</button>
      </div>
    </div>
  `;
}

// Populate filter dropdowns
function populateFilters() {
  console.log('Populating filter options...');
  
  const tripSelector = document.getElementById('tripSelector');
  const countrySelector = document.getElementById('countrySelector');
  
  // Clear existing options except the default
  while (tripSelector.options.length > 1) {
    tripSelector.options.remove(1);
  }
  
  while (countrySelector.options.length > 1) {
    countrySelector.options.remove(1);
  }
  
  // Add trip options
  gAllTrips.forEach(trip => {
    const option = document.createElement('option');
    option.value = trip.id;
    option.textContent = trip.name;
    tripSelector.appendChild(option);
  });
  
  // Get unique countries
  const countries = [...new Set(gAllPhotos.map(photo => photo.country).filter(Boolean))];
  
  // Add country options
  countries.sort().forEach(country => {
    const option = document.createElement('option');
    option.value = country;
    option.textContent = country;
    countrySelector.appendChild(option);
  });
  
  // Add event listeners for filters
  tripSelector.addEventListener('change', applyFilters);
  countrySelector.addEventListener('change', applyFilters);
  document.getElementById('filterApplyButton').addEventListener('click', applyFilters);
  document.getElementById('filterClearButton').addEventListener('click', clearFilters);
}

// Apply map filters
function applyFilters() {
  console.log('Applying filters...');
  
  const tripId = document.getElementById('tripSelector').value;
  const country = document.getElementById('countrySelector').value;
  const dateStart = document.getElementById('filterDateStart').value;
  const dateEnd = document.getElementById('filterDateEnd').value;
  
  // Filter photos based on selections
  const filteredPhotos = gAllPhotos.filter(photo => {
    // Trip filter
    if (tripId && photo.tripId !== tripId) {
      return false;
    }
    
    // Country filter
    if (country && photo.country !== country) {
      return false;
    }
    
    // Date filters
    if (dateStart && photo.date) {
      if (new Date(photo.date) < new Date(dateStart)) {
        return false;
      }
    }
    
    if (dateEnd && photo.date) {
      if (new Date(photo.date) > new Date(dateEnd)) {
        return false;
      }
    }
    
    return true;
  });
  
  // Clear existing markers
  markerCluster.clearLayers();
  
  // Add filtered markers
  filteredPhotos.forEach(photo => {
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
  
  // Update visible count
  console.log(`Showing ${filteredPhotos.length} of ${gAllPhotos.length} photos`);
  
  // Show notification
  showNotification(`Showing ${filteredPhotos.length} photos`);
}

// Clear map filters
function clearFilters() {
  document.getElementById('tripSelector').value = '';
  document.getElementById('countrySelector').value = '';
  document.getElementById('filterDateStart').value = '';
  document.getElementById('filterDateEnd').value = '';
  
  // Reset map to show all photos
  populateMap();
  
  // Show notification
  showNotification('Filters cleared');
}

// ======= GLOBE FUNCTIONALITY =======

// Initialize the Cesium globe
async function initializeGlobe() {
  console.log('Initializing globe...');
  
  // Load Cesium dynamically
  try {
    // Show loading indication (could add a spinner)
    showNotification('Loading 3D globe components...');
    
    // Dynamically load Cesium script
    const cesiumScript = document.createElement('script');
    cesiumScript.src = 'https://cesium.com/downloads/cesiumjs/releases/1.118/Build/Cesium/Cesium.js';
    document.head.appendChild(cesiumScript);
    
    // Wait for Cesium to load
    await new Promise((resolve, reject) => {
      cesiumScript.onload = resolve;
      cesiumScript.onerror = reject;
    });
    
    // Wait a bit more to ensure Cesium is fully loaded
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get Cesium token
    const tokenResponse = await fetch('/api/config/cesium-token');
    if (!tokenResponse.ok) {
      throw new Error(`Failed to fetch Cesium token: ${tokenResponse.status}`);
    }
    
    const tokenData = await tokenResponse.json();
    const cesiumToken = tokenData.token;
    
    // Set token
    Cesium.Ion.defaultAccessToken = cesiumToken;
    
    // Create viewer
    const viewer = new Cesium.Viewer('cesiumContainer', {
      baseLayerPicker: false,
      sceneModePicker: false,
      animation: false,
      fullscreenButton: false,
      vrButton: false,
      geocoder: false,
      homeButton: true,
      infoBox: false,
      selectionIndicator: true,
      timeline: false,
      navigationHelpButton: false,
      navigationInstructionsInitiallyVisible: false,
      requestRenderMode: true,
      maximumRenderTimeChange: Infinity,
    });
    
    // Fly to home view
    viewer.camera.flyHome(0);
    
    // Add photo pins to globe
    addPhotoMarkers(viewer);
    
    // Mark as initialized
    gGlobeInitialized = true;
    showNotification('3D globe ready');
    
  } catch (error) {
    console.error('Error initializing globe:', error);
    showNotification(`Error initializing globe: ${error.message}`, 'error');
  }
}

// Add photo markers to globe
async function addPhotoMarkers(viewer) {
  console.log('Adding photo markers to globe...');
  
  // Use PinBuilder for creating pin graphics
  const pinBuilder = new Cesium.PinBuilder();
  
  // Sort photos by sortIndex if available
  const sortedPhotos = [...gAllPhotos].sort((a, b) => {
    const ai = a.sortIndex;
    const bi = b.sortIndex;
    if (ai != null && bi != null) return ai - bi;      // both indexed
    if (ai == null && bi != null) return 1;            // a without index
    if (bi == null && ai != null) return -1;           // b without index
    return new Date(a.date) - new Date(b.date);        // both missing
  });
  
  // Add entity for each photo
  sortedPhotos.forEach(async (photo, index) => {
    // Skip photos without coordinates
    if (!photo.lat || !photo.lng) return;
    
    try {
      // Create entity
      viewer.entities.add({
        name: photo.title || 'Photo Location',
        position: Cesium.Cartesian3.fromDegrees(photo.lng, photo.lat, 0.0),
        model: {
          uri: 'models/pin.glb',
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          scale: 500,
          scaleByDistance: new Cesium.NearFarScalar(
            5.0e2, 1.0, 2.5e6, 0.45
          ),
          minimumPixelSize: 32
        },
        properties: {
          photoIndex: index,
          photoData: photo
        }
      });
    } catch (error) {
      console.error(`Error adding entity for photo ${photo.title || 'Untitled'}:`, error);
    }
  });
  
  // Set up click handler for entities
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction(function(movement) {
    const pickedObject = viewer.scene.pick(movement.position);
    if (Cesium.defined(pickedObject) && 
        Cesium.defined(pickedObject.id) && 
        pickedObject.id instanceof Cesium.Entity && 
        pickedObject.id.properties?.photoData) {
      
      const clickedEntity = pickedObject.id;
      const clickedPhoto = clickedEntity.properties.photoData.getValue(viewer.clock.currentTime);
      
      // Fly to entity
      viewer.flyTo(clickedEntity, {
        duration: 2.0,
        offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-90), 1.5e4)
      }).then(() => {
        // Open gallery once flight completes
        openPhotoGallery(clickedPhoto);
      }).catch(error => {
        console.error('Error during flyTo:', error);
        // Open gallery even if flight fails
        openPhotoGallery(clickedPhoto);
      });
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

// ======= SHARED FUNCTIONALITY =======

// Open photo gallery
function openPhotoGallery(clickedPhoto) {
  console.log('Opening photo gallery...');
  
  // Get context (trip or country)
  const contextId = clickedPhoto.tripId ? clickedPhoto.tripId : clickedPhoto.country;
  const contextKey = clickedPhoto.tripId ? 'tripId' : 'country';
  
  // Filter photos in the same context
  const photosInContext = gAllPhotos.filter(photo => photo[contextKey] === contextId);
  
  // Sort by sortIndex or date
  const sortedPhotos = [...photosInContext].sort((a, b) => {
    const ai = a.sortIndex;
    const bi = b.sortIndex;
    if (ai != null && bi != null) return ai - bi;      // both indexed
    if (ai == null && bi != null) return 1;            // a without index
    if (bi == null && ai != null) return -1;           // b without index
    return new Date(a.date) - new Date(b.date);        // both missing
  });
  
  // Get clicked photo index
  const clickedIndex = sortedPhotos.findIndex(p => 
    (p.imageFull || p.thumbnail) === (clickedPhoto.imageFull || clickedPhoto.thumbnail)
  );
  
  if (clickedIndex === -1) {
    console.error('Clicked photo not found in context!');
    return;
  }
  
  // Map photos to gallery elements
  const galleryElements = sortedPhotos.map(photo => {
    const imagePath = photo.imageFull ? `img/${photo.imageFull}` : 
                     (photo.thumbnail ? `img/${photo.thumbnail}` : 'img/placeholder-cover.png');
    
    // Use consistent caption helper
    const caption = getPhotoCaption(photo);
    
    return {
      href: imagePath,
      type: 'image', 
      title: caption,
      alt: photo.title || 'Photo'
    };
  });
  
  // Initialize GLightbox
  const lightbox = GLightbox({
    elements: galleryElements,
    startAt: Math.max(0, clickedIndex),
    loop: true
  });
  
  // Open the lightbox
  lightbox.open();
  
  // Get context description for notification
  const contextDesc = contextKey === 'tripId' ? 
    `Trip "${gAllTrips.find(t => t.id === clickedPhoto.tripId)?.name || clickedPhoto.tripId}"` : 
    `Country "${clickedPhoto.country}"`;
  
  // Show notification
  showNotification(`Showing photos from ${contextDesc}`);
}

// Show notification
function showNotification(message, type = 'info') {
  console.log(`[${type}] ${message}`);
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  notification.style.position = 'fixed';
  notification.style.bottom = '20px';
  notification.style.left = '50%';
  notification.style.transform = 'translateX(-50%)';
  notification.style.backgroundColor = type === 'info' ? 'rgba(0, 120, 255, 0.9)' : 'rgba(255, 0, 0, 0.9)';
  notification.style.color = 'white';
  notification.style.padding = '10px 20px';
  notification.style.borderRadius = '5px';
  notification.style.zIndex = '1000';
  notification.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
  
  // Add to body
  document.body.appendChild(notification);
  
  // Remove after delay
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 500);
  }, 3000);
}