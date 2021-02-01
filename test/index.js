import { plug } from 'zorax'

import _browse, { lock as lockBrowser } from '../lib/browse'
import _fixture from '../lib/fixture'
import _serve from '../lib/snowpack/serve'
import _hmr from '../lib/snowpack/hmr'

const extractData = args =>
  typeof args[args.length - 1] === 'function' ? null : args.pop()

const closable = (get, errorHandler) => opts =>
  async function zora_spec_fn(t, next, ...args) {
    const [close, service] = await get(opts)

    Object.assign(t, service)

    const promises = [next(t, ...args)]

    // Timeout
    //
    // NOTE disabled when browser is open for debugging
    //
    if (process.env.OPEN != 1) {
      promises.push(
        new Promise((resolve, reject) =>
          setTimeout(() => reject(new Error('Timeout after 5s')), 5000)
        )
      )
    }

    if (errorHandler) {
      promises.push(errorHandler(service))
    }

    await Promise.race(promises)

    await close()
  }

export const serve = closable(async opts => {
  const { close, ...server } = await _serve(opts)
  return [close, { server }]
})

export const browse = closable(async opts => {
  const { close, ...browser } = await _browse(opts)
  return [
    close,
    {
      browser,
      page: browser.page,
    },
  ]
})

export const fixture = closable(async opts => {
  const fixture = await _fixture(opts)
  return [fixture.close, { fixture }]
})

export const dev = closable(
  async arg => {
    const userOpts =
      typeof arg === 'string' || Array.isArray(arg)
        ? { fixture: arg }
        : arg || {}

    const { open = false, ...opts } = userOpts

    const { close: closeFixture, ...fixture } = await _fixture(opts.fixture)

    const [
      { close: closeServer, ...server },
      { close: closeBrowser, ...browser },
    ] = await Promise.all([
      _serve({ fixture, ...opts.serve }),
      _browse(opts.browse),
    ])

    const { page } = browser

    const hmr = _hmr({ page, ...opts.hmr })

    if (open) {
      const url = open === true ? '/' : open
      await browser.page.goto(server.url + url)
    }

    return [
      async () => {
        await Promise.all([
          closeBrowser(),
          Promise.resolve().then(async () => {
            await closeServer()
            await new Promise(resolve => setTimeout(resolve, 100))
            await closeFixture()
          }),
        ])
      },
      {
        fixture,
        server,
        browser,
        page,
        hmr,
      },
    ]
  },
  ({ page, hmr }) =>
    Promise.race([
      hmr.nextConsoleError().catch(err => {
        throw `Unexpected console error:\n\n${err}`
      }),
      new Promise((resolve, reject) => {
        page.exposeFunction('reportError', err => {
          reject(new Error(`Unexpected error: ${err}`))
        })
      }),
      new Promise((resolve, reject) => {
        let loaded = false
        page.on('framenavigated', () => {
          if (!loaded) {
            loaded = true
            return
          }
          if (hmr.consumeExpectedNavigation()) {
            return
          }
          reject(new Error('Unexpected page navigation'))
        })
      }),
    ])
)

export const checkpoints = () =>
  async function zora_spec_fn(t, next, ...args) {
    const after = []

    t.checkpoints = (expected, msg = 'pass all checkpoints') => {
      const checkpoints = []

      const check = name => {
        checkpoints.push(name)
      }

      after.push(() => {
        t.eq(checkpoints.length, expected, msg)
      })

      return check
    }

    await next(t, ...args)

    for (const fn of after) {
      fn()
    }
  }

export const { test, describe } = plug([
  {
    name: 'isFunction',
    test(t) {
      t.isFunction = (x, msg = 'should be a function') =>
        t.ok(typeof x === 'function', msg)
    },
  },

  {
    name: 'eqBody',
    test(t) {
      t.eqBody = async (content, message = `body should be ${content}`) =>
        t.eq(await t.page.$eval('body', el => el.innerHTML), content, message)
    },
  },

  {
    name: 'report time',
    report(h) {
      const started = Date.now()
      return () => {
        const elapsed = Date.now() - started
        let msg
        if (elapsed < 1000) {
          msg = `${elapsed}ms`
        } else {
          msg = `${(elapsed / 1000).toFixed(2)}s`
        }
        console.info(` ${msg}`)
        console.info()
      }
    },
  },

  {
    name: 'lock browser',
    report: () => lockBrowser(),
  },

  {
    name: 'pageSpy',
    test(t) {
      t.pageSpy = async (name, ...args) => {
        const spy = t.spy(...args)
        await t.page.exposeFunction(name, spy)
        return spy
      }
    },
  },
])
