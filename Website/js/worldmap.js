// worldmap.js

// Global variables for data management
let allPhotos = [];      // Master list of all photos loaded
let filteredPhotos = []; // Array holding currently visible photos
let uniqueTags = new Set(); // To store all unique tags
let availableTrips = []; // Will be populated later for potential future usage

// DOM Element References
const filterDateStart = document.getElementById('filterDateStart');
const filterDateEnd = document.getElementById('filterDateEnd');
const filterTagsInput = document.getElementById('filterTagsInput');
const filterCountrySelect = document.getElementById('filterCountrySelect');
const tagSuggestions = document.getElementById('tagSuggestions');
const applyFiltersButton = document.getElementById('applyFiltersButton');
const clearFiltersButton = document.getElementById('clearFiltersButton');

// These elements were part of the previous UI that included grouping controls
// Adding fallbacks to prevent errors since the related UI section was removed
const tripSelector = document.getElementById('tripSelector') || document.createElement('select');
const locationList = document.getElementById('locationList') || document.createElement('div');

// Marker definitions and utilities
const ZOOM_THRESHOLD = 5; // Zoom level threshold for switching between icon types
let allMapMarkers = []; // Array to store all markers for later updates

// Simple icon for low zoom levels
const simpleIcon = L.divIcon({
    html: '<div class="simple-map-pin"></div>',
    className: 'simple-marker',
    iconSize: [14, 14],
    iconAnchor: [7, 7]
});

// Function to create a photo icon with the given thumbnail
function createPhotoIcon(thumbnailUrl) {
    return L.divIcon({
        html: '<img src="img/' + thumbnailUrl + '" class="photo-pin" />',
        className: 'photo-marker',
        iconSize: [50, 50],
        iconAnchor: [25, 25]
    });
}

// initialize the map
console.log("Initializing map...");
var map = L.map('map', {
  worldCopyJump: false
}).setView([40, 60], 2); // Adjusted to better display Russia
console.log("Map initialized:", map ? "Success" : "Failed");

console.log("Adding tile layer...");
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '&copy; openstreetmap contributors',
  noWrap: true // Prevent horizontal tiling
}).addTo(map);
console.log("Tile layer added");

// Set max bounds to prevent panning beyond world edges
map.setMaxBounds([[-90, -180], [90, 180]]);
console.log("Map bounds set");

// create marker cluster group with custom cluster icon
console.log("Creating marker cluster group...");
var markers = L.markerClusterGroup({
  iconCreateFunction: function(cluster) {
    // Check current zoom level
    const currentZoom = map.getZoom();
    const shouldShowPhotoIcons = currentZoom >= ZOOM_THRESHOLD;
    
    // If we're below the zoom threshold, use a simple cluster icon
    if (!shouldShowPhotoIcons) {
      const count = cluster.getChildCount();
      return L.divIcon({
        html: '<div class="simple-cluster">' + count + '</div>',
        className: 'simple-cluster-icon',
        iconSize: [30, 30]
      });
    }
    
    // Otherwise, build our photo stack cluster
    var markersArray = cluster.getAllChildMarkers();
    // sort markers by ranking (descending)
    markersArray.sort(function(a, b) {
      return (b.options.photoRanking || 0) - (a.options.photoRanking || 0);
    });
    // build a stack of up to three images
    var stackHtml = '<div class="cluster-stack">';
    for (var i = 0; i < Math.min(3, markersArray.length); i++) {
      var marker = markersArray[i];
      var photoUrl = marker.options.photoUrl;
      stackHtml += '<img src="img/' + photoUrl + '" class="cluster-photo cluster-photo-' + i + '" />';
    }
    stackHtml += '</div>';
    return L.divIcon({
      html: stackHtml,
      className: 'custom-cluster-icon',
      iconSize: [50, 50]
    });
  }
  // Letting zoomToBoundsOnClick use its default value (true) to restore cluster zooming
});
console.log("Marker cluster group created:", markers ? "Success" : "Failed");

// load country boundaries geojson for clickable borders
console.log("Fetching country boundaries...");
fetch('data/countries.geojson')
  .then(function(res) {
    console.log("Country data fetch response:", res.status, res.statusText);
    if (!res.ok) {
      throw new Error(`HTTP error: ${res.status} ${res.statusText}`);
    }
    return res.json();
  })
  .then(function(countryData) {
    console.log("Successfully loaded country boundaries");
    try {
      console.log("Adding country boundaries to map...");
      const countriesLayer = L.geoJSON(countryData, {
        style: { color: '#3377cc', weight: 1, fillOpacity: 0.1 },
        onEachFeature: function(feature, layer) {
          layer.on('click', function() {
            map.fitBounds(layer.getBounds());
          });
        }
      });
      countriesLayer.addTo(map);
      console.log("Country boundaries added to map");
    } catch (error) {
      console.error("Error adding country boundaries to map:", error);
    }
  })
  .catch(error => {
    console.error("Error loading country data:", error);
  });

// Load trips data for the trip selector
fetch('/api/data/trips')
  .then(function(res) { return res.json(); })
  .then(function(tripsData) {
    if (Array.isArray(tripsData)) {
      availableTrips = tripsData;
      console.log("Loaded trips data:", availableTrips.length);
    } else {
      console.error("Invalid trips data format received");
      availableTrips = [];
    }
  })
  .catch(error => {
    console.error("Error loading trips data:", error);
    availableTrips = [];
  });

