import { NextResponse } from 'next/server'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const requestId = searchParams.get('requestId')
  if (!requestId) return NextResponse.json({ error: 'Missing requestId' }, { status: 400 })

  const FAL_KEY = process.env.FAL_API_KEY
  if (!FAL_KEY) return NextResponse.json({ error: 'FAL_API_KEY not configured' }, { status: 500 })

  try {
    const statusResp = await fetch(
      `https://queue.fal.run/fal-ai/flux/dev/image-to-image/requests/${requestId}/status`,
      { headers: { 'Authorization': `Key ${FAL_KEY}` } }
    )

    if (!statusResp.ok) return NextResponse.json({ error: 'Status check failed' }, { status: 500 })

    const { status } = await statusResp.json()

    if (status === 'COMPLETED') {
      const resultResp = await fetch(
        `https://queue.fal.run/fal-ai/flux/dev/image-to-image/requests/${requestId}`,
        { headers: { 'Authorization': `Key ${FAL_KEY}` } }
      )
      const resultData = await resultResp.json()
      const imageUrl = resultData?.images?.[0]?.url
      if (!imageUrl) return NextResponse.json({ error: 'No image in result' }, { status: 500 })
      return NextResponse.json({ status: 'COMPLETED', imageUrl })
    }

    if (status === 'FAILED') {
      return NextResponse.json({ status: 'FAILED', error: 'Generation failed' }, { status: 500 })
    }

    return NextResponse.json({ status: status || 'IN_QUEUE' })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
