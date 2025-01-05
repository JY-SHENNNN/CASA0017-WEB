// TfL color map
const lineColors = {
    "bakerloo": "#B36305",
    "central": "#E32017",
    "circle": "#FFD300",
    "district": "#00782A",
    "hammersmith-city": "#F3A9BB",
    "jubilee": "#A0A5A9",
    "metropolitan": "#9B0056",
    "northern": "#000000",
    "piccadilly": "#003688",
    "victoria": "#0098D4",
    "waterloo-city": "#95CDBA"
};

const lineNameFixes = {
    "hammersmith & city": "hammersmith-city",
    "waterloo & city": "waterloo-city"
};

let map;

// get the line id from the query string
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    let value = urlParams.get(param);
    return value;
}



// init the map
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
        center: { lat: 51.5074, lng: -0.1278 },  // center of London
        zoom: 13,
        styles: silverStyle  // apply silver style to the map
    });
}

async function fetchTubeStatus(lineId) {
    const response = await fetch(`https://api.tfl.gov.uk/Line/${lineId}/Status?detail=true`);
    const statusData = await response.json();
    
    let statusText = '';

    if (statusData.length > 0) {
        // response(.lineStatuses.statusSeverityDescription)
        statusData.forEach(line => {
            line.lineStatuses.forEach(status => {
                statusText += `<p>${line.name} Line Status: <br> ${status.statusSeverityDescription}</p>`;
            });
        });
    } 
    const statusInfo = document.getElementById('LineStatus');
    statusInfo.innerHTML = statusText;
    //console.log('statusData:', statusData);
}


const polylines = {};
const polyMarkers = {};
const stationMarkers = {};  
// Fetch station data and draw continuous line (polyline)
async function fetchAndDrawLine(lineId, color) {
    const response = await fetch(`https://api.tfl.gov.uk/Line/${lineId}/Route/Sequence/all`);
    const routeData = await response.json();

    const stopPointSequences = routeData.stopPointSequences;
    const mainLineSet = new Set();
    let allBranches = [];

    const fromSelect = document.getElementById('from');
    const toSelect = document.getElementById('to');

    // remove all options from the select elements
    fromSelect.innerHTML = `<option value="" disabled selected>Select start location</option>`;
    toSelect.innerHTML = `<option value="" disabled selected>Select destination</option>`;

    stopPointSequences.forEach(sequence => {
        const branchCoordinates = sequence.stopPoint.map(station => {
            const coord = { lat: station.lat, lng: station.lon };
            mainLineSet.add(JSON.stringify(coord));

            // create options for the select elements
            const stationName = station.name.replace(/Underground Station/g, '').trim();

            const option1 = document.createElement('option');
            option1.value = stationName;
            option1.textContent = stationName;

            const option2 = option1.cloneNode(true);

            fromSelect.appendChild(option1);
            toSelect.appendChild(option2);

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
            strokeOpacity: 0.8,
            strokeWeight: 7
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
            const stationName = station.name.replace(/Underground Station/g, '').trim();
            const marker = new google.maps.Marker({
                position: latLng,
                map: map,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 7,
                    fillColor: color,
                    fillOpacity: 0.8,
                    strokeWeight: 1,
                    strokeColor: "#000"
                },

                // label: {
                //     text: station.name
                //     .replace(/Underground Station/g, '')  // remove 'Underground Station'
                //     .split(' ') 
                //     .join('\n'),   // split the name by space
                //     color: '#333',
                //     fontSize: '15px',
                //     textbackgroundColor: '#f9f9f9',
                //     fontWeight: 'bold',
                //     className: 'vertical-label'
                // },
                title: station.name
            });

            stationMarkers[stationName] = marker;
        
            if (!polyMarkers[lineId]) {
                polyMarkers[lineId] = [];
            }
            polyMarkers[lineId].push(marker);
        });
    });
    bindHighlightEvent(fromSelect);
    bindHighlightEvent(toSelect);
}


