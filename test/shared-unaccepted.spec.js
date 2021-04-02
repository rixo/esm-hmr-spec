import { test, dev } from './index.js'

/**
 * See: https://github.com/snowpackjs/snowpack/discussions/2238
 *
 * index -> a, b
 * a+ -> transitive
 * b+ -> transitive
 *
 * transitive <==
 *
 * => a and b get same copy of transitive
 */
test('shared unaccepted deps', dev(), async (t) => {
  const reportA = t.spy()
  const reportB = t.spy()

  await t.page.exposeFunction('reportA', reportA)
  await t.page.exposeFunction('reportB', reportB)

  const reportsNextCall = () =>
    Promise.all([reportA, reportB].map((spy) => spy.nextCall()))

  const moduleArg = t.isSnowpack() ? '{ module }' : 'module'

  // --- 0 ---

  let reportsCalled = reportsNextCall()

  await t.fixture.write({
    'index.js': `
      import a from './a.js'
      import b from './b.js'

      a.subscribe(({ value }) => {
        reportA(value)
      })

      b.subscribe(({ value }) => {
        reportB(value)
      })
    `,

    'a.js': `
      import transitive from './transitive.js'

      let _callback

      const a = {
        value: 'a-' + transitive,
        subscribe: fn => {
          _callback = fn
          fn(a)
        }
      }

      export default a

      if (import.meta.hot) {
        import.meta.hot.accept((${moduleArg}) => {
          a.value = module.default.value
          _callback(a)
        })
      }
    `,

    'b.js': `
      import transitive from './transitive.js'

      let _callback

      const b = {
        value: 'b-' + transitive,
        subscribe: fn => {
          _callback = fn
          fn(b)
        }
      }

      export default b

      if (import.meta.hot) {
        import.meta.hot.accept((${moduleArg}) => {
          b.value = module.default.value
          _callback(b)
        })
      }
    `,

    'transitive.js': `
      if (!window.nextValue) {
        window.nextValue = 0
      }
      export default window.nextValue++
    `,
  })

  await t.page.goto(t.server.url)

  reportA.wasCalledWith('a-0')
  reportB.wasCalledWith('b-0')

  // --- 2 ---

  reportsCalled = reportsNextCall()

  await t.fixture.write({
    'transitive.js': `
      export default window.nextValue++
    `,
  })

  await reportsCalled

  reportA.wasCalledWith('a-1')
  reportB.wasCalledWith('b-1')
})
