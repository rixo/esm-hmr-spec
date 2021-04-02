import { test, dev } from './index.js'

// Exploratory: ensure we don't get out of sync with the update param on initial
// page load / full reload.
//
test.skip('full page reload', dev(), async (t) => {
  const loaded = await t.pageSpy('loaded')
  const accept = await t.pageSpy('accept')
  const report = await t.pageSpy('report')

  await t.page.evaluate(() => {
    debugger
  })

  // --- 0 ---
  {
    await loaded.nextCallAfter(async () => {
      await t.fixture.write({
        'index.js': `
          import foo from './foo.js'

          export const my = 'my:' + foo

          report(foo)

          loaded()

          import.meta.hot.accept(({ module: { my } }) => {
            accept(my)
          })
        `,
        'foo.js': `
          export default 'foo-0'
        `,
      })

      await t.page.goto(t.server.url)

      await t.hmr.ready()
    })

    loaded.wasCalled()
    accept.wasNotCalled()
    report.wasCalledWith('foo-0')
  }

  // --- 1: change foo ---
  {
    await loaded.nextCallAfter(async () => {
      await t.fixture.write({
        'foo.js': `
          export default 'foo-1'
        `,
      })
    })

    loaded.wasCalled()
    accept.wasCalledWith('my:foo-1')
    report.wasCalledWith('foo-1')
  }

  // --- 2: full reload ---
  {
    t.hmr.expectNavigation()

    await t.page.reload()

    await t.page.evaluate(() => {
      debugger
    })
  }
})
