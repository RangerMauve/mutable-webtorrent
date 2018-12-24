const WebTorrent = require('webtorrent')
const ed = require('ed25519-supercop')
const crypto = require('crypto')

const BTPK_PREFIX = 'urn:btpk:'
const BITH_PREFIX = 'urn:btih:'

class MutableWebTorrent extends WebTorrent {
  constructor (options) {
    let finalOptions = options || {
      dht: {
        verify: ed.verify
      }
    }

    if (options) {
      if (options.dht) {
        const dht = { verify: ed.verify, ...options.dht }
        finalOptions = { ...options, dht }
      } else {
        finalOptions = {
          ...options,
          dht: {
            verify: ed.verify
          }
        }
      }
    }

    super(finalOptions)
  }

  add (magnetURI, callback) {
    if (typeof magnetURI !== 'string') {
      return super.add(magnetURI, callback)
    }

    const parsed = new URL(magnetURI)

    const isBTPK = parsed.searchParams.keys().find((param) => param.startsWith(BTPK_PREFIX))

    if (!isBTPK) return super.add(magnetURI, callback)

    const publicKeyString = isBTPK.slice(BTPK_PREFIX.length)

    this.resolve(publicKeyString, (err, { infohash }) => {
      if (err) return callback(err)

      const urn = `${BITH_PREFIX}${infohash}`

      parsed.searchParams.set(urn, '')

      super.add(parsed.href, callback)
    })
  }

  resolve (publicKeyString, callback) {
    const publicKey = Buffer.from(publicKeyString, 'hex')

    const targetID = crypto.createHash('sha1').update(publicKey).digest('hex')

    this.dht.get(targetID, function (err, res) {
      if (err) return callback(err)

      try {
        const infohash = res.v.ih
        const sequence = res.seq

        return callback(null, { infohash, sequence })
      } catch (parseErr) {
        return callback(parseErr)
      }
    })
  }

  publish (publicKeyString, secretKeyString, infohashString, options, callback) {
    if (!callback) {
      callback = options
      options = { sequence: 0 }
    } else if (!options) {
      options = { sequence: 0 }
    }
    var buffPubKey = Buffer.from(publicKeyString, 'hex')
    var buffSecKey = Buffer.from(secretKeyString, 'hex')
    var targetID = crypto.createHash('sha1').update(buffPubKey).digest('hex')

    var dht = this.dht

    var opts = {
      k: buffPubKey,
      // seq: 0,
      v: {
        ih: Buffer.from(infohashString, 'hex')
      },
      sign: function (buf) {
        return ed.sign(buf, buffPubKey, buffSecKey)
      }
    }

    dht.get(targetID, function (err, res) {
      if (err) return callback(err)

      var sequence = res.seq || options.sequence
      opts.seq = sequence

      dht.put(opts, function (putErr, hash) {
        if (putErr) return callback(putErr)

        const magnetURI = `magnet?${BTPK_PREFIX}${publicKeyString}`

        callback(null, magnetURI)
      })
    })
  }

  createKeypair () {
    const { publicKey, secretKey } = ed.createKeyPair(ed.createSeed())

    return {
      publicKey: publicKey.toString('hex'),
      secretKey: secretKey.toString('hex')
    }
  }
}

module.exports = MutableWebTorrent
