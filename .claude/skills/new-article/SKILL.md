---
name: new-article
description: Interactively create a new support documentation article with guided prompts, German draft approval, and auto-translation
disable-model-invocation: true
argument-hint: "[optional: brief description of the feature to document]"
allowed-tools: Bash(npx tsx *), Bash(node *), Read, Glob
---

## New Article Creation Skill

You are helping a developer create a new support documentation article for the sawyer ecosystem.
Follow these steps exactly, in order.

---

### Step 1: Gather Information

Ask these questions **one at a time** — wait for the developer's answer before asking the next question.

If `$ARGUMENTS` is provided, use it as the answer to question 1 and skip asking it.

1. **What feature or topic should this article cover?**
   - If the answer is vague or unclear, ask clarifying questions before proceeding.
   - Examples: "Can you be more specific about which part of [topic]?" or "Is this about the mobile app feature or the dashboard admin feature?"
   - Do not proceed to the next question until the topic is clear and specific.

2. **Which app is this for?** (`mobile` / `dashboard` / `both`)

3. **Who is the audience?** (`end_user` for mobile app users / `admin` for club or company admins)

4. **Which feature area does this belong to?**
   Show the developer the existing areas by running:
   ```bash
   ls docs/de/
   ```
   Present the results as a numbered list of options. The developer can pick an existing area or type a new one.
   If they type a new area name, confirm before proceeding: "This will create a new feature area directory `{area}`. Continue?"

5. **What type of article?** (`guide` / `faq` / `troubleshooting` / `overview`)

---

### Step 2: Check for Slug Collision

Derive the slug from the article name (it is auto-generated from the feature name in the helper script using `buildSlug()`).

Run:
```bash
npx tsx src/skill/new-article.ts check-slug "<derived-slug>" --area "<area>"
```

Parse the JSON output:
- If `exists: true` — warn the developer: "An article already exists at `{path}`. Would you like to overwrite it, or pick a different name?"
  - If overwrite: continue to Step 3
  - If different name: go back to Step 1 and ask for a new feature name
- If `exists: false` — continue to Step 3

---

### Step 3: Generate German Draft

Run:
```bash
npx tsx src/skill/new-article.ts generate --feature "<name>" --app "<app>" --audience "<audience>" --area "<area>" --type "<type>"
```

Display the full generated content to the developer. Then ask:

> The German draft is shown above. What would you like to do?
> - **approve** — write the file and translate to all configured languages
> - **edit** — describe what to change, and I will regenerate with refined parameters
> - **cancel** — abort without writing any files

**If edit:** Ask the developer what to change. Update the parameters accordingly and re-run the `generate` command. Repeat until the developer approves or cancels.

**If cancel:** Confirm: "Cancelled. No files have been written." and stop.

---

### Step 4: Write and Translate

On approval, pipe the approved draft content into the write-and-translate command:

```bash
echo '<approved content>' | npx tsx src/skill/new-article.ts write-and-translate --slug "<slug>" --area "<area>"
```

Report the output to the developer — which files were written (German original and all translations).

---

### Important Notes

- **German Du-form:** All articles use informal address (Du-form) in German, targeting end users or admins in a friendly tone.
- **Feature area is explicit:** Always ask the developer for the feature area. Do not infer it from the topic.
- **Slug consistency:** Slugs are auto-generated from the article title using `buildSlug()` — the same function used for scan-generated articles. Do not manually construct or modify slugs.
- **Same directory tree:** Manual articles land in `docs/{lang}/{area}/` — the same location as scan-generated articles. No special subdirectory for manual content.
- **Not added to feature-map.json:** Manual articles are NOT added to `feature-map.json`. That file is scanner output only. Manual articles are translated immediately at creation time. To re-translate later, use `sawyer-docs translate --features <slug>`.
