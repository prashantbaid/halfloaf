const getData = (lat, lng) => {
  const requestOptions = {
    method: 'GET',
    redirect: 'follow'
  };

  hideResultsHtml();
  $('.loading-container').show();

  fetch(`https://6pa3a8gyl5.execute-api.ap-south-1.amazonaws.com/default/findhalfloaves-prod-halfloaves?lat=${lat}&lng=${lng}`, requestOptions)
    .then(response => response.json())
    .then(result => drawMap(result))
    .catch(error => showErrorHtml(error));
}

const drawMap = (result) => {
  $('.loading-container').hide();

  if (result.length === 0) {
    showNoResultsHtml();
    return;
  } else {
    showResultsHtml();
  }

  const map = new maplibregl.Map({
    container: 'map',
    style: 'https://api.maptiler.com/maps/f6a3cec6-db18-4ba4-85ae-ac4bdee7f1e9/style.json?key=PsBI3TqYiCczIww1qpnq',
    center: [78.9629, 20.5937],
    zoom: 10
  });

  const coordinates = result.map(item => {

    const el = document.createElement('div');
    el.id = 'marker';

    const marker = new maplibregl
      .Marker(el)
      .setLngLat([item.lng, item.lat])
      .addTo(map);

    return [item.lng, item.lat];
  });

  console.log('coordinates ', coordinates);

  const bounds = coordinates.reduce(function (bounds, coord) {
    return bounds.extend(coord);
  }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));

  map.fitBounds(bounds, {
    padding: 50,
    maxZoom: 15
  });

  showResults(result);
}

const drawGoogleMap = (result) => {
  const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 8,
    center: [
      12.550343, 55.665957
    ],
  });

  const coordinates = JSON.parse(result).map(item => {
    const { lat, lng } = item;
    new google.maps.Marker({
      position: { lat, lng },
      map,
      title: "Hello World!",
    });

    return { lat, lng };
  });

  const bounds = coordinates.reduce(function (bounds, coord) {
    return bounds.extend(coord);
  }, new google.maps.LatLngBounds(
    new google.maps.LatLng(coordinates[0].lat, coordinates[0].lng),
    new google.maps.LatLng(coordinates[0].lat, coordinates[0].lng)
  ));

  map.fitBounds(bounds, {
    padding: 50
  });
}

function initialize() {
  hideResultsHtml();
  const input = document.getElementById('searchTextField');
  const options = {
    componentRestrictions: { country: 'in' }
  };

  const autocomplete = new google.maps.places.Autocomplete(input, options);

  google.maps.event.addListener(autocomplete, 'place_changed', function () {
    const place = autocomplete.getPlace();
    getData(place.geometry.location.lat(), place.geometry.location.lng());
    console.log('place ', place.geometry.location.lat(), place.geometry.location.lng());
  });
}

const showResults = (results) => {
  const template = $('#resultsTemplate').html();
  nunjucks.configure({ autoescape: true });
  //console.log('template ', results);
  totalLoaves = getTotalLoaves(results);
  const html = nunjucks.renderString(template, { results, totalLoaves });
  $('.results-container').html(html);
}

const getTotalLoaves = (results) => {
  let totalLoaves = 0;
  results.map(item => {
    totalLoaves = item.halfloaves.length + totalLoaves;
  });

  console.log('totalLoaves ', totalLoaves);
  return totalLoaves;
}


const hideResultsHtml = () => {
  $('.results-container').hide();
  $('#map').hide();
  $('.no-results-container').hide();
  $('.error-container').hide();
}

const showResultsHtml = () => {
  $('.results-container').show();
  $('#map').show();
}

const showNoResultsHtml = () => {
  $('.no-results-container').show();
}

const showErrorHtml = (error) => {
  $('.loading-container').hide();
  $('.error-container').show();
}

google.maps.event.addDomListener(window, 'load', initialize);




