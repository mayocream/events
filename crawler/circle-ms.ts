import 'dotenv/config'
import assert from 'node:assert'
import puppeteer from 'puppeteer'
import { Client } from '@googlemaps/google-maps-services-js'

const browser = await puppeteer.launch({ headless: false })
const page = await browser.newPage()

await page.goto('https://portal.circle.ms/event/catalog/')

assert.equal(await page.title(), 'イベントカレンダー | Circle.ms')

// Wait for the event summary div to be present
await page.waitForSelector('.event-summary', { visible: true })

// Extract event information
const eventInfo = await page.evaluate(() => {
  const summary = document.querySelector('.event-summary')
  if (!summary) return null

  const getTextContent = (selector) => {
    const element = summary.querySelector(selector)
    return element ? element.textContent.trim() : ''
  }

  return {
    date: getTextContent('dd[data-bind="text: HoldDateStr"]'),
    location: getTextContent('dd[data-bind="text: Place"]'),
    organizer: getTextContent('dd[data-bind="text: EventOrgName"]'),
    catalogUrl:
      summary.querySelector('.button-catalog')?.getAttribute('href') || '',
  }
})

console.log('Event Information:', eventInfo)

// If we have a location, geocode it
if (eventInfo && eventInfo.location) {
  const client = new Client({})
  const args = {
    params: {
      key: process.env.GOOGLE_MAPS_API_KEY!,
      address: eventInfo.location,
    },
  }

  try {
    const response = await client.geocode(args)
    console.log('Location Data:', response.data)
  } catch (error) {
    console.error('Geocoding error:', error)
  }
}

await browser.close()
