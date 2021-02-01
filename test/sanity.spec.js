import * as fs from 'fs'
import * as path from 'path'
import { describe, test, serve, browse, fixture, dev, checkpoints } from '.'

test('zorax', (t) => {
  t.ok(true)
})

test('browse', browse(), checkpoints(), async (t) => {
  t.ok(t.browser, 'provides t.browser')
  t.ok(t.page, 'provides t.page')

  const check = t.checkpoints(2)

  await t.test('concurency', browse(), async (t) => {
    check()
  })

  check()
})

test('serve', serve(), browse(), async (t) => {
  t.ok(t.server, 'provides t.server')
  t.ok(t.server.url, 't.server has a url')

  await t.page.goto(t.server.url)

  t.eq(
    await t.page.$eval('h1', (el) => el.innerHTML),
    'Welcome to Snowpack!',
    'can test the page'
  )
})

describe('fixture', () => {
  test('defaults', fixture(), async (t) => {
    t.ok(t.fixture, 'provides t.fixture')
    t.ok(typeof t.fixture.dir === 'string', 't.fixture object has a dir')
  })

  test(
    'fixture inline files',
    fixture([
      {
        'index.js': '// hello',
      },
    ]),
    async (t) => {
      const indexFile = path.resolve(t.fixture.dir, 'src/index.js')
      const index = await fs.promises.readFile(indexFile, 'utf8')
      t.eq(index, '// hello')
    }
  )
})

test('dev', dev({ fixture: 'hmr', open: true }), async (t) => {
  t.ok(t.fixture, 'provides t.fixture')
  t.ok(t.browser, 'provides t.browser')
  t.ok(t.page, 'provides t.page')
  t.ok(t.server, 'provides t.server')
  t.eq(
    await t.page.$eval('h1', (el) => el.innerHTML),
    'bim!',
    'opens the page of the server URL'
  )
})
