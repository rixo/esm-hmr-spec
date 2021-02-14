module.exports = {
  ignore: ['**/node_modules', '**/.git', 'tmp/**'],

  exit: true,

  customOptions: [
    ['-t, --target <target>', 'set target', 'vite'],
    ['-o, --open', 'open playwright browser', false],
    ['-k, --keep', 'keep browser and dev server running after test completion', false],
    ['-b, --break', 'adds a browser breakpoint after test execution', false],
    ['-c, --console', 'log browser console to terminal', false],
  ],

  alias: {
    '--vite': '--target vite',
    '--snowpack': '--target snowpack',
  },
}
