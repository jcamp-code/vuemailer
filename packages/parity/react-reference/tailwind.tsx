import { Body, Button, Container, Head, Heading, Html, Tailwind, Text } from 'react-email'

export default function TailwindEmail() {
  return (
    <Tailwind>
      <Html>
        <Head />
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto max-w-xl rounded-lg bg-white p-6">
            <Heading className="text-2xl text-gray-900">Tailwind email</Heading>
            <Text className="text-gray-600">Utility classes are inlined at render time.</Text>
            <Button href="https://example.com" className="rounded bg-blue-600 px-5 py-3 text-white">
              Click me
            </Button>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  )
}