// Load images json and add markers with custom icons
console.log("Fetching image data...");
fetch('/api/data/images')
  .then(function(res) {
    console.log("Image data fetch response:", res.status, res.statusText);
    if (!res.ok) {
      throw new Error(`HTTP error: ${res.status} ${res.statusText}`);
    }
    return res.json();
  })
  .then(function(images) {
    console.log("Successfully parsed images JSON data");
    
    if (!Array.isArray(images)) {
      console.error("Invalid image data received, not an array:", images);
      images = []; // Default to empty if format is wrong
    }
    
    console.log(`Received ${images.length} images`);
    
    // Debug: Check the first few images
    if (images.length > 0) {
      console.log("First image sample:", images[0]);
    }
    
    allPhotos = images; // Store master list
    filteredPhotos = [...allPhotos]; // Initially, all photos are filtered in
    
    // Count images with coordinates
    const imagesWithCoords = images.filter(img => img.lat !== undefined && img.lng !== undefined);
    console.log(`Images with coordinates: ${imagesWithCoords.length}/${images.length}`);

    // Populate unique tags
    uniqueTags.clear(); // Clear previous tags if reloading
    let tagCount = 0;
    allPhotos.forEach(img => {
      if (Array.isArray(img.tags)) {
        img.tags.forEach(tag => {
          if (tag && typeof tag === 'string') { // Ensure tag is valid
            uniqueTags.add(tag.toLowerCase().trim());
            tagCount++;
          }
        });
      }
    });
    console.log(`Unique Tags Found: ${uniqueTags.size} (from ${tagCount} total tags)`);
    
    // Populate country dropdown
    const uniqueCountries = new Set();
    allPhotos.forEach(img => {
        if (img.country && typeof img.country === 'string' && img.country.trim() !== '') {
            uniqueCountries.add(img.country.trim());
        }
    });
    const sortedCountries = [...uniqueCountries].sort();
    console.log(`Unique Countries Found: ${sortedCountries.length}`);
    populateCountryFilter(sortedCountries);
    
    // No need to prepare photoswipe data - GLightbox will be initialized on-demand

    // Initial map population using the filtered list
    console.log("Calling updateMapMarkers for initial population...");
    updateMapMarkers(); // New function to handle marker updates
  })
  .catch(error => {
    console.error("Error loading image data:", error);
    // Handle error display
  });

// No longer need to track individual markers, using cluster group instead

// Simple function to clear markers for refresh
function clearMarkers() {
  // Clear cluster group
  if (markers) {
    try {
      map.removeLayer(markers);
    } catch (e) {
      console.warn("Could not remove markers layer (might not be on map yet):", e.message);
    }
    markers.clearLayers();
  }
  
  // Reset the allMapMarkers array (important for zoom handler)
  allMapMarkers = [];
  
  // Future: Clear polylines if added later
  // clearTripPolylines();
}

// Simplified function to update the map based on filters
function updateMapMarkers() {
  console.log("=== Updating map markers based on filters... ===");

  // Apply Filters (using filteredPhotos array)
  applyFilters(); // This function will update the filteredPhotos array
  
  // Render active filters based on current input values
  renderActiveFilters();
  
  console.log(`Result of applyFilters: filteredPhotos contains ${filteredPhotos.length} items.`);
  if (filteredPhotos.length > 0) {
    console.log("First filtered photo:", filteredPhotos[0]);
  }

  // Clear previous markers
  clearMarkers();
  
  // Add filtered markers to the cluster group
  addMarkersToClusterGroup(filteredPhotos);
  
  // Ensure markers are added to map
  if (markers && markers.getLayers().length > 0) {
    console.log(`Adding marker cluster group (${markers.getLayers().length} markers) to map`);
    map.addLayer(markers);
    
    // Force a map refresh
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }
  
  console.log("=== Map update completed ===");
}

// Filter photos based on date, tags, and country criteria
function applyFilters() {
  const startDate = filterDateStart.value; // YYYY-MM-DD
  const endDate = filterDateEnd.value;
  const tagsInput = filterTagsInput.value.toLowerCase();
  const selectedTags = tagsInput.split(',')
                        .map(t => t.trim())
                        .filter(t => t !== '');
  const selectedCountry = filterCountrySelect.value;

  console.log("Applying filters - Dates:", startDate, "-", endDate, 
              "Tags:", selectedTags, 
              "Country:", selectedCountry || "All");
  console.log("Total photos before filtering:", allPhotos.length);

  filteredPhotos = allPhotos.filter(photo => {
    // Enhanced date matching logic to handle partial dates
    let dateMatch = true;
    if (photo.date && typeof photo.date === 'string' && photo.date.match(/^\d{4}(-\d{2}(-\d{2})?)?$/)) {
      // Photo has a valid date (YYYY, YYYY-MM, or YYYY-MM-DD)
      
      // Check start date constraint
      if (startDate) {
        // If photo date is partial (YYYY or YYYY-MM), extend it for comparison
        const photoStartCompare = photo.date.padEnd(10, photo.date.length === 4 ? '-01-01' : '-01');
        
        if (photoStartCompare < startDate) {
          dateMatch = false;
        }
      }
      
      // Check end date constraint
      if (endDate && dateMatch) {
        // If photo date is partial, extend it to end of year/month for comparison
        let photoEndCompare = photo.date;
        if (photo.date.length === 4) {
          // Year only, extend to end of year (YYYY-12-31)
          photoEndCompare = `${photo.date}-12-31`;
        } else if (photo.date.length === 7) {
          // Year-month, extend to end of month (YYYY-MM-last_day)
          const year = parseInt(photo.date.substring(0, 4));
          const month = parseInt(photo.date.substring(5, 7));
          const lastDay = new Date(year, month, 0).getDate(); // Last day of the month
          photoEndCompare = `${photo.date}-${lastDay.toString().padStart(2, '0')}`;
        }
        
        if (photoEndCompare > endDate) {
          dateMatch = false;
        }
      }
    } else if (startDate || endDate) {
      // If filtering by date but photo has no valid date, exclude it
      dateMatch = false;
    }
    console.log(` -> Date Check: Start='${startDate}', End='${endDate}', PhotoDate='${photo.date}', Match=${dateMatch}`);

    let tagsMatch = true;
    if (selectedTags.length > 0) {
      if (!Array.isArray(photo.tags) || photo.tags.length === 0) {
        tagsMatch = false; // Photo has no tags, cannot match
      } else {
        // Check if ALL selected tags are present in the photo's tags
        tagsMatch = selectedTags.every(filterTag =>
          photo.tags.some(photoTag => 
            photoTag.toLowerCase().trim() === filterTag)
        );
      }
    }
    console.log(` -> Tag Check: Selected='${JSON.stringify(selectedTags)}', PhotoTags='${JSON.stringify(photo.tags)}', Match=${tagsMatch}`);

    // Country matching
    let countryMatch = true;
    if (selectedCountry !== "") {
      if (!photo.country || photo.country.toLowerCase().trim() !== selectedCountry.toLowerCase()) {
        countryMatch = false;
      }
    }
    console.log(` -> Country Check: Selected='${selectedCountry}', PhotoCountry='${photo.country}', Match=${countryMatch}`);

    const result = dateMatch && tagsMatch && countryMatch;
    console.log(` -> Overall Match: ${result}`);
    return result;
  });
  
  console.log("Filtered photos count:", filteredPhotos.length);
}

