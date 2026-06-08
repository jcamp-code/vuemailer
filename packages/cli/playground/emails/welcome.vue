<script setup lang="ts">
import { Body, Button, Container, Head, Heading, Hr, Html, Tailwind, Text } from 'vuemailer'
</script>

<template>
  <Tailwind>
    <Html>
      <Head />
      <Body class="font-sans">
        <Container class="mx-auto my-10 max-w-xl rounded-lg bg-white p-8 dark:bg-gray-800">
          <Heading class="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Welcome to vuemailer
          </Heading>
          <Text class="text-gray-600 dark:text-gray-300">
            Build emails with Vue components and preview them live.
          </Text>
          <Button
            href="https://example.com"
            class="inline-block rounded bg-blue-600 px-5 py-3 text-white dark:bg-blue-400 dark:text-gray-900"
          >
            Get started
          </Button>
          <Hr class="my-6 border-gray-200 dark:border-gray-700" />
          <Text class="text-sm text-gray-400 dark:text-gray-500">Sent with vuemailer</Text>
        </Container>
      </Body>
    </Html>
  </Tailwind>
</template>
