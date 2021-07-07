// Mocha Specification Cases

// Imports
import { assertDeepStrictEqual } from 'assert-deep-strict-equal';
import puppeteer from 'puppeteer';
import { browserReady } from 'puppeteer-browser-ready';
import { serverListening } from 'server-listening';
import { webServer } from '../build/step0-tsc/web-server/index.js';

// Setup
process.env.webFolder = process.env.webFolder || 'build/step1-staging';
serverListening.setPort();
const serverInst = webServer.start();
const url = 'http://localhost:' + serverInst.address().port + '/';
const web = {};  //fields: browser, page, response, url, status, statusText, html, $
let $;  //just for convenience... you could also use: web.$
const loadWebPage = () => puppeteer.launch()
   .then(browserReady.goto(url, { web: web }))
   .then(() => $ = web.$);
const closeWebPage = () => browserReady.close(web);
before(() => serverListening.ready(serverInst));
after(() =>  serverListening.close(serverInst));

////////////////////////////////////////////////////////////////////////////////////////////////////
describe('The web page', () => {
   before(loadWebPage);
   after(closeWebPage);

   it('has the correct URL -> ' + url, () => {
      const actual =   { url: web.response.url() };
      const expected = { url: url };
      assertDeepStrictEqual(actual, expected);
      });

   it('has the correct title -> "DataDashboard"', () => {
      const actual =   { title: web.title };
      const expected = { title: 'DataDashboard' };
      assertDeepStrictEqual(actual, expected);
      });

   it('has exactly one header, main, and footer', () => {
      const actual =   {
         header: $('body >header').length,
         main:   $('body >main').length,
         footer: $('body >footer').length,
         };
      const expected = { header: 1, main: 1, footer: 1 };
      assertDeepStrictEqual(actual, expected);
      });

   });

////////////////////////////////////////////////////////////////////////////////////////////////////
describe('The document content', () => {
   before(loadWebPage);
   after(closeWebPage);

   it('has no 🚀 traveling to 🪐!', () => {
      const actual =   { '🚀': !!web.html.match(/🚀/g), '🪐': !!web.html.match(/🪐/g) };
      const expected = { '🚀': false,                   '🪐': false };
      assertDeepStrictEqual(actual, expected);
      });

   });