import { test, dev } from '.'

test('dispose handler', dev(), async (t) => {
  const loaded = t.spy()
  const report = t.spy()
  const dispose = t.spy()

  await Promise.all([
    t.page.exposeFunction('loaded', loaded),
    t.page.exposeFunction('report', report),
    t.page.exposeFunction('dispose', dispose),
  ])

  // --- 0 ---
  {
    await loaded.nextCallAfter(async () => {
      await t.fixture.write({
        'index.js': `
          import.meta.hot.dispose(data => {
            dispose(0, data)
            import.meta.hot.data.x = 42
          })

          import.meta.hot.accept()

          loaded()
        `,
      })

      await t.page.goto(t.server.url)

      await t.hmr.ready()
    })

    loaded.wasCalled()
    dispose.wasNotCalled()
  }

  // --- 1 ---
  //
  // expected: import.meta.hot.data is made available to next version
  //
  {
    await loaded.nextCallAfter(async () => {
      await t.fixture.write({
        'index.js': `
          import.meta.hot.dispose(data => {
            dispose(1, data)
            import.meta.hot.data.x = 43
          })

          import.meta.hot.accept()

          loaded(import.meta.hot.data)
        `,
      })
    })

    loaded.wasCalled('hot.data is passed to next version').with({ x: 42 })
    if (t.isSnowpack()) {
      // but shouldn't it?
      dispose
        .wasCalled('data is not passed as arg to dispose handler')
        .with(0, null)
    } else {
      dispose.wasCalled('data is passed to dipose handler').with(0, {})
    }
  }

  // --- 3 ---
  //
  // expected: it's the dispose callback from the last version of the module
  //           that is called
  //
  {
    await loaded.nextCallAfter(async () => {
      await t.fixture.write({
        'index.js': `
          import.meta.hot.dispose(data => {
            dispose(2, data)
          })

          import.meta.hot.accept()

          loaded(import.meta.hot.data)
        `,
      })
    })

    loaded.wasCalled('hot.data is passed to next next version').with({ x: 43 })
    if (t.isSnowpack()) {
      dispose
        .wasCalled("it's the last dispose handler that is called")
        .with(1, null)
    } else {
      dispose.wasCalled('data is passed to dipose handler').with(1, { x: 42 })
    }
  }
})
