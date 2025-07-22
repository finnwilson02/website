// photography.js - Combined Globe and Map View Controller

/**
 * Photography page controller with toggle functionality
 * Manages both globe and map views in a single interface
 */

// Global state
let globeInitialized = false;
let mapInitialized = false;
let currentView = 'globe'; // Start with globe view
let isGlobeInit = false; // Additional flag for globe initialization status
let isGlobeInitialized = false; // Main flag for lazy initialization

/**
 * Initializes the photography page with toggle functionality
 * Called when DOM is ready
 */
function initPhotography() {
    console.log("Initializing photography page...");
    
    // Set up toggle event listeners
    setupToggleListeners();
    
    // Don't initialize globe immediately - do it lazily when first shown
    // Just ensure the globe container is visible since it's the default view
    const globeContainer = document.getElementById('globeContainer');
    const mapContainer = document.getElementById('mapContainer');
    
    if (globeContainer) {
        globeContainer.style.display = 'block';
    }
    if (mapContainer) {
        mapContainer.style.display = 'none';
    }
    
    // Hide map controls initially since globe is active
    const mapControls = document.getElementById('mapControls');
    if (mapControls) {
        mapControls.style.display = 'none';
    }
    
    console.log("Photography page initialized (globe deferred for lazy loading)");
    
    // Since globe is the default view, initialize it after a short delay
    // This gives time for all libraries to load properly
    setTimeout(() => {
        if (currentView === 'globe' && !isGlobeInitialized) {
            console.log("Auto-initializing globe as default view...");
            initGlobeView();
            isGlobeInitialized = true;
        }
    }, 500);
}

/**
 * Sets up event listeners for the view toggle buttons
 */
function setupToggleListeners() {
    const globeToggle = document.getElementById('globeToggle');
    const mapToggle = document.getElementById('mapToggle');
    
    if (globeToggle) {
        globeToggle.addEventListener('click', () => {
            if (currentView !== 'globe') {
                showGlobe();
                toggleActive('globe');
            }
        });
    }
    
    if (mapToggle) {
        mapToggle.addEventListener('click', () => {
            if (currentView !== 'map') {
                showMap();
                toggleActive('map');
            }
        });
    }
    
    console.log("Toggle listeners set up");
}

/**
 * Shows the globe view and hides the map view
 */
function showGlobe() {
    console.log("Switching to globe view...");
    
    let globeContainer = document.getElementById('globeContainer');
    const mapContainer = document.getElementById('mapContainer');
    const mapControls = document.getElementById('mapControls');
    
    // Ensure globe container exists, create if necessary
    if (!globeContainer) {
        console.log("Globe container not found, creating dynamically...");
        globeContainer = document.createElement('div');
        globeContainer.id = 'globeContainer';
        globeContainer.style.height = 'calc(100vh - 120px)';
        globeContainer.style.width = '100%';
        
        // Create cesium container inside
        const cesiumDiv = document.createElement('div');
        cesiumDiv.id = 'cesiumContainer';
        cesiumDiv.style.width = '100%';
        cesiumDiv.style.height = '100%';
        globeContainer.appendChild(cesiumDiv);
        
        // Insert after map controls or at the beginning of body
        const insertAfter = mapControls || document.body.firstChild;
        if (insertAfter && insertAfter.parentNode) {
            insertAfter.parentNode.insertBefore(globeContainer, insertAfter.nextSibling);
        } else {
            document.body.appendChild(globeContainer);
        }
    }
    
    if (globeContainer) {
        globeContainer.style.display = 'block';
    }
    if (mapContainer) {
        mapContainer.style.display = 'none';
    }
    if (mapControls) {
        mapControls.style.display = 'none';
    }
    
    // Lazy initialize globe only when first shown
    if (!isGlobeInitialized) {
        console.log("Lazy initializing globe for first time...");
        initGlobeView();
        isGlobeInitialized = true;
    }
    
    currentView = 'globe';
    console.log("Switched to globe view");
}

/**
 * Shows the map view and hides the globe view
 */
function showMap() {
    console.log("Switching to map view...");
    
    const globeContainer = document.getElementById('globeContainer');
    const mapContainer = document.getElementById('mapContainer');
    const mapControls = document.getElementById('mapControls');
    
    if (globeContainer) {
        globeContainer.style.display = 'none';
    }
    if (mapContainer) {
        mapContainer.style.display = 'block';
    }
    if (mapControls) {
        mapControls.style.display = 'flex';
    }
    
    // Initialize map if not already done
    if (!mapInitialized) {
        initMapView();
    } else {
        // If map exists, refresh it to handle container size changes
        setTimeout(() => {
            if (typeof map !== 'undefined' && map) {
                map.invalidateSize();
            }
        }, 100);
    }
    
    currentView = 'map';
    console.log("Switched to map view");
}

