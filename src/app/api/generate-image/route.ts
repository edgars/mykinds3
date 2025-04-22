import { NextResponse } from "next/server";
import sharp from "sharp";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { createCanvas, loadImage } from "canvas";
import { z } from "zod";
import { UTApi } from "uploadthing/server";

// Initialize UTApi with the API key from environment variables
const utapi = new UTApi({
  apiKey: process.env.UPLOADTHING_KEY
});

const textPositions = [
  "top-left", "top-center", "top-right",
  "middle-left", "middle-center", "middle-right",
  "bottom-left", "bottom-center", "bottom-right"
] as const;

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
  const apiKey = request.headers.get("x-api-key");
  const validApiKey = process.env.API_KEY;

  if (!apiKey || apiKey !== validApiKey) {
    throw new Error("Invalid API key");
  }
}

async function generateImage(input: z.infer<typeof inputSchema>, dimensions: { width: number; height: number }) {
  // Download and resize the input image
  const imageResponse = await fetch(input.imageUrl);
  const imageBuffer = await imageResponse.arrayBuffer();
  
  const resizedImage = await sharp(Buffer.from(imageBuffer))
    .resize(dimensions.width, dimensions.height, {
      fit: "cover",
      position: "center"
    })
    .toBuffer();

  // Create canvas for text overlay
  const canvas = createCanvas(dimensions.width, dimensions.height);
  const ctx = canvas.getContext("2d");

  // Load and draw the background image
  const image = await loadImage(resizedImage);
  ctx.drawImage(image, 0, 0);

  // Convert markdown to HTML and sanitize
  const html = sanitizeHtml(await marked(input.markdownText), {
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    allowedAttributes: {}
  });

  // Split HTML into lines and process each line
  const lines = html.split('<br>').map(line => {
    // Remove HTML tags but keep track of bold text
    const isBold = line.includes('<strong>') || line.includes('<b>');
    const cleanText = line.replace(/<[^>]+>/g, '');
    return { text: cleanText, isBold };
  });

  // Calculate text position (always center)
  const x = dimensions.width / 2;
  const y = dimensions.height / 2;

  // Apply base text styles
  const baseFontSize = input.textStyle.fontSize;
  const lineHeight = baseFontSize * 1.5; // Increased line height for better readability
  const totalHeight = lines.length * lineHeight;
  const startY = y - (totalHeight / 2) + (lineHeight / 2);

  // Draw text with proper styling
  ctx.fillStyle = input.textStyle.color;
  ctx.globalAlpha = input.textStyle.opacity;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  lines.forEach(({ text, isBold }, index) => {
    // Apply different font size for bold text
    const fontSize = isBold ? baseFontSize * 1.2 : baseFontSize;
    ctx.font = `${fontSize}px Arial`;
    
    // Add a subtle text shadow for better readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    
    ctx.fillText(
      text,
      x,
      startY + (index * lineHeight)
    );
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  });

  return canvas.toBuffer();
}

export async function POST(request: Request) {
  try {
    await validateApiKey(request);

    const input = inputSchema.parse(await request.json());

    // Generate images for both formats
    const storyImage = await generateImage(input, { width: 1080, height: 1920 });
    const postImage = await generateImage(input, { width: 1080, height: 1080 });

    // Get current date for filenames
    const date = new Date();
    const dateString = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;

    // Upload to Uploadthing using UTApi
    const [storyResponse, postResponse] = await Promise.all([
      utapi.uploadFiles([
        new File([storyImage], `story-${dateString}.png`, { type: 'image/png' })
      ]),
      utapi.uploadFiles([
        new File([postImage], `post-${dateString}.png`, { type: 'image/png' })
      ])
    ]);

    return NextResponse.json({
      storyUrl: storyResponse[0].data.url,
      postUrl: postResponse[0].data.url
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    
    if (error instanceof Error && error.message === "Invalid API key") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Error generating images:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}