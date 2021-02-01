import { test, dev } from '.'

test('last version of CSS is not lost on importer update', dev(), async (t) => {
  const loaded = t.spy()

  await t.page.exposeFunction('loaded', loaded)

  const getStyle = () => t.page.$eval('body', (el) => getComputedStyle(el))

  // --- 0 ---
  {
    await loaded.nextCallAfter(async () => {
      await t.fixture.write({
        'index.js': `
          import './index.css'
          loaded()
          import.meta.hot.accept()
        `,
        'index.css': `
          body {
            color: red;
            background: black;
            font-size: 1px;
          }
        `,
      })

      await t.page.goto(t.server.url)

      await t.hmr.ready()
    })

    loaded.wasCalled()

    const style = await getStyle()
    t.eq(style.color, 'rgb(255, 0, 0)')
    t.eq(style.fontSize, '1px')
  }

  // --- 1: css update ---
  //
  // expected:
  // - new CSS is applied
  // - previous CSS is completly removed (background should reset)
  //
  {
    await Promise.all([
      await t.fixture.write({
        'index.css': `
          body {
            color: blue;
          }
        `,
      }),
      await t.hmr.idle(),
    ])

    loaded.wasNotCalled()

    const style = await getStyle()
    t.eq(style.color, 'rgb(0, 0, 255)', 'updated CSS is applied')
    t.eq(
      style.fontSize,
      '16px',
      'updated CSS completly replaces previous stylesheet'
    )
  }

  // --- 2: importer update
  //
  // expected: still applies last version of CSS
  //
  {
    await loaded.nextCallAfter(async () => {
      await t.fixture.write({
        'index.js': `
          import './index.css'
          loaded()
          import.meta.hot.accept()
        `,
      })
    })

    loaded.wasCalled()

    const style = await getStyle()
    t.eq(
      style.color,
      'rgb(0, 0, 255)',
      'last version of css is not forgotten when reimported'
    )
  }
})

test('orphan CSS lifecycle', dev(), async (t) => {
  const loaded = t.spy()

  await t.page.exposeFunction('loaded', loaded)

  const getStyle = () => t.page.$eval('body', (el) => getComputedStyle(el))

  // --- 0 ---
  {
    await loaded.nextCallAfter(async () => {
      await t.fixture.write({
        'index.js': `
          import './index.css'
          loaded()
          import.meta.hot.accept()
        `,
        'index.css': `
          body {
            color: red;
          }
        `,
      })

      await t.page.goto(t.server.url)

      await t.hmr.ready()
    })

    loaded.wasCalled()

    const style = await getStyle()
    t.eq(style.color, 'rgb(255, 0, 0)')
  }

  // --- 1: importer update ---
  //
  // expected: the stylesheet is unapplied in the browser
  //
  {
    await loaded.nextCallAfter(async () => {
      await t.fixture.write({
        'index.js': `
          loaded()
          import.meta.hot.accept()
        `,
      })
    })

    loaded.wasCalled()

    const style = await getStyle()
    t.eq(
      style.color,
      'rgb(0, 0, 0)',
      'stylesheet is removed when it has no more active importers'
    )
  }

  // --- 2: import the unmodified CSS back on the page ---
  //
  // expected: the CSS is reapplied immediately
  //
  {
    await loaded.nextCallAfter(async () => {
      await t.fixture.write({
        'index.js': `
            import './index.css'
            loaded()
            import.meta.hot.accept()
          `,
      })
    })

    loaded.wasCalled()

    const style = await getStyle()
    t.eq(
      style.color,
      'rgb(255, 0, 0)',
      'removed stylesheet is added back when imported again'
    )
  }

  // --- 3: remove the CSS again ---
  //
  // expected: the CSS is unapplied
  //
  {
    await loaded.nextCallAfter(async () => {
      await t.fixture.write({
        'index.js': `
          loaded()
          import.meta.hot.accept()
        `,
      })
    })

    loaded.wasCalled()

    const style = await getStyle()
    t.eq(
      style.color,
      'rgb(0, 0, 0)',
      'stylesheet is removed when it has no more active importers again'
    )
  }

  // --- 4: update CSS while not imported ---
  //
  // expected: the CSS is not reapplied in the browser
  //
  {
    await t.fixture.write({
      'index.css': `
        body {
          color: rgb(0, 255, 0);
        }
      `,
    })

    // give some time for the incorrect update to happen
    await new Promise((resolve) => setTimeout(resolve, 50))

    loaded.wasNotCalled()

    const style = await getStyle()
    t.eq(
      style.color,
      'rgb(0, 0, 0)',
      'stylesheet is not reapplied if modified while not imported'
    )
  }

  // --- 5: reimport CSS ---
  //
  // expected: modified stylesheet (while not imported) is now applied
  //
  {
    await loaded.nextCallAfter(async () => {
      await t.fixture.write({
        'index.js': `
          import './index.css'
          loaded()
          import.meta.hot.accept()
        `,
      })
    })

    loaded.wasCalled()

    const style = await getStyle()
    t.eq(
      style.color,
      'rgb(0, 255, 0)',
      'stylesheet modified while not imported is applied when imported again'
    )
  }
})
