import * as R from 'react-email'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  render as renderVue,
  Section,
  Text,
} from 'vuemailer'

import { compareEmails, formatReport } from '../src/compare'

const bodyStyle = { backgroundColor: '#f6f6f6', fontFamily: 'Arial, sans-serif' }
const mutedText = { color: '#888888' }
const buttonStyle = { padding: '12px 20px', backgroundColor: '#2563eb', color: '#ffffff' }

const reactEmail = (
  <R.Html>
    <R.Head />
    <R.Body style={bodyStyle}>
      <R.Container style={{ padding: '24px' }}>
        <R.Heading as="h1">Welcome, Ada!</R.Heading>
        <R.Text style={{ color: '#333333' }}>
          Thanks for signing up. We&apos;re glad you&apos;re here.
        </R.Text>
        <R.Section>
          <R.Button href="https://example.com/verify" style={buttonStyle}>
            Verify email
          </R.Button>
        </R.Section>
        <R.Hr />
        <R.Text style={mutedText}>
          Questions? <R.Link href="https://example.com/help">Visit our help center</R.Link>.
        </R.Text>
      </R.Container>
    </R.Body>
  </R.Html>
)

const vueEmail = () =>
  h(Html, () => [
    h(Head),
    h(Body, { style: bodyStyle }, () =>
      h(Container, { style: { padding: '24px' } }, () => [
        h(Heading, { as: 'h1' }, () => 'Welcome, Ada!'),
        h(
          Text,
          { style: { color: '#333333' } },
          () => "Thanks for signing up. We're glad you're here.",
        ),
        h(Section, () =>
          h(
            Button,
            { href: 'https://example.com/verify', style: buttonStyle },
            () => 'Verify email',
          ),
        ),
        h(Hr),
        h(Text, { style: mutedText }, () => [
          'Questions? ',
          h(Link, { href: 'https://example.com/help' }, () => 'Visit our help center'),
          '.',
        ]),
      ]),
    ),
  ])

describe('full-email parity report', () => {
  it('welcome email: react-email vs vuemailer', async () => {
    const reactHtml = await R.render(reactEmail)
    const vueHtml = await renderVue(vueEmail)
    const report = compareEmails(reactHtml, vueHtml)

    // eslint-disable-next-line no-console
    console.log('\n--- welcome email parity ---\n' + formatReport(report) + '\n')

    // The two should be near-identical; this threshold guards against regressions
    // while tolerating documented cosmetic divergences.
    expect(report.similarity).toBeGreaterThan(0.95)
  })
})
