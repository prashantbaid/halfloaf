const getBreads = import('./get-breads.mjs');

module.exports = handler = async function (event, context) {
  const lng = event.queryStringParameters.lng;
  const lat = event.queryStringParameters.lat;

  const { csrfToken, cookie } = await getCookieAndCsrfToken();

  const breads = [];
  await getBreads({ lat, lng, csrfToken, cookie }, breads);


  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*' // Required for CORS support to work
    },
    body: JSON.stringify(breads)
  }
}
