import { dev } from './commands/dev'

const HELP = `vuemailer — build and preview emails with Vue

Usage:
  vuemailer dev [options]      Start the live preview dev server

Options:
  --dir <path>     Emails directory (default: emails)
  --port <number>  Port to listen on (default: 3000)
  -h, --help       Show this help
`

function getFlag(args: string[], name: string): string | undefined {
  const index = args.indexOf(`--${name}`)
  return index >= 0 ? args[index + 1] : undefined
}

export async function run(argv: string[] = process.argv.slice(2)): Promise<void> {
  const command = argv[0]

  if (!command || command === '-h' || command === '--help') {
    process.stdout.write(HELP)
    return
  }

  switch (command) {
    case 'dev': {
      const port = getFlag(argv, 'port')
      await dev({
        dir: getFlag(argv, 'dir'),
        port: port ? Number(port) : undefined,
      })
      return
    }
    default: {
      process.stderr.write(`Unknown command: ${command}\n\n${HELP}`)
      process.exitCode = 1
    }
  }
}
