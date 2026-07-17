/**
 * Skill-name normalisation and alias resolution.
 *
 * Job postings and CVs rarely agree on wording: a posting asks for "Google Cloud
 * Platform", the CV says "GCP"; one writes "Node.js", the other "NodeJS". Treating
 * those as misses would produce gaps that don't exist and scores nobody trusts.
 */

/**
 * Lowercase, strip punctuation that carries no meaning in a skill name, and
 * collapse whitespace. `.` and `+` and `#` are kept because they distinguish real
 * skills: "C++", "C#", and "Node.js" are not "c", "c", and "nodejs".
 */
export function normalise(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Common equivalences, grouped. Every member of a group normalises to the group's
 * first entry. This is deliberately a hand-maintained list rather than anything
 * clever: it is small, it is auditable, and it is wrong in ways we can see.
 */
const ALIAS_GROUPS: string[][] = [
  ['javascript', 'js', 'ecmascript'],
  ['typescript', 'ts'],
  ['node.js', 'nodejs', 'node'],
  ['postgresql', 'postgres', 'psql'],
  ['microsoft sql server', 'sql server', 'mssql', 't-sql', 'tsql'],
  ['google cloud platform', 'gcp', 'google cloud'],
  ['amazon web services', 'aws'],
  ['microsoft azure', 'azure'],
  ['kubernetes', 'k8s'],
  ['continuous integration', 'ci', 'ci/cd', 'continuous delivery'],
  ['infrastructure as code', 'iac'],
  ['power bi', 'powerbi', 'microsoft power bi'],
  ['business intelligence', 'bi'],
  ['machine learning', 'ml'],
  ['artificial intelligence', 'ai'],
  ['natural language processing', 'nlp'],
  ['extract transform load', 'etl', 'elt'],
  ['react', 'react.js', 'reactjs'],
  ['vue', 'vue.js', 'vuejs'],
  ['c#', 'c sharp', 'csharp'],
  ['c++', 'cpp', 'c plus plus'],
  ['golang', 'go'],
  ['rest', 'restful', 'rest api', 'restful api'],
  ['data build tool', 'dbt'],
  ['apache airflow', 'airflow'],
  ['apache spark', 'spark', 'pyspark'],
  ['terraform', 'hashicorp terraform'],
  ['snowflake', 'snowflake data cloud'],
]

const ALIAS_LOOKUP: Map<string, string> = (() => {
  const map = new Map<string, string>()
  for (const group of ALIAS_GROUPS) {
    const canonical = normalise(group[0])
    for (const member of group) {
      map.set(normalise(member), canonical)
    }
  }
  return map
})()

/** Resolve a skill name to its canonical form, following the alias table. */
export function canonicalise(input: string): string {
  const n = normalise(input)
  return ALIAS_LOOKUP.get(n) ?? n
}

/**
 * True when two skill names refer to the same thing, by exact match or alias.
 *
 * This does not do substring matching. "Java" must not match "JavaScript", and
 * substring logic is exactly how that bug gets in.
 */
export function isSameSkill(a: string, b: string): boolean {
  return canonicalise(a) === canonicalise(b)
}

/**
 * Does `text` mention `skill` as a whole word (or alias of it)?
 *
 * Used to find evidence in experience bullets for skills the candidate never
 * listed explicitly — someone who shipped Terraform for two years often forgets
 * to put it in their skills list.
 */
export function textMentionsSkill(text: string, skill: string): boolean {
  const haystack = normalise(text)
  const canonical = canonicalise(skill)

  const candidates = new Set<string>([canonical, normalise(skill)])
  for (const group of ALIAS_GROUPS) {
    if (normalise(group[0]) === canonical) {
      for (const member of group) candidates.add(normalise(member))
    }
  }

  for (const candidate of candidates) {
    if (!candidate) continue
    // Word-boundary match. `\b` is unreliable next to `+`/`#`/`.`, so bound on
    // whitespace or string edges instead.
    const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`(^|\\s)${escaped}($|\\s|,|\\.)`)
    if (pattern.test(haystack)) return true
  }
  return false
}
