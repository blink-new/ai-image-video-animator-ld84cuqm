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
    let enhancedPrompt = prompt || '';
    
    switch (animationStyle) {
      case 'smooth':
        enhancedPrompt += ' smooth flowing motion, gentle movement, soft transitions';
        break;
      case 'dynamic':
        enhancedPrompt += ' dynamic motion, energetic movement, vibrant action';
        break;
      case 'cinematic':
        enhancedPrompt += ' cinematic motion, dramatic movement, film-like quality';
        break;
    }

    // First, try Stable Video Diffusion
    console.log('Generating video with Stable Video Diffusion...');
    
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
            num_frames: 25,
            motion_bucket_id: animationStyle === 'dynamic' ? 180 : animationStyle === 'cinematic' ? 120 : 100,
            fps: 8,
            noise_aug_strength: 0.1,
          }
        }),
      }
    );

    if (svdResponse.ok) {
      const videoBlob = await svdResponse.arrayBuffer();
      
      // Convert to base64 for easier handling
      const base64Video = btoa(String.fromCharCode(...new Uint8Array(videoBlob)));
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

    // If SVD fails, try AnimateDiff as fallback
    console.log('SVD failed, trying AnimateDiff...');
    
    const animateDiffResponse = await fetch(
      'https://api-inference.huggingface.co/models/guoyww/animatediff-motion-adapter-v1-5-2',
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
            num_inference_steps: 20,
            guidance_scale: 7.5,
            num_frames: 16,
          }
        }),
      }
    );

    if (animateDiffResponse.ok) {
      const videoBlob = await animateDiffResponse.arrayBuffer();
      const base64Video = btoa(String.fromCharCode(...new Uint8Array(videoBlob)));
      const videoDataUrl = `data:video/mp4;base64,${base64Video}`;

      return new Response(JSON.stringify({
        success: true,
        videoUrl: videoDataUrl,
        model: 'animatediff'
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // If both fail, check if it's a model loading issue
    const errorText = await svdResponse.text();
    if (errorText.includes('loading')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Model is loading, please try again in 20-30 seconds',
        retryAfter: 30
      }), {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Video generation failed. Please try again.',
      details: errorText
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Video generation error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error during video generation'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});