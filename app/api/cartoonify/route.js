export async function POST(request) {
  try {
    const { imageUrl, childName } = await request.json();

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: "a9f94946fa0377091ac0bcfe61b0d62ad9a85224e4b421b677d4747914b908c0",
        input: {
          image: imageUrl,
          prompt: `cute cartoon portrait of ${childName}, children's book illustration, soft watercolour style, warm pastel colours, big expressive eyes, Pixar inspired, gentle and sweet, white background`,
          negative_prompt: "realistic, photo, dark, scary, ugly, adult",
          num_inference_steps: 25,
          guidance_scale: 7,
          strength: 0.75
        }
      })
    });

    const prediction = await response.json();
    if (!prediction.id) {
      return Response.json({ error: 'Failed to start prediction' }, { status: 500 });
    }

    // Poll until done
    let result = prediction;
    let attempts = 0;
    while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < 40) {
      await new Promise(r => setTimeout(r, 1500));
      const poll = await fetch(
        `https://api.replicate.com/v1/predictions/${result.id}`,
        { headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}` } }
      );
      result = await poll.json();
      attempts++;
    }

    if (result.status === 'failed' || !result.output) {
      return Response.json({ error: 'Cartoon generation failed' }, { status: 500 });
    }

    const cartoonUrl = Array.isArray(result.output) ? result.output[0] : result.output;
    return Response.json({ cartoonUrl });

  } catch (error) {
    console.error('Cartoonify error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}