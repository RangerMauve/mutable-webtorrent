# mutable-webtorrent (WIP)
Create / Load / Seed mutable webtorrents (BEP 46)

Based on the proof of concept for [BEP 46](http://www.bittorrent.org/beps/bep_0046.html) https://github.com/lmatteis/dmt/

## About

BitTorrent is widespread and is used all over the place for sharing files without having to rely on centralized third parties. Even though it's great for sharing content, it doesn't provide a method for updating that content. Luckily, BitTorrent is a constantly evolving spec, and there was a push to provide a mechanism to support this use case in 2016. This library implements the "Updating Torrents Via DHT Mutable Items" proposal on top of WebTorrent.

Essentially, you create a public/secret keypair using ed25519. Then, you create a torrent and note it's `infoHash`, an identifier calculated based on the torrent contents. Then, you sign the infohash with your secret key, and publish a value to the DHT under the `sha1` hash of your public key. Only you are able to publish changes to this key because it's automatically validated by nodes in the DHT.

Then, you create a magnet link which points to your public key instead of the infohash of the torrent and share it somewhere. Then, if somebody wants to download your content, they'll take the hash of your public key, look up values in the DHT, then verify that those values got signed by your secret key, and get the infohash of the torrent. From there they use the usual peer discovery methods for other magnet links.

What this gives you is the ability to share a torrent, and update where it points to over time. My goal with this is to enable people to create websites and other types of archives that can be used as a peer to peer alternative to the HTTP-based web.

## Example

```javascript
const MutableWebTorrent = require('mutable-webtorrent')

const client = new MutableWebTorrent()

const { publicKey, secretKey } = client.createKeypair()

console.log('Created Keypair: Public [ ', publicKey, '] Secret [ ', secretKey, ']')

client.on('torrent', (torrent) => {
  const { infoHash, files } = torrent

  console.log('Created torrent', infoHash, files.map(({ path }) => path))

  console.log('Publishing torrent')

  client.publish(publicKey, secretKey, infoHash, (err, { magnetURI, sequence }) => {
    if (err) throw err
    console.log('Published torrent', magnetURI, '- Version', sequence)

    client.resolve(publicKey, (err, res) => {
      if (err) throw err

      console.log('Resolved latest version:', res)
    })
  })
})

console.log('Preparing to seed', __dirname)

client.seed(__dirname, {
  name: 'example'
})

```

## API

Extends the [WebTorrent](https://github.com/webtorrent/webtorrent/blob/master/docs/api.md) API with the following:

- `add(magnetURI, callback)` now takes magnet URIs using the new `uri:btpk:` scheme for resolving mutable torrents. It also adds a `publicKey` buffer to torrents loaded from a mutable magnet link.
- `resolve(publicKeyString, callback)` resolves a public key to an object with the latest `infoHash` it's pointing to as well as the `sequence` number.
- `publish(publicKeyString, secretKeyString, infohash, [options], callback)` publishes your latest version information on the DHT. The options can include the `sequence` you wish to publish at. Note that nodes in the DHT will ignore any sequences older than what they currently have. It results in an object with the `infoHash`, `magnetURI`, and `sequence` number for the published torrent. Check out how [BEP 44](https://github.com/lmatteis/bittorrent.org/blob/master/beps/bep_0044.rst) works for details.
- `createKeypair()` creates a `publicKey` and `secretKey` pair that can be used for publishing content.