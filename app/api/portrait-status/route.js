import { NextResponse } from 'next/server'

export async function POST(req) {
  const { imageBase64, mediaType } = await req.json()
  if (!imageBase64 || !mediaType) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: 'Describe this pet in 2 warm, poetic sentences as if writing marketing copy for a luxury portrait — mention breed if identifiable, personality suggested by expression, and one charming physical detail. Be concise and enchanting.' }
          ]
        }]
      })
    })

    const data = await response.json()
    const description = data.content?.find(b => b.type === 'text')?.text || ''
    return NextResponse.json({ description })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
