import { NextResponse } from "next/server";
import sharp from "sharp";
import { z } from "zod";
import { UTApi } from "uploadthing/server";
import path from "path";
import { marked } from "marked";

// Conditionally import canvas based on environment
// This will be properly initialized at runtime, but we need to provide a fallback
// for Next.js static analysis during build time
type CanvasType = {
  createCanvas: (width: number, height: number) => any;
  loadImage: (src: string | Buffer) => Promise<any>;
  registerFont: (path: string, options: any) => void;
};

// Initialize canvas with fallback values
let canvasModule: CanvasType = {
  createCanvas: (width: number, height: number) => ({
    width,
    height,
    getContext: () => ({}),
    toBuffer: () => Buffer.from([]),
  }),
  loadImage: async () => ({}),
  registerFont: () => {},
};

// This initialization runs only at runtime
if (process.env.NODE_ENV === 'production') {
  try {
    // Force using the real canvas module at runtime
    if (process.env.NEXT_PHASE !== 'phase-production-build') {
      const realCanvas = require('canvas');
      canvasModule = realCanvas;
      
      // Register fonts at runtime
      console.log("[Text Rendering] Loading font files...");
      canvasModule.registerFont(path.join(process.cwd(), 'fonts/NotoSans-Regular.ttf'), { 
        family: 'Noto Sans'
      });
      canvasModule.registerFont(path.join(process.cwd(), 'fonts/NotoSans-Bold.ttf'), { 
        family: 'Noto Sans', 
        weight: 'bold'
      });
      canvasModule.registerFont(path.join(process.cwd(), 'fonts/NotoSans-Italic.ttf'), { 
        family: 'Noto Sans', 
        style: 'italic'
      });
      canvasModule.registerFont(path.join(process.cwd(), 'fonts/NotoSans-VariableFont_wdth,wght.ttf'), { 
        family: 'Noto Sans Variable'
      });

      // Register Montserrat fonts for overlay text
      canvasModule.registerFont(path.join(process.cwd(), 'fonts/Montserrat-Light.ttf'), { 
        family: 'Montserrat',
        weight: '300'
      });
      canvasModule.registerFont(path.join(process.cwd(), 'fonts/Montserrat-Regular.ttf'), { 
        family: 'Montserrat'
      });
      canvasModule.registerFont(path.join(process.cwd(), 'fonts/Montserrat-Bold.ttf'), { 
        family: 'Montserrat', 
        weight: 'bold'
      });
      canvasModule.registerFont(path.join(process.cwd(), 'fonts/Montserrat-Italic.ttf'), { 
        family: 'Montserrat', 
        style: 'italic'
      });
      canvasModule.registerFont(path.join(process.cwd(), 'fonts/Montserrat-VariableFont_wght.ttf'), { 
        family: 'Montserrat Variable'
      });
      console.log("[Text Rendering] Fonts loaded successfully");
    }
  } catch (e) {
    console.error("[Text Rendering] Error loading canvas module:", e);
  }
} else {
  // Development environment - use canvas directly
  try {
    const devCanvas = require('canvas');
    canvasModule = devCanvas;
    
    // Register fonts
    console.log("[Text Rendering] Loading font files...");
    canvasModule.registerFont(path.join(process.cwd(), 'fonts/NotoSans-Regular.ttf'), { 
      family: 'Noto Sans'
    });
    canvasModule.registerFont(path.join(process.cwd(), 'fonts/NotoSans-Bold.ttf'), { 
      family: 'Noto Sans', 
      weight: 'bold'
    });
    canvasModule.registerFont(path.join(process.cwd(), 'fonts/NotoSans-Italic.ttf'), { 
      family: 'Noto Sans', 
      style: 'italic'
    });
    canvasModule.registerFont(path.join(process.cwd(), 'fonts/NotoSans-VariableFont_wdth,wght.ttf'), { 
      family: 'Noto Sans Variable'
    });

    // Register Montserrat fonts for overlay text
    canvasModule.registerFont(path.join(process.cwd(), 'fonts/Montserrat-Light.ttf'), { 
      family: 'Montserrat',
      weight: '300'
    });
    canvasModule.registerFont(path.join(process.cwd(), 'fonts/Montserrat-Regular.ttf'), { 
      family: 'Montserrat'
    });
    canvasModule.registerFont(path.join(process.cwd(), 'fonts/Montserrat-Bold.ttf'), { 
      family: 'Montserrat', 
      weight: 'bold'
    });
    canvasModule.registerFont(path.join(process.cwd(), 'fonts/Montserrat-Italic.ttf'), { 
      family: 'Montserrat', 
      style: 'italic'
    });
    canvasModule.registerFont(path.join(process.cwd(), 'fonts/Montserrat-VariableFont_wght.ttf'), { 
      family: 'Montserrat Variable'
    });
    console.log("[Text Rendering] Fonts loaded successfully");
  } catch (e) {
    console.error("[Text Rendering] Error loading fonts:", e);
  }
}

