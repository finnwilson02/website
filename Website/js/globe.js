// globe.js - CesiumJS Globe Viewer Initialization

// This is the main initialization function that fetches the Cesium token and initializes the viewer
async function initializeGlobeViewer() {
    console.log("Attempting to initialize globe viewer...");

    // --- Fetch Cesium Token from Backend ---
    let cesiumToken = null;
    try {
        console.log("Fetching Cesium token...");
        const response = await fetch('/api/config/cesium-token');
        if (!response.ok) {
            let errorMsg = `Failed to fetch token: ${response.status}`;
            try { 
                const err = await response.json(); 
                errorMsg += ` - ${err.error}`; 
            } catch(e) {}
            throw new Error(errorMsg);
        }
        const data = await response.json();
        if (!data.token) {
            throw new Error("Token not found in server response.");
        }
        cesiumToken = data.token;
        console.log("Cesium token fetched successfully.");

    } catch (error) {
        console.error("Error fetching Cesium token:", error);
        alert(`Failed to get configuration required for Globe Viewer: ${error.message}`);
        // Display error in container
        const container = document.getElementById('cesiumContainer');
        if(container) container.innerHTML = `<p style="color:red; padding: 20px;">Configuration Error: ${error.message}</p>`;
        return; // Stop initialization
    }

    // --- Set Token and Initialize Viewer ---
    Cesium.Ion.defaultAccessToken = cesiumToken;

    try {
        console.log("Initializing Cesium.Viewer with pickers ENABLED initially...");
        const viewer = new Cesium.Viewer('cesiumContainer', {
            // --- Let Viewer choose defaults & Ensure pickers initialize ---
            // No explicit imageryProvider or terrainProvider - use defaults
            
            // --- Enable Pickers during init ---
            baseLayerPicker: true, // Enable for proper initialization
            sceneModePicker: true, // Enable for proper initialization
            
            // --- UI elements configuration ---
            animation: false,
            fullscreenButton: false,
            vrButton: false,
            geocoder: true,
            homeButton: true,
            infoBox: true,
            selectionIndicator: true,
            timeline: false,
            navigationHelpButton: false,
            navigationInstructionsInitiallyVisible: false,
            
            // Improve rendering quality
            requestRenderMode: true,
            maximumRenderTimeChange: Infinity,
        });

        // Fly to home view immediately to ensure we start looking at the whole globe
        viewer.camera.flyHome(0);
        console.log("Cesium Viewer constructor finished.");
        
        // --- Hide Pickers Immediately After Init ---
        hideViewerWidgets(viewer); // Call helper function to hide them
        
        console.log("Cesium Viewer initialized successfully (pickers hidden post-init).");

        // --- Add event listeners for loading progress and errors ---
        viewer.scene.globe.tileLoadProgressEvent.addEventListener(function(numberOfPendingTiles) {
            if (numberOfPendingTiles === 0) {
                console.log("All base tiles loaded.");
            }
        });
        
        viewer.scene.renderError.addEventListener(function(scene, error) {
            console.error("CesiumJS Rendering Error:", error);
            // Handle severe errors potentially
        });

        console.log("Cesium Viewer initialized successfully using fetched token.");

        // Now that the viewer is ready, load the photo data
        loadAndPlaceGlobeMarkers(viewer); // Call function to add photo markers

    } catch (error) {
        console.error("Error initializing Cesium Viewer:", error);
        alert(`Failed to initialize 3D Globe Viewer: ${error.message}`);
        const container = document.getElementById('cesiumContainer');
        if(container) container.innerHTML = `<p style="color:red; padding: 20px;">Viewer Error: ${error.message}</p>`;
    }
}

// Function to load photo data and add entities to the globe
async function loadAndPlaceGlobeMarkers(viewer) {
    console.log("Loading photo data for globe...");
    if (!viewer) {
        console.error("Viewer not available for placing markers.");
        return;
    }

    try {
        const response = await fetch('/api/data/images');
        if (!response.ok) {
            let errorMsg = `Failed to fetch images: ${response.status}`;
            try { 
                const err = await response.json(); 
                errorMsg += ` - ${err.error}`; 
            } catch(e) {}
            throw new Error(errorMsg);
        }
        const images = await response.json();
        if (!Array.isArray(images)) throw new Error("Invalid image data format.");

        console.log(`Processing ${images.length} images for globe placement...`);
        let placedCount = 0;

        // Use PinBuilder for creating pin graphics
        const pinBuilder = new Cesium.PinBuilder();

        // Fetch trips data for descriptions if available
        let trips = [];
        try {
            const tripsResponse = await fetch('/api/data/trips');
            if (tripsResponse.ok) {
                trips = await tripsResponse.json();
                console.log(`Loaded ${trips.length} trips for reference.`);
            }
        } catch (tripError) {
            console.warn("Could not load trips data:", tripError);
        }

        // Use Promise.all to handle async pin creation efficiently
        const entityPromises = images.map(async (image, index) => {
            // Ensure lat/lng are numbers
            const lat = parseFloat(image.lat);
            const lng = parseFloat(image.lng);

            if (!isNaN(lat) && !isNaN(lng)) {
                // Add original index for linking back later
                image.originalIndex = index;
                try {
                    await createPhotoPinEntity(viewer, pinBuilder, image, trips);
                    placedCount++;
                } catch (entityError) {
                    console.error(`Failed to create entity for ${image.title || 'Untitled'}:`, entityError);
                }
            } else {
                console.warn(`Skipping photo "${image.title || 'Untitled'}" due to invalid coordinates.`);
            }
        });
        
        await Promise.all(entityPromises); // Wait for all entities to be processed
        console.log(`${placedCount} photo locations added to the globe.`);

    } catch (error) {
        console.error("Error loading or placing globe markers:", error);
        showNotification(`Error loading photo locations: ${error.message}`, 'error');
    }
}

