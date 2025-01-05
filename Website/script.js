// TfL color map
const lineColors = {
    "Bakerloo": "#B36305",
    "Central": "#E32017",
    "Circle": "#FFD300",
    "District": "#00782A",
    "Hammersmith & City": "#F3A9BB",
    "Jubilee": "#A0A5A9",
    "Metropolitan": "#9B0056",
    "Northern": "#000000",
    "Piccadilly": "#003688",
    "Victoria": "#0098D4",
    "Waterloo & City": "#95CDBA"
};


/* selection dropdown setting*/
document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('line');
    Object.keys(lineColors).forEach(lineName => {
        const option = document.createElement('option');
        option.value = lineName.toLowerCase(); 
        option.textContent = lineName;
        option.style.color = "white";
        option.style.backgroundColor = lineColors[lineName];
        select.appendChild(option);
    });
});

document.getElementById('routeForm').onsubmit = function(event) {
    event.preventDefault();
    const selectedLine = document.getElementById('line').value;

    // encode the line name to avoid special characters
    const encodedLine = encodeURIComponent(selectedLine);  
    window.location.href = `line.html?line=${encodedLine}`;
};




const polylines = {};
const polyMarkers = {};
// Fetch and display all tube lines
async function fetchTubeLines() {
    const response = await fetch('https://api.tfl.gov.uk/Line/Mode/tube/Route?serviceTypes=Regular');
    const data = await response.json();

    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = '';  // Clear previous content

    data.forEach(line => {
        const div = document.createElement('div');
        div.classList.add('line-name');
        div.textContent = line.name;
        div.style.backgroundColor = lineColors[line.name] || "#666";

        // mouse linsterer
        // function handleMouseOver(event, line) {
        //     highlightLine(line.id);               
        //     // centerLineStations(line.id);           
        //    // largeMarker(line.id);                  
        //     // showTooltip(event, line);              
        // }
        // function handleMouseLeave(line) {
        //     resetHighlight();                      
        //     //dislargeMarker(line.id);               
        //     // hideTooltip();                        
        // }
        //console.log("line id:", line.id);
        //div.addEventListener('click', () => dislargeMarker(line.id));
        div.addEventListener('mouseover', () => highlightLine(line.id));
        div.addEventListener('mouseover', () => centerLineStations(line.id));
       // div.addEventListener('mousemove', moveTooltip);
        div.addEventListener('mouseleave', () => resetHighlight());
        div.addEventListener('mouseover', () => largeMarker(line.id));
        div.addEventListener('mouseleave', () => dislargeMarker(line.id));




        contentDiv.appendChild(div);

        // Fetch and draw the line
        fetchAndDrawLine(line.id, lineColors[line.name]);
       
    });
}

// Fetch station data and draw continuous line (polyline)
async function fetchAndDrawLine(lineId, color) {
    const response = await fetch(`https://api.tfl.gov.uk/Line/${lineId}/Route/Sequence/all`);
    const routeData = await response.json();

    const stopPointSequences = routeData.stopPointSequences;
    const mainLineSet = new Set();
    let allBranches = []; //store all branches of the line

    // iterate over all branches of the line
    stopPointSequences.forEach(sequence => {
        const branchCoordinates = sequence.stopPoint.map(station => {
            const coord = { lat: station.lat, lng: station.lon };
            mainLineSet.add(JSON.stringify(coord));
            return coord;
        });

        allBranches.push(branchCoordinates);
    });

    allBranches.forEach(branch => {
        let uniqueBranch = [];
        branch.forEach(coord => {
            if (!uniqueBranch.some(item => item.lat === coord.lat && item.lng === coord.lng)) {
                uniqueBranch.push(coord);
            }
        });

        const polyline = new google.maps.Polyline({
            path: uniqueBranch,
            geodesic: true,
            strokeColor: color,
            strokeOpacity: 0.5,
            strokeWeight: 1
        });

        polyline.setMap(map);

        if (!polylines[lineId]) {
            polylines[lineId] = [];
        }
        polylines[lineId].push(polyline);
    });

    // draw the markers for each station
    stopPointSequences.forEach(sequence => {
        sequence.stopPoint.forEach(station => {
            const latLng = new google.maps.LatLng(station.lat, station.lon);

            const marker = new google.maps.Marker({
                position: latLng,
                map: map,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 5,
                    fillColor: color,
                    fillOpacity: 0.8,
                    strokeWeight: 0.5,
                    strokeColor: "#000"
                },
                title: station.name
            });

            //init new array to store markers for each line
            if (!polyMarkers[lineId]) {
                polyMarkers[lineId] = [];
            }
            polyMarkers[lineId].push(marker);

            const infoWindow = new google.maps.InfoWindow({
                content: `<strong>${station.name}</strong><br>Latitude: ${station.lat}<br>Longitude: ${station.lon}`
            });

            marker.addListener('mouseover', () => {
                infoWindow.open(map, marker);
            });

            marker.addListener('mouseout', () => {
                infoWindow.close();
            });
        });
    });
}


