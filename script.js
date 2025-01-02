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

        div.addEventListener('mouseover', (event) => showTooltip(event, line));
        div.addEventListener('mousemove', moveTooltip);
        div.addEventListener('mouseleave', hideTooltip);

        contentDiv.appendChild(div);

        // Fetch and display stations for each line
        fetchStationData(line.id, lineColors[line.name]);
    });
}

// Fetch station data for each line
async function fetchStationData(lineId, color) {
    const response = await fetch(`https://api.tfl.gov.uk/Line/${lineId}/StopPoints`);
    const stations = await response.json();

    stations.forEach(station => {
        const latLng = new google.maps.LatLng(station.lat, station.lon);

        // Create a circular marker
        const marker = new google.maps.Marker({
            position: latLng,
            map: map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,  // Size of the circle
                fillColor: color,
                fillOpacity: 1,
                strokeWeight: 1,
                strokeColor: "#000"  // Border color of the circle
            },
            title: station.commonName
        });

        const infoWindow = new google.maps.InfoWindow({
            content: `<strong>${station.commonName}</strong><br>Latitude: ${station.lat}<br>Longitude: ${station.lon}`
        });

        marker.addListener('mouseover', () => {
            infoWindow.open(map, marker);
        });

        marker.addListener('mouseout', () => {
            infoWindow.close();
        });
    });
}

// Show tooltip on mouseover
function showTooltip(event, line) {
    const tooltip = document.getElementById('tooltip');
    let origin = line.routeSections[0].originationName;
    let destination = line.routeSections[0].destinationName;

    origin = origin.replace(/ Underground Station/g, '');
    destination = destination.replace(/ Underground Station/g, '');

    tooltip.innerHTML = `From: ${origin}  <br> To: ${destination}`;
    tooltip.style.display = 'block';
    tooltip.style.left = event.pageX + 15 + 'px';
    tooltip.style.top = event.pageY + 15 + 'px';
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
