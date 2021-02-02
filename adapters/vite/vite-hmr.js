export default {
  hmrReadyMessage: '[vite] connected.',
  // NOTE Vite doesn't provide update start message, but this should be
  // functionnaly equivalent as far as tests are concerned
  hmrStartMessage: /\[vite\] hot updated:/,
  hmrCompleteMessage: /\[vite\] hot updated:/,
}
