# cli.js

A helpful wrapper around [command-line-args](https://www.npmjs.com/package/command-line-args) and [command-line-usage](https://www.npmjs.com/package/command-line-usage).

- Easily define single or multi-command CLI program
- Adds required options
- Suggests possible fixes for typos in flags or sub-commands
- Built in `--help` flag
- Add documentation footers to commands
- Automatically add color to command types
- Type checked!

## Installation

```sh
yarn add @liplum/cli
# or
npm i --save @liplum/cli
```

## Usage

### A simple single cli program

```ts
import { cli, Command } from '@liplum/cli';

const echo: Command = {
  name: 'echo',
  description: 'Print a string to the terminal',
  examples: ['echo foo', 'echo "Intense message"'],
  require: ['value'],
  options: [
    {
      name: 'value',
      type: String,
      defaultOption: true,
      description: 'The value to print'
    }
  ]
};

const args = cli(echo);

// $ echo foo
console.log(args);
// output: { value: "foo" }
```

### Complex examples

```ts
import cli, { Command } from '@liplum/cli';

const echo: Command = {
  examples: [{ example: 'echo foo', desc: 'The default use case' }],
  ...
};
```

### Multi Command

You can even nest multi-commands!

```ts
import cli, { Command } from '@liplum/cli';

const test: Command = { ... };
const lint: Command = { ... };
const scripts: MultiCommand = {
  name: 'scripts',
  descriptions: 'my tools',
  commands: [test, lint]
};

const args = cli(scripts);

// $ scripts test --fix
console.log(args);
// output: { _command: 'test', fix: true }
```

### Footers

Add additional docs to your commands with Footers.

```ts
const echo: Command = {
  name: 'echo',
  description: 'Print a string to the terminal',
  examples: ['echo foo', 'echo "Intense message"'],
  options: [
    {
      name: 'value',
      type: String,
      defaultOption: true,
      description: 'The value to print'
    }
  ],
  footer: 'Only run this if you really need to',
  // or
  footer: {
    header: 'Additional Info',
    content: 'Only run this if you really need to'
  },
  // or
  footer: [
    {
      header: 'Additional Info',
      content: 'Only run this if you really need to'
    }
  ]
};
```

### Code in footers

To display code in a footer set `code` to true.

```ts
const echo: Command = {
  name: 'echo',
  description: 'Print a string to the terminal',
  examples: ['echo foo', 'echo "Intense message"'],
  options: [
    {
      name: 'value',
      type: String,
      defaultOption: true,
      description: 'The value to print'
    }
  ],
  footer: {
    header: 'Additional Info',
    code: true,
    content: 'function foo (){\n  return 1;\n}'
  }
};
```

### Require One or Another

To require on of multiple flags simply make on of the items in the required array an array of `n` options.

```ts
const echo: Command = {
  name: 'one-or-another',
  description: "Errors if one of the flags isn't provided",
  examples: ['one-or-another --a', 'one-or-another --b'],
  required: [['a', 'b']],
  options: [
    {
      name: 'a',
      type: Boolean,
      description: 'One options'
    },
    {
      name: 'b',
      type: Boolean,
      description: 'another option'
    }
  ]
};
```

## Options

### argv

Provide `argv` manually.

```ts
const args = cli(echo, { argv: ['--help'] });
```

### showHelp

Whether to show the help dialog. Defaults to `true`

```ts
const args = cli(echo, { showHelp: false });
```

### camelCase

Whether to camelCase the parsed options. Defaults to `true`

```ts
const args = cli(echo, { camelCase: false });
```

### error

Configure how `@liplum/cli` reports errors.

- exit - (default) print error message and exit process
- throw - throw error message
- object - return the error message on an object with key `error`
