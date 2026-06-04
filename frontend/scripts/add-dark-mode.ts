// scripts/add-dark-mode.ts
// One-shot migration to add `dark:` Tailwind variants to common class patterns.
// Idempotent: skips lines that already contain a `dark:` variant for the
// same property, so the script is safe to re-run.
//
// Scope: components and pages in src/{components,pages}/.
// What it touches:
//   bg-white         -> bg-white dark:bg-slate-900
//   bg-gray-50       -> bg-gray-50 dark:bg-slate-950
//   text-gray-900    -> text-gray-900 dark:text-white
//   text-gray-700    -> text-gray-700 dark:text-slate-200
//   text-gray-600    -> text-gray-600 dark:text-slate-300
//   text-gray-500    -> text-gray-500 dark:text-slate-400
//   text-gray-400    -> text-gray-400 dark:text-slate-500
//   border-gray-100  -> border-gray-100 dark:border-slate-800
//   border-gray-200  -> border-gray-200 dark:border-slate-800
//   border-gray-300  -> border-gray-300 dark:border-slate-700
//   bg-gray-100      -> bg-gray-100 dark:bg-slate-800
//   bg-gray-200      -> bg-gray-200 dark:bg-slate-800
//   hover:bg-gray-50   -> hover:bg-gray-50 dark:hover:bg-slate-800/60
//   hover:bg-gray-100  -> hover:bg-gray-100 dark:hover:bg-slate-800
//   hover:text-gray-900 -> hover:text-gray-900 dark:hover:text-white
//   placeholder-gray-... -> placeholder-gray-... dark:placeholder-slate-500
//   divide-gray-*    -> divide-gray-* dark:divide-slate-*
//
// What it deliberately DOESN'T touch (would be wrong):
//   - text-white (foreground on colored backgrounds)
//   - bg-gradient-* (gradient backgrounds; dark mode is achieved by changing the body bg)
//   - hero/footer specifically (Footer is already dark; hero gradients look fine on dark body)
//
// Usage: npx tsx scripts/add-dark-mode.ts

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..', 'src')
const TARGET_DIRS = [
  path.join(ROOT, 'components'),
  path.join(ROOT, 'pages'),
]

type Pair = readonly [RegExp, (m: string) => string]

const REPLACEMENTS: readonly Pair[] = [
  // For each pattern, we check the line and only emit the dark: variant
  // if it isn't already present. The check is property-based: if the
  // line already has e.g. `dark:bg-slate-900`, we don't add another
  // `dark:bg-slate-900` from `bg-white`.
  [/bg-white(?!\s+dark:)/g, (m) => `${m} dark:bg-slate-900`],
  [/bg-gray-50(?!\s+dark:)/g, (m) => `${m} dark:bg-slate-950`],
  [/text-gray-900(?!\s+dark:)/g, (m) => `${m} dark:text-white`],
  [/text-gray-800(?!\s+dark:)/g, (m) => `${m} dark:text-slate-100`],
  [/text-gray-700(?!\s+dark:)/g, (m) => `${m} dark:text-slate-200`],
  [/text-gray-600(?!\s+dark:)/g, (m) => `${m} dark:text-slate-300`],
  [/text-gray-500(?!\s+dark:)/g, (m) => `${m} dark:text-slate-400`],
  [/text-gray-400(?!\s+dark:)/g, (m) => `${m} dark:text-slate-500`],
  [/border-gray-100(?!\s+dark:)/g, (m) => `${m} dark:border-slate-800`],
  [/border-gray-200(?!\s+dark:)/g, (m) => `${m} dark:border-slate-800`],
  [/border-gray-300(?!\s+dark:)/g, (m) => `${m} dark:border-slate-700`],
  [/bg-gray-100(?!\s+dark:)/g, (m) => `${m} dark:bg-slate-800`],
  [/bg-gray-200(?!\s+dark:)/g, (m) => `${m} dark:bg-slate-800`],
  [/hover:bg-gray-50(?!\s+dark:)/g, (m) => `${m} dark:hover:bg-slate-800/60`],
  [/hover:bg-gray-100(?!\s+dark:)/g, (m) => `${m} dark:hover:bg-slate-800`],
  [/hover:text-gray-900(?!\s+dark:)/g, (m) => `${m} dark:hover:text-white`],
  [
    /placeholder-gray-(?:400|500)(?!\s+dark:)/g,
    (m) => `${m} dark:placeholder-slate-500`,
  ],
  [/divide-gray-(?:100|200)(?!\s+dark:)/g, (m) => `${m} dark:divide-slate-800`],
]

async function* walk(dir: string): AsyncIterable<string> {
  let entries: import('node:fs').Dirent[]
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      yield* walk(full)
    } else if (e.isFile() && /\.(tsx?|jsx?)$/.test(e.name)) {
      yield full
    }
  }
}

let filesChanged = 0
let totalReplacements = 0

for (const dir of TARGET_DIRS) {
  for await (const file of walk(dir)) {
    const original = await fs.readFile(file, 'utf8')
    let next = original
    let n = 0
    for (const [pattern, replacer] of REPLACEMENTS) {
      next = next.replace(pattern, (match) => {
        n += 1
        return replacer(match)
      })
    }
    if (n > 0 && next !== original) {
      await fs.writeFile(file, next, 'utf8')
      filesChanged += 1
      totalReplacements += n
      console.log(`  ${path.relative(process.cwd(), file)} (+${n})`)
    }
  }
}

console.log(
  `\nDone. ${filesChanged} file(s) modified, ${totalReplacements} replacement(s).`
)
