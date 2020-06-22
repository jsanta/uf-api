const express    = require('express');
const cors       = require('cors');
const axios      = require('axios');
const htmlParser = require('node-html-parser');
const https      = require('https');
const differenceInHours          = require('./utils').differenceInHours;
const retrieveCurrencyConversion = require('./money-converter').retrieveCurrencyConversion;
const currencyConversionCache    = require('./money-converter').currencyConversionCache;

const bcentralUrl = 'https://www.bcentral.cl/web/banco-central/inicio';

let startDate    = new Date();
let dailyUfValue = {
  today: startDate,
  uf: 0
};

function retrieveUfValue() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const agent = new https.Agent({
    rejectUnauthorized: false
  });
  return axios({
    method: 'get',
    url: bcentralUrl,
    headers: {
      Host: 'www.bcentral.cl',
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
      const html    = htmlParser.parse(response.data);
      const values  = html.querySelectorAll('#_BcentralIndicadoresViewer_INSTANCE_wphwYhQJUX6t_myTooltipDelegate div.tooltip-wrap p');
      const ufElem = values.filter(v => v.parentNode.rawAttrs.indexOf('Unidad de Fomento') !== -1);
      const ufHtml = htmlParser.parse(ufElem[1].innerHTML);
      const ufValue = ufHtml.childNodes[0];

      return ufValue.rawText.replace(/[$\r\n\s]+/g, '');
    }
  ).catch(err => console.error(err) );
}

const app = new express();
app.use(cors({
  origin:               true,
  methods:              [ 'GET', 'POST', 'OPTIONS', 'PUT', 'DELETE' ],
  allowedHeaders:       [ 'Content-Type', 'Authorization', 'X-Requested-With' ],
  exposedHeaders:       [ 'X-Token', 'X-RefreshToken' ],
  preflightContinue:    false,
  optionsSuccessStatus: 204
}));

app.get('/uf', (req, res) => {
  const reqDate = new Date();
  const dateDiff = differenceInHours(reqDate, startDate);

  if (dailyUfValue.uf === 0 || dateDiff >= 24) {
    console.log('Retrieving UF value');
    startDate = reqDate;
    retrieveUfValue().then(
      data => {
        console.log('Retrieved UF value: ', data);
        dailyUfValue = {
          today: startDate,
          uf: data.replace(/\./g, '').replace(',', '.')
        };
        res.status(200).json(dailyUfValue);
      }
    ).catch(err => {
      console.error(err);
      res.status(400).json({
        status: 400,
        msg: err
      });
    });

  } else {
    console.log('Using cached UF value', dailyUfValue.uf);
    res.status(200).json(dailyUfValue);
  }
});

app.get('/currency/:origCurrency/:targetCurrency', (req, res) => {
  const origCurr   = req.params.origCurrency;
  const targetCurr = req.params.targetCurrency;
  const reqDate  = new Date();
  const dateDiff = differenceInHours(reqDate, startDate);

  if (!currencyConversionCache.has(`${origCurr}/${targetCurr}`) || dateDiff >= 24) {
    console.log(`Retrieving currency conversion for ${origCurr}/${targetCurr}`);
    startDate = reqDate;
    retrieveCurrencyConversion(origCurr, targetCurr).then(data => {
      console.log(`Retrieved currency conversion for ${origCurr}/${targetCurr}`, data);
      const currencyConversion = {
        today: startDate,
        currencyConversion: {
          from: {
            currency: data[1],
            value: parseFloat(data[0])
          },
          to: {
            currency: data[3],
            value: parseFloat(data[2])
          },
          timestamp: data[4]
        }
      };
      currencyConversionCache.set(`${origCurr}/${targetCurr}`, currencyConversion);
      
      res.status(200).json(currencyConversion);
    }).catch(err => {
      console.error(err);
      res.status(400).json({
        status: 400,
        msg: err
      });
    });
  } else {
    const response = currencyConversionCache.get(`${origCurr}/${targetCurr}`);
    console.log(`Using cached currency conversion for ${origCurr}/${targetCurr}: `, response);
    res.status(200).json(response);
  }
})

app.listen(8002, '0.0.0.0', () => {
  console.log('Server started on http://localhost:8002');
})