// Add markers to the cluster group based on provided photos
function addMarkersToClusterGroup(photosToShow) {
  console.log(`--- Running addMarkersToClusterGroup with ${photosToShow.length} photos ---`);
  if (!markers) { 
    console.error("ERROR: Cluster group 'markers' is not defined!"); 
    return; 
  }
  
  if (!photosToShow || photosToShow.length === 0) {
    console.warn("No photos to show, skipping marker creation");
    return;
  }
  
  allMapMarkers = []; // Reset the list of active markers
  const currentZoom = map.getZoom(); // Check zoom level for initial icons
  console.log("Current zoom level:", currentZoom);

  photosToShow.forEach((img, index) => {
    console.log(`Processing photo ${index + 1}: ${img.title || 'Untitled'}`);
    
    if (img.lat === undefined || img.lng === undefined) {
      console.warn(`  Skipping photo ${img.title || 'Untitled'} due to missing coordinates.`);
      return; // Skip photos without coords
    }
    
    console.log(`  Coordinates: [${img.lat}, ${img.lng}]`);
    
    // Determine initial icon
    const usePhotoIcon = currentZoom >= ZOOM_THRESHOLD;
    console.log(`  Icon type: ${usePhotoIcon ? 'Photo' : 'Simple'}`);
    
    try {
      // Determine initial icon
      const initialIcon = usePhotoIcon ? 
        createPhotoIcon(img.thumbnail) : simpleIcon;

      // Find the original index in allPhotos to link to photoswipeData
      const originalIndex = allPhotos.findIndex(p => p === img); // Find object reference match
      if (originalIndex === -1) {
          console.warn("Could not find original index for photo:", img.title);
          return; // Skip if we can't link it
      }

      const marker = L.marker([img.lat, img.lng], {
        icon: initialIcon,
        photoUrl: img.thumbnail, // Needed for icon switching & clustering
        photoRanking: img.ranking || 0,
        isPhotoIcon: usePhotoIcon,
        photoIndex: originalIndex, // Store original index in marker options
        photoTitle: img.title,
        photoDate: img.date,
        photoDescription: img.description
      });
      
      // Single click handler for all markers, with different behavior based on icon type
      marker.on('click', function(e) {
        // Stop event propagation to prevent cluster zoom behavior
        L.DomEvent.stopPropagation(e);
        
        const targetMarker = e.target;
        
        if (!targetMarker.options.isPhotoIcon) {
            // Simple icon - zoom in first, then open GLightbox after zoom completes
            console.log("Simple icon clicked, zooming in first...");
            map.flyTo(e.latlng, ZOOM_THRESHOLD, {
                duration: 0.5 // Shorter zoom duration
            }).once('moveend', function() {
                console.log("Zoom complete, now opening GLightbox...");
                openGLightboxForMarker(targetMarker);
            });
        } else {
            // Already photo icon, just open GLightbox directly
            console.log("Photo icon clicked, opening GLightbox directly...");
            openGLightboxForMarker(targetMarker);
        }
      });
      
      /* Comment out popup binding - using PhotoSwipe instead
      // Create Popup Content Dynamically
      var popupContent = `<strong>${img.title || 'Untitled'}</strong><br>` +
                        `<em>${img.date || ''}</em><br>` +
                        (img.thumbnail ? `<img src="img/${img.thumbnail}" alt="${img.title || ''}" style="max-width:100%; height:auto;"><br>` : '') +
                        (img.description || '');
      marker.bindPopup(popupContent);
      */

      // Add marker to cluster layer
      markers.addLayer(marker);
      
      allMapMarkers.push(marker); // Add to global list for zoom handling
      console.log(`  Marker created and added for ${img.title || 'Untitled'}`);
    } catch (markerError) {
      console.error(`  ERROR creating or adding marker for ${img.title || 'Untitled'}:`, markerError);
    }
  });
  
  console.log(`--- Finished adding ${allMapMarkers.length} markers ---`);
  // Check if markers were actually added to the cluster group
  try {
    console.log(`Marker layer count in cluster: ${markers.getLayers().length}`);
    // Note: We're not adding the cluster group to the map here anymore
    // That's now handled in updateMapMarkers()
  } catch (error) {
    console.error("Error checking marker count in cluster:", error);
  }
}