async function getArrivalTime(naptanCode) {
    const response = await fetch(`https://api.tfl.gov.uk/StopPoint/${naptanCode}/Arrivals`);
    const arrivals = await response.json();
    //console.log("naptancode:", naptanCode);
    if (arrivals.length > 0) {
        const nextArrival = arrivals.reduce((earliest, current) => {
            return new Date(current.expectedArrival) < new Date(earliest.expectedArrival) ? current : earliest;
        });
        const arrivalTime = new Date(nextArrival.expectedArrival).toLocaleTimeString();
        return arrivalTime;
    }
}


document.getElementById('routeForm').onsubmit = async function(event) {
    event.preventDefault();
    const fromStation = document.getElementById('from').value;
    //const toStation = document.getElementById('to').value;

    const fromNaptanCode = await fetchNaptanCode(fromStation);
    console.log('fromNaptanCode:', fromNaptanCode);
    //const toNaptanCode = await fetchNaptanCode(toStation);

    const nextArrivalTime = await getArrivalTime(fromNaptanCode);
    // console.log('nextArrivalTime:', nextArrivalTime);
    // console.log('destinationArrivalTime:', destinationArrivalTime);
    const resultDiv = document.getElementById('timetable');
    resultDiv.innerHTML = `
        <p>Next train arrives at <strong>${fromStation}</strong> at: ${nextArrivalTime}</p>`;
}



async function fetchNaptanCode(stationName) {
    const response = await fetch(`https://api.tfl.gov.uk/StopPoint/Search/${stationName}`);
    const data = await response.json();
    console.log('data:', data);

    // fetch the naptan code of the matching station
    if (data.matches && data.matches.length > 0) {
        const naptanId = data.matches[0].id;
       // console.log(`Naptan ID for ${stationName}:`, naptanId);
        return naptanId;
    }

}

let fromNaptanCode = '';
let toNaptanCode = '';

// get the naptan code of the selected station
// document.getElementById('from').addEventListener('change', async (event) => {
//     const selectedStation = event.target.value;
//     const naptanCode = await fetchNaptanCode(selectedStation);
//     //console.log('naptanCode:', naptanCode);
//     return naptanCode;
    
// });

// document.getElementById('to').addEventListener('change', async (event) => {
//     const selectedStation = event.target.value;
//     const naptanCode = await fetchNaptanCode(selectedStation);
//     return naptanCode;
//     //console.log('naptanCode:', naptanCode);
// });



let currentHoveredMarker = null;  // store the name of the highlighted marker

function bindHighlightEvent(selectElement) {
    selectElement.addEventListener('mouseover', (event) => {
        const hoveredStation = event.target.value;
        if (currentHoveredMarker !== hoveredStation) {
            resetMarkerHighlight(); 
            highlightMarker(hoveredStation);  
        }
    });

    selectElement.addEventListener('mouseleave', () => {
        resetMarkerHighlight();
        currentHoveredMarker = null; 
    });
}

// hightlight the marker of the selected station
function highlightMarker(stationName) {
    if (stationMarkers[stationName]) {
        const marker = stationMarkers[stationName];
        marker.setIcon({
            path: google.maps.SymbolPath.CIRCLE,
            scale: 13,
            fillColor: marker.getIcon().fillColor,
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#333"
        });
        currentHoveredMarker = stationName;  // get the name of the highlighted marker
    }
}

// reset unselected markers to normal style
function resetMarkerHighlight() {
    Object.entries(stationMarkers).forEach(([stationName, marker]) => {
        if (stationName !== currentHoveredMarker) {
            marker.setIcon({
                path: google.maps.SymbolPath.CIRCLE,
                scale: 7,
                fillColor: marker.getIcon().fillColor,
                fillOpacity: 0.8,
                strokeWeight: 1,
                strokeColor: "#000"
            });
        }
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

const selectedLine = getQueryParam('line');

window.onload = function () {
    initMap();
    //let selectedLine = getQueryParam('line');

    if (selectedLine) {
        if (lineNameFixes[selectedLine]) {
            selectedLine = lineNameFixes[selectedLine];
        }
        //console.log('Selected Line:', selectedLine);
        fetchAndDrawLine(selectedLine, lineColors[selectedLine] || '#FF0000')
        .then(() => {
            centerLineStations(selectedLine);
            fetchTubeStatus(selectedLine);
        })
        
    } else {
        alert('No line selected.');
    }
};

