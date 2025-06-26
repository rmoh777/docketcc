import { json } from '@sveltejs/kit'
import { HARDCODED_DOCKETS } from '$lib/docket-data.js'

export async function GET() {
  try {
    return json({
      status: 'success',
      count: HARDCODED_DOCKETS.length,
      dockets: HARDCODED_DOCKETS.map(d => ({
        docket_number: d.docket_number,
        title: d.title,
        keywords: d.keywords
      })),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return json({
      status: 'error',
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
} 