// Function to implement search filtering for country/trip lists
function addListSearchFilter(inputId, itemSelector) {
  const input = document.getElementById(inputId);
  // Ensure the container for items exists for querySelectorAll
  const listContainer = document.getElementById('locationList');
  if (!input || !listContainer) {
    console.warn(`Search input ${inputId} or item container not found for list filter.`);
    return;
  }

  input.addEventListener('input', () => {
    const filter = input.value.toLowerCase().trim();
    // Select items relative to the overall list container
    const items = listContainer.querySelectorAll(itemSelector);
    console.log(`Filtering ${items.length} items with filter '${filter}'`); // Debug
    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      if (text.includes(filter)) {
        item.style.display = ''; // Show item
      } else {
        item.style.display = 'none'; // Hide item
      }
    });
  });
}

// Display photos grouped by country
function displayGroupedByCountry(countries, countryCounts) {
  console.log("Displaying grouped by country");
  console.log('Countries found in filtered data:', countries);
  if (!locationList) return;
  
  // Add search input and container for list items
  locationList.innerHTML = `
    <input type="text" id="countrySearchInput" placeholder="Search countries..." style="width: 95%; margin-bottom: 5px;">
    <div id="countryListItems"></div>`;
  
  const listItemsContainer = document.getElementById('countryListItems');
  
  // If no countries found
  if (countries.length === 0) {
    listItemsContainer.innerHTML = '<p>No countries found in current filtered photos.</p>';
    return;
  }
  
  // Populate country list
  countries.forEach(country => {
    const count = countryCounts.get(country);
    const item = document.createElement('div');
    item.className = 'location-list-item country-item';
    item.textContent = `${country} (${count})`;
    item.dataset.country = country;
    item.style.cursor = 'pointer';
    item.style.padding = '3px';
    item.addEventListener('click', () => showMarkersForCountry(country));
    listItemsContainer.appendChild(item);
  });
  
  // Add search filter
  addListSearchFilter('countrySearchInput', '#countryListItems .country-item');
  
  // Initially show all filtered photos
  addMarkersToClusterGroup(filteredPhotos);
}

// Display photos grouped by trip
function displayGroupedByTrip(tripIds) {
  console.log("Displaying grouped by trip");
  if (!locationList || !tripSelector) return;
  
  // Add search input and container for list items
  locationList.innerHTML = `
    <input type="text" id="tripSearchInput" placeholder="Search trips..." style="width: 95%; margin-bottom: 5px;">
    <div id="tripListItems"></div>`;
  
  // Reset trip selector
  tripSelector.innerHTML = '<option value="">-- All Filtered Trips --</option>';
  
  const listItemsContainer = document.getElementById('tripListItems');
  
  // Ensure global 'availableTrips' array is loaded
  if (!Array.isArray(availableTrips) || availableTrips.length === 0) {
    console.warn("Global 'availableTrips' array not loaded or empty.");
    listItemsContainer.innerHTML = '<p>No trip data available.</p>';
    return;
  }
  
  // If no trips found
  if (tripIds.size === 0) {
    listItemsContainer.innerHTML = '<p>No trips found in current filtered photos.</p>';
    return;
  }
  
  // Populate trip list and selector
  availableTrips.forEach(trip => {
    if (tripIds.has(trip.id)) {
      // Add to dropdown
      const option = document.createElement('option');
      option.value = trip.id;
      option.textContent = `${trip.name} (${trip.dateRange || ''})`;
      tripSelector.appendChild(option);
      
      // Add to list
      const item = document.createElement('div');
      item.className = 'location-list-item trip-item';
      item.textContent = `${trip.name} (${trip.dateRange || ''})`;
      item.dataset.tripId = trip.id;
      item.style.cursor = 'pointer';
      item.style.padding = '3px';
      item.addEventListener('click', () => showMarkersForTrip(trip.id));
      listItemsContainer.appendChild(item);
    }
  });
  
  // Add search filter
  addListSearchFilter('tripSearchInput', '#tripListItems .trip-item');
  
  // Add change listener to dropdown
  tripSelector.onchange = () => showMarkersForTrip(tripSelector.value);
  
  // Initially show all filtered trips combined
  showMarkersForTrip('');
}

// Populate trip selector dropdown
function populateTripSelector(photosToShow) {
  if (!tripSelector) return;
  
  tripSelector.innerHTML = '<option value="">-- Select Trip --</option>'; // Reset
  const tripIds = new Set();
  
  photosToShow.forEach(p => { 
    if (p.tripId) tripIds.add(p.tripId); 
  });

  // Find trip names from the global 'availableTrips' array
  availableTrips.forEach(trip => {
    if (tripIds.has(trip.id)) { // Only add trips that are in the filtered photos
      const option = document.createElement('option');
      option.value = trip.id;
      option.textContent = `${trip.name} (${trip.dateRange || ''})`;
      tripSelector.appendChild(option);
    }
  });
}