// For convenience, extract the canvas functions
const { createCanvas, loadImage, registerFont } = canvasModule;

// Check if UPLOADTHING_KEY is set
if (!process.env.UPLOADTHING_KEY) {
  console.error("UPLOADTHING_KEY is not set in environment variables");
}

// Initialize the UploadThing API client
const utapi = new UTApi({
  apiKey: process.env.UPLOADTHING_KEY
});

// Define allowed text positions
const textPositions = [
  "top-left", "top-center", "top-right",
  "middle-left", "middle-center", "middle-right",
  "bottom-left", "bottom-center", "bottom-right"
] as const;

// Input validation schema
const inputSchema = z.object({
  imageUrl: z.string().url(),
  markdownText: z.string(),
  position: z.enum(textPositions),
  textStyle: z.object({
    color: z.string(),
    fontSize: z.number().positive(),
    backgroundColor: z.string(),
    padding: z.number().nonnegative(),
    borderRadius: z.number().nonnegative(),
    textAlign: z.enum(["left", "center", "right"]),
    opacity: z.number().min(0).max(1)
  })
});

async function validateApiKey(request: Request) {
  console.log("[API] Validating API key");
  const apiKey = request.headers.get("x-api-key");
  const validApiKey = process.env.API_KEY;

  if (!apiKey || apiKey !== validApiKey) {
    console.error("[API] Invalid API key provided");
    throw new Error("Invalid API key");
  }
  console.log("[API] API key validation successful");
}

// Add this as a new utility function
function logFontMetrics(ctx: CanvasRenderingContext2D, text: string) {
  // Test if the font is being applied correctly
  console.log("[Font Metrics] Current font:", ctx.font);
  
  // Get metrics for a test string with accented characters
  const testString = "AÁÀÂÃaáàâãEÉÈÊeéèêIÍÌÎiíìîOÓÒÔÕoóòôõUÚÙÛuúùûÇç";
  const metrics = ctx.measureText(testString);
  
  console.log("[Font Metrics] Test string:", testString);
  console.log("[Font Metrics] Width:", metrics.width);
  console.log("[Font Metrics] Actual text:", text);
  console.log("[Font Metrics] Actual text width:", ctx.measureText(text).width);
  
  // Additional font metrics if available
  if (metrics.actualBoundingBoxAscent !== undefined) {
    console.log("[Font Metrics] Ascent:", metrics.actualBoundingBoxAscent);
    console.log("[Font Metrics] Descent:", metrics.actualBoundingBoxDescent);
  }
}

// Simplified function that renders text exactly as provided, centered at the top
function renderBasicText(ctx: any, text: string, x: number, y: number, fontSize: number, maxWidth: number) {
  console.log("[Text Rendering] Input text:", text);
  
  // Set base font properties
  ctx.textBaseline = 'top';
  ctx.font = `300 ${fontSize}px 'Montserrat', 'Montserrat Variable', Arial, sans-serif`;
  ctx.textAlign = "center"; // Force center alignment
  
  // Process the text line by line
  const lines = text.split('\n').filter(line => line !== undefined);
  console.log("[Text Rendering] Number of lines:", lines.length);
  
  // Set line height
  const lineHeight = fontSize * 1.4;
  let currentY = y;
  
  // Process each line
  for (const line of lines) {
    // Simply render each line as-is, with markdown symbols
    drawTextWithProperEncoding(ctx, line, x, currentY);
    currentY += lineHeight;
  }
  
  return currentY - y; // Return total height used
}

