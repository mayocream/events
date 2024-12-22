type IEvent = {
  name: string
  description: string
  startDate: Date
  endDate: Date
  location: string
  geo: {
    lat: number
    lng: number
  }
  content: string
}
