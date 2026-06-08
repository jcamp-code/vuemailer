<script setup lang="ts">
import { Body, Container, Head, Heading, Html, Link, Text } from '@vuemailer/core'
</script>

<template>
  <Html>
    <Head />
    <Body :style="{ fontFamily: 'Arial, sans-serif' }">
      <Container :style="{ padding: '24px', backgroundColor: '#ffffff' }">
        <Heading as="h1">Linter demo</Heading>
        <Text>
          <Link href="https://nonexistent-vuemailer-test.invalid">This link is broken</Link>
        </Text>
        <Text>
          <Link href="http://example.com">This link is insecure (http)</Link>
        </Text>
        <!-- raw <img>: insecure http source and no alt text -->
        <img src="http://example.com/banner.png" width="600" />
      </Container>
    </Body>
  </Html>
</template>
