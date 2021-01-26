import * as path from 'path'
// import { firefox as Browser } from 'playwright'
import { chromium as Browser } from 'playwright'

const OPEN = process.env.OPEN == 1

const defaults = OPEN
  ? {
      headless: false,
      slowMo: 200,
      devtools: true,
    }
  : {}

let latches = 0
let locks = 0
let browserPromise

const getBrowser = async opts => {
  latches++
  if (latches === 1) {
    const userDir = path.resolve(__dirname, '../node_modules/.snowgun/chromium')
    if (OPEN) {
      browserPromise = Browser.launchPersistentContext(userDir, {
        ...defaults,
        ...opts,
      })
    } else {
      browserPromise = Browser.launch({ ...defaults, ...opts })
    }
  }
  return await browserPromise
}

const maybeClose = async () => {
  if (latches === 0 && locks === 0) {
    const browser = await browserPromise
    if (!browser) return
    await browser.close()
  } else if (latches < 0 || locks < 0) {
    throw new Error('Illegal state')
  }
}

const release = async () => {
  latches--
  maybeClose()
}

export const lock = () => {
  locks++
  let released = false
  return () => {
    if (released) return
    released = true
    locks--
    maybeClose()
  }
}

export default async opts => {
  const browser = await getBrowser(opts)

  // const context = await browser.newContext()
  const context = OPEN ? browser : await browser.newContext()

  const page = await context.newPage()

  await page.evaluate(() => {
    window.console.error = window.console.trace
  })

  if (OPEN) {
    page.setDefaultNavigationTimeout(0)
  }

  let released = false

  page.on('close', () => {
    if (released) return
    released = true
    release()
  })

  const close = async () => {
    await page.close()
    // await release()
  }

  return { page, close }
}
