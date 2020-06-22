const axios = require('axios');
const htmlParser = require('node-html-parser');
const https = require('https');

const moneyConverterUrl = 'https://themoneyconverter.com/'; // moneda_origen / moneda_destino

const currencyConversionCache = new Map();

function retrieveCurrencyConversion(origCurr, targetCurr) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const agent = new https.Agent({
        rejectUnauthorized: false
    });
    return axios({
        method: 'get',
        url: moneyConverterUrl + `/${origCurr}/${targetCurr}`,
        headers: {
            'accept-language': 'en-US,en;q=0.9,es-US;q=0.8,es;q=0.7',
            dnt: 1,
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'cross-site',
            'upgrade-insecure-requests': 1,

            Host: 'themoneyconverter.com',
            Connection: 'keep-alive',
            Pragma: 'no-cache',
            'Cache-Control': 'no-cache',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36',
            'Sec-Fetch-User': '?1',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            httpsAgent: agent
        }
    }).then(
        response => {
            const html = htmlParser.parse(response.data);
            const values = html.querySelectorAll('#currency-converter div.cc-result output');
            const result = values[0].childNodes[0].rawText;
            const tst       = html.querySelectorAll('#currency-converter div.cc-controls time');
            let tstResult = tst[0].childNodes[0].rawText;
            tstResult = tstResult.replace(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2}:\d{2})/g, '$3-$1-$2T$4.000Z');

            return [...result.split(/\s/).filter(r => r !== '='), ...[tstResult]];
        }
    ).catch(err => console.error(err));
}

module.exports = {
    currencyConversionCache,
    retrieveCurrencyConversion
};

// retrieveCurrencyConversion('USD', 'PEN').then(
//     result => console.log(result)
// );