import got from 'got';
import cheerio from 'cheerio';

export const handler = async function (event, context) {
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

async function getCookieAndCsrfToken() {
  const response = await got(`https://www.dunzo.com/search`);
  const $ = cheerio.load(response.body);

  const props = $('[id="__NEXT_DATA__"]').html();
  const csrfToken = JSON.parse(props).props.initialProps.csrf;

  return { csrfToken, cookie: response.headers['set-cookie'] };
}


const processResults = (data) => {
  const finalData = [];
  const totalResults = data.eventMeta.result_count;

  data.widgets.map((widget) => {
    const items = widget.items;

    if (widget.type !== 'SEPARATOR' && items) {
      items.map(item => {
        if (item.category === 'Breakfast & Dairy' && item.subCategory === 'Bread & Buns' && removeArtisinalBreads(item.title)) {
          const lat = widget.checkoutData.lat;
          const lng = widget.checkoutData.lng;
          const dzid = widget.eventMeta.dzid;
          const storeDetails = widget.widgetData.actionButton.action;
          const storeAddress = storeDetails.address;
          const storeName = widget.title;

          if (item.customizationData) {
            const variantTypes = item.customizationData.variantTypes;
            if (variantTypes) {
              variantTypes.map(variantType => variantType.variants.map(variant => {
                if (variant.unitWeight < 300) {

                  const imageUrl = variant.imageUrls && variant.imageUrls[0];
                  finalData.push({
                    title: item.title,
                    variant: variant.unitWeight,
                    url: `https://www.dunzo.com/product/${variant.variantSlug}?dzid=${dzid}`,
                    lat,
                    lng,
                    storeAddress,
                    storeName,
                    imageUrl
                  })
                  // console.log('title ', item.title);
                  // console.log('variant: ', variant.unitWeight);
                  // console.log('variant: ', variant.variantSlug);
                  // console.log(`https://www.dunzo.com/product/${variant.variantSlug}?dzid=${dzid}`)
                  // console.log('lat: ', lat, 'lng: ', lng);
                }
              })
              )
            }
          }
        }
      })
    }
  });

  return { finalData, totalResults };
}

const getBreads = async (options, breadsArr) => {

  const { lat, lng, csrfToken, cookie, pg = 1 } = options;

  const payload = {
    "query": "bread",
    "event": "AUTO",
    "supportedWidgetTypes": ["LABEL", "STORE_HEADER_GRID_ROW_X", "GRID_ROW_X"],
    "queryContext": {
      "tabType": "ITEM"
    },
    "location": {
      "lat": lat,
      "lng": lng
    },
    "page": pg,
    "size": 10,
    "is_guest_user": true
  }

  const requestOptions = {
    'method': 'POST',
    'url': 'https://www.dunzo.com/api/v8/search/global/',
    'headers': {
      'content-type': 'application/json;charset=UTF-8',
      'x-csrf-token': csrfToken,
      cookie
    },
    body: JSON.stringify(payload)

  };

  console.log('pg ', pg, ' calling...');

  const response = await got(requestOptions);

  const processedResults = processResults(JSON.parse(response.body));

  const { finalData, totalResults } = processedResults;

  breadsArr.push(...finalData);

  console.log('current breada arr ', breadsArr.length);

  if (Number(totalResults) === 0 || pg > 5) {
    return breadsArr;
  } else {
    await getBreads({ ...options, pg: pg + 1 }, breadsArr);
  }
}

const removeArtisinalBreads = (title) => {
  const regex = new RegExp(/(kulcha|fruit|pav|bun|fuit|sweet|flattened|flat|garlic|toast|toasted|round|crumbs|cheese|pita|pizza)+/g);
  return !regex.test(title.toLowerCase());
}