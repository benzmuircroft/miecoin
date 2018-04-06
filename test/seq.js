var sinon = require('sinon')
var should = require('should')

var Services = require('../src/services')
var Models = require('../src/models')

var factory = require('./factory')

var exceptions = require('../src/exceptions')

var pr1 = factory.pr1
var pu1 = factory.pu1
var pr2 = factory.pr2
var pu2 = factory.pu2

var authors = [pu1, pu2]
describe('cycle', function () {
  describe('createGenesisBlock', function () {
    var models = new Models()
    var modelsStub = sinon.stub(models)
    var services = new Services(modelsStub)
    modelsStub.getLastBlock.yields(null, undefined)
    modelsStub.removeFrom.returns('removeFrom')
    modelsStub.add_block.returns('add bl')
    modelsStub.add_transaction.returns('add tr')
    modelsStub.add_raw_data.returns('add rd')
    modelsStub.add_otx.returns('add otx')
    modelsStub.transaction.yields(null)
    it('should work', function (done) {
      var createdAt = 1522727362019
      services.chain.createGenesisBlock(authors, createdAt, function (err, block) {
        should(err).equal(null)
        modelsStub.transaction.calledOnce.should.be.true()
        modelsStub.transaction.getCall(0).args[0].should.match(['removeFrom', 'add bl', 'add tr', 'add rd'])
        block.height.should.equal(1)
        block.created_at.should.equal(createdAt)
        done()
      })
    })
  })
  describe('flush', function () {
    var models = new Models()
    var modelsStub = sinon.stub(models)
    var services = new Services(modelsStub)
    modelsStub.getLastBlock.yields(null, factory.genesisBlock)
    modelsStub.removeFrom.returns('removeFrom')
    modelsStub.add_block.returns('add bl')
    modelsStub.add_transaction.returns('add tr')
    modelsStub.add_raw_data.returns('add rd')
    modelsStub.add_otx.returns('add otx')
    modelsStub.transaction.yields(null)
    it('should work with no transactions', function (done) {
      services.pool.flush(100, pr1, pu1, ['somedata'], function (err, block) {
        should(err).equal(null)
        done()
      })
    })
  })
  describe('wallet.getTotal', function () {
    var config = require('config')
    var stub
    var services
    var models = new Models()
    var modelsStub = sinon.stub(models)
    before(function () {
      stub = sinon.stub(config, 'get')
      stub.withArgs('wallet.private_key').returns(factory.pr1)
      stub.withArgs('wallet.public_key').returns(factory.pu1)
      services = new Services(modelsStub)
      modelsStub.selectUTXOByPublicKey.yields(null, [factory.firstBlockTransactionUTXO])
    })
    after(function () {
      stub.restore()
    })
    it('should work', function (done) {
      services.wallet.getTotal(function (err, total) {
        should(modelsStub.selectUTXOByPublicKey.getCall(0).args[0]).equal(factory.pu1)
        should(err).equal(null)
        should(total).equal(100)
        done()
      })
    })
  })
  describe('wallet.pay', function () {
    var config = require('config')
    var stub
    var services
    var models = new Models()
    var modelsStub = sinon.stub(models)
    before(function () {
      stub = sinon.stub(config, 'get')
      stub.withArgs('wallet.private_key').returns(factory.pr1)
      stub.withArgs('wallet.public_key').returns(factory.pu1)
      services = new Services(modelsStub)
      modelsStub.selectUTXOByPublicKey.yields(null, [factory.firstBlockTransactionUTXO])
      modelsStub.selectUTXO.yields(null, [factory.firstBlockTransactionUTXO])
    })
    after(function () {
      stub.restore()
    })
    it('should work', function (done) {
      services.wallet.pay([], [{'amount': 20, 'public_key': factory.pu2}], 10, 2, function (err, transaction) {
        should(err).equal(null)
        transaction.components.length.should.equal(3)
        done()
      })
    })
    it('should work if barely enough money', function (done) {
      services.wallet.pay([], [{'amount': 90, 'public_key': factory.pu2}], 10, 2, function (err, transaction) {
        should(err).equal(null)
        transaction.components.length.should.equal(2)
        done()
      })
    })
    it('should not work if no enough money', function (done) {
      services.wallet.pay([], [{'amount': 90, 'public_key': factory.pu2}], 20, 2, function (err, transaction) {
        (() => should.ifError(err)).should.throw(new exceptions.NotEnoughMoneyToSpendException())
        done()
      })
    })
  })
})