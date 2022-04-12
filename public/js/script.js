const getData = (lat, lng) => {
  const requestOptions = {
    method: 'GET',
    redirect: 'follow'
  };

  hideResultsHtml();
  $('.loading-container').show();

  fetch(`https://brc5og74x0.execute-api.ap-south-1.amazonaws.com/prod/findhalfloaves?lat=${lat}&lng=${lng}`, requestOptions)
    .then(response => response.json())
    .then(result => drawMap(result))
    .catch(error => showNoResultsHtml(error));
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

  const bounds = coordinates.reduce(function (bounds, coord) {
    return bounds.extend(coord);
  }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));

  map.fitBounds(bounds, {
    padding: 50,
    maxZoom: 15
  });

  showResults(result);
}

function initialize() {
  hideResultsHtml();
  nunjucks.configure('/nunjunks', { autoescape: true });
  const input = document.getElementById('searchTextField');
  const options = {
    componentRestrictions: { country: 'in' }
  };

  const autocomplete = new google.maps.places.Autocomplete(input, options);

  google.maps.event.addListener(autocomplete, 'place_changed', function () {
    const place = autocomplete.getPlace();
    getData(place.geometry.location.lat(), place.geometry.location.lng());
  });


  $('#searchTextField').focus(function () {
    $(this).val('');
  });
}

const showResults = (results) => {
  totalLoaves = getTotalLoaves(results);
  nunjucks.render('results.njk', { results, totalLoaves }, function (err, res) {
    $('.results-container').html(res);
  });
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
}

const showResultsHtml = () => {
  $('.results-container').show();
  $('#map').show();
}

const showNoResultsHtml = () => {
  $('.loading-container').hide();
  $('.no-results-container').show();
}


google.maps.event.addDomListener(window, 'load', initialize);




