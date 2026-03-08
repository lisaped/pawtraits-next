import { NextResponse } from 'next/server'

export async function POST(req) {
  const { imageBase64, mediaType, prompt } = await req.json()
  if (!imageBase64 || !prompt) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const FAL_KEY = process.env.FAL_API_KEY
  if (!FAL_KEY) return NextResponse.json({ error: 'FAL_API_KEY not configured' }, { status: 500 })

  try {
    const dataUri = `data:${mediaType || 'image/jpeg'};base64,${imageBase64}`

    const queueResp = await fetch('https://queue.fal.run/fal-ai/flux/dev/image-to-image', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: dataUri,
        prompt: `portrait of a pet, ${prompt}, professional art, high quality, masterpiece`,
        strength: 0.85,
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        image_size: 'square_hd',
      }),
    })

    const queueText = await queueResp.text()
    console.log('fal.ai queue:', queueResp.status, queueText.substring(0, 200))

    if (!queueResp.ok) {
      return NextResponse.json({ error: `fal.ai error (${queueResp.status}): ${queueText}` }, { status: 500 })
    }

    const { request_id } = JSON.parse(queueText)
    if (!request_id) return NextResponse.json({ error: 'No request_id: ' + queueText }, { status: 500 })

    return NextResponse.json({ requestId: request_id })
  } catch (err) {
    console.error('generate-portrait error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
