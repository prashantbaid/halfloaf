import got from 'got';
import cheerio from 'cheerio';

const ARTISANAL_BREADS_REGEX = /(kulcha|fruit|pav|bun|fuit|sweet|flattened|flat|garlic|toast|toasted|round|crumbs|cheese|pita|pizza|cream|creamy|roll|parmesan|footlong|sub|crumb|stick|focaccia)+/g

export const handler = async function (event, context) {
  const lng = event.queryStringParameters.lng;
  const lat = event.queryStringParameters.lat;

  const { csrfToken, cookie } = await getCookieAndCsrfToken();

  const breads = [];
  await getBreads({ lat, lng, csrfToken, cookie }, breads);

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://halfloafnear.me',
      "Access-Control-Allow-Methods": "OPTIONS,GET"
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
  const halfloafResults = [];

  data.widgets.map((widget) => {
    if (widget.type !== 'SEPARATOR' && widget.items) {
      const { items, checkoutData, eventMeta, widgetData } = widget;
      const { lat, lng, displayAddress, title, distanceText } = checkoutData;
      const dzid = eventMeta.dzid;
      const storeDistance = sanitiseDistance(distanceText);

      const storeData = {
        storeName: title,
        storeAddress: displayAddress,
        storeDistance,
        halfloaves: [],
        lng,
        lat
      };

      items.map(item => {
        if (item.customizationData && item.category === 'Breakfast & Dairy' && item.subCategory === 'Bread & Buns' && isNonArtisanalBread(item.title) && storeDistance < 20) {
          const variantTypes = item.customizationData.variantTypes;

          if (variantTypes) {
            variantTypes.map(variantType => variantType.variants.map(variant => {
              const { unitWeight, itemQuantityOrWeight, priceText, variantSlug } = variant;

              if (unitWeight < 300 && validateWeights(unitWeight, itemQuantityOrWeight)) {
                storeData.halfloaves.push({
                  title: item.title,
                  weight: itemQuantityOrWeight,
                  price: priceText,
                  url: `https://www.dunzo.com/product/${variantSlug}?dzid=${dzid}`
                })
              }

            }))
          }

        }
      })

      if (storeData.halfloaves.length > 0) {
        halfloafResults.push(storeData);
      }
    }
  });

  return { halfloafResults };
}

const validateWeights = (unitWeight, itemQuantityOrWeight) => {
  if (unitWeight > 0 && itemQuantityOrWeight.includes(' Gms')) {
    const weight = itemQuantityOrWeight.substring(0, itemQuantityOrWeight.length - 3);
    if (Number(weight) < 300) {
      return true;
    }
  }

  return false;
}

const sanitiseDistance = (distanceText) => {
  if (distanceText.includes(' km')) {
    return distanceText.substring(0, distanceText.length - 3);
  }
  return distanceText;
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
      'x-app-type': 'PWA_WEB',
      cookie
    },
    body: JSON.stringify(payload)

  };

  const response = await got(requestOptions);

  const dunzoData = JSON.parse(response.body);
  const processedResults = processResults(dunzoData);
  const { halfloafResults } = processedResults;

  breadsArr.push(...halfloafResults);

  if (!dunzoData.next || pg > 10) {
    return breadsArr;
  } else {
    await getBreads({ ...options, pg: pg + 1 }, breadsArr);
  }
}

const isNonArtisanalBread = (title) => {
  const regex = new RegExp(ARTISANAL_BREADS_REGEX);
  return !regex.test(title.toLowerCase());
}