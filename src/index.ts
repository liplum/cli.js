import commandLineArgs from 'command-line-args';
import commandLineUsage from 'command-line-usage';
import removeMarkdown from 'remove-markdown';
import didYouMean from "didyoumean"
import chalk from 'chalk';
import { Option, Command, Section, MultiCommand } from './cmd.js';

const help: Option = {
  name: 'help',
  alias: 'h',
  description: 'Display the help output',
  type: Boolean,
  group: 'global'
};

/** Options available to all CLIs created with this tool */
export const globalOptions = [help];

const arrayify = <T>(x: T | T[]): T[] => (Array.isArray(x) ? x : [x]);
const hasGlobal = (options: Option[]) =>
  Boolean(options.find(option => option.group === 'global'));

function styleTypes(command: Command, option: Option) {
  const isRequired = command.require && command.require.includes(option.name);

  if (isRequired && option.type === Number) {
    option.typeLabel = `{rgb(173, 216, 230) {underline ${option.typeLabel ||
      'number'}}} [{rgb(254,91,92) required}]`;
  } else if (option.type === Number) {
    option.typeLabel = `{rgb(173, 216, 230) {underline ${option.typeLabel ||
      'number'}}}`;
  }

  if (isRequired && option.type === String) {
    option.typeLabel = `{rgb(173, 216, 230) {underline ${option.typeLabel ||
      'string'}}} [{rgb(254,91,92) required}]`;
  } else if (option.multiple && option.type === String) {
    option.typeLabel = `{rgb(173, 216, 230) {underline ${option.typeLabel ||
      'string[]'}}}`;
  } else if (option.type === String) {
    option.typeLabel = `{rgb(173, 216, 230) {underline ${option.typeLabel ||
      'string'}}}`;
  }
}

function addFooter(command: Command, sections: Section[]) {
  if (typeof command.footer === 'string') {
    sections.push({ content: command.footer });
  } else if (command.footer) {
    const footers = Array.isArray(command.footer)
      ? command.footer
      : [command.footer];

    footers.forEach(f => {
      let content = !('content' in f)
        ? undefined
        : typeof f.content === 'string'
          ? removeMarkdown(
            f.code
              ? f.content
                .split('\n')
                .map(s => (s.includes('```') ? undefined : `| ${s}`))
                .join('\n')
              : f.content,
            {
              stripListLeaders: false
            }
          )
          : Array.isArray(f.content)
            ? f.content
            : undefined;

      if (typeof content === 'string') {
        content = content.replace(/}/g, '\\}').replace(/{/g, '\\{');
      }

      sections.push({
        ...f,
        header: f.header
          ? removeMarkdown(f.header, { stripListLeaders: false })
          : undefined,
        content
      });
    });
  }
}

const printUsage = (command: Command) => {
  const options = command.options || [];
  const sections: Section[] = [
    {
      header: command.name,
      content: command.description
    }
  ];

  options.forEach(option => {
    styleTypes(command, option);
  });

  if (hasGlobal(options)) {
    sections.push(
      {
        header: 'Options',
        optionList: options.filter(o => o.group !== 'global')
      },
      {
        header: 'Global Options',
        optionList: [...options, ...globalOptions],
        group: 'global'
      }
    );
  } else {
    sections.push({
      header: 'Options',
      optionList: [...options, ...globalOptions]
    });
  }

  if (command.examples) {
    sections.push({
      header: 'Examples',
      content: command.examples
    });
  }

  addFooter(command, sections);

  console.log(commandLineUsage(sections));
  return;
};

const printRootUsage = (multi: MultiCommand) => {
  const subCommands =
    multi.commands.filter((c): c is Command => !('isMulti' in c)) || [];
  const rootOptions = multi.options || [];
  const options = [...rootOptions, ...globalOptions];
  const sections: Section[] = [];

  if (multi.logo) {
    sections.push({
      content: multi.logo,
      raw: true
    });
  }

  sections.push({
    header: multi.name,
    content: multi.description
  });

  sections.push({
    header: 'Synopsis',
    content: `$ ${multi.name} <command> <options>`
  });

  const groups = subCommands.reduce((all, command) => {
    if (command.group) {
      all.add(command.group);
    }

    return all;
  }, new Set<string>());

  groups.forEach(header => {
    const grouped = subCommands.filter(c => c.group === header) || [];

    if (grouped.length > 0) {
      sections.push({
        header,
        content: grouped.map(command => ({
          name: command.name,
          description: command.description
        }))
      });
    }
  });

  if (groups.size === 0) {
    sections.push({
      header: 'Commands',
      content: subCommands.map(command => ({
        name: command.name,
        description: command.description
      }))
    });
  }

  options.forEach(option => {
    styleTypes(multi, option);
  });

  sections.push({
    header: 'Global Options',
    optionList: options,
    group: ['_none', 'global']
  });

  addFooter(multi, sections);

  console.log(commandLineUsage(sections));
};

const errorReportingStyles = ['exit', 'throw', 'object'] as const;
type ErrorReportingStyle = typeof errorReportingStyles[number];

