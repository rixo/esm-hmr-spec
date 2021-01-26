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

let locks = 0
let browser

const getBrowser = async opts => {
  if (locks === 0) {
    await new Promise(resolve => setTimeout(resolve, 50))
    browser = await Browser.launch({ ...defaults, ...defaults })
  }
  locks++
  return browser
}

const release = async () => {
  locks--
  if (locks === 0) {
    await browser.close()
  } else if (locks < 0) {
    throw new Error('Illegal state')
  }
}

export default async opts => {
  const browser = await getBrowser(opts)

  const page = await browser.newPage()

  if (OPEN) {
    page.setDefaultNavigationTimeout(0)
  }

  const close = async () => {
    await page.close()
    await release()
  }

  return { page, close }
}
