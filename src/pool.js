var _ = require('lodash')
module.exports =
  class Pool {
    constructor(services, models) {
      this.services = services
      this.models = models
      this.transactions = {}
      this.data = []
      this.privateKey = null
      this.publicKey = null
      this.miningReward = null
    }
    setKeyPair(privateKey, publicKey) {
      this.privateKey = privateKey
      this.publicKey = publicKey
    }
    setMiningReward(miningReward) {
      this.miningReward = miningReward
    }
    add(transaction, cb) {
      return this.verifyTransaction(transaction, (err, res) => {
        if (err) {
          return cb(err)
        } else {
          this.addToPool(transaction)
          return cb(null, this.countPool())
        }
      })
    }
    verifyTransaction(transaction, cb) {
      var self = this
      self.services.block.getBlockHeight(function (err, height) {
        if (err) {
          return cb(err)
        } else {
          self.services.transaction.verify_non_block_transactions([transaction], self.getFromPool(), height, cb)
        }
      })
    }
    shouldFlush(cb) {
      if (_.keys(this.transactions).length >= 10) {
        return cb(null, true)
      } else {
        return cb(null, false)
      }
    }
    flush(cb) {
      var self = this
      var createdAt = new Date().getTime()
      return self.services.block.generate_new_block(self.getFromPool(), this.miningReward, this.privateKey, this.publicKey, this.getData(), createdAt, function (err, block) {
        if (err) {
          return cb(err)
        } else {
          return self.services.chain.create([block], function (err, res) {
            if (err) {
              return cb(err)
            } else {
              self.emptyPool()
              self.emptyData()
              cb(null, block)
            }
          })
        }
      })
    }
    getUnspentMoney(publicKey, cb) {
      return this.models.selectUTXOByPublicKey(publicKey, (err, res) => {
        if (err) {
          return cb(err)
        }
        var transactions = this.getFromPool()
        var components = _.flatMap(transactions, 'components')
        var sources = components.map((x) => x.source).filter((x) => x)
        return cb(null, res.filter((txo) => sources.indexOf(txo.hash) === -1))
      })
    }
    announceTransaction(transaction) {
      console.log(`announcing transaction with hash ${transaction.hash}`)
      this.services.network.announceTransaction(transaction, (err, res) => {
        if (err) {
          return console.log(`error announcing transaction ${err}`)
        }
        var {
          accepted,
          rejected
        } = res
        return console.log(`transaction announced accepted: ${accepted}, rejected: ${rejected}`)
      })
    }
    emptyData() {
      while (this.data.length) {
        this.data.pop()
      }
    }
    getData() {
      return this.data
    }
    addToData(data) {
      this.data.push(data)
    }
    reverify(blocks) {
      var components = _.flatMap(_.flatMap(blocks, 'transactions'), 'components')
      var sources = components.map((x) => x.source).filter((x) => x)
      Object.keys(this.transactions).forEach((x) => {
        var innerComponents = _.flatMap(this.transactions[x], 'components')
        var innerSources = components.map((x) => x.source).filter((x) => x)
        for (var s of innerSources) {
          if (sources.indexOf(s) !== -1) {
            delete this.transactions[x]
            return
          }
        }
      })
    }
    emptyPool() {
      Object.keys(this.transactions).forEach((x) => {
        delete this.transactions[x]
      })
    }
    addToPool(transaction) {
      var hash = this.services.transaction.calculate_hash(transaction)
      this.transactions[hash] = transaction
      this.announceTransaction(transaction)
      if (this.countPool() >= 10) {
        this.services.recurring.createBlock()
      }
    }
    getFromPool() {
      return Object.keys(this.transactions).map((k) => this.transactions[k])
    }
    countPool() {
      return Object.keys(this.transactions).length
    }
  }