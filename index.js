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

  add (magnetURI, options, callback) {
    if (!callback) {
      if (typeof options === 'function') {
        callback = options
        options = null
      } else {
        callback = () => void 0
      }
    }

    if (typeof magnetURI !== 'string') {
      return super.add(magnetURI, options, callback)
    }

    const parsed = new URL(magnetURI)

    const xs = parsed.searchParams.get('xs')

    const isMutableLink = xs && xs.startsWith(BTPK_PREFIX)

    if (!isMutableLink) return super.add(magnetURI, options, callback)

    const publicKeyString = xs.slice(BTPK_PREFIX.length)

    this.resolve(publicKeyString, (err, res) => {
      if (err) return this.emit('error', err)
      if (!res) return this.emit('error', new Error('Unable to resolve magnet link'))

      const urn = `${BITH_PREFIX}${res.infoHash.toString('hex')}`

      const finalMangetURI = magnetURI + `&xt=${urn}`

      super.add(finalMangetURI, options, (torrent) => {
        torrent.publicKey = Buffer.from(publicKeyString, 'hex')
        torrent.sequence = res.sequence || 0

        callback(torrent)
      })
    })
  }

  resolve (publicKeyString, callback) {
    const publicKey = Buffer.from(publicKeyString, 'hex')

    const targetID = crypto.createHash('sha1').update(publicKey).digest('hex')

    this.dht.get(targetID, function (err, res) {
      if (err) return callback(err)

      try {
        const infoHash = res.v.ih
        const sequence = res.seq

        return callback(null, { infoHash, sequence })
      } catch (parseErr) {
        return callback(parseErr)
      }
    })
  }

  publish (publicKeyString, secretKeyString, infoHashString, options, callback) {
    if (!callback) {
      callback = options
      options = { sequence: 0 }
    } else if (!options) {
      options = { sequence: 0 }
    }
    const buffPubKey = Buffer.from(publicKeyString, 'hex')
    const buffSecKey = Buffer.from(secretKeyString, 'hex')
    const targetID = crypto.createHash('sha1').update(buffPubKey).digest('hex')

    const dht = this.dht

    const opts = {
      k: buffPubKey,
      // seq: 0,
      v: {
        ih: Buffer.from(infoHashString, 'hex')
      },
      sign: function (buf) {
        return ed.sign(buf, buffPubKey, buffSecKey)
      }
    }

    dht.get(targetID, function (err, res) {
      if (err) return callback(err)

      const sequence = (res && res.seq) ? res.seq + 1 : options.sequence
      opts.seq = sequence

      dht.put(opts, function (putErr, hash) {
        if (putErr) return callback(putErr)

        const magnetURI = `magnet:?xs=${BTPK_PREFIX}${publicKeyString}`

        callback(null, {
          magnetURI,
          infohash: infoHashString,
          sequence
        })
      })
    })
  }

  republish (publicKeyString, callback) {
    if (!callback) {
      callback = () => void 0
    }

    const buffPubKey = Buffer.from(publicKeyString, 'hex')
    const targetID = crypto.createHash('sha1').update(buffPubKey).digest('hex')

    const dht = this.dht

    dht.get(targetID, (err, res) => {
      if (err) {
        callback(err)
        callback = () => void 0
        return
      }

      dht.put(res, (err) => {
        callback(err)
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
