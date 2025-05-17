// globe.js - CesiumJS Globe Viewer Initialization

let gAllPhotos = [];  // global cache: populated once, reused forever
const photoKey = p => (p.imageFull || p.thumbnail).split('/').pop();

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
            infoBox: false, // Disable default InfoBox panel
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
            // Silently track tile loading progress
        });
        
        viewer.scene.renderError.addEventListener(function(scene, error) {
            console.error("CesiumJS Rendering Error:", error);
            // Handle severe errors potentially
        });

        console.log("Cesium Viewer initialized successfully using fetched token.");

        // Set up click handler for entities
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction(function(movement) {
            const pickedObject = viewer.scene.pick(movement.position);
            if (Cesium.defined(pickedObject) && Cesium.defined(pickedObject.id) && 
                pickedObject.id instanceof Cesium.Entity && pickedObject.id.properties?.photoData) {
                // We clicked one of our photo pin entities
                const clickedEntity = pickedObject.id;
                const clickedPhotoData = clickedEntity.properties.photoData.getValue(viewer.clock.currentTime); // Get data
                const clickedPhotoIndex = clickedEntity.properties.photoIndex.getValue(viewer.clock.currentTime); // Get index

                console.log(`Cesium Entity clicked: ${clickedEntity.name}, Index: ${clickedPhotoIndex}`);

                // --- Fly To Entity ---
                viewer.flyTo(clickedEntity, {
                    duration: 2.0, // Animation duration in seconds
                    offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-90), 1.5e4) // Look down from 1km away
                }).then(function(didFlightComplete) {
                    if (didFlightComplete) {
                        console.log("FlyTo complete, opening GLightbox...");
                        // --- Open GLightbox (Contextual Logic) ---
                        buildAndOpenLightbox(clickedPhotoData, 'trip'); // Use the helper function
                    } else {
                        console.warn("FlyTo was cancelled.");
                    }
                }).catch(function(error) {
                    console.error("Error during flyTo or GLightbox:", error);
                    // Attempt to open lightbox even if flyTo fails
                    buildAndOpenLightbox(clickedPhotoData, 'trip');
                });
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // Helper function to build and open GLightbox
        function buildAndOpenLightbox(clickedPhoto, initialContext = 'trip') {
            const photos = gAllPhotos;           // single source of truth
            if (!photos.length)
              throw new Error('gAllPhotos empty; ensure globe initialised first.');
              
            // Determine context (trip or country)
            const contextId = initialContext === 'trip' && clickedPhoto.tripId ? 
                clickedPhoto.tripId : clickedPhoto.country;
            const contextKey = initialContext === 'trip' && clickedPhoto.tripId ? 
                'tripId' : 'country';
                    
            // Helper function to get context photos with proper filtering and sorting
            function getContextPhotos(contextType) {
                // Filter photos by context
                const photosInContext = photos.filter(photo => photo[contextKey] === contextId);
                
                // Create a copy for sorting
                const sorted = [...photosInContext];
                
                // Sort by sortIndex (if available), fallback to date
                sorted.sort((a, b) => {
                    // Primary sort by sortIndex if both have it
                    if (a.sortIndex != null && b.sortIndex != null) {
                        return a.sortIndex - b.sortIndex;
                    }
                    
                    // Fallback to date sort when sortIndex not available
                    if (a.date && b.date) {
                        return new Date(a.date) - new Date(b.date);
                    } else if (a.date) {
                        return -1; // a has date, b doesn't - a comes first
                    } else if (b.date) {
                        return 1;  // b has date, a doesn't - b comes first
                    }
                    return 0;      // neither has date - keep order
                });
                
                return sorted;
            }
            
            // Debug: verify clicked photo has required properties
            console.log("Clicked photo data:", clickedPhoto?.title);
            
            // Get sorted gallery photos for the initial context
            const sortedGalleryPhotos = getContextPhotos(initialContext);
            
            // Log the sorted array to help with debugging
            console.log("Context photos after sorting:", sortedGalleryPhotos.map(p => p.title)); // Log titles in sorted order
            
            // Find the index of the clicked photo in the sorted array using stable key
            const startIndex = sortedGalleryPhotos.findIndex(
                p => photoKey(p) === photoKey(clickedPhoto)
            );
            
            if (startIndex === -1) {
                console.error(`CRITICAL: Clicked photo (title ${clickedPhoto?.title}) NOT FOUND in its own context gallery after sorting! Defaulting to 0.`, clickedPhoto, sortedGalleryPhotos);
                throw new Error('Clicked photo not found in sorted subset');
            }
            
            console.log(`Starting gallery at SORTED index ${startIndex} for clicked photo "${clickedPhoto?.title}" using key "${photoKey(clickedPhoto)}".`);
            
            // Map sortedGalleryPhotos to galleryElements for GLightbox
            const galleryElements = sortedGalleryPhotos.map((p, idx) => {
                // Determine filename, preferring imageFull, falling back to thumbnail
                const filenameToUse = p?.imageFull || p?.thumbnail;
                
                // Construct URL safely
                const fullImageUrl = filenameToUse ? `img/${filenameToUse}` : 'img/placeholder-cover.png'; // Use placeholder if no filename found
                
                // Log the details for the item corresponding to the initial click
                if (idx === startIndex) {
                    console.log(`Element for starting index ${startIndex}:`);
                    console.log(`  >> Href requesting: ${fullImageUrl}`);
                    console.log(`  >> Based on photo data:`, p); // Log the source photo object
                }
                
                return {
                    href: fullImageUrl, // This is the URL GLightbox will request
                    type: 'image',
                    title: p.title || '',
                    description: p.description || '',
                    alt: p.title || 'Photo'
                };
            });
            
            console.log(`--- Finished preparing ${galleryElements.length} elements ---`);
            
            if (galleryElements.length === 0) {
                console.error("No gallery elements created! Check filtering logic and data.");
                showNotification("Error: No photos found for this context", "error");
                return;
            }
            
            // Initialize GLightbox with the filtered gallery
            const lightbox = GLightbox({
                elements: galleryElements,
                startAt: Math.max(0, startIndex),
                loop: true
            });
            
            // Only keep the close listener
            lightbox.on('close', () => {
                console.log("GLightbox closed.");
            });
            
            // Open the lightbox
            lightbox.open();
            
            // Use the global tripsData variable instead of trips
            const contextDescription = contextKey === 'tripId' && clickedPhoto.tripId ? 
                `Trip "${tripsData.find(t => t.id === clickedPhoto.tripId)?.name || clickedPhoto.tripId}"` : 
                `Country "${clickedPhoto.country}"`;
            
            console.log(`Showing photos from ${contextDescription}`);
            showNotification(`Showing photos from ${contextDescription}`, 'info');
        }

        // Now that the viewer is ready, load the photo data
        loadAndPlaceGlobeMarkers(viewer); // Call function to add photo markers

    } catch (error) {
        console.error("Error initializing Cesium Viewer:", error);
        alert(`Failed to initialize 3D Globe Viewer: ${error.message}`);
        const container = document.getElementById('cesiumContainer');
        if(container) container.innerHTML = `<p style="color:red; padding: 20px;">Viewer Error: ${error.message}</p>`;
    }
}

