## What

<!-- One sentence: what does this PR do? -->

## Why

<!-- Why is this change needed? Link to IMPLEMENTATION.md phase/task if applicable. -->

## How

<!-- Brief explanation of the approach. Skip if obvious from the diff. -->

## Test

<!-- How did you verify this works? What did you test manually? -->

## Checklist

- [ ] Tested locally with `wrangler dev`
- [ ] No API keys or secrets in code
- [ ] Durable Object schema changes are backwards-compatible
- [ ] Prompt changes don't include banned words (`journey`, `warrior`, `champion`, `grind`, `beast`, `mindset`, `believe`, `hustle`)
- [ ] Cut mode messages are under 40 words