// Add zoom event listener to switch icons based on zoom level
console.log("Adding zoom event listener...");
map.on('zoomend', function() {
  const currentZoom = map.getZoom();
  console.log(`--- ZoomEnd Event Fired: New Zoom = ${currentZoom}, Threshold = ${ZOOM_THRESHOLD} ---`);
  console.log(`Processing ${allMapMarkers.length} markers.`);
  
  // In our diagnostic mode without clustering, we'll check allMapMarkers directly
  allMapMarkers.forEach((marker, index) => {
    if (!marker.options) { console.warn(`Marker ${index} has no options!`); return; } // Safety check

    const needsPhotoIcon = currentZoom >= ZOOM_THRESHOLD;
    const currentlyIsPhotoIcon = marker.options.isPhotoIcon;
    const photoUrl = marker.options.photoUrl; // Get the needed URL

    // console.log(`Marker ${index}: needsPhoto=${needsPhotoIcon}, isPhoto=${currentlyIsPhotoIcon}, photoUrl=${photoUrl}`); // Optional verbose log

    // Only switch icon if needed
    if (needsPhotoIcon && !currentlyIsPhotoIcon) {
        console.log(`Marker ${index}: Switching TO photo icon. URL: ${photoUrl}`);
        if (!photoUrl) {
             console.warn(`Marker ${index}: Cannot switch to photo icon, photoUrl missing!`);
             return; // Skip if no URL
        }
        try {
             marker.setIcon(createPhotoIcon(photoUrl));
             marker.options.isPhotoIcon = true;
             console.log(`Marker ${index}: Switched to photo icon OK.`);
        } catch (e) {
             console.error(`Marker ${index}: ERROR setting photo icon:`, e);
        }
    } else if (!needsPhotoIcon && currentlyIsPhotoIcon) {
        console.log(`Marker ${index}: Switching TO simple icon.`);
        try {
             marker.setIcon(simpleIcon);
             marker.options.isPhotoIcon = false;
             console.log(`Marker ${index}: Switched to simple icon OK.`);
        } catch (e) {
             console.error(`Marker ${index}: ERROR setting simple icon:`, e);
        }
    }
  });
  console.log("--- ZoomEnd Event Finished ---");
});
console.log("Zoom event listener added");

// Tag autocomplete functionality
if (filterTagsInput && tagSuggestions) {
    filterTagsInput.addEventListener('input', () => {
        const inputText = filterTagsInput.value.toLowerCase();
        // Get the last tag being typed (after the last comma)
        const parts = inputText.split(',');
        const currentTag = parts[parts.length - 1].trim().toLowerCase();

        tagSuggestions.innerHTML = ''; // Clear old suggestions

        if (currentTag === '') {
            tagSuggestions.style.display = 'none';
            return;
        }

        const suggestions = [];
        uniqueTags.forEach(tag => {
            if (tag.startsWith(currentTag)) {
                suggestions.push(tag);
            }
        });

        if (suggestions.length > 0) {
            suggestions.slice(0, 10).forEach(tag => { // Limit suggestions
                const div = document.createElement('div');
                div.textContent = tag;
                div.addEventListener('click', () => {
                    // Replace the last part being typed with the selected tag
                    parts[parts.length - 1] = tag;
                    filterTagsInput.value = parts.map(p=>p.trim()).join(', ') + ', '; // Add comma/space for next tag
                    tagSuggestions.innerHTML = '';
                    tagSuggestions.style.display = 'none';
                    filterTagsInput.focus();
                });
                tagSuggestions.appendChild(div);
            });
            tagSuggestions.style.display = 'block';
        } else {
            tagSuggestions.style.display = 'none';
        }
    });

    // Hide suggestions when input loses focus (with a small delay)
    filterTagsInput.addEventListener('blur', () => {
        setTimeout(() => { tagSuggestions.style.display = 'none'; }, 150); // Delay allows click on suggestion
    });
}

// Event handlers for view and filter controls - Simplified
// Note: groupingRadios have been removed in a previous update, so this code is no longer needed

// Validate date input format (YYYY, YYYY-MM, or YYYY-MM-DD)
function validateDateInput(input) {
    const value = input.value.trim();
    
    // Empty value is valid (no filter)
    if (!value) return true;
    
    // Check against the three valid formats
    const yearRegex = /^\d{4}$/;  // YYYY
    const yearMonthRegex = /^\d{4}-\d{2}$/;  // YYYY-MM
    const fullDateRegex = /^\d{4}-\d{2}-\d{2}$/;  // YYYY-MM-DD
    
    if (yearRegex.test(value) || yearMonthRegex.test(value) || fullDateRegex.test(value)) {
        input.style.border = '1px solid #ccc'; // Reset border if valid
        return true;
    } else {
        // Invalid format - highlight the input
        input.style.border = '1px solid red';
        return false;
    }
}

// Add validation to date inputs
if (filterDateStart) {
    filterDateStart.addEventListener('blur', () => validateDateInput(filterDateStart));
}
if (filterDateEnd) {
    filterDateEnd.addEventListener('blur', () => validateDateInput(filterDateEnd));
}

// Filter buttons connected to update function
if (applyFiltersButton) {
    applyFiltersButton.addEventListener('click', () => {
        // Validate both date inputs before updating
        const startValid = validateDateInput(filterDateStart);
        const endValid = validateDateInput(filterDateEnd);
        
        if (startValid && endValid) {
            updateMapMarkers(); // Only update if date formats are valid
        } else {
            alert('Please enter dates in YYYY, YYYY-MM, or YYYY-MM-DD format.');
        }
    });
}

if (clearFiltersButton) {
    clearFiltersButton.addEventListener('click', () => {
        filterDateStart.value = '';
        filterDateEnd.value = '';
        filterTagsInput.value = '';
        filterCountrySelect.value = '';
        // Reset any validation styling
        filterDateStart.style.border = '1px solid #ccc';
        filterDateEnd.style.border = '1px solid #ccc';
        updateMapMarkers(); // Re-apply cleared filters and update active filters display
    });
}

