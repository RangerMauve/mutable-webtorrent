const MutableWebTorrent = require('..')

const client = new MutableWebTorrent()

const seed = Buffer.from('DEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF', 'hex')
const { publicKey, secretKey } = client.createKeypair(seed)

console.log('Created Keypair: Public <', publicKey, '> Secret <', secretKey, '>')

client.on('torrent', (torrent) => {
  const { infoHash, files } = torrent

  console.log('Created torrent', infoHash, files.map(({ path }) => path))

  console.log('Publishing torrent')

  client.publish(publicKey, secretKey, infoHash, (err, { magnetURI, sequence }) => {
    if (err) throw err
    console.log('Published torrent', magnetURI, '- Version', sequence)

    function republish () {
      console.log('Republishing')
      client.republish(publicKey, () => {
        console.log('Scheduling republish for 10 mins')
        setTimeout(republish, 10 * 60 * 1000)
      })
    }

    client.resolve(publicKey, (err, { infoHash, sequence }) => {
      if (err) throw err

      console.log('Resolved latest version:', infoHash.toString('hex'), sequence)

      console.log('Seeding...')

      republish()
    })
  })
})

console.log('Preparing to seed', __dirname)

client.seed(__dirname, {
  name: 'example'
})
