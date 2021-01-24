import * as fs from 'fs-extra'
import * as path from 'path'
import * as crypto from 'crypto'

const asyncNoop = async () => {}

const pipe = (...fns) => x0 => fns.reduce((x, f) => f(x), x0)

const root = path.resolve(__dirname, '..')

const tmp = path.resolve(root, 'tmp')

const sourceFixtures = path.resolve(root, 'fixtures')

const tmpFixtures = path.resolve(tmp, 'fixtures')

let init = async () => {
  await fs.copy(sourceFixtures, tmpFixtures, {
    overwrite: true,
    dereference: true,
  })
  init = asyncNoop
}

let lastIndex = 0

const freeDir = async () => {
  while (true) {
    const suffix = crypto
      .randomBytes(6)
      .readUIntLE(0, 6)
      .toString(36)
    const dir = path.resolve(tmp, `f${suffix}`)
    if (await fs.pathExists(dir)) continue
    return dir
  }
}

const fsHelpers = ({ dir, encoding, writeDebounce }) => {
  const lastWrites = {}

  /**
   *     write('src/index.js', '// hello')
   *
   *     write({
   *       'index.js': '// hello',
   *     })
   */
  const writeFile = async (file, contents, prefix = '') => {
    if (typeof file === 'object') {
      return Promise.all(
        Object.entries(file).map(([f, contents]) =>
          writeFile(f, contents, prefix)
        )
      )
    }
    const now = Date.now()
    const lastFileWrite = lastWrites[file]
    if (lastFileWrite && now - lastFileWrite < writeDebounce) {
      await new Promise(resolve =>
        setTimeout(resolve, lastFileWrite + writeDebounce - now)
      )
    }
    await fs.promises.writeFile(
      path.resolve(dir, prefix, file),
      contents,
      encoding
    )
    lastWrites[file] = Date.now()
  }

  /**
   * Write in `src` directory.
   */
  const write = (file, contents) => writeFile(file, contents, 'src')

  return { writeFile, write }
}

const parseShortcut = opts =>
  Array.isArray(opts) || typeof opts === 'string' ? { source: opts } : opts

const createFixture = async ({
  base = 'default',
  source,
  encoding = 'utf8',
  // avoid writing faster than this, or Chokidar (Snowpack) might miss the
  // second write -- probably because of its own polling and/or atomic delay
  // (even though it seems buggy that it _loses_ an event in this case, that's
  // what I see on Linux)
  writeDebounce = 100,
} = {}) => {
  // await init()

  const dir = await freeDir()

  const sources = Array.isArray(source) ? [...source] : source ? [source] : []

  if (base) {
    sources.unshift(base)
  }

  for (const src of new Set(sources)) {
    if (typeof src === 'object') {
      for (const [file, contents] of Object.entries(src)) {
        const filepath = path.resolve(dir, 'src', file)
        await fs.writeFile(filepath, contents, 'utf8')
      }
    } else {
      // string
      const from = path.resolve(sourceFixtures, src)
      await fs.copy(from, dir, { overwrite: true, dereference: true })
    }
  }

  let closed = false

  const close = async () => {
    if (closed) return
    closed = true
    await fs.remove(dir)
  }

  return { dir, close, ...fsHelpers({ dir, encoding, writeDebounce }) }
}

export default pipe(parseShortcut, createFixture)