// Global trips variable to be accessible from all functions
let tripsData = [];

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
        const photos = await response.json();
        if (!Array.isArray(photos)) throw new Error("Invalid image data format.");
        
        gAllPhotos = photos;  // cache photos globally
        
        console.log(`Processing ${photos.length} images for globe placement...`);
        let placedCount = 0;

        // Use PinBuilder for creating pin graphics
        const pinBuilder = new Cesium.PinBuilder();

        // Fetch trips data for descriptions if available
        try {
            const tripsResponse = await fetch('/api/data/trips');
            if (tripsResponse.ok) {
                tripsData = await tripsResponse.json(); // Store in global variable
                console.log(`Loaded ${tripsData.length} trips for reference.`);
            }
        } catch (tripError) {
            console.warn("Could not load trips data:", tripError);
        }

        // Sort photos by sortIndex before creating pins
        const sortedPhotos = [...photos].sort((a, b) => {
            // Primary sort by sortIndex if both have it
            if (a.sortIndex != null && b.sortIndex != null) {
                return a.sortIndex - b.sortIndex;
            }
            // Fallback to date
            if (a.date && b.date) {
                return new Date(a.date) - new Date(b.date);
            }
            return 0;
        });
        
        // Use Promise.all to handle async pin creation efficiently
        const entityPromises = sortedPhotos.map(async (photo, index) => {
            // Ensure lat/lng are numbers
            const lat = parseFloat(photo.lat);
            const lng = parseFloat(photo.lng);

            if (!isNaN(lat) && !isNaN(lng)) {
                try {
                    console.log(`Processing photo index ${index}, Title: ${photo?.title}`);
                    // Pass the photo's sortIndex (or index if not available) as the display order
                    const displayIndex = typeof photo.sortIndex === 'number' ? photo.sortIndex : index;
                    await createPhotoPinEntity(viewer, pinBuilder, photo, tripsData, displayIndex);
                    placedCount++;
                } catch (entityError) {
                    console.error(`Failed to create entity for ${photo.title || 'Untitled'}:`, entityError);
                }
            } else {
                console.warn(`Skipping photo "${photo.title || 'Untitled'}" due to invalid coordinates.`);
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
async function createPhotoPinEntity(viewer, pinBuilder, image, trips, idx) {
    const lat = parseFloat(image.lat);
    const lng = parseFloat(image.lng);
    // Position with height 0 initially, let heightReference handle terrain
    const position = Cesium.Cartesian3.fromDegrees(lng, lat, 0.0);

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
        const tripInfo = tripsData.find(t => t.id === image.tripId);
        if (tripInfo) descriptionHtml += `<p><em>Trip: ${tripInfo.name}</em></p>`;
    }
    // Add thumbnail to description if available
    if (thumbUrl) {
        descriptionHtml += `<p><img src="${thumbUrl}" alt="thumbnail" style="max-width: 200px; height: auto;"></p>`;
    }
    if (image.description) descriptionHtml += `<p>${image.description}</p>`;
    // No button needed since we open lightbox directly from entity click handler
    
    console.log(`Creating entity for: ${image.title || 'Untitled'}`);

    // Use local pin model
    try {
        console.log(` --> Attempting viewer.entities.add for ${image.title || 'Untitled'}`);
        viewer.entities.add({
            name: image.title || 'Photo Location', // Text on hover
            position: position,
            model: {
                uri: 'models/pin.glb',
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND, // Keep height reference
                
                // Overall base size multiplier
                scale: 500, // Base scale for close-up view
                
                // Dynamic scaling with distance - adjusted for better mid-range visibility
                scaleByDistance: new Cesium.NearFarScalar(
                    5.0e2,  // nearDistance: 500m
                    1.0,    // nearScale: Full base scale when closer
                    2.5e6,  // farDistance: 2500km - better for mid-range zoom
                    0.45    // farScale: Moderate shrinking to 45% when far
                ),
                
                // Absolute minimum screen size safety net
                minimumPixelSize: 32 // Smallest acceptable size in pixels
            },
            description: descriptionHtml, // Content for InfoBox on click
            properties: { // Store custom data for later access
                photoIndex: idx, // Link back to index in array
                photoData: image // Store the original image data object
            }
        });
        console.log(` --> Successfully called viewer.entities.add for ${image.title || 'Untitled'}`);
    } catch (addError) {
        console.error(` --> ERROR during viewer.entities.add for ${image.title || 'Untitled'}:`, addError);
    }
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