// Helper function to create filter badges
function createFilterBadge(type, value, displayText) {
    const badge = document.createElement('span');
    badge.className = 'filter-badge';
    badge.textContent = displayText || value; // Show specific text if provided

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-filter';
    removeBtn.textContent = '×'; // Multiplication sign for 'x'
    removeBtn.dataset.filterType = type;
    if (value) { // Only add value dataset if needed (like for tags)
        removeBtn.dataset.filterValue = value;
    }

    badge.appendChild(removeBtn);
    return badge;
}

// Helper function to format date display based on the format
function getFormattedDateLabel(dateStr) {
    if (!dateStr) return '';
    
    // For year only (YYYY)
    if (dateStr.match(/^\d{4}$/)) {
        return `Year: ${dateStr}`;
    }
    // For year-month (YYYY-MM)
    else if (dateStr.match(/^\d{4}-\d{2}$/)) {
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(5, 7);
        // Convert numeric month to name
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = monthNames[parseInt(month) - 1];
        return `${monthName} ${year}`;
    }
    // For full date (YYYY-MM-DD)
    else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Format as a more readable date
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(5, 7);
        const day = dateStr.substring(8, 10);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = monthNames[parseInt(month) - 1];
        return `${monthName} ${parseInt(day)}, ${year}`;
    }
    
    // Fallback for any other format
    return dateStr;
}

// Render active filters as badges
function renderActiveFilters() {
    const listContainer = document.getElementById('activeFiltersList');
    if (!listContainer) return;
    listContainer.innerHTML = ''; // Clear current badges

    const startDate = document.getElementById('filterDateStart').value.trim();
    const endDate = document.getElementById('filterDateEnd').value.trim();
    const tagsInput = document.getElementById('filterTagsInput').value;
    const selectedCountry = document.getElementById('filterCountrySelect').value;
    const selectedTags = tagsInput.split(',')
                              .map(t => t.trim())
                              .filter(t => t !== '');
    let hasFilters = false;

    // Date Start Badge - simplified text
    if (startDate) {
        listContainer.appendChild(createFilterBadge('dateStart', startDate, startDate));
        hasFilters = true;
    }
    
    // Date End Badge - simplified text
    if (endDate) {
        listContainer.appendChild(createFilterBadge('dateEnd', endDate, endDate));
        hasFilters = true;
    }
    
    // Tag Badges - simplified text
    selectedTags.forEach(tag => {
        if(tag) { // Ensure tag is not empty after trimming etc.
            listContainer.appendChild(createFilterBadge('tag', tag, tag));
            hasFilters = true;
        }
    });

    // Country Badge
    if (selectedCountry) {
        listContainer.appendChild(createFilterBadge('country', selectedCountry, selectedCountry));
        hasFilters = true;
    }

    // "None" message if no filters applied
    if (!hasFilters) {
        const noneSpan = document.createElement('span');
        noneSpan.className = 'no-filters';
        noneSpan.textContent = 'None';
        listContainer.appendChild(noneSpan);
    }
}

// Add event listener for removing filters
const activeFiltersList = document.getElementById('activeFiltersList');
if (activeFiltersList) {
    activeFiltersList.addEventListener('click', (event) => {
        if (event.target.classList.contains('remove-filter')) {
            const button = event.target;
            const type = button.dataset.filterType;
            const value = button.dataset.filterValue; // Only present for tags

            console.log(`Removing filter - Type: ${type}, Value: ${value}`);

            if (type === 'dateStart') {
                document.getElementById('filterDateStart').value = '';
            } else if (type === 'dateEnd') {
                document.getElementById('filterDateEnd').value = '';
            } else if (type === 'tag' && value) {
                const tagsInput = document.getElementById('filterTagsInput');
                let currentTags = tagsInput.value.split(',')
                                     .map(t => t.trim())
                                     .filter(t => t !== '');
                // Filter out the tag to be removed (case-insensitive compare)
                currentTags = currentTags.filter(tag => tag.toLowerCase() !== value.toLowerCase());
                tagsInput.value = currentTags.join(', '); // Join back
            } else if (type === 'country') {
                document.getElementById('filterCountrySelect').value = '';
            }

            // Re-apply filters and update map/badges
            updateMapMarkers();
        }
    });
}

