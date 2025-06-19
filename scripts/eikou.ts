import puppeteer from 'puppeteer'
import * as fs from 'fs'

async function main() {
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  await page.goto('https://www.eikou.com/events/', {
    waitUntil: 'networkidle0',
  })
  await page.waitForSelector('table.table-bordered')

  const events = await page.evaluate(() => {
    const rows = Array.from(
      document.querySelectorAll('table.table-bordered tbody tr')
    )
    return rows
      .filter((row) => !row.querySelector('th'))
      .map((row) => {
        const cells = row.querySelectorAll('td')
        if (cells.length < 6) return null

        const name = cells[1]?.textContent?.trim() || ''
        const dateText = cells[2]?.textContent?.trim() || ''
        const prefecture = cells[3]?.textContent?.trim() || ''
        const location = cells[4]?.textContent?.trim() || ''
        const url =
          (cells[0]?.querySelector('a') as HTMLAnchorElement)?.href || ''

        // Convert date format from 2025/06/21 to 2025-06-21
        const date = dateText.replace(/\//g, '-')

        const event: any = {
          name,
          date: [date],
          location: `${location}${prefecture ? `, ${prefecture}` : ''}`,
        }
        if (url && !url.includes('nobanner.gif')) event.url = url

        return event
      })
      .filter(Boolean)
  })

  await browser.close()

  events.forEach((event) => {
    const year = event.date[0]?.split('-')[0] || '2025'
    const fileName = event.name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')

    fs.writeFileSync(`${year}/${fileName}.json`, JSON.stringify(event, null, 2))
  })
}

main()
