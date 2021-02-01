import { test, dev } from '.'

test('import.meta.hot.invalidate()', dev(), async t => {
  const loaded = await t.pageSpy('loaded')
  const accept = await t.pageSpy('accept')
  const report = await t.pageSpy('report')
  const reportFoo = await t.pageSpy('reportFoo')

  // --- 0 ---
  {
    await loaded.nextCallAfter(async () => {
      await t.fixture.write({
        'index.js': `
          import foo, { a } from './foo.js'

          reportFoo(foo)

          report(a)

          loaded()

          import.meta.hot.accept()
        `,
        'foo.js': `
          export default 'foo0'

          export const a = 'a0'

          import.meta.hot.accept(
            async ({ module }) => {
              accept(module.default, module.a)
              import.meta.hot.invalidate()
            }
          )
        `,
      })

      await t.page.goto(t.server.url)

      await t.hmr.ready()
    })

    loaded.wasCalled()
    accept.wasNotCalled()
    reportFoo.wasCalledWith('foo0')
    report.wasCalledWith('a0')
  }

  // --- 1 ---
  {
    await reportFoo.nextCallAfter(async () => {
      await t.fixture.write({
        'foo.js': `
          export default 'foo1'

          export const a = 'a1'

          import.meta.hot.accept(({ module }) => {
            accept(module.default, module.a)
            import.meta.hot.invalidate()
          })
        `,
      })
    })

    accept.wasCalledWith('foo1', 'a1')
    reportFoo.wasCalledWith('foo1')

    // FIXME conditional bubble
    // should bubble when the accept handler returns false
    t.test('conditional bubble', () => {
      loaded.wasCalled()
      report.wasCalledWith('a1')
    })
  }

  // --- 2 ---
  {
    await loaded.nextCallAfter(async () => {
      await t.fixture.write({
        'index.js': `
          import foo, { a } from './foo.js'

          reportFoo(foo)

          report(a)

          loaded()

          import.meta.hot.accept()
        `,
      })
    })

    loaded.wasCalled()
    accept.wasNotCalled()
    reportFoo.wasCalledWith('foo1')
    report.wasCalledWith('a1')
  }
})
