import { test, dev } from '.'

test('bubbled', dev(), async t => {
  const accept = t.spy(() => {})

  await t.page.exposeFunction('accept', accept)

  await t.fixture.write({
    'index.js': `
      import foo from './foo.js'

      document.body.innerHTML = 'hello ' + foo

      if (import.meta.hot) {
        import.meta.hot.accept(accept)
      }
    `,
    'foo.js': `
      export default 'foo'
    `,
  })

  await t.page.goto(t.server.url)

  await t.hmr.ready()

  accept.hasBeenCalled(0)

  await t.eqBody('hello foo', 'initial')

  let idle = accept.nextCall()

  await t.fixture.write({
    'index.js': `
      import foo from './foo.js'

      document.body.innerHTML = 'allo ' + foo

      if (import.meta.hot) {
        import.meta.hot.accept(accept)
      }
    `,
  })

  await idle

  accept.wasCalled('index accept handler has been called on index.js update')
  t.eq(accept.args[0][0].bubbled, false, 'bubbled is false on direct updates')

  idle = accept.nextCall()

  await t.fixture.write({
    'foo.js': `
      export default 'oof'
    `,
  })

  await idle

  accept.wasCalled('index accept handler has been called on foo.js update')
  t.eq(accept.args[1][0].bubbled, true, 'bubbled is true on transitive updates')

  await t.eqBody('allo oof', 'after foo.js update')
})
