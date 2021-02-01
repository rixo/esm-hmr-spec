export { default as serve } from './serve.js'

export const hmr = {
  hmrStartMessage: (msg) => msg.startsWith('[ESM-HMR] message: update '),
  hmrCompleteMessage: '[ESM-HMR] up to date',
  hmrReadyMessage: '[ESM-HMR] listening for file changes...',
}
