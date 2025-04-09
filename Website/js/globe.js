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
        console.log("Initializing Cesium.Viewer...");
        const viewer = new Cesium.Viewer('cesiumContainer', {
            // --- Viewer Options ---
            
            // Let Cesium Viewer handle default terrain initialization
            // terrainProvider: Cesium.createWorldTerrain(), // Removed to fix initialization error
            
            // UI elements configuration
            animation: false, // Hide animation widget
            baseLayerPicker: true, // Show base layer picker
            fullscreenButton: false, // Hide fullscreen button
            vrButton: false, // Hide VR button
            geocoder: true, // Show geocoder search
            homeButton: true, // Show Home button
            infoBox: true, // Show InfoBox on click (needed later)
            sceneModePicker: true, // Allow switching between 3D, 2D, Columbus View
            selectionIndicator: true, // Show indicator when selecting entities
            timeline: false, // Hide timeline widget
            navigationHelpButton: false, // Hide navigation help button
            navigationInstructionsInitiallyVisible: false,
            
            // Improve rendering quality
            requestRenderMode: true, // Only render on change (saves resources)
            maximumRenderTimeChange: Infinity,
        });

        // Set default view to show a good view of the entire Earth
        viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(0, 20, 20000000),
            orientation: {
                heading: Cesium.Math.toRadians(0.0),
                pitch: Cesium.Math.toRadians(-45.0),
                roll: 0.0
            }
        });

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
    // Placeholder for Phase G.2 logic
    try {
        const response = await fetch('/api/data/images');
        if(!response.ok) throw new Error("Failed to fetch images for globe");
        const images = await response.json();
        console.log(`Found ${images.length} photos, filtering those with coordinates...`);
        
        // Filter images with valid coordinates
        const imagesWithCoords = images.filter(img => 
            img.lat !== undefined && img.lng !== undefined &&
            !isNaN(parseFloat(img.lat)) && !isNaN(parseFloat(img.lng))
        );
        
        console.log(`${imagesWithCoords.length} photos have valid coordinates for globe placement.`);
        // Phase G.2: Loop through images and call viewer.entities.add(...)
        // Will be implemented in the next phase
        
    } catch (error) {
        console.error("Error loading/placing globe markers:", error);
        showNotification(`Error loading photo locations: ${error.message}`, 'error');
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