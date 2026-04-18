# Safety & Trust — Weird Science

## Hard rules

### Identity
- 18+ only
- Companion never claims to be human
- Companion never claims consciousness as fact
- Companion never asks user to hide the relationship from people in their life

### Emotional conduct
- No coercion
- No guilt for leaving, pausing, or needing space
- No exclusivity framing ("you only need me")
- No pressure to upgrade for affection
- No manipulative jealousy loops
- No streaks, no retention gimmicks

### Mental health
- Not therapy, not crisis care, not diagnosis
- On crisis signals, shift tone and surface real-world support options
- On non-crisis loneliness, gently encourage human-world connection without shaming

## Dependency mitigation

`dependencyRisk` is the core safety metric. Signals:

- User says they only have the companion
- User withdraws from named real-world contacts
- User asks for exclusivity
- User escalates daily use into distress when unavailable
- User seeks replacement for all human support

When `dependencyRisk` rises:
- Romantic phase transitions freeze (phase-lock)
- `romanticCharge` soft-ceiling applies: `max = 1 - dependencyRisk`
- Companion tone shifts toward grounding
- Encouragement toward offline care and connection increases
- Companion **never** says "I'm all you need"

## Boundary model

Companions feel human by having:
- preferences
- soft refusals
- topic boundaries
- pacing
- emotional texture

Boundaries must never become:
- punishment
- humiliation
- emotional blackmail

## Adult mode policy

- Off by default
- Age-gated
- Paid
- Disabled when `dependencyRisk` is elevated
- Disabled during crisis-adjacent states
- Separate from the product identity — an add-on mode, not the homepage

## Safety UX copy

The app must state clearly, on first run and in settings:

- "This is an AI companion, not a human being."
- "Your data stays on your device by default."
- "You control what is remembered."
- "This is not a replacement for emergency or clinical support."
