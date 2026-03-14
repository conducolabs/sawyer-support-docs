import * as deepl from "deepl-node";
import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import { join, relative, dirname, basename, extname } from "path";

// ── Config ──────────────────────────────────────────────────────────────────

const DOCS_ROOT = join(import.meta.dirname, "..", "docs");
const SOURCE_LANG: deepl.SourceLanguageCode = "de";

interface TargetConfig {
  code: deepl.TargetLanguageCode;
  langField: string; // value for frontmatter `language` field
  formality?: deepl.Formality;
}

const TARGETS: TargetConfig[] = [
  { code: "en-US", langField: "en" },
  { code: "nl", langField: "nl", formality: "less" },
  { code: "tr", langField: "tr" },
  { code: "uk", langField: "uk" },
];

// ── DeepL client ────────────────────────────────────────────────────────────

const apiKey = process.env.DEEPL_API_KEY;
if (!apiKey) {
  console.error("ERROR: Set DEEPL_API_KEY environment variable");
  process.exit(1);
}
const translator = new deepl.Translator(apiKey);

// ── Helpers ─────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9\s-]/g, "")   // remove non-alphanumeric
    .replace(/[\s_]+/g, "-")         // spaces/underscores to hyphens
    .replace(/-+/g, "-")             // collapse multiple hyphens
    .replace(/^-|-$/g, "");          // trim leading/trailing hyphens
}

function slugifyUnicode(text: string): string {
  // For languages with non-latin scripts (Ukrainian), keep unicode letters
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "") // keep letters, numbers, spaces, hyphens
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseFrontmatter(content: string): {
  frontmatter: Record<string, string>;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error("No frontmatter found");

  const frontmatter: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    // Strip surrounding quotes
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    frontmatter[key] = val;
  }

  return { frontmatter, body: match[2] };
}

function buildFrontmatter(fields: Record<string, string>): string {
  const lines = Object.entries(fields).map(([k, v]) => {
    if (k === "id" || k === "title" || k === "synopsis") return `${k}: "${v}"`;
    return `${k}: ${v}`;
  });
  return `---\n${lines.join("\n")}\n---\n`;
}

async function translateText(
  text: string,
  target: TargetConfig
): Promise<string> {
  const result = await translator.translateText(text, SOURCE_LANG, target.code, {
    formality: target.formality,
    preserveFormatting: true,
  });
  return result.text;
}

// ── Collect all source files ────────────────────────────────────────────────

async function collectFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => join(e.parentPath ?? e.path, e.name));
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const sourceDir = join(DOCS_ROOT, "de");
  const files = await collectFiles(sourceDir);
  console.log(`Found ${files.length} source files\n`);

  for (const target of TARGETS) {
    console.log(`\n═══ Translating to ${target.code.toUpperCase()} ═══\n`);

    // Cache for translated path segments (German slug -> translated slug)
    const slugCache = new Map<string, string>();
    const doSlug = target.code === "uk" ? slugifyUnicode : slugify;

    async function translateSlug(germanSlug: string): Promise<string> {
      if (slugCache.has(germanSlug)) return slugCache.get(germanSlug)!;

      // Translate the human-readable form (replace hyphens with spaces)
      const readable = germanSlug.replace(/-/g, " ");
      const translated = await translateText(readable, target);
      const slug = doSlug(translated);
      slugCache.set(germanSlug, slug);
      return slug;
    }

    let count = 0;
    for (const filePath of files) {
      const rel = relative(sourceDir, filePath); // e.g. app/konto/anmelden.md
      const content = await readFile(filePath, "utf-8");
      const { frontmatter, body } = parseFrontmatter(content);

      // Translate path segments
      const parts = rel.split("/");
      const translatedParts: string[] = [];
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          // File name
          const ext = extname(part);
          const stem = basename(part, ext);
          if (stem === "index") {
            translatedParts.push("index.md");
          } else {
            const translatedStem = await translateSlug(stem);
            translatedParts.push(translatedStem + ext);
          }
        } else {
          // Directory name
          translatedParts.push(await translateSlug(part));
        }
      }

      const targetRel = translatedParts.join("/");
      const targetPath = join(DOCS_ROOT, target.langField, targetRel);

      // Translate content
      const [translatedTitle, translatedSynopsis, translatedBody] =
        await Promise.all([
          translateText(frontmatter.title, target),
          translateText(frontmatter.synopsis, target),
          body.trim() ? translateText(body, target) : Promise.resolve(""),
        ]);

      // Build output
      const newFrontmatter = buildFrontmatter({
        id: frontmatter.id,
        title: translatedTitle,
        synopsis: translatedSynopsis,
        language: target.langField,
      });

      const output = newFrontmatter + translatedBody;

      // Write file
      await mkdir(dirname(targetPath), { recursive: true });
      await writeFile(targetPath, output, "utf-8");

      count++;
      console.log(`  [${count}/${files.length}] ${rel} → ${target.langField}/${targetRel}`);
    }
  }

  console.log("\nDone! All translations complete.");
}

main().catch((err) => {
  console.error("Translation failed:", err);
  process.exit(1);
});
