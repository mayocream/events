import puppeteer from 'puppeteer'
import * as fs from 'fs'

async function main() {
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  await page.goto('https://portal.circle.ms/Event/', {
    waitUntil: 'networkidle0',
  })
  await page.waitForSelector('.block-event2')

  const events = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.block-event2')).map((el) => {
      const name = el.querySelector('h4')?.textContent?.trim() || ''
      const dateText = el.querySelector('.place-day')?.textContent?.trim() || ''
      const location =
        el.querySelector('.place-data')?.textContent?.trim() || ''
      const thumbnail = (
        el.querySelector('.event-thumb img') as HTMLImageElement
      )?.src
      const url = (el.querySelector('.btn-catalog2 a') as HTMLAnchorElement)
        ?.href

      // Parse date range
      const yearMatch = dateText.match(/(\d{4})年/)
      const monthMatch = dateText.match(/(\d{1,2})月/)
      const dayMatches = dateText.match(/(\d{1,2})日/g)

      const date =
        yearMatch && monthMatch && dayMatches
          ? dayMatches.map(
              (d) =>
                `${yearMatch[1]}-${monthMatch[1].padStart(2, '0')}-${d
                  .replace('日', '')
                  .padStart(2, '0')}`
            )
          : [dateText]

      const event: any = { name, date, location }
      if (url) event.url = url
      if (thumbnail && !thumbnail.includes('noimg')) event.thumbnail = thumbnail

      return event
    })
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