// Create photo pin entities and add them to the globe
async function createPhotoPinEntity(viewer, pinBuilder, image, trips) {
    const lat = parseFloat(image.lat);
    const lng = parseFloat(image.lng);
    // Position slightly above ground - adjust height as needed
    const position = Cesium.Cartesian3.fromDegrees(lng, lat, 50.0);

    // --- Commenting out PinBuilder ---
    /*
    // Generate the pin graphic (returns a Promise)
    let pinUrl;
    try {
        // Create a blue pin with 'camera' icon
        pinUrl = await pinBuilder.fromMakiIconId('camera', Cesium.Color.DODGERBLUE, 48);
    } catch (pinError) {
        console.error("Error generating pin graphic:", pinError);
        // Fallback to a simple color pin if icon fails
        pinUrl = await pinBuilder.fromColor(Cesium.Color.ROYALBLUE, 48);
    }
    */

    // Prepare InfoBox description (HTML)
    const thumbUrl = image.thumbnail ? `img/${image.thumbnail}` : '';
    let descriptionHtml = `<h3>${image.title || 'Untitled'}</h3>`;
    if (image.date) descriptionHtml += `<p><em>Date: ${image.date}</em></p>`;
    if (image.country) descriptionHtml += `<p><em>Country: ${image.country}</em></p>`;
    if (image.tripId) {
        const tripInfo = trips.find(t => t.id === image.tripId);
        if (tripInfo) descriptionHtml += `<p><em>Trip: ${tripInfo.name}</em></p>`;
    }
    // Add thumbnail to description if available
    if (thumbUrl) {
        descriptionHtml += `<p><img src="${thumbUrl}" alt="thumbnail" style="max-width: 200px; height: auto;"></p>`;
    }
    if (image.description) descriptionHtml += `<p>${image.description}</p>`;
    // Add button placeholder for lightbox (Phase G.4)
    descriptionHtml += `<p><button type="button" class="cesium-infobox-lightbox-button" data-photo-index="${image.originalIndex}">View Full Size</button></p>`;

    // Use local pin model
    viewer.entities.add({
        name: image.title || 'Photo Location', // Text on hover
        position: position,
        model: {
            uri: 'models/pin.glb',
            minimumPixelSize: 32, // Adjust as needed for visibility
            maximumScale: 2000  // Adjust as needed to prevent getting too large
        },
        description: descriptionHtml, // Content for InfoBox on click
        properties: { // Store custom data for later access
            photoIndex: image.originalIndex, // Link back to allPhotos array index
            photoData: image // Store the original image data object
        }
    });
}

// Helper function to hide specific Cesium UI widgets via CSS class
function hideViewerWidgets(viewerInstance) {
    console.log("Attempting to hide picker widgets...");
    try {
        // Cesium adds classes to the container or creates specific elements.
        const container = viewerInstance.container;

        const layerPicker = container.querySelector('.cesium-baseLayerPicker-dropDown');
        if (layerPicker) {
             layerPicker.style.display = 'none';
             console.log("BaseLayerPicker dropdown hidden.");
        } else { console.warn("Could not find BaseLayerPicker element to hide."); }
        
        // Also hide the button itself which might be separate
        const layerPickerButton = container.querySelector('.cesium-viewer-toolbar .cesium-baseLayerPicker-selected');
        // Or sometimes just the button container directly:
        const layerPickerButtonContainer = container.querySelector('.cesium-baseLayerPicker-button');
        if (layerPickerButtonContainer) {
             layerPickerButtonContainer.style.display = 'none';
             console.log("BaseLayerPicker button hidden.");
        } else if (layerPickerButton) {
             layerPickerButton.style.display = 'none'; // Fallback if container class changes
             console.log("BaseLayerPicker selected button part hidden.");
        } else { console.warn("Could not find BaseLayerPicker button element to hide."); }

        const sceneModePicker = container.querySelector('.cesium-sceneModePicker-wrapper');
        if (sceneModePicker) {
            sceneModePicker.style.display = 'none';
            console.log("SceneModePicker hidden.");
        } else { console.warn("Could not find SceneModePicker element to hide."); }

    } catch(e) {
         console.error("Error trying to hide widgets:", e);
    }
}

// Helper function to show notifications
function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`); // Basic console fallback
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `globe-notification ${type}`;
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

// Call the main initialization function when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof Cesium !== 'undefined') {
        initializeGlobeViewer();
    } else {
        console.error("Cesium library not loaded before globe.js execution!");
        const container = document.getElementById('cesiumContainer');
        if(container) container.innerHTML = `<p style="color:red; padding: 20px;">Error: Cesium library not loaded properly.</p>`;
    }
});