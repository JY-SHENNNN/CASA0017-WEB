// TfL color map
const lineColors = {
    "bakerloo": "#B36305",
    "central": "#E32017",
    "circle": "#FFD300",
    "district": "#00782A",
    "hammersmith & city": "#F3A9BB",
    "jubilee": "#A0A5A9",
    "metropolitan": "#9B0056",
    "northern": "#000000",
    "piccadilly": "#003688",
    "victoria": "#0098D4",
    "waterloo & city": "#95CDBA"
};


let map;

// get the line id from the query string
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    let value = urlParams.get(param);

    // decode
    if (value) {
        value = value.replace(/%26/g, '&');  
        console.log("value:",value);
    }
    return value;
}



// init the map
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 51.5074, lng: -0.1278 },  // 伦敦中心
        zoom: 12
    });
}

const polylines = {};
const polyMarkers = {};
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
        strokeOpacity: 0.8,  // transparency for the line
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
                scale: 15,
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

// center the map on the stations of the selected line
function centerLineStations(lineId) {
    const markers = polyMarkers[lineId];
    const bounds = new google.maps.LatLngBounds();
    markers.forEach(marker => {
        bounds.extend(marker.getPosition());
    });

    map.fitBounds(bounds);
}

const lineNameFixes = {
    "hammersmith": "hammersmith & city",
    "waterloo%20": "waterloo & city"
};

window.onload = function () {
    initMap();
    let selectedLine = getQueryParam('line');

    if (selectedLine) {
        if (lineNameFixes[selectedLine]) {
            selectedLine = lineNameFixes[selectedLine];
        }
        console.log('Selected Line:', selectedLine);
        fetchAndDrawLine(selectedLine, lineColors[selectedLine] || '#FF0000');
    } else {
        alert('No line selected.');
    }
};


// excute the code when the page is loaded
// window.onload = function () {
//     initMap();
//     const selectedLine = getQueryParam('line');

//     if (selectedLine) {
//         fetchAndDrawLine(selectedLine, lineColors[selectedLine] || '#FF0000');
//         console.log(selectedLine);
        
//     } else {
//         alert('No line selected.');
//     }
// };

