/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    public: '/',
    src: '/dist',
  },
  plugins: [],
  packageOptions: {
    knownEntrypoints: [],
  },
  devOptions: {
    open: 'none',
  },
  buildOptions: {},
  routes: [],
  alias: {},
}
