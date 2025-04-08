// worldmap.js

// initialize the map
var map = L.map('map').setView([20, 0], 2);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '&copy; openstreetmap contributors'
}).addTo(map);

// create marker cluster group with custom cluster icon
var markers = L.markerClusterGroup({
  iconCreateFunction: function(cluster) {
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
});

// load country boundaries geojson for clickable borders
fetch('data/countries.geojson')
  .then(function(res) { return res.json(); })
  .then(function(countryData) {
    L.geoJSON(countryData, {
      style: { color: '#3377cc', weight: 1, fillOpacity: 0.1 },
      onEachFeature: function(feature, layer) {
        layer.on('click', function() {
          map.fitBounds(layer.getBounds());
        });
      }
    }).addTo(map);
  });

// load images json and add markers with custom icons
fetch('data/images.json')
  .then(function(res) { return res.json(); })
  .then(function(images) {
    images.forEach(function(img) {
      // create a custom icon that looks like an iphone-style photo pin
      var customIcon = L.divIcon({
        html: '<img src="img/' + img.thumbnail + '" class="photo-pin" />',
        className: 'photo-marker',
        iconSize: [50, 50]
      });
      // add extra options for clustering
      var marker = L.marker([img.lat, img.lng], { 
         icon: customIcon,
         photoUrl: img.thumbnail,    // used in cluster stacking
         photoRanking: img.ranking || 0  // ranking weight; higher means on top
      });
      var popupContent = '<strong>' + img.title + '</strong><br>' +
                         '<em>' + img.date + '</em><br>' +
                         '<img src="img/' + img.thumbnail + '" alt="' + img.title + '" style="max-width:100%; height:auto;"><br>' +
                         img.description;
      marker.bindPopup(popupContent);
      markers.addLayer(marker);
    });
    map.addLayer(markers);
  });
