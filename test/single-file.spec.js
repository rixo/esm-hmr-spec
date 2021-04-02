import { test, dev } from './index.js'

test('single file', dev(), async (t) => {
  const accept = t.spy()
  const accept2 = t.spy()
  const notify = t.spy()

  await t.page.exposeFunction('notify', notify)
  await t.page.exposeFunction('accept', accept)
  await t.page.exposeFunction('accept2', accept2)

  await t.fixture.write({
    'index.js': `
      document.body.innerHTML = 'hello'

      if (import.meta.hot) {
        import.meta.hot.accept(() => {
          accept()
        })
      }

      notify()
    `,
  })

  await t.page.goto(t.server.url)

  await t.hmr.ready()

  accept.wasNotCalled()

  await t.eqBody('hello', 'initial')

  let idle = Promise.race([accept.nextCall(), accept2.nextCall()])

  await t.fixture.write({
    'index.js': `
      document.body.innerHTML = 'How are you?'
      if (import.meta.hot) {
        import.meta.hot.accept(accept2)
      }
    `,
  })

  await idle

  accept.wasCalled('accept handler has been called')

  await t.eqBody('How are you?', 'after second update')

  idle = Promise.race([accept.nextCall(), accept2.nextCall()])

  await t.fixture.write({
    'index.js': `
      document.body.innerHTML = 'Bye!'
      if (import.meta.hot) {
        import.meta.hot.accept(accept2)
      }
    `,
  })

  await idle

  await t.eqBody('Bye!', 'after second update')

  if (t.isSnowpack()) {
    accept.wasCalled('initial accept handler was called again')
    accept2.wasNotCalled('non initial accept handlers are ignored')
  } else {
    accept.wasNotCalled('initial accept handler has been replaced')
    accept2.wasCalled('new accept handler has been called')
  }
})
