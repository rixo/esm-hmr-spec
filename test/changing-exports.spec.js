import { test, dev } from './index.js'

/**
 * index+ -> foo
 * foo
 *
 * foo <==
 *
 * => index gets reloaded and gets last version of foo
 *
 * index <==
 *
 * => index gets reloaded and still use last version of foo
 *
 * foo <==
 *
 * => index gets updated, gets new version of foo
 */
test('changing exports: unaccepted exporter', dev(), async (t) => {
  const moduleArg = t.isSnowpack() ? '{ module }' : 'module'

  const report = t.spy()

  await t.page.exposeFunction('report', report)

  // --- 0 ---

  await t.fixture.write({
    'index.js': `
      import { a } from './foo.js'

      export default a

      if (import.meta.hot) {
        import.meta.hot.accept((${moduleArg}) => {
          report(module.default)
        })
      }
    `,
    'foo.js': `
      export const a = 'a0'
    `,
  })

  await t.page.goto(t.server.url)

  await t.hmr.ready()

  // --- 1 ---

  await report.nextCallAfter(async () => {
    await t.fixture.write({
      'foo.js': `
        export const a = 'a1'
        export const b = 'b1'
        export const c = 'c1'
      `,
    })
  })

  report.wasCalledWith('a1')

  // --- 2 ---

  await report.nextCallAfter(async () => {
    await t.fixture.write({
      'index.js': `
        import { a, b } from './foo.js'

        export default a + b

        if (import.meta.hot) {
          import.meta.hot.accept((${moduleArg}) => {
            report(module.default)
          })
        }
      `,
    })
  })

  report.wasCalledWith('a1b1')

  // --- 3. Change index.js ---
  //
  // Expected: still sees new exports
  //
  // (could be lost if ?mtime is missing or incorrect in '/.foo.js?mtime=...')
  //

  await report.nextCallAfter(async () => {
    await t.fixture.write({
      'index.js': `
        import { a, b, c } from './foo.js'

        export default a + b + c

        if (import.meta.hot) {
          import.meta.hot.accept((${moduleArg}) => {
            report(module.default)
          })
        }
      `,
    })
  })

  report.wasCalledWith('a1b1c1')

  // --- 4. Change foo.js again ---
  //
  // Expected: don't get a full reload
  //

  await report.nextCallAfter(async () => {
    await t.fixture.write({
      'foo.js': `
        export const a = 'a2'
        export const b = 'b2'
        export const c = 'c2'
      `,
    })
  })

  report.wasCalledWith('a2b2c2')
})
