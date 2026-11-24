# AI Overview panel

Every blog and portfolio post shows an "✦ AI Overview" panel at the top of the article. A reader clicks it, sees a short "thinking" state, and a summary streams in. Below it, "Dig deeper" chips ask follow-up questions, and each answer appears the same way. "Regenerate" shows a different summary.

It looks live, but nothing is generated in the browser and nothing is sent anywhere. Every response is written ahead of time in the page bundle's `ai-overview.yaml`, and the script picks one at random.

- Data: `ai-overview.yaml` in the page's folder, next to `index.md`.
- Embedding: `zachleinfo/layouts/partials/extend-head-uncached.html` turns it into JSON in the page. A build warns `AI OVERVIEW MISSING` for a post without one.
- Behaviour: `zachleinfo/static/js/ai-overview.js`. Styles: the "AI Overview" section of `zachleinfo/assets/css/custom.css`.
- The checker's `overview` rule (minor) requires the file on every blog and portfolio post and checks its shape.

## The file

```yaml
# Pre-written "AI Overview" for this page. One overview is picked at random
# each time; follow-ups appear as "Dig deeper" chips. Only facts from the
# post. Format and rules: docs/ai-overview.md.
overviews:
  - |
    First version of the summary...
  - |
    Second version, worded and structured differently...
  - |
    Third version...
followups:
  - question: What were the four bugs?
    answers:
      - |
        The answer...
  - question: Is it safe to use?
    answers:
      - |
        The answer...
```

`zachleinfo/content/blog/2026/20261122/ai-overview.yaml` is the reference example. Copy its shape.

- **`overviews`**: exactly 3. Each takes 60 to 140 words. Make them differ in shape, not just wording. For example, one can be a bolded lead plus bullets, one two short paragraphs, and one starting "In short:".
- **`followups`**: 3 or 4 chips. Each has a `question` of at most 45 characters, phrased the way a reader would ask it. Each also has `answers`, a list of 1 or 2 versions, each 40 to 120 words.
- Text format: blank lines split paragraphs, lines starting with `- ` are bullets, and `**bold**` is bold. `` `code` `` in backticks shows as inline code; use it for file and command names. There are no links, headings, or HTML; they show up as plain text.

## Writing rules

- **Only what the post says.** Every fact, number, and name must appear in the post. Don't add context from elsewhere, don't guess, and don't round numbers differently. If the post says "about 90", write "about 90".
- Write in the voice of an AI summary: neutral third person ("The post describes...", "The author..."). Don't use first person as the author, and don't write "I think".
- Never use the author's name, and use no other personal details beyond what the post itself states.
- Follow the site style guide ([style-guide.md](style-guide.md)): plain English, no em dashes, and no hype words.
- Follow-ups should cover what a curious reader would ask next: how something works, what went wrong, the results, and how to try it. Each answer must stand alone.
- When a post changes in a way that makes its overview wrong, update `ai-overview.yaml` in the same change.
