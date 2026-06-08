import { Body, Button, Container, Head, Heading, Hr, Html, Text } from 'react-email'

export default function Welcome() {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f6f6f6', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ padding: '24px', backgroundColor: '#ffffff' }}>
          <Heading as="h1">Welcome to vuemailer</Heading>
          <Text>Build emails with Vue components and preview them live.</Text>
          <Button
            href="https://example.com"
            style={{
              padding: '12px 20px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              borderRadius: '6px',
            }}
          >
            Get started
          </Button>
          <Hr />
          <Text style={{ color: '#888888' }}>Sent with vuemailer</Text>
        </Container>
      </Body>
    </Html>
  )
}
