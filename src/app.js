const express = require('express')
const bodyParser = require('body-parser')
var mysql = require('mysql')
var _ = require('lodash')

var exceptions = require('./exceptions')

class App {
  constructor(connectionParams, rpcParams) {
    this.connectionParams = connectionParams
    this.rpcParams = rpcParams
    const app = express()
    this.app = app
    app.use(bodyParser.json())

    var connection = mysql.createConnection(_.extend({}, connectionParams, {multipleStatements: true}))
    this.connection = connection

    var Models = require('../src/models')
    var models = new Models(connection)

    var Services = require('./services')
    var services = new Services(models)
    this.services = services

    var apiController = require('./api_controller')(services)
    var rpcController = require('./rpc_controller')(services)

    app.get('/api/hi', apiController.hi)
    app.get('/api/public_key', apiController.publicKey)
    app.get('/api/areyou', apiController.areYou)
    app.post('/api/transaction', apiController.announceTransaction)
    app.post('/api/block', apiController.announceBlock)
    app.get('/api/block', apiController.listBlocks)

    app.all('/rpc/.*', (req, res, next) => {
      var auth = req.headers['authorization']
      var token = Buffer.from(rpcParams.username + ':' + rpcParams.password).toString('base64')
      var expected = 'Basic ' + token
      if (expected === auth) {
        return next()
      } else {
        return res.send(401).end()
      }
    })
    app.post('/rpc/block', rpcController.createBlock)
    app.get('/rpc/total', rpcController.getTotal)
    app.post('/rpc/pay', rpcController.pay)

  }
}
module.exports = App