const express    = require('express');
const cors       = require('cors');
const axios      = require('axios');
const htmlParser = require('node-html-parser');
const https      = require('https');
// const differenceInHours = require('date-fns/differenceInHours');

const bcentralUrl = 'https://www.bcentral.cl/web/banco-central/inicio';

let startDate    = new Date();
let dailyUfValue = {
  today: startDate,
  uf: 0
};

// Ref.: https://github.com/date-fns/date-fns/blob/master/src/differenceInHours/index.js
function differenceInHours(dateLeft, dateRight) {
  const MILLISECONDS_IN_HOUR = 3600000;
  const diffInMilliseconds = dateLeft.getTime() - dateRight.getTime();
  const diff = diffInMilliseconds / MILLISECONDS_IN_HOUR;

  return diff > 0 ? Math.floor(diff) : Math.ceil(diff);
}

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
      const values  = html.querySelectorAll('#_BcentralIndicadoresViewer_INSTANCE_wphwYhQJUX6t_myTooltipDelegate dl');
      const ufElem  = values.filter(v => v.rawAttrs.indexOf('Unidad de Fomento') !== -1);
      const ufHtml  = htmlParser.parse(ufElem[0].innerHTML);
      const ufValue = ufHtml.querySelector('dd');

      return ufValue.childNodes[1].rawText;
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
  console.log(dateDiff);
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

app.listen(8002, '0.0.0.0', () => {
  console.log('Server started on http://localhost:8002');
})

