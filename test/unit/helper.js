'use strict';

global.sinon = require('sinon');
const chai = require('chai');
chai.should();
chai.use(require('sinon-chai'));
global.expect = chai.expect;
global.reqres = require('hmpo-reqres');
global.proxyquire = require('proxyquire');

