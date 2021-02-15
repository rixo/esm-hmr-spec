# ESM HMR Spec

> A test suite to explore the behaviour of `esm-hmr` flavours.

The hope is that an objective and verifiable set of rules might help with aligning behind a standard API. For the greater good of ESM adapters implementers and, ultimately, the users of your tool.

## Install

```bash
git clone git@github.com:rixo/esm-hmr-spec.git
cd esm-hmr-spec
yarn
```

## Usage

```bash
yarn test --snowpack
```

```bash
yarn test --vite
```

## Development

`esm-hmr-spec` is powered by [test-hmr](https://github.com/rixo/test-hmr) v0.2+, itself powered by ~~poorly~~ lightly documented [zoar](https://github.com/rixo/zoar) test runner, and [zorax](https://github.com/rixo/zorax) extensions (themselves built upon the great [zora](https://github.com/lorenzofox3/zora) essentialist testing library).

Here are a few tips about the most useful commands you can use...

**NOTE** `thc` (test-hmr cli) is aliased as `test` in `package.json`, but all the following commands are really just running `thc` itself... You could just as well use `yarn thc` or `node_modules/.bin/thc`.

### Watch mode

```bash
yarn test --watch
```

In watch mode, pressing <kbd>Enter</kbd> will rerun the tests.

Also, further options can be passed / changed interactively, without the need to restart the test runner. The available options are essentially the same as the argument accepted by the cli (see bellow for a curated selection).

The interactive console accepts options in long (e.g. `--filter`) or shortcut (e.g. `-f`), with or without the leading `--` / `-`.

Adding `?` after the option name will display the current option value. Adding `!` will reset the option to `false` / empty.

Entering just `!!` (or pressing <kbd>Esc</kbd>) will reset all options to their _initial_ value (that is, the value that have been passed to the cli command).

So you can do something like this (`$` is the term, `>` is zoar's interactive console):

```bash
$ zoar -w -f sanity
...
> f? # show the current filter
> f! # reset the filter
...
> ls # print matched files (switches to ls mode)
> f single # change the filter (and rerun ls)
> run #  run the tests (switches back to run mode)
...
> ib # debug the test in Node (short for --inspect-brk)
...
> ib! # stop debugging in Node
...
> e OPEN # open the browser while running test (allowing for in-browser debugging)
...
> e? # display current env variables that are passed to the test process
> e! # stop opening browser while running test
...
> !! # reset to initial options (`-f sanity`, in this example)
```

In default interactive (watch) console, entering any command will rerun the tests immediately. When you want to change several options at once, this might not be desirable. You can switch to deferred interactive mode by pressing <kbd>:</kbd>. In this mode, options are changed without rerunning the tests. Go back to fully interactive mode by pressing <kbd>Enter</kbd> or <kbd>Ctrl+C</kbd>.

### Useful options

Help:

```bash
yarn test --help # -h
```

Run test process with `--inspect-brk` (allow debugging Snowpack code):

```bash
yarn test --inspect-brk # --ib
```

Open Playwright browser while running tests (with slowmo and also cancelling tests timeout -- allow debugging the JS running in the browser, by adding `debugger` in the fixtures' JS):

```bash
yarn test --open # -o
```

Display brower console output:

```bash
yarn test --console # -c
```

Filter tests by file name:

```bash
yarn test --filter sanity # -f sanity
```

Show the files matched by your filter:

```bash
yarn test --ls
```

Filter tests by test name:

```bash
yarn test --grep serve # -g serve
```

Print all the tests matched by the filters (instead of running them):

```bash
yarn test --print # -p
```

Modifier options can all be mixed and matched:

```bash
yarn test --filter sanity --grep serve --ls
yarn test --filter sanity --grep serve --print
```
