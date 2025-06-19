import puppeteer from 'puppeteer'
import * as fs from 'fs'

async function main() {
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  await page.goto('https://ketto.com/index.cgi?b1', {
    waitUntil: 'networkidle0',
  })

  const events = await page.evaluate(() => {
    const eventBlocks = []

    // Get the main content as text
    const bodyText = document.body.innerHTML

    // Split by HR tags to separate event blocks
    const blocks = bodyText.split(/<hr[^>]*>/i)

    for (const block of blocks) {
      // Look for date pattern: YYYY/MM/DD
      const dateRegex = /(20\d{2}\/\d{2}\/\d{2})/g
      const dateMatches = block.match(dateRegex)
      if (!dateMatches) continue

      // Look for event name in Japanese quotes
      const nameRegex = /「([^」]+)」/
      const nameMatch = block.match(nameRegex)
      if (!nameMatch) continue

      // Create temp element to parse HTML properly
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = block

      // Extract location - look for text patterns and links
      let location = ''
      const locationPatterns = [
        /東京:(.*?)(?=<BR|<br|<HR|<hr|$)/i, // ← CHANGED: Better stopping pattern
        /大阪:(.*?)(?=<BR|<br|<HR|<hr|$)/i, // ← CHANGED: Better stopping pattern
        /関東:(.*?)(?=<BR|<br|<HR|<hr|$)/i, // ← CHANGED: Better stopping pattern
        /近畿:(.*?)(?=<BR|<br|<HR|<hr|$)/i, // ← CHANGED: Better stopping pattern
        /東海:(.*?)(?=<BR|<br|<HR|<hr|$)/i, // ← CHANGED: Better stopping pattern
        /九州:(.*?)(?=<BR|<br|<HR|<hr|$)/i, // ← CHANGED: Better stopping pattern
        /北海道:(.*?)(?=<BR|<br|<HR|<hr|$)/i, // ← CHANGED: Better stopping pattern
        /東北:(.*?)(?=<BR|<br|<HR|<hr|$)/i, // ← CHANGED: Better stopping pattern
        /北陸:(.*?)(?=<BR|<br|<HR|<hr|$)/i, // ← CHANGED: Better stopping pattern
      ]

      for (const pattern of locationPatterns) {
        const match = block.match(pattern)
        if (match) {
          // Extract text from links and clean up HTML tags    // ← CHANGED: Updated comment
          let locationText = match[1] // ← NEW: Store raw text

          // First extract text from any <a> tags              // ← NEW: Link extraction logic
          const linkMatches = locationText.match(/<a[^>]*>([^<]+)<\/a>/gi)
          if (linkMatches) {
            // Get text content from the first link found
            const linkTextMatch = linkMatches[0].match(/>([^<]+)</i)
            if (linkTextMatch) {
              locationText = linkTextMatch[1]
            }
          }

          // Clean up remaining HTML tags and whitespace       // ← CHANGED: Updated comment
          location = locationText.replace(/<[^>]*>/g, '').trim() // ← CHANGED: Use processed text
          break
        }
      }

      // Find external event URL (not ketto.com, google calendar, maps, etc.)
      let eventUrl = ''
      const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>/gi
      let linkMatch

      while ((linkMatch = linkRegex.exec(block)) !== null) {
        const href = linkMatch[1]
        if (
          href.startsWith('http') &&
          !href.includes('ketto.com') &&
          !href.includes('google.com/calendar') &&
          !href.includes('goo.gl/maps') &&
          !href.includes('maps.app.goo.gl') &&
          !href.includes('x.com')
        ) {
          eventUrl = href
        }
      }

      // Process dates and create event object
      const uniqueDates = Array.from(
        new Set(dateMatches.map((d) => d.replace(/\//g, '-')))
      )
      const name = nameMatch[1].trim()

      if (name && uniqueDates.length > 0) {
        const event: any = {
          name,
          date: uniqueDates,
          location: location || '',
        }

        if (eventUrl) {
          event.url = eventUrl
        }

        eventBlocks.push(event)
      }
    }

    return eventBlocks
  })

  await browser.close()

  // Remove duplicates based on name
  const uniqueEvents = events.filter(
    (event, index, self) =>
      index === self.findIndex((e) => e.name === event.name)
  )

  // Save each event
  uniqueEvents.forEach((event, index) => {
    const fileName = event.name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')

    const filePath = `2025/${fileName}.json`

    if (fs.existsSync(filePath)) return

    fs.writeFileSync(filePath, JSON.stringify(event, null, 2))
  })
}

main()
