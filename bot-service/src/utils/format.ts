// ── Bot Message Formatter ──────────────────────────────────────────────────
// All bot messages use this consistent bordered format.

function border(title: string, content: string): string {
  const titleLen = title.length
  const top = `╭────${"─".repeat(titleLen + 2)}────╮`
  const titleBar = `│     ${title}     │`
  const bottom = `╰────${"─".repeat(titleLen + 2)}────╯`
  
  const contentLines = content.split("\n")
  const maxLineLen = Math.max(
    titleLen + 10,
    ...contentLines.map(l => l.length)
  )
  
  const pad = (line: string): string => {
    const diff = maxLineLen - line.length
    return line + " ".repeat(Math.max(0, diff))
  }
  
  const wrapped = contentLines.map(l => `│ ${pad(l)} │`).join("\n")
  
  return `${top}\n${titleBar}\n│${" ".repeat(maxLineLen + 2)}│\n${wrapped}\n│${" ".repeat(maxLineLen + 2)}│\n${bottom}`
}

export function fmt(title: string, body: string): string {
  return border(title.toUpperCase(), body)
}

export function fmtError(msg: string): string {
  return border("ERROR", msg)
}

export function fmtSuccess(msg: string): string {
  return border("SUCCESS", msg)
}

export function fmtInfo(title: string, msg: string): string {
  return border(title, msg)
}
