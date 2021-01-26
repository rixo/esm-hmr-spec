import { test, dev } from '.'

test('last version of CSS is not lost on importer update', dev(), async t => {
  const loaded = t.spy()

  await t.page.exposeFunction('loaded', loaded)

  const getStyle = () => t.page.$eval('body', el => getComputedStyle(el))

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
      await t.hmr.update(),
    ])

    loaded.wasNotCalled()

    await new Promise(resolve => setTimeout(resolve, 150))

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
    await Promise.all([
      await t.fixture.write({
        'index.js': `
          import './index.css'
          loaded()
          import.meta.hot.accept()
        `,
      }),
      await t.hmr.update(),
    ])

    loaded.wasNotCalled()

    await new Promise(resolve => setTimeout(resolve, 150))

    const style = await getStyle()
    t.eq(
      style.color,
      'rgb(0, 0, 255)',
      'last version of css is not forgotten when reimported'
    )
  }
})

// TODO should it? (probably, that's what you'd get in an app that _never_
// imports it)
test.skip('CSS is removed when no more importers', dev(), async t => {
  const loaded = t.spy()

  await t.page.exposeFunction('loaded', loaded)

  const getStyle = () => t.page.$eval('body', el => getComputedStyle(el))

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

  // --- 1: importer update
  //
  // expected: still applies last version of CSS
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

    await new Promise(resolve => setTimeout(resolve, 150))

    const style = await getStyle()
    t.eq(
      style.color,
      'rgb(0, 0, 0)',
      'stylesheet is removed when it has no more active importers'
    )
  }
})
