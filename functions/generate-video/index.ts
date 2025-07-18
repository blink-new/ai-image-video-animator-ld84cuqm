import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

interface VideoGenerationRequest {
  imageUrl: string;
  prompt?: string;
  animationStyle: 'smooth' | 'dynamic' | 'cinematic';
}

interface VideoGenerationResponse {
  success: boolean;
  videoUrl?: string;
  error?: string;
  jobId?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    const { imageUrl, prompt, animationStyle }: VideoGenerationRequest = await req.json();

    if (!imageUrl) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Image URL is required' 
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const huggingfaceApiKey = Deno.env.get('HUGGINGFACE_API_KEY');
    if (!huggingfaceApiKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Hugging Face API key not configured' 
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Build the prompt based on animation style
    let enhancedPrompt = prompt || 'animate this image with natural motion';
    
    switch (animationStyle) {
      case 'smooth':
        enhancedPrompt += ', smooth flowing motion, gentle movement, soft transitions, subtle animation';
        break;
      case 'dynamic':
        enhancedPrompt += ', dynamic motion, energetic movement, vibrant action, lively animation';
        break;
      case 'cinematic':
        enhancedPrompt += ', cinematic motion, dramatic movement, film-like quality, professional animation';
        break;
    }

    console.log('Generating video with enhanced prompt:', enhancedPrompt);
    console.log('Image URL:', imageUrl);
    console.log('Animation style:', animationStyle);

    // Try Stable Video Diffusion with better error handling
    try {
      const svdResponse = await fetch(
        'https://api-inference.huggingface.co/models/stabilityai/stable-video-diffusion-img2vid-xt',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${huggingfaceApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: imageUrl,
            parameters: {
              num_frames: 14, // Reduced for faster processing
              motion_bucket_id: animationStyle === 'dynamic' ? 180 : animationStyle === 'cinematic' ? 120 : 100,
              fps: 6, // Reduced for faster processing
              noise_aug_strength: 0.02,
            }
          }),
        }
      );

      const responseText = await svdResponse.text();
      console.log('SVD Response status:', svdResponse.status);
      console.log('SVD Response:', responseText);

      if (svdResponse.ok) {
        // Try to parse as JSON first (in case it's an error message)
        try {
          const jsonResponse = JSON.parse(responseText);
          if (jsonResponse.error) {
            throw new Error(jsonResponse.error);
          }
        } catch {
          // If it's not JSON, assume it's binary video data
          const videoBlob = new TextEncoder().encode(responseText);
          const base64Video = btoa(String.fromCharCode(...videoBlob));
          const videoDataUrl = `data:video/mp4;base64,${base64Video}`;

          return new Response(JSON.stringify({
            success: true,
            videoUrl: videoDataUrl,
            model: 'stable-video-diffusion'
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }

      // Check if model is loading
      if (responseText.includes('loading') || responseText.includes('Loading')) {
        return new Response(JSON.stringify({
          success: false,
          error: 'AI model is loading, please try again in 20-30 seconds',
          retryAfter: 30
        }), {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

    } catch (svdError) {
      console.error('SVD Error:', svdError);
    }

    // Fallback: Try I2VGen-XL model
    try {
      console.log('Trying I2VGen-XL as fallback...');
      
      const i2vResponse = await fetch(
        'https://api-inference.huggingface.co/models/ali-vilab/i2vgen-xl',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${huggingfaceApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: enhancedPrompt,
            parameters: {
              image: imageUrl,
              num_frames: 16,
              fps: 8,
            }
          }),
        }
      );

      const i2vResponseText = await i2vResponse.text();
      console.log('I2VGen Response status:', i2vResponse.status);
      console.log('I2VGen Response:', i2vResponseText);

      if (i2vResponse.ok) {
        try {
          const jsonResponse = JSON.parse(i2vResponseText);
          if (jsonResponse.error) {
            throw new Error(jsonResponse.error);
          }
        } catch {
          const videoBlob = new TextEncoder().encode(i2vResponseText);
          const base64Video = btoa(String.fromCharCode(...videoBlob));
          const videoDataUrl = `data:video/mp4;base64,${base64Video}`;

          return new Response(JSON.stringify({
            success: true,
            videoUrl: videoDataUrl,
            model: 'i2vgen-xl'
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }

      if (i2vResponseText.includes('loading') || i2vResponseText.includes('Loading')) {
        return new Response(JSON.stringify({
          success: false,
          error: 'AI model is loading, please try again in 20-30 seconds',
          retryAfter: 30
        }), {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

    } catch (i2vError) {
      console.error('I2VGen Error:', i2vError);
    }

    // Final fallback: Create a simple demo video response for testing
    console.log('All models failed, returning demo response');
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Video generation temporarily unavailable. The AI models may be loading or experiencing high demand. Please try again in a few minutes.',
      retryAfter: 60,
      demo: true
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Video generation error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error during video generation',
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});