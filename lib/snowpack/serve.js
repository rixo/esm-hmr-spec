import * as path from 'path'
import * as ports from 'port-authority'
import { startServer, createConfiguration } from 'snowpack'

const FIXTURES = path.resolve(__dirname, '../../fixtures')

let nextPort = 13000
let nextHmrPort = 14000

let currentInstances = 0
const maxInstances = 3
const queue = []

const freeSlot = () => {
  if (currentInstances < maxInstances) {
    currentInstances++
    return Promise.resolve()
  }
  return new Promise(resolve => {
    queue.push(resolve)
  })
}

const release = () => {
  currentInstances--
  while (queue.length > 0 && currentInstances < maxInstances) {
    currentInstances++
    queue.shift()()
  }
}

export default async ({
  fixture = 'default',
  root = fixture.dir || path.resolve(FIXTURES, fixture),
  // reload = false,
  reload = true,
} = {}) => {
  await freeSlot()

  const configPath = path.resolve(root, 'snowpack.config.js')

  const { default: userConfig } = await import(configPath)

  const [port, hmrPort] = await Promise.all([
    await ports.find(nextPort),
    await ports.find(nextHmrPort),
  ])

  nextPort = port + 1
  nextHmrPort = hmrPort + 1

  const baseConfig = {
    root: root,
    ...userConfig,
    devOptions: {
      open: 'none',
      output: 'stream',
      port,
      hmrPort,
      ...userConfig.devOptions,
    },
  }

  const config = createConfiguration(baseConfig)

  const protocol = config.devOptions.secure ? 'https' : 'http'

  const url = `${protocol}://${config.devOptions.hostname}:${port}`

  if (reload) {
    // TODO would that ever be a need? (doesn't work with non-linked Snowpack)
    // await require('snowpack/lib/util').clearCache()
  }

  const server = await startServer({ config })

  const close = async () => {
    await server.shutdown()
    release()
  }

  return { close, url, closed: false }
}