// Show markers for a specific country
function showMarkersForCountry(countryName) {
    selectedCountry = countryName; // Set selected country
    console.log(`Showing markers for country: ${countryName}`);
    console.log('Filtering photos for country:', countryName);
    clearMapDisplay(); // Clear previous markers/clusters/lists etc.

    const countryPhotos = filteredPhotos.filter(p => p.country === countryName);
    console.log('Photos found for this country:', countryPhotos);
    console.log('Filtered photos for this country:', JSON.stringify(countryPhotos));
    if (countryPhotos.length === 0) {
        console.log("No photos found for this country in the current filter.");
        map.setView([20,0], 2); // Reset view
        return;
    }

    const bounds = L.latLngBounds();
    const currentZoom = map.getZoom();

    countryPhotos.forEach(img => {
        if (img.lat === undefined || img.lng === undefined) {
            console.log(`Missing coordinates for photo: ${img.title || 'Untitled'}`);
            return;
        }
        
        console.log(` Attempting to add marker for ${img.title || 'Untitled'} at [${img.lat}, ${img.lng}]`);
        
        try {
            const icon = currentZoom >= ZOOM_THRESHOLD ? 
                createPhotoIcon(img.thumbnail) : simpleIcon;
            
            const isPhotoIcon = currentZoom >= ZOOM_THRESHOLD;
            const marker = L.marker([img.lat, img.lng], { 
                icon: icon, 
                photoUrl: img.thumbnail,
                photoRanking: img.ranking || 0,
                isPhotoIcon: isPhotoIcon,
                photoTitle: img.title,
                photoDate: img.date,
                photoDescription: img.description
            });
            
            // Single click handler for all markers, with different behavior based on icon type
            marker.on('click', function(e) {
                // Stop event propagation to prevent cluster zoom behavior
                L.DomEvent.stopPropagation(e);
                
                const targetMarker = e.target;
                
                if (!targetMarker.options.isPhotoIcon) {
                    // Simple icon - zoom in first, then open GLightbox after zoom completes
                    console.log("Simple icon clicked in country view, zooming in first...");
                    map.flyTo(e.latlng, ZOOM_THRESHOLD, {
                        duration: 0.5 // Shorter zoom duration
                    }).once('moveend', function() {
                        console.log("Zoom complete, now opening GLightbox from country view...");
                        openGLightboxForMarker(targetMarker);
                    });
                } else {
                    // Already photo icon, just open GLightbox directly
                    console.log("Photo icon clicked in country view, opening GLightbox directly...");
                    openGLightboxForMarker(targetMarker);
                }
            });
            
            // No popup binding - using PhotoSwipe for images
            
            marker.addTo(map); // Add directly to map
            currentlyDisplayedMarkers.push(marker); // Track it
            bounds.extend([img.lat, img.lng]);
            console.log(` Successfully added marker for ${img.title || 'Untitled'}`);
        } catch (error) {
            console.error(`Error adding marker for ${img.title || 'Untitled'}:`, error);
        }
    });

    console.log('Calculated bounds:', bounds, 'Is valid:', bounds.isValid());
    if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [100, 100], maxZoom: 10 }); // Increased padding and zoom to fit markers
    }
    
    // Update active filters to show selected country
    renderActiveFilters();
}


// Show markers for a specific trip or all trips
function showMarkersForTrip(tripId) {
    selectedCountry = null; // Clear selected country when showing trips
    console.log(`Showing markers for trip: ${tripId || 'ALL (filtered)'}`); 
    clearMapDisplay(); // Clear previous state

    let tripPhotos;
    if (tripId === "") {
        // Show all photos that belong to ANY trip in the filtered set
        const uniqueTripIds = new Set();
        filteredPhotos.forEach(p => { if (p.tripId) uniqueTripIds.add(p.tripId); });
        tripPhotos = filteredPhotos.filter(p => uniqueTripIds.has(p.tripId));
        // Re-populate selector to ensure it reflects the currently active trips
        populateTripSelector(tripPhotos);
        document.getElementById('tripSelector').value = ""; // Ensure dropdown shows default
    } else {
        // Show photos for a SPECIFIC trip
        tripPhotos = filteredPhotos.filter(p => p.tripId === tripId);
        // Ensure dropdown reflects selection if list item was clicked
        document.getElementById('tripSelector').value = tripId;
    }

    if (tripPhotos.length === 0) {
        console.log("No photos found for this trip selection in the current filter.");
        map.setView([20,0], 2); // Reset view
        return;
    }

    const bounds = L.latLngBounds();
    const currentZoom = map.getZoom();

    // Sort photos by date within the trip (optional)
    tripPhotos.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    tripPhotos.forEach(img => {
        if (img.lat === undefined || img.lng === undefined) return;
        
        const isPhotoIcon = currentZoom >= ZOOM_THRESHOLD;
        const icon = isPhotoIcon ? createPhotoIcon(img.thumbnail) : simpleIcon;
        
        const marker = L.marker([img.lat, img.lng], { 
            icon: icon, 
            photoUrl: img.thumbnail,
            photoRanking: img.ranking || 0,
            isPhotoIcon: isPhotoIcon,
            photoTitle: img.title,
            photoDate: img.date,
            photoDescription: img.description
        });
        
        // Single click handler for all markers, with different behavior based on icon type
        marker.on('click', function(e) {
            // Stop event propagation to prevent cluster zoom behavior
            L.DomEvent.stopPropagation(e);
            
            const targetMarker = e.target;
            
            if (!targetMarker.options.isPhotoIcon) {
                // Simple icon - zoom in first, then open GLightbox after zoom completes
                console.log("Simple icon clicked in trip view, zooming in first...");
                map.flyTo(e.latlng, ZOOM_THRESHOLD, {
                    duration: 0.5 // Shorter zoom duration
                }).once('moveend', function() {
                    console.log("Zoom complete, now opening GLightbox from trip view...");
                    openGLightboxForMarker(targetMarker);
                });
            } else {
                // Already photo icon, just open GLightbox directly
                console.log("Photo icon clicked in trip view, opening GLightbox directly...");
                openGLightboxForMarker(targetMarker);
            }
        });
        
        // No popup binding - using PhotoSwipe for images
        
        marker.addTo(map);
        currentlyDisplayedMarkers.push(marker);
        bounds.extend([img.lat, img.lng]);
    });

    // Future: Draw trip polyline
    // drawTripPolyline(tripId, tripPhotos);

    if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [100, 100], maxZoom: 12 }); // Increased padding for better visibility
    }
    
    // Update active filters to show selected trip
    renderActiveFilters();
}

// Function to populate the country filter dropdown
function populateCountryFilter(countries) {
    const select = document.getElementById('filterCountrySelect');
    if (!select) return;
    
    // Clear existing options (keep the first "All Countries" option)
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    // Add new options
    countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        select.appendChild(option);
    });
    
    console.log(`Populated country dropdown with ${countries.length} countries`);
}

// Add country filter change handler
if (filterCountrySelect) {
    filterCountrySelect.addEventListener('change', () => {
        // Optional: Auto-apply when country changes
        // Uncomment if you want immediate filtering on country change
        // updateMapMarkers();
    });
}

