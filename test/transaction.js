var should = require('should')
var crypto = require('crypto')

var Transaction = require('../src/transaction')
var models = {}
var transaction = Transaction(null, models)
var factory = require('./factory')
var exceptions = require('../src/exceptions')
var utils = require('../src/utils')

var assert = require('assert')
describe('Transaction', function () {
  describe('calculate_merkle_root', function () {
    var zeros = Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex')
    it('should work for no trasnsactions', function () {
      transaction.calculate_merkle_root([]).should.match(zeros)
    })
  })
  describe('verify_merkle', function () {
    xit('should work')
  })
  describe('verify_non_block_transactions', function () {
    xit('should consider parent transactions')
    it('should work', function (done) {
      var testTransaction = factory.transaction
      var otx = testTransaction.components.filter((x) => x.type === 'otx')
      var itx = testTransaction.components.filter((x) => x.type === 'itx')
      var utxo = itx.map((x) => x.otx)
      var toHash = utils.hash(transaction.components_to_buffer(otx))
      var components = testTransaction.components.map((s) => {
        if (s.type === 'itx') {
          s.to_hash = toHash
          s.signature = utils.sign(transaction.plain_itx_to_buffer(s), factory.pr1)
        }
        return s
      })
      models.selectUTXO = function (s, h, cb) {
        return cb(null, utxo)
      }
      transaction.verify_non_block_transactions([{'components': components}], {}, 10, function (err, res) {
        assert(err === null)
        res.change.should.equal(testTransaction._change)
        done()
      })
    })
    it('should detext double spending', function (done) {
      var testTransaction = factory.transaction
      var otx = testTransaction.components.filter((x) => x.type === 'otx')
      var itx = testTransaction.components.filter((x) => x.type === 'itx')
      var utxo = itx.map((x) => x.otx)
      var toHash = utils.hash(transaction.components_to_buffer(otx))
      var components = testTransaction.components.map((s) => {
        if (s.type === 'itx') {
          s.to_hash = toHash
          s.signature = utils.sign(transaction.plain_itx_to_buffer(s), factory.pr1)
        }
        return s
      })
      models.selectUTXO = function (s, h, cb) {
        return cb(null, utxo)
      }
      transaction.verify_non_block_transactions([{'components': components}, {'components': components}], {}, 10, function (err, res) {
        (() => should.ifError(err)).should.throw(new exceptions.DoubleSpendingException())
        done()
      })
    })
    it('should not work if wrong signatures', function (done) {
      var testTransaction = factory.transaction
      var otx = testTransaction.components.filter((x) => x.type === 'otx')
      var itx = testTransaction.components.filter((x) => x.type === 'itx')
      var utxo = itx.map((x) => x.otx)
      var toHash = utils.hash(transaction.components_to_buffer(otx))
      var components = testTransaction.components.map((s) => {
        if (s.type === 'itx') {
          s.to_hash = toHash
          s.signature = utils.sign(transaction.plain_itx_to_buffer(s), factory.pr2)
        }
        return s
      })
      models.selectUTXO = function (s, h, cb) {
        return cb(null, utxo)
      }
      transaction.verify_non_block_transactions([{'components': components}, {'components': components}], {}, 10, function (err, change) {
        (() => should.ifError(err)).should.throw(new exceptions.InvalidTransactionSignatureException())
        done()
      })
    })
  })
  describe('verify_block_transaction', function () {
    it('should work', function (done) {
      var testTransaction = factory.blockTransaction
      transaction.verify_block_transactions([testTransaction], {}, 10, -testTransaction._change - 100, 100, function (err) {
        done(err)
      })
    })
    it('should not work if exceeds amount', function (done) {
      var testTransaction = factory.blockTransaction
      transaction.verify_block_transactions([testTransaction], {}, 10, -testTransaction._change - 100, 100 - 1, function (err) {
        (() => should.ifError(err)).should.throw(new exceptions.OverSpendingException())
        done()
      })
    })
  })
  describe('verify', function () {
    it('should work', function (done) {
      var testTransaction = factory.transaction
      var otx = testTransaction.components.filter((x) => x.type === 'otx')
      var itx = testTransaction.components.filter((x) => x.type === 'itx')
      var utxo = itx.map((x) => x.otx)
      var toHash = utils.hash(transaction.components_to_buffer(otx))
      var components = testTransaction.components.map((s) => {
        if (s.type === 'itx') {
          s.to_hash = toHash
          s.signature = utils.sign(transaction.plain_itx_to_buffer(s), factory.pr1)
        }
        return s
      })
      models.selectUTXO = function (s, h, cb) {
        return cb(null, utxo)
      }
      transaction.verify({'components': components}, 10, true, function (err, res) {
        assert(err === null)
        res.change.should.equal(testTransaction._change)
        done()
      })
    })
    it('should not work if amount of one of out changes', function (done) {
      var testTransaction = factory.transaction
      var otx = testTransaction.components.filter((x) => x.type === 'otx')
      var itx = testTransaction.components.filter((x) => x.type === 'itx')
      var utxo = itx.map((x) => x.otx)
      var toHash = utils.hash(transaction.components_to_buffer(otx))
      var components = testTransaction.components.map((s) => {
        if (s.type === 'itx') {
          s.to_hash = toHash
          s.signature = utils.sign(transaction.plain_itx_to_buffer(s), factory.pr1)
        }
        return s
      })
      models.selectUTXO = function (s, h, cb) {
        return cb(null, utxo)
      }
      otx[0].amount += 1
      transaction.verify({'components': components}, 10, true, function (err) {
        (() => should.ifError(err)).should.throw(new exceptions.NonMatchingInOutException())
        done()
      })
    })
    it('should not work if publickey of one of out changes', function (done) {
      var testTransaction = factory.transaction
      var otx = testTransaction.components.filter((x) => x.type === 'otx')
      var itx = testTransaction.components.filter((x) => x.type === 'itx')
      var utxo = itx.map((x) => x.otx)
      var toHash = utils.hash(transaction.components_to_buffer(otx))
      var components = testTransaction.components.map((s) => {
        if (s.type === 'itx') {
          s.to_hash = toHash
          s.signature = utils.sign(transaction.plain_itx_to_buffer(s), factory.pr1)
        }
        return s
      })
      models.selectUTXO = function (s, h, cb) {
        return cb(null, utxo)
      }
      otx[0].public_key = factory.pu2
      transaction.verify({'components': components}, 10, true, function (err) {
        (() => should.ifError(err)).should.throw(new exceptions.NonMatchingInOutException())
        done()
      })
    })
    it('should not work if signed with different private key', function (done) {
      var testTransaction = factory.transaction
      var otx = testTransaction.components.filter((x) => x.type === 'otx')
      var itx = testTransaction.components.filter((x) => x.type === 'itx')
      var utxo = itx.map((x) => x.otx)
      var toHash = utils.hash(transaction.components_to_buffer(otx))
      var components = testTransaction.components.map((s) => {
        if (s.type === 'itx') {
          s.to_hash = toHash
          s.signature = utils.sign(transaction.plain_itx_to_buffer(s), factory.pr2)
        }
        return s
      })
      models.selectUTXO = function (s, h, cb) {
        return cb(null, utxo)
      }
      otx[0].public_key = factory.pu2
      transaction.verify({'components': components}, 10, true, function (err) {
        (() => should.ifError(err)).should.throw(new exceptions.InvalidTransactionSignatureException())
        done()
      })
    })
    it('should not work if out more than in', function (done) {
      var testTransaction = factory.transaction
      var otx = testTransaction.components.filter((x) => x.type === 'otx')
      otx[0].amount += testTransaction._change + 1
      var itx = testTransaction.components.filter((x) => x.type === 'itx')
      var utxo = itx.map((x) => x.otx)
      var toHash = utils.hash(transaction.components_to_buffer(otx))
      var components = testTransaction.components.map((s) => {
        if (s.type === 'itx') {
          s.to_hash = toHash
          s.signature = utils.sign(transaction.plain_itx_to_buffer(s), factory.pr1)
        }
        return s
      })
      models.selectUTXO = function (s, h, cb) {
        return cb(null, utxo)
      }
      otx[0].public_key = factory.pu2
      transaction.verify({'components': components}, 10, true, function (err) {
        (() => should.ifError(err)).should.throw(new exceptions.UnavailableAmountException())
        done()
      })
    })
  })
  describe('verify_in_out', function () {
    it('should not work when in out does not match', function (done) {
      var otxItxSources = factory.otxItxSources
      transaction.verify_in_out(otxItxSources.itxSources, otxItxSources.otx, function (err) {
        (() => should.ifError(err)).should.throw(new exceptions.NonMatchingInOutException())
        done()
      })
    })
    it('should work when in out matches', function (done) {
      var otxItxSources = factory.otxItxSources
      var toHash = utils.hash(transaction.components_to_buffer(otxItxSources.otx))
      var newItxSources = otxItxSources.itxSources.map((s) => {
        s.to_hash = toHash
        return s
      })
      transaction.verify_in_out(newItxSources, otxItxSources.otx, function (err) {
        done(err)
      })
    })
  })
  describe('verify_singature', function () {
    it('should not work when no sugnature is provided', function (done) {
      var itxSources = factory.otxItxSources.itxSources
      transaction.verify_signatures(itxSources, function (err) {
        (() => should.ifError(err)).should.throw(new exceptions.InvalidTransactionSignatureException())
        done()
      })
    })
    it('should not work when signed with a different private key', function (done) {
      var itxSources = factory.otxItxSources.itxSources
      itxSources.map((itxSource) => {
        itxSource.signature = utils.sign(transaction.plain_itx_to_buffer(itxSource), factory.pr2)
      })
      transaction.verify_signatures(itxSources, function (err) {
        (() => should.ifError(err)).should.throw(new exceptions.InvalidTransactionSignatureException())
        done()
      })
    })
    it('should work when signed with the corresponding private key', function (done) {
      var itxSources = factory.otxItxSources.itxSources
      itxSources.map((itxSource) => {
        itxSource.signature = utils.sign(transaction.plain_itx_to_buffer(itxSource), factory.pr1)
      })
      transaction.verify_signatures(itxSources, function (err) {
        done(err)
      })
    })
  })
  describe('verify_amount', function () {
    it('should work', function (done) {
      var sources = factory.otxItxSources
      transaction.verify_amount(sources.otx, sources.itxSources, true, function (err, change) {
        assert(err === null)
        change.should.equal(sources.change)
        done()
      })
    })
    it('should raise if no enough money', function (done) {
      var sources = factory.otxItxSourcesNoEnough
      transaction.verify_amount(sources.otx, sources.itxSources, true, function (err, change) {
        (() => should.ifError(err)).should.throw(new exceptions.UnavailableAmountException())
        done()
      })
    })
    it('should work on barely enough money', function (done) {
      var sources = factory.otxItxSourcesBarelyEnough
      transaction.verify_amount(sources.otx, sources.itxSources, true, function (err, change) {
        assert(err === null)
        change.should.equal(0)
        done()
      })
    })
  })
  describe('get_sources', function () {
    xit('should get only less than block height')
    it('should get sources', function (done) {
      var sources = factory.sources
      models.selectUTXO = function (s, h, cb) {
        return cb(null, sources.map((x) => x.source))
      }
      transaction.get_sources(sources.map((x) => x.itx), 10, function (err, res) {
        assert(err === null)
        assert(res.filter((x) => x.source !== x.otx.hash).length === 0)
        done()
      })
    })
    it('should not get unmatching sources', function (done) {
      var sources = factory.unmatchingSources
      models.selectUTXO = function (s, h, cb) {
        return cb(null, sources.map((x) => x.source))
      }
      transaction.get_sources(sources.map((x) => x.itx), 10, function (err, res) {
        assert(err === null)
        var unmatching = res.filter((x) => !x.otx || x.source !== x.otx.hash)
        assert(unmatching.length === 1)
        unmatching[0].source.should.equal(sources[0].itx.source)
        done()
      })
    })
  })
  describe('calculate_hash', function () {
    it('should differ for different transaction', function () {
      var hash1 = transaction.calculate_hash(factory.invalidToHashTransaction)
      var hash2 = transaction.calculate_hash(factory.invalidToHashTransaction2)
      hash1.should.not.equal(hash2)
    })
  })
  describe('to_buffer', function () {
    it('should work for the second component', function () {
      var buffer = transaction.to_buffer(factory.invalidToHashTransaction)
      var second = 16 + 256 + 1024
      var type = Buffer.from(factory.itx.type)
      assert(type.compare(buffer, second, second + type.length) === 0)
      var source = Buffer.from(factory.itx.source)
      assert(source.compare(buffer, second + 16, second + 16 + source.length) === 0)
      var signature = Buffer.from(factory.itx.signature)
      assert(signature.compare(buffer, second + 16 + 256, second + 16 + 256 + signature.length) === 0)
    })
  })
  describe('components_to_buffer', function () {
    it('should work for the second component', function () {
      var buffer = transaction.components_to_buffer([factory.otx, factory.itx])
      var second = 16 + 256 + 1024
      var type = Buffer.from(factory.itx.type)
      assert(type.compare(buffer, second, second + type.length) === 0)
      var source = Buffer.from(factory.itx.source)
      assert(source.compare(buffer, second + 16, second + 16 + source.length) === 0)
      var signature = Buffer.from(factory.itx.signature)
      assert(signature.compare(buffer, second + 16 + 256, second + 16 + 256 + signature.length) === 0)
    })
  })
  describe('component_to_buffer', function () {
    it('should work with itx', function () {
      var buffer = transaction.component_to_buffer(factory.itx)
      var type = Buffer.from(factory.itx.type)
      assert(type.compare(buffer, 0, type.length) === 0)
      var source = Buffer.from(factory.itx.source)
      assert(source.compare(buffer, 16, 16 + source.length) === 0)
      var signature = Buffer.from(factory.itx.signature)
      assert(signature.compare(buffer, 16 + 256, 16 + 256 + signature.length) === 0)
    })
    it('should throw error when unknown component', function () {
      (() => transaction.component_to_buffer(factory.unknownComponent)).should.throw(new exceptions.UnknownComponentTypeException())
    })
  })
  describe('plain_itx_to_buffer', function () {
    it('should be reversable', function () {
      var buffer = transaction.plain_itx_to_buffer(factory.itx)
      var type = Buffer.from(factory.itx.type)
      assert(type.compare(buffer, 0, type.length) === 0)
      var source = Buffer.from(factory.itx.source)
      assert(source.compare(buffer, 16, 16 + source.length) === 0)
      var toHash = Buffer.from(factory.itx.to_hash)
      assert(toHash.compare(buffer, 16 + 256, 16 + 256 + toHash.length) === 0)
    })
  })
  describe('itx_to_buffer', function () {
    it('should be reversable', function () {
      var buffer = transaction.itx_to_buffer(factory.itx)
      var type = Buffer.from(factory.itx.type)
      assert(type.compare(buffer, 0, type.length) === 0)
      var source = Buffer.from(factory.itx.source)
      assert(source.compare(buffer, 16, 16 + source.length) === 0)
      var toHash = Buffer.from(factory.itx.signature)
      assert(toHash.compare(buffer, 16 + 256, 16 + 256 + toHash.length) === 0)
    })
  })
  describe('otx_to_buffer', function () {
    it('should be reversable', function () {
      var buffer = transaction.otx_to_buffer(factory.otx)
      var type = Buffer.from(factory.otx.type)
      assert(type.compare(buffer, 0, type.length) === 0)
      assert(buffer.readInt32BE(16) === factory.otx.amount)
      var publicKey = Buffer.from(factory.otx.public_key)
      assert(publicKey.compare(buffer, 16 + 256, 16 + 256 + publicKey.length) === 0)
    })
  })
  describe('raw_data_to_buffer', function () {
    it('should be reversable', function () {
      var buffer = transaction.raw_data_to_buffer(factory.rawData)
      var type = Buffer.from(factory.rawData.type)
      assert(type.compare(buffer, 0, type.length) === 0)
      var data = Buffer.from(factory.rawData.data)
      assert(data.compare(buffer, 16 + 256, 16 + 256 + data.length) === 0)
    })
  })
})
