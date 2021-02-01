/**
 * HMR adapter
 */

const CONSOLE = process.env.CONSOLE == 1

const Deferred = () => {
  let resolve, reject
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
  })
  return { promise, resolve, reject }
}

const shouldIgnore = (ignore, err) => {
  if (typeof ignore === 'function') {
    if (ignore(err)) return true
  } else if (typeof ignore === 'string') {
    if (err && err.message === ignore) return true
  } else {
    throw new Error('Unsuported ignore type', typeof ignore, ignore)
  }
  return false
}
const ignoreErrors = (handler, ignores) => async (...args) => {
  try {
    return await handler(...args)
  } catch (err) {
    for (const ignore of ignores) {
      if (shouldIgnore(ignore, err)) return
    }
    throw err
  }
}

export default ({ page, options }) => {
  const readyDeferred = Deferred()
  let updateDeferred = Deferred()
  let idleDeferred = Deferred()
  let errorDeferred = Deferred()

  let lastUpdate

  const pushError = (error) => {
    errorDeferred.reject(error)
    errorDeferred = Deferred()
  }

  const handleConsole = async (e) => {
    if (page.isClosed()) return
    if (e.type() === 'error') {
      const args = await Promise.all(
        e
          .args()
          .slice(1)
          .map((x) => x.jsonValue())
      )
      console.error(e.text(), args)
      pushError([e.text().replace(' JSHandle@error', ''), ...args].join(' '))
    } else if (CONSOLE) {
      console.log(
        '>>',
        e.text()
        // await Promise.all(e.args().map(x => x.jsonValue()))
      )
    }
    if (page.isClosed()) return
    const text = e.text()
    if (text.startsWith('[ESM-HMR] message: update ')) {
      const args = e.args()
      lastUpdate = await args[2].jsonValue()
      updateDeferred.resolve(lastUpdate)
      updateDeferred = Deferred()
    } else if (text === '[ESM-HMR] up to date') {
      idleDeferred.resolve()
      idleDeferred = Deferred()
    } else if (text === '[ESM-HMR] listening for file changes...') {
      readyDeferred.resolve()
      idleDeferred.resolve()
      idleDeferred = Deferred()
    }
  }

  page.on(
    'console',
    ignoreErrors(handleConsole, [
      'Target page, context or browser has been closed',
      'Protocol error (Runtime.callFunction): Target isClosed().undefined',
      'Protocol error (Runtime.callFunctionOn): Target closed.',
      'Execution context was destroyed, most likely because of a navigation.',
    ])
  )

  const ready = () => readyDeferred.promise

  const update = () => updateDeferred.promise

  const idle = () => idleDeferred.promise

  const nextConsoleError = async () => {
    const error = await errorDeferred.promise
    if (page.isClosed()) return
    if (isExpectedError(error)) return nextConsoleError()
    return error
  }

  // --- Expected navigation ---

  let expectedNavigation

  const expectNavigation = () => {
    expectedNavigation++
  }

  const consumeExpectedNavigation = () => {
    if (expectedNavigation < 1) return false
    expectedNavigation--
    return true
  }

  // ------

  return {
    ready,
    update,
    idle,
    nextConsoleError,
    expectNavigation,
    consumeExpectedNavigation,
    get lastUpdate() {
      return lastUpdate
    },
  }
}