const reportError = (error: string, style: ErrorReportingStyle) => {
  if (style === 'exit') {
    console.log(error);
    process.exit(1);
  }

  if (style === 'throw') {
    throw new Error(error);
  }

  if (style === 'object') {
    return { error };
  }

  return;
};

const createList = (list: string[], transform: (value: string) => string) => {
  const [first, ...rest] = list.map(transform);
  return rest.length > 0 ? `${rest.join(', ')} or ${first}` : first;
};

const reportUnknownFlags = (
  args: (Option | Command)[],
  [unknown]: string[],
  errorStyle: ErrorReportingStyle
) => {
  const unknownStyled = chalk.redBright(`"${unknown}"`);
  const type = unknown.startsWith('-') ? 'flag' : 'command';
  let suggestions = didYouMean(
    unknown,
    args.map(a => (type === 'flag' ? `--${a.name}` : a.name))
  );

  let error: string;
  suggestions = Array.isArray(suggestions) ? suggestions : [suggestions]
  if (suggestions.length) {
    const list = createList(suggestions, s => chalk.greenBright(`"${s}"`));
    error = `Found unknown ${type} ${unknownStyled}, did you mean ${list}?`;
  } else {
    error = `Found unknown ${type}: ${unknownStyled}`;
  }

  return reportError(error, errorStyle);
};

const initializeOptions = (options: Option[] = []) => {
  const args = [...options];

  globalOptions.forEach(o => {
    if (!args.find(a => a.name === o.name)) {
      args.push(o);
    }
  });

  return args;
};

interface Options {
  /** Override the agreements that command-line-application parses */
  argv?: string[];
  /** Configure whether command-line-application shows the help prompt */
  showHelp?: boolean;
  /** Control how command-line-application reports errors */
  error?: ErrorReportingStyle;
  /** Convert parsed options to camelCase */
  camelCase?: boolean;
}

const parseCommand = (
  command: Command,
  { argv, showHelp, error = 'exit', camelCase = true }: Options
): Record<string, any> | undefined => {
  const args = initializeOptions(command.options);
  const { global, ...rest } = commandLineArgs(args, {
    stopAtFirstUnknown: true,
    camelCase,
    argv
  });

  if (rest._unknown) {
    printUsage(command);
    return reportUnknownFlags(args, rest._unknown, error);
  }

  if (global.help && showHelp) {
    printUsage(command);
    return;
  }

  const formatArrayOption = (option: any): string =>
    typeof option === 'string'
      ? `--${option}`
      : option.map(formatArrayOption).join(', ');

  if (command.require) {
    const missing = command.require
      .filter(
        option =>
          (typeof option === 'string' && !(option in rest._all)) ||
          (typeof option === 'object' &&
            !option.find(
              o =>
                (typeof o === 'string' && o in rest._all) ||
                (typeof o === 'object' && !o.find(op => !(op in rest._all)))
            )) ||
          // tslint:disable-next-line strict-type-predicates
          (typeof option === 'string' && rest._all[option] === null)
      )
      .map(option =>
        typeof option === 'string'
          ? `--${option}`
          : `(${(option as any[]).map(formatArrayOption).join(' or ')})`
      );

    if (missing.length > 0) {
      const multiple = missing.length > 1;
      printUsage(command);

      return reportError(
        `Missing required arg${multiple ? 's' : ''}: ${missing.join(', ')}`,
        error
      );
    }
  }

  return { ...rest, ...rest._all, ...global };
};

/**
 * Create a command line application with all the bells and whistles
 * @param command the command to create an application for
 * @param options Advanced options for the application
 */
export function app(
  command: Command | MultiCommand,
  { showHelp = true, argv, error = 'exit', camelCase = true }: Options = {}
):
  | (({ _command: string | string[] } | { error: string } | {}) &
    Record<string, any>)
  | undefined {
  const appOptions = { showHelp, argv, error, camelCase };

  if (!('commands' in command)) {
    return parseCommand(command, appOptions);
  }

  const rootOptions = initializeOptions(command.options);
  const { global, _unknown, _all } = commandLineArgs(rootOptions, {
    stopAtFirstUnknown: true,
    camelCase,
    argv
  });

  if (global.help && showHelp) {
    printRootUsage(command);
    return;
  }

  if (_unknown && _unknown.length > 0) {
    const subCommand = command.commands.find((c): c is Command =>
      Boolean(c.name === _unknown[0])
    );

    if (subCommand) {
      const options = [
        ...(subCommand.options || []),
        ...(command.options || [])
      ];
      const parsed = app(
        { ...subCommand, options },
        { ...appOptions, argv: _unknown.slice(1) }
      );

      if (!parsed) {
        return;
      }

      return {
        ...parsed,
        _command:
          '_command' in parsed
            ? [subCommand.name, ...arrayify(parsed._command)]
            : subCommand.name
      };
    }

    printRootUsage(command);
    return reportUnknownFlags(
      [...rootOptions, ...command.commands],
      _unknown,
      error
    );
  }

  if (Object.keys(_all).length > 0) {
    return _all;
  }

  if (showHelp) {
    printRootUsage(command);
  }

  return reportError(
    `No sub-command provided to MultiCommand "${command.name}"`,
    error
  );
}
