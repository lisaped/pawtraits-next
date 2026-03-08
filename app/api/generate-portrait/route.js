import { NextResponse } from 'next/server'

export const maxDuration = 10

export async function POST(req) {
  let body
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { imageBase64, mediaType, prompt } = body
  if (!imageBase64 || !prompt) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const FAL_KEY = process.env.FAL_API_KEY
  if (!FAL_KEY) return NextResponse.json({ error: 'FAL_API_KEY not configured' }, { status: 500 })

  try {
    const resp = await fetch('https://queue.fal.run/fal-ai/flux/dev/image-to-image', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: `data:${mediaType || 'image/jpeg'};base64,${imageBase64}`,
        prompt: `portrait of a pet, ${prompt}, professional art, high quality, masterpiece`,
        strength: 0.85,
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        image_size: 'square_hd',
      }),
    })

    const text = await resp.text()
    console.log('Queue response:', resp.status, text.substring(0, 200))

    if (!resp.ok) return NextResponse.json({ error: `fal.ai (${resp.status}): ${text}` }, { status: 500 })

    const data = JSON.parse(text)
    if (!data.request_id) return NextResponse.json({ error: 'No request_id: ' + text }, { status: 500 })

    return NextResponse.json({ requestId: data.request_id })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
