import { test, dev } from '.'

test('dynamic imports', dev(), async t => {
  const report = t.spy()
  const loaded = t.spy()

  await t.page.exposeFunction('report', report)
  await t.page.exposeFunction('loaded', loaded)

  await report.nextCallAfter(async () => {
    await t.fixture.write({
      'index.js': `
        import('./a.js').then(m => {
          report(m.default)
        })

        if (import.meta.hot) {
          import.meta.hot.accept()
        }

        loaded()
      `,
      'a.js': `
        export default 'a0'
      `,
      'b.js': `
        import a from './a.js'
        export default 'b0:' + a
      `,
    })

    await t.page.goto(t.server.url)

    await t.hmr.ready()
  })

  loaded.wasCalled()
  report.wasCalledWith('a0')

  // --- unaccepted dynamic import changes ---

  await report.nextCallAfter(async () => {
    await t.fixture.write({
      'a.js': `
        export default 'a1'
      `,
    })
  })

  loaded.wasCalled()
  report.wasCalledWith('a1')

  // --- importer changes ---

  await report.nextCallAfter(async () => {
    await t.fixture.write({
      'index.js': `
        import('./a.js').then(m => {
          report('>' + m.default)
        })

        if (import.meta.hot) {
          import.meta.hot.accept()
        }

        loaded()
      `,
    })
  })

  loaded.wasCalled('index is reloaded')
  report.wasCalledWith('>a1')

  // --- new importer ---
  //
  // ensure the dep gets correctly rewritten in a new importer
  //

  const reportB = t.spy()

  await t.page.exposeFunction('reportB', reportB)

  await reportB.nextCallAfter(async () => {
    await t.fixture.write({
      'index.js': `
        Promise.all([
          import('./a.js'),
          import('./b.js'),
        ])
        .then(([a, b]) => {
          report('>>' + a.default)
          reportB('>>' + b.default)
        })

        if (import.meta.hot) {
          import.meta.hot.accept()
        }

        loaded()
      `,
    })
  })

  loaded.wasCalled()
  report.wasCalledWith('>>a1')
  reportB.wasCalledWith('>>b0:a1')
})