/**
 * Toggles the active state of toggle buttons
 * @param {string} view - Either 'globe' or 'map'
 */
function toggleActive(view) {
    const globeToggle = document.getElementById('globeToggle');
    const mapToggle = document.getElementById('mapToggle');
    
    // Remove active class from both
    if (globeToggle) globeToggle.classList.remove('active');
    if (mapToggle) mapToggle.classList.remove('active');
    
    // Add active class to selected view
    if (view === 'globe' && globeToggle) {
        globeToggle.classList.add('active');
    } else if (view === 'map' && mapToggle) {
        mapToggle.classList.add('active');
    }
    
    console.log(`Active toggle set to: ${view}`);
}

/**
 * Initializes the globe view in the globe container
 * Lazy loads the globe to avoid performance issues
 */
function initGlobeView() {
    if (isGlobeInit || isGlobeInitialized) {
        console.log("Globe already initialized");
        return;
    }
    
    console.log("Initializing globe view...");
    
    // Check if Cesium is available
    if (typeof Cesium === 'undefined') {
        console.error("Cesium library not loaded");
        showGlobeError("Cesium library not loaded. Please refresh the page.");
        return;
    }
    
    // Ensure globeContainer exists
    const globeContainer = document.getElementById('globeContainer');
    if (!globeContainer) {
        console.error("Globe container not found");
        showGlobeError("Globe container not found. Please refresh the page.");
        return;
    }
    
    // Ensure cesiumContainer exists in globeContainer
    let cesiumContainer = document.getElementById('cesiumContainer');
    
    if (!cesiumContainer) {
        // Create cesiumContainer inside globeContainer
        const cesiumDiv = document.createElement('div');
        cesiumDiv.id = 'cesiumContainer';
        cesiumDiv.style.width = '100%';
        cesiumDiv.style.height = '100%';
        globeContainer.appendChild(cesiumDiv);
        console.log("Created cesiumContainer in globeContainer");
    }
    
    // Check if globe initialization function exists
    if (typeof initializeGlobeViewer === 'function') {
        // Initialize the globe viewer
        initializeGlobeViewer()
            .then(() => {
                isGlobeInit = true;
                globeInitialized = true;
                console.log("Globe view initialized successfully");
            })
            .catch(error => {
                console.error("Failed to initialize globe view:", error);
                showGlobeError(`Failed to initialize globe: ${error.message}`);
            });
    } else {
        console.error("Globe initialization function not found");
        showGlobeError("Globe initialization function not found. Please ensure globe.js is loaded.");
    }
}

/**
 * Shows an error message in the globe container
 * @param {string} message - Error message to display
 */
function showGlobeError(message) {
    const globeContainer = document.getElementById('globeContainer');
    if (globeContainer) {
        globeContainer.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #dc3545;">
                <h3>Globe Initialization Error</h3>
                <p>${message}</p>
                <button onclick="location.reload()" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                    Reload Page
                </button>
            </div>
        `;
    }
}

/**
 * Initializes the map view in the map container
 * Lazy loads the map to avoid performance issues
 */
function initMapView() {
    if (mapInitialized) {
        console.log("Map already initialized");
        return;
    }
    
    console.log("Initializing map view...");
    
    // Check if Leaflet is available
    if (typeof L === 'undefined') {
        console.error("Leaflet library not loaded");
        return;
    }
    
    // The map should initialize automatically from worldmap.js
    // We just need to mark it as initialized and ensure it's properly sized
    setTimeout(() => {
        if (typeof map !== 'undefined' && map) {
            map.invalidateSize();
            mapInitialized = true;
            console.log("Map view initialized successfully");
        } else {
            console.error("Map object not found - ensure worldmap.js is loaded");
        }
    }, 500);
}

// Initialize photography page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on the photography page
    if (document.getElementById('viewToggle')) {
        console.log("Photography page detected, initializing...");
        // Add a small delay to ensure all scripts are loaded
        setTimeout(() => {
            initPhotography();
        }, 100);
    } else {
        console.log("Not a photography page, skipping photography.js initialization");
    }
});

// Export functions for external use if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initPhotography,
        showGlobe,
        showMap,
        toggleActive
    };
}