#!/usr/bin/env node
import { run } from './cli'

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error)
  process.exit(1)
})
