const path = require('path')
const MutableWebTorrent = require('..')

const client = new MutableWebTorrent()

const magnet = process.argv[2]

const DOWNLOAD_LOCATION = path.join(__dirname, '/download')

client.add(magnet, {
  path: DOWNLOAD_LOCATION
}, (torrent) => {
  console.log('Downloading torrent:', torrent.infoHash.toString('hex'))
})
