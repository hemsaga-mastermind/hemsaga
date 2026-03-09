export async function POST(request) {
  try {
    const { imageUrl, childName } = await request.json();

    // Use the newer deployment-based API format
    const response = await fetch(
      'https://api.replicate.com/v1/models/catacolabs/cartoonify/predictions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
          'Prefer': 'wait'
        },
        body: JSON.stringify({
          input: {
            image: imageUrl
          }
        })
      }
    );

    const result = await response.json();

    if (!result.output) {
      console.error('Replicate error:', JSON.stringify(result));
      return Response.json({ error: result.detail || 'Cartoon generation failed' }, { status: 500 });
    }

    const cartoonUrl = Array.isArray(result.output) ? result.output[0] : result.output;
    return Response.json({ cartoonUrl });

  } catch (error) {
    console.error('Cartoonify error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}