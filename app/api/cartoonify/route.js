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
        version: "8beff3369e81422112d93b89ca01426147de542cd4684c244b673b105188fe5f",
        input: {
          image: imageUrl,
          prompt: `cartoon portrait of ${childName}, children's book illustration style, 
                   soft watercolour, warm colours, big expressive eyes, cute and gentle, 
                   Pixar style, white background`,
          negative_prompt: "realistic, photo, dark, scary, adult",
          num_inference_steps: 20,
          guidance_scale: 7.5,
        }
      })
    });

    const prediction = await response.json();

    // Poll for result
    let result = prediction;
    while (result.status !== 'succeeded' && result.status !== 'failed') {
      await new Promise(r => setTimeout(r, 1500));
      const poll = await fetch(
        `https://api.replicate.com/v1/predictions/${result.id}`,
        { headers: { 'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}` } }
      );
      result = await poll.json();
    }

    if (result.status === 'failed') {
      return Response.json({ error: 'Cartoon generation failed' }, { status: 500 });
    }

    return Response.json({ cartoonUrl: result.output[0] });

  } catch (error) {
    console.error('Cartoonify error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}