// Helper function to open GLightbox for a marker
function openGLightboxForMarker(markerInstance) {
  const clickedPhotoIndex = markerInstance.options.photoIndex;
  
  console.log(`--- Preparing GLightbox ---`);
  console.log(`Clicked Photo Index: ${clickedPhotoIndex}`);
  
  // Ensure GLightbox library is loaded
  if (typeof GLightbox === 'undefined') {
    console.error("GLightbox is not loaded!");
    alert("Error: Photo gallery library failed to load.");
    return;
  }
  
  // Get the data for the clicked photo from the master array
  if (clickedPhotoIndex === undefined || clickedPhotoIndex < 0 || clickedPhotoIndex >= allPhotos.length) {
    console.error("Invalid photo index:", clickedPhotoIndex);
    alert("Error retrieving photo data.");
    return;
  }
  
  const clickedPhotoData = allPhotos[clickedPhotoIndex];
  
  // Use the buildAndOpenLightbox helper function with 'trip' as the default context
  buildAndOpenLightbox(clickedPhotoData, 'trip');
}

// Helper function to build and open a contextual lightbox
function buildAndOpenLightbox(clickedPhoto, initialContext = 'trip') {
  let currentContext = initialContext;
  let galleryPhotos = [];
  let contextDescription = ""; // Description for the gallery title/UI
  
  // Function to filter and sort photos for a given context
  function getContextPhotos(contextType) {
    let photosInContext = [];
    let contextValue = null;
    contextDescription = "";
    
    if (contextType === 'trip') {
      contextValue = clickedPhoto.tripId;
      if (contextValue) { // If photo has a tripId
        photosInContext = allPhotos.filter(p => p.tripId === contextValue);
        const tripInfo = availableTrips.find(t => t.id === contextValue);
        contextDescription = `Trip: ${tripInfo ? tripInfo.name : contextValue}`;
      } else {
        // Fallback to country if no tripId
        console.log("No tripId found, falling back to country context.");
        return getContextPhotos('country'); // Recursive call for fallback
      }
    } else { // contextType === 'country'
      contextValue = clickedPhoto.country;
      if (contextValue) { // If photo has a country
        photosInContext = allPhotos.filter(p => p.country === contextValue);
        contextDescription = `Country: ${contextValue}`;
      } else {
        // If no country either, just show the single photo
        console.log("No country or trip found, showing single photo.");
        photosInContext = [clickedPhoto];
        contextDescription = "Single Photo";
      }
    }
    
    // Sort by date
    photosInContext.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    return photosInContext;
  }
  
  // Get initial photos based on default context
  galleryPhotos = getContextPhotos(currentContext);
  
  // If fallback resulted in single photo and initial context was trip, set context to country
  if (galleryPhotos.length === 1 && galleryPhotos[0] === clickedPhoto && initialContext === 'trip' && clickedPhoto.country) {
    currentContext = 'country';
    galleryPhotos = getContextPhotos(currentContext);
  }
  
  // Map to GLightbox format
  const galleryElements = galleryPhotos.map(p => {
    const fullImageUrl = `img/${p.imageFull || p.thumbnail}`;
    let description = `<strong>${p.title || 'Untitled'}</strong>`;
    
    if (p.date) description += ` (${p.date})`;
    
    // Add the *other* context info
    if (currentContext === 'trip' && p.country) {
      description += `<br><em>Country: ${p.country}</em>`;
    }
    
    if (currentContext === 'country' && p.tripId) {
      const tripInfo = availableTrips.find(t => t.id === p.tripId);
      if (tripInfo) description += `<br><em>Trip: ${tripInfo.name}</em>`;
    }
    
    if (p.description) description += `<br>${p.description}`;
    
    return {
      'href': fullImageUrl,
      'type': 'image',
      'title': p.title || 'Untitled',
      'description': description,
      'alt': p.description || (p.title || 'Untitled'),
      // Store original photo object reference for potential toggle later
      'photoData': p
    };
  });
  
  if (galleryElements.length === 0) {
    console.error("No photos found for the context:", currentContext);
    alert("No photos found in this context.");
    return;
  }
  
  // Find the index of the originally clicked photo in the new gallery list
  const startIndex = galleryElements.findIndex(el => el.photoData === clickedPhoto); // Compare object reference
  
  if (startIndex === -1) {
    console.error("Clicked photo not found in its own context gallery! This shouldn't happen.");
    return;
  }
  
  // Initialize GLightbox
  const lightboxOptions = {
    elements: galleryElements,
    startAt: startIndex,
    loop: true, // Loop within the context
    touchNavigation: true,
    keyboardNavigation: true,
    openEffect: 'zoom',
    closeEffect: 'fade'
  };
  
  console.log(`Initializing GLightbox (${contextDescription}) with ${galleryElements.length} elements, starting at ${startIndex}`);
  
  try {
    const lightbox = GLightbox(lightboxOptions);
    lightbox.open();
    console.log("GLightbox open() called successfully");
    
    // Show a temporary notification about the context
    showNotification(`Showing photos from ${contextDescription}`, 'info');
  } catch (initError) {
    console.error("ERROR initializing or opening GLightbox:", initError);
    alert(`Gallery Error: ${initError.message}`);
  }
}

// Helper function to show a temporary notification
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `map-notification ${type}`;
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
      document.body.removeChild(notification);
    }, 500);
  }, 3000);
}

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM fully loaded, ensuring map is initialized...");
  
  setTimeout(() => {
    // Force map to recalculate its container size
    if (map) {
      console.log("Refreshing map view...");
      map.invalidateSize();
      console.log("Map refreshed");
    }
  }, 500);
});
