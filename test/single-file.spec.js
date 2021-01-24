import * as fs from 'fs'
import * as path from 'path'

import { test, dev } from '.'

test('single file', dev(), async t => {
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

  accept.hasBeenCalled(0)

  await t.eqBody('hello', 'initial')

  let idle = accept.nextCall()

  await t.fixture.write({
    'index.js': `
      document.body.innerHTML = 'How are you?'
      if (import.meta.hot) {
        import.meta.hot.accept(accept2)
      }
    `,
  })

  await idle

  accept.hasBeenCalled(1, 'accept handler has been called')

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

  accept.hasBeenCalled(2, 'initial accept handler been called again')
  accept2.hasBeenCalled(0, 'non initial accept handlers are ignored')
})
