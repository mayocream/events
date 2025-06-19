import * as fs from 'fs'

const files = fs.readdirSync('2025').filter((f) => f.endsWith('.json'))
const events = files.map((f) =>
  JSON.parse(fs.readFileSync(`2025/${f}`, 'utf8'))
)

events.sort(
  (a, b) => new Date(a.date[0]).getTime() - new Date(b.date[0]).getTime()
)

fs.writeFileSync('events.json', JSON.stringify(events, null, 2))
