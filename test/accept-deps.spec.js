import { test, dev } from './index.js'

const targets = ['snowpack']

test('Snowpack: accept(deps, handler)', dev(), targets, async (t) => {
  const loaded = await t.pageSpy('loaded')
  const report = await t.pageSpy('report')
  const accept = await t.pageSpy('accept')

  // --- 0 ---
  {
    await loaded.nextCallAfter(async () => {
      await t.fixture.write({
        'index.js': `
          import foo from './foo.js'

          report(foo)

          loaded()

          import.meta.hot.accept(['./foo.js'], ({ deps: [foo] }) => {
            accept(foo.default)
          })
        `,
        'foo.js': `
          export default 'foo0'
        `,
      })

      await t.page.goto(t.server.url)

      await t.hmr.ready()
    })

    loaded.wasCalled()
    report.wasCalledWith('foo0')
  }

  // --- 1: change unaccepted dep ---
  //
  // expected: importer's accept handler is called and passed the latest version
  //           of the dep
  //
  {
    await accept.nextCallAfter(async () => {
      await t.fixture.write({
        'foo.js': `
          export default 'foo1'
        `,
      })
    })

    loaded.wasCalled()
    report.wasCalledWith('foo1')
    accept.wasCalledWith('foo1')
  }
})

test('accept deps: accepted & updated dep', dev(), targets, async (t) => {
  const loaded = await t.pageSpy('loaded')
  const report = await t.pageSpy('report')
  const accept = await t.pageSpy('accept')

  // --- 0 ---
  {
    await loaded.nextCallAfter(async () => {
      await t.fixture.write({
        'index.js': `
          import foo from './foo.js'

          report(foo)

          loaded('index')

          export default 0

          import.meta.hot.accept(['./foo.js'], ({ module, deps: [foo] }) => {
            accept(module.default + ' => ' + foo.default)
          })
        `,
        'store.js': `
          let last = -1
          export default () => ++last
        `,
        'foo.js': `
          import next from './store.js'

          export default 'foo' + next()

          import.meta.hot.accept()
        `,
      })

      await t.page.goto(t.server.url)

      await t.hmr.ready()
    })

    loaded.wasCalledWith('index')
    report.wasCalledWith('foo0')
  }

  // --- 1: change foo ---
  {
    await loaded.nextCallAfter(async () => {
      await t.fixture.write({
        'foo.js': `
          import next from './store.js'

          export default 'foo' + next()

          import.meta.hot.accept()

          loaded('foo')
        `,
      })
    })

    loaded.wasCalledWith('foo')
    report.wasNotCalled()
  }

  // --- 2: change index ---
  //
  // expected: get the existing copy of foo, not a dup module
  //
  {
    // simulate user delay before changing the next file
    await new Promise((resolve) => setTimeout(resolve, 3))

    await accept.nextCallAfter(async () => {
      await t.fixture.write({
        'index.js': `
          import foo from './foo.js'

          report(foo)

          loaded('index')

          export default 1

          import.meta.hot.accept(['./foo.js'], ({ module, deps: [foo] }) => {
            accept(module.default + ' => ' + foo.default)
          })
        `,
      })
    })

    loaded.wasCalled('index is rerun').with('index')
    report
      .wasCalled('importer receives the last version of the dep')
      .with('foo1')
    accept
      .wasCalled('the dep module is not duplicated in accept handler')
      .with('1 => foo1')
  }
})
