<script setup lang="ts">
import { Body, Button, Container, Head, Heading, Html, Tailwind, Text } from '@vuemailer/core'
</script>

<template>
  <Tailwind>
    <Html>
      <Head />
      <Body class="font-sans">
        <Container class="mx-auto my-10 max-w-xl rounded-lg bg-white p-8 dark:bg-gray-800">
          <Heading class="text-2xl font-bold text-gray-900 dark:text-gray-100"> Dark mode demo </Heading>
          <Text class="text-gray-600 dark:text-gray-300">
            Toggle Light / Dark above — this card adapts via
            <code>@media (prefers-color-scheme: dark)</code>, emulated authentically in the iframe.
          </Text>
          <Button
            href="https://example.com"
            class="mt-4 inline-block rounded bg-blue-600 px-5 py-3 text-white dark:bg-blue-400 dark:text-gray-900"
          >
            Adaptive button
          </Button>
        </Container>
      </Body>
    </Html>
  </Tailwind>
</template>