// Helper function to wrap text with character limit and Portuguese language support
function wrapText(ctx: any, text: string, maxWidth: number, maxCharsPerLine: number = 30): string[] {
  if (!text) return ['']; // Handle empty text
  
  // Define Portuguese-specific punctuation that shouldn't be separated from the preceding word
  const keepWithPreviousWord = /^[.,;:!?»)}\]"']+$/;
  
  // Define characters that shouldn't be separated from the following word
  const keepWithNextWord = /^[«({[\]"']+$/;
  
  // Split text into words while preserving spaces and punctuation
  const words = text.split(/(\s+|[.,;:!?»)}\]"']+|[«({[\]"']+)/).filter(Boolean);
  
  const lines = [];
  let currentLine = '';
  let currentLineCharCount = 0;
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    // Skip adding spaces at the beginning of a new line
    if (/^\s+$/.test(word) && currentLine === '') continue;
    
    // Handle punctuation that should stick to the previous word
    if (keepWithPreviousWord.test(word) && currentLine !== '') {
      currentLine += word;
      currentLineCharCount += word.length;
      continue;
    }
    
    // Special handling for punctuation that should stick to the next word
    if (keepWithNextWord.test(word) && i < words.length - 1) {
      const nextWord = words[i + 1];
      const combinedWord = word + nextWord;
      const testLine = currentLine + combinedWord;
      const testWidth = ctx.measureText(testLine).width;
      const testLineCharCount = currentLineCharCount + combinedWord.length;
      
      // If the combined word fits, add it together
      if (testWidth <= maxWidth && testLineCharCount <= maxCharsPerLine) {
        currentLine = testLine;
        currentLineCharCount = testLineCharCount;
        i++; // Skip the next word as we've already processed it
        continue;
      }
    }
    
    const wordLength = word.trim().length;
    const testLine = currentLine + word;
    const testWidth = ctx.measureText(testLine).width;
    const testLineCharCount = currentLineCharCount + word.length;
    
    // Check if adding this word would exceed maxWidth or maxCharsPerLine
    // Don't break at spaces (they don't count as exceeding character limit)
    if ((testWidth > maxWidth) || 
        (!word.match(/^\s+$/) && testLineCharCount > maxCharsPerLine)) {
      // Don't push empty lines
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      // Skip adding a space at the beginning of a new line
      currentLine = /^\s+$/.test(word) ? '' : word;
      currentLineCharCount = wordLength; // Reset character count for new line
    } else {
      currentLine = testLine;
      currentLineCharCount = testLineCharCount;
    }
  }
  
  if (currentLine.trim()) {
    lines.push(currentLine); // Add the last line if it's not empty
  }
  
  // If no lines were created (empty input), return an array with an empty string
  if (lines.length === 0) {
    return [''];
  }
  
  return lines;
}

// Add a debug function to show text encoding details
function debugTextEncoding(text: string) {
  console.log("[Text Encoding Debug] Text length:", text.length);
  console.log("[Text Encoding Debug] First 10 characters:", text.substring(0, 10));
  console.log("[Text Encoding Debug] Character codes:");
  for (let i = 0; i < Math.min(text.length, 20); i++) {
    console.log(`  Char '${text[i]}': ${text.charCodeAt(i)} (${text.charCodeAt(i).toString(16)})`);
  }
}

// Helper function to render text with proper encoding
function drawTextWithProperEncoding(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  // Ensure text is defined and not null
  if (!text) return 0;
  
  // Ensure text is properly normalized for rendering
  const normalizedText = text.normalize('NFC');
  
  // Draw text directly when using center alignment (simpler approach)
  ctx.fillText(normalizedText, x, y);
  
  return ctx.measureText(normalizedText).width;
}

async function generateImage(input: z.infer<typeof inputSchema>, dimensions: { width: number; height: number }) {
  console.log(`[Image Generation] Starting image generation (${dimensions.width}x${dimensions.height})`);
  console.log(`[Image Generation] Fetching image from URL: ${input.imageUrl}`);
  
  // Debug text encoding
  debugTextEncoding(input.markdownText);
  
  try {
    // Download and resize the input image
    const imageResponse = await fetch(input.imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    console.log(`[Image Generation] Image fetched successfully (${imageBuffer.byteLength} bytes)`);
    
    const resizedImage = await sharp(Buffer.from(imageBuffer))
      .resize(dimensions.width, dimensions.height, {
        fit: "cover",
        position: "center"
      })
      .toBuffer();
    console.log(`[Image Generation] Image resized to ${dimensions.width}x${dimensions.height}`);

    // Create canvas for text overlay
    const canvas = createCanvas(dimensions.width, dimensions.height);
    const ctx = canvas.getContext("2d");

    // Load and draw the background image
    const image = await loadImage(resizedImage);
    ctx.drawImage(image, 0, 0);
    console.log(`[Image Generation] Background image drawn on canvas`);

    // Calculate text position - force top-center positioning
    const horizontalMargin = dimensions.width * 0.1;
    const verticalMargin = dimensions.height * 0.1;
    
    // Calculate the safe area width for text
    const safeWidth = dimensions.width - (horizontalMargin * 2);
    
    // Force center horizontal alignment
    const x = dimensions.width / 2;
    const y = verticalMargin; // Set to top with margin

    console.log(`[Image Generation] Text position set to top-center: (${x}, ${y})`);
    
    // Override text alignment to center
    ctx.textAlign = "center" as CanvasTextAlign;
    
    // Set text color and opacity
    ctx.fillStyle = input.textStyle.color;
    ctx.globalAlpha = input.textStyle.opacity;
    
    console.log(`[Image Generation] Font settings: ${input.textStyle.fontSize}px, Color: ${input.textStyle.color}, Opacity: ${input.textStyle.opacity}`);
    
    // Improve text normalization to better handle accented characters
    const normalizedText = input.markdownText
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .normalize('NFC')        // Use NFC normalization for combined characters
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, ''); // Remove control characters

    // Log detailed information about the text
    console.log(`[Image Generation] Normalized markdown text length: ${normalizedText.length}`);
    console.log(`[Image Generation] Sample of normalized text: ${normalizedText.substring(0, 50)}...`);
    debugTextEncoding(normalizedText); // Debug the normalized text
    
    // Use our simple text renderer with proper width constraints
    renderBasicText(
      ctx, 
      normalizedText, 
      x, 
      y, 
      input.textStyle.fontSize, 
      safeWidth // Use the safe area width instead of a percentage
    );
    
    // Reset opacity
    ctx.globalAlpha = 1.0;
    
    console.log(`[Image Generation] Image generation completed`);
    return canvas.toBuffer();
  } catch (error) {
    console.error(`[Image Generation] Error generating image:`, error);
    throw error;
  }
}

export async function POST(request: Request) {
  console.log("[API] Received POST request to /api/generate-image");
  
  try {
    await validateApiKey(request);

    console.log("[API] Parsing request body");
    const requestBody = await request.json();
    console.log("[API] Request body:", JSON.stringify(requestBody, null, 2));
    
    const input = inputSchema.parse(requestBody);
    console.log("[API] Request validation successful");

    // Generate images for both formats
    console.log("[API] Generating story image (1080x1920)");
    const storyImage = await generateImage(input, { width: 1080, height: 1920 });
    console.log("[API] Story image generated successfully");
    
    console.log("[API] Generating post image (1080x1080)");
    const postImage = await generateImage(input, { width: 1080, height: 1080 });
    console.log("[API] Post image generated successfully");

    // Get current date for filenames
    const date = new Date();
    const dateString = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
    const storyFilename = `story-${dateString}.png`;
    const postFilename = `post-${dateString}.png`;
    
    console.log(`[API] Preparing to upload files: ${storyFilename}, ${postFilename}`);

    // Upload to Uploadthing using UTApi
    console.log("[API] Starting upload to UploadThing");
    
    try {
      const storyFile = new File([storyImage], storyFilename, { type: 'image/png' });
      const postFile = new File([postImage], postFilename, { type: 'image/png' });
      
      console.log(`[API] Created File objects: Story (${storyImage.length} bytes), Post (${postImage.length} bytes)`);
      console.log("[API] Uploading to UploadThing...");
      
      const [storyResponse, postResponse] = await Promise.all([
        utapi.uploadFiles([storyFile]),
        utapi.uploadFiles([postFile])
      ]);
      
      console.log("[API] Upload successful");
      console.log("[API] Story upload response:", JSON.stringify(storyResponse, null, 2));
      console.log("[API] Post upload response:", JSON.stringify(postResponse, null, 2));
      
      return NextResponse.json({
        storyUrl: storyResponse[0].data.url,
        postUrl: postResponse[0].data.url
      });
    } catch (uploadError) {
      console.error("[API] Error during file upload:", uploadError);
      throw uploadError;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("[API] Validation error:", JSON.stringify(error.errors, null, 2));
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    
    if (error instanceof Error && error.message === "Invalid API key") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("[API] Unhandled error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}