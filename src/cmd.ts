import commandLineUsage from 'command-line-usage';

/** An options for a CLI command */
export type Option = commandLineUsage.OptionDefinition;

/** A detailed example of the usage of a CLI command */
export interface Example {
  /** A description of what the example is showcasing */
  desc: string;
  /** The actual example */
  example: string;
};

export type Section = commandLineUsage.Section & {
  /** Whether the body of the section should be formatted like a code block */
  code?: boolean;
};


/** A command for a CLI */
export interface Command {
  /** The name of the CLI command. Used when running in a terminal */
  name: string;
  /** A description of what the command does */
  description: string;
  /** Options that the command can accept */
  options?: Option[];
  /**
   * A list of what options are required.
   * You can also have 1 of multiple required options.
   * In the following example c is always required and a or b is required.
   *
   * @example
   * {
   *   require: [['a', 'b'], 'c']
   * }
   */
  require?: (string | string[] | (string | string[])[])[];
  /** Examples showcasing common usage of the command */
  examples?: (string | Example)[];
  /** What group to render the command in a MultiCommand */
  group?: string;
  /** Extra info and documentation about a command */
  footer?: Section[] | Section | string;
};

/** A command that is a collection of sub-command */
export interface MultiCommand {
  /** The name of the multi command. Used when running in a terminal */
  name: string;
  /** An optional logo to display above the help text */
  logo?: string;
  /** A description of what the command does */
  description: string;
  /** A list of options that will be available to all sub-commands */
  options?: Option[];
  /** The sub-commands for the multi command */
  commands: (Command | MultiCommand)[];
  /** Extra info and documentation about a command */
  footer?: Section | string;
}