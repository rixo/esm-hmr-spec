import { test, dev } from '.'

/**
 * index -> a, b
 * a+
 * b+ -> a
 *
 * a+ <==
 *
 * b+ <==
 *
 * => b gets last version of a
 */
test('importing updated file', dev({ open: false }), async (t) => {
  const reportA = t.spy(() => {})
  const reportB = t.spy(() => {})

  await t.page.exposeFunction('reportA', reportA)
  await t.page.exposeFunction('reportB', reportB)

  let reported = Promise.all([reportA, reportB].map((spy) => spy.nextCall()))

  await t.fixture.write({
    'index.js': `
      import './a.js'
      import './b.js'
    `,
    'a.js': `
      const value = 'a0'

      export default value

      reportA(value)

      if (import.meta.hot) {
        import.meta.hot.accept()
      }
    `,
    'b.js': `
      import a from './a.js'

      const value = 'b0:' + a

      export default value

      reportB(value)

      if (import.meta.hot) {
        import.meta.hot.accept()
      }
    `,
  })

  await t.page.goto(t.server.url)

  await reported

  reportA.wasCalledWith('a0')
  reportB.wasCalledWith('b0:a0')

  // --- a changes ---

  await reportA.nextCallAfter(async () => {
    await t.fixture.write({
      'a.js': `
        const value = 'a1'

        export default value
        debugger

        reportA(value)

        if (import.meta.hot) {
          import.meta.hot.accept()
        }
      `,
    })
  })

  reportA.wasCalledWith('a1')
  reportB.wasNotCalled()

  // --- b changes ---

  await reportB.nextCallAfter(async () => {
    await t.fixture.write({
      'b.js': `
        import a from './a.js'

        const value = 'b1:' + a

        export default value

        reportB(value)

        if (import.meta.hot) {
          import.meta.hot.accept()
        }
      `,
    })
  })

  reportA.wasNotCalled()
  reportB.wasCalledWith('b1:a1')
})
