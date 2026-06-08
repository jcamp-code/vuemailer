<script setup lang="ts">
import { Body, Button, Container, Head, Heading, Html, Tailwind, Text } from '@vuemailer/core'
</script>

<template>
  <Tailwind>
    <Html>
      <Head />
      <Body class="font-sans">
        <Container class="mx-auto my-10 max-w-xl rounded-lg bg-white p-6 dark:bg-gray-800">
          <Heading class="text-2xl text-gray-900 dark:text-gray-100">Tailwind email</Heading>
          <Text class="text-gray-600 dark:text-gray-300">
            Utility classes are inlined at render time, with dark-mode support.
          </Text>
          <Button
            href="https://example.com"
            class="rounded bg-blue-600 px-5 py-3 text-white dark:bg-blue-400 dark:text-gray-900"
          >
            Click me
          </Button>
        </Container>
      </Body>
    </Html>
  </Tailwind>
</template>