// Show tooltip on mouseover (next to line name)
function showTooltip(event, line) {
    const tooltip = document.getElementById('tooltip');
    let origin = line.routeSections[0].originationName;
    let destination = line.routeSections[0].destinationName;

    origin = origin.replace(/ Underground Station/g, '');
    destination = destination.replace(/ Underground Station/g, '');

    tooltip.innerHTML = `From: ${origin}  <br> To: ${destination}`;
    tooltip.style.display = 'block';
}


// Update tooltip position
function moveTooltip(event) {
    const tooltip = document.getElementById('tooltip');
    tooltip.style.left = event.pageX + 15 + 'px';
    tooltip.style.top = event.pageY + 15 + 'px';
}

// Hide tooltip on mouse leave
function hideTooltip() {
    const tooltip = document.getElementById('tooltip');
    tooltip.style.display = 'none';
}

// get all markers and larger them by a given line
function largeMarker(lineId) {
    const markers = polyMarkers[lineId];
    markers.forEach(marker => {
        const currentIcon = marker.getIcon();
        marker.setIcon({
            ...currentIcon,
            scale: 13
        });
    });
}



function dislargeMarker(lineId){
    const markers = polyMarkers[lineId];
    markers.forEach(marker => {
        const currentIcon = marker.getIcon();
        marker.setIcon({
            ...currentIcon,
            scale: 5
        });
    });
}


// center the map on the stations of the selected line
function centerLineStations(lineId) {
    const markers = polyMarkers[lineId];
    const bounds = new google.maps.LatLngBounds();
    markers.forEach(marker => {
        bounds.extend(marker.getPosition());
    });

    map.fitBounds(bounds);
}

// highlight the selected line and de-highlight the others
function highlightLine(lineId) {
    for (const id in polylines) {
        polylines[id].forEach(polyline => {
            if (id === lineId) {
                polyline.setOptions({ strokeOpacity: 1, strokeWeight: 7 });  
            } else {
                polyline.setOptions({ strokeOpacity: 0.5, strokeWeight: 1 });
            }
        });
    }
}


// reset the line highlight
function resetHighlight() {
    for (const id in polylines) {
        polylines[id].setOptions({ strokeOpacity: 0.5, strokeWeight: 1 }); 
    }
}

let map;

// Initialize Google Map
function initMap() {
    const silverStyle = [
        {
            "elementType": "geometry",
            "stylers": [{"color": "#f5f5f5"}]
        },
        {
            "elementType": "labels.icon",
            "stylers": [{"visibility": "off"}]
        },
        {
            "elementType": "labels.text.fill",
            "stylers": [{"color": "#616161"}]
        },
        {
            "elementType": "labels.text.stroke",
            "stylers": [{"color": "#f5f5f5"}]
        },
        {
            "featureType": "administrative.land_parcel",
            "elementType": "labels.text.fill",
            "stylers": [{"color": "#bdbdbd"}]
        },
        {
            "featureType": "poi",
            "elementType": "geometry",
            "stylers": [{"color": "#eeeeee"}]
        },
        {
            "featureType": "poi",
            "elementType": "labels.text.fill",
            "stylers": [{"color": "#757575"}]
        },
        {
            "featureType": "poi.park",
            "elementType": "geometry",
            "stylers": [{"color": "#e5e5e5"}]
        },
        {
            "featureType": "poi.park",
            "elementType": "labels.text.fill",
            "stylers": [{"color": "#9e9e9e"}]
        },
        {
            "featureType": "road",
            "elementType": "geometry",
            "stylers": [{"color": "#ffffff"}]
        },
        {
            "featureType": "road.arterial",
            "elementType": "labels.text.fill",
            "stylers": [{"color": "#757575"}]
        },
        {
            "featureType": "road.highway",
            "elementType": "geometry",
            "stylers": [{"color": "#dadada"}]
        },
        {
            "featureType": "road.highway",
            "elementType": "labels.text.fill",
            "stylers": [{"color": "#616161"}]
        },
        {
            "featureType": "transit",
            "elementType": "geometry",
            "stylers": [{"color": "#e5e5e5"}]
        },
        {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [{"color": "#c9c9c9"}]
        },
        {
            "featureType": "water",
            "elementType": "labels.text.fill",
            "stylers": [{"color": "#9e9e9e"}]
        }
    ];
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 51.5074, lng: -0.1278 },  // London center
        zoom: 12,
        styles: silverStyle
    });

    // Fetch all tube lines and display them on the map
    fetchTubeLines();
}

// Execute the fetch function when the page loads
window.onload = function() {
    initMap();
};
