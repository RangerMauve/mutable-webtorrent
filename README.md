# mutable-webtorrent (WIP)
Create / Load / Seed mutable webtorrents (BEP 46)

Based on the proof of concept for [BEP 46](http://www.bittorrent.org/beps/bep_0046.html) https://github.com/lmatteis/dmt/

## API

Extends the [WebTorrent](https://github.com/webtorrent/webtorrent/blob/master/docs/api.md) API with the following:

- `add(magnetURI, callback)` now takes magnet URIs using the new `uri:btpk:` scheme for resolving mutable torrents.
- `resolve(publicKeyString, callback)` resolves a public key to an object with the latest `infohash` it's pointing to as well as the `sequence` number.
- `publish(publicKeyString, secretKeyString, infohash, [options], callback)` publishes your latest version information on the DHT. The options can include the `sequence` you wish to publish at. Note that nodes in the DHT will ignore any sequences older than what they currently have. Check out how [BEP 44](https://github.com/lmatteis/bittorrent.org/blob/master/beps/bep_0044.rst) works for details.
- `createKeypair()` creates a `publicKey` and `secretKey` pair that can be used for publishing content.