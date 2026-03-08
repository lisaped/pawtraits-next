import { NextResponse } from 'next/server'

export const maxDuration = 10

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const requestId = searchParams.get('requestId')

  if (!requestId) return NextResponse.json({ error: 'Missing requestId' }, { status: 400 })

  const FAL_KEY = process.env.FAL_API_KEY
  if (!FAL_KEY) return NextResponse.json({ error: 'FAL_API_KEY not configured' }, { status: 500 })

  const BASE = 'https://queue.fal.run/fal-ai/flux/dev/image-to-image'

  try {
    // Check status
    const statusResp = await fetch(`${BASE}/requests/${requestId}/status`, {
      headers: { 'Authorization': `Key ${FAL_KEY}` }
    })
    const statusText = await statusResp.text()
    console.log('Status:', statusResp.status, statusText.substring(0, 200))

    if (!statusResp.ok) {
      return NextResponse.json({ error: `Status failed (${statusResp.status}): ${statusText}` }, { status: 500 })
    }

    const { status } = JSON.parse(statusText)

    if (status === 'COMPLETED') {
      // Fetch result
      const resultResp = await fetch(`${BASE}/requests/${requestId}`, {
        headers: { 'Authorization': `Key ${FAL_KEY}` }
      })
      const resultText = await resultResp.text()
      console.log('Result:', resultResp.status, resultText.substring(0, 200))

      if (!resultResp.ok) {
        return NextResponse.json({ error: `Result failed: ${resultText}` }, { status: 500 })
      }

      const result = JSON.parse(resultText)
      const imageUrl = result?.images?.[0]?.url
      if (!imageUrl) return NextResponse.json({ error: 'No image URL in: ' + resultText }, { status: 500 })

      return NextResponse.json({ status: 'COMPLETED', imageUrl })
    }

    if (status === 'FAILED') {
      return NextResponse.json({ status: 'FAILED', error: 'Generation failed' }, { status: 500 })
    }

    // Still in queue or processing
    return NextResponse.json({ status: status || 'IN_QUEUE' })

  } catch (err) {
    console.error('portrait-status crash:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
