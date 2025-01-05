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
        function handleMouseOver(event, line) {
            highlightLine(line.id);               
            centerLineStations(line.id);           
            largeMarker(line.id);                  
            showTooltip(event, line);              
        }
        function handleMouseLeave(line) {
            resetHighlight();                      
            //dislargeMarker(line.id);               
            hideTooltip();                        
        }
        div.addEventListener('click', () => dislargeMarker(line.id));
        div.addEventListener('mouseover', (event) => handleMouseOver(event, line));
        div.addEventListener('mousemove', moveTooltip);
        div.addEventListener('mouseleave', () => handleMouseLeave(line));



        contentDiv.appendChild(div);

        // Fetch and draw the line
        fetchAndDrawLine(line.id, lineColors[line.name]);
    });
}

// Fetch station data and draw continuous line (polyline)
async function fetchAndDrawLine(lineId, color) {
    const response = await fetch(`https://api.tfl.gov.uk/Line/${lineId}/Route/Sequence/all`);
    const routeData = await response.json();

    const stations = routeData.stopPointSequences[0].stopPoint;
    const lineCoordinates = stations.map(station => {
        return { lat: station.lat, lng: station.lon };
    });

    const polyline = new google.maps.Polyline({
        path: lineCoordinates,
        geodesic: true,
        strokeColor: color,
        strokeOpacity: 0.5,  // transparency for the line
        strokeWeight: 5
    });

    // Draw the polyline on the map
    polyline.setMap(map);
    polylines[lineId] = polyline;

    //initial polymarker, if there is no marker for this line, create one
    if (!polyMarkers[lineId]){
        polyMarkers[lineId] = [];
    }
   
    // create the markers
    stations.forEach(station => {
        const latLng = new google.maps.LatLng(station.lat, station.lon);

        const marker = new google.maps.Marker({
            position: latLng,
            map: map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 7,
                fillColor: color,
                fillOpacity: 1,
                strokeWeight: 1,
                strokeColor: "#000"
            },
            title: station.name
        });

        marker.setMap(map);
        polyMarkers[lineId].push( marker);
      //  console.log(polyMarkers[lineId]);
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
            scale: 15
        });
    });
}


function dislargeMarker(lineId){
    const markers = polyMarkers[lineId];
    markers.forEach(marker => {
        const currentIcon = marker.getIcon();
        marker.setIcon({
            ...currentIcon,
            scale: 7
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
        if (id === lineId) {
            polylines[id].setOptions({ strokeOpacity: 1.0 });  
        } else {
            polylines[id].setOptions({ strokeOpacity: 0.1 }); 
        }
    }
}

// reset the line highlight
function resetHighlight() {
    for (const id in polylines) {
        polylines[id].setOptions({ strokeOpacity: 0.1 }); 
    }
}

let map;

// Initialize Google Map
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 51.5074, lng: -0.1278 },  // London center
        zoom: 12
    });

    // Fetch all tube lines and display them on the map
    fetchTubeLines();
}

// Execute the fetch function when the page loads
window.onload = function() {
    initMap();
};
