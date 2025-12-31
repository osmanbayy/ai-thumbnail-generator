import { Request, Response } from "express";
import Thumbnail from "../models/Thumbnail.js";
import { GenerateContentConfig } from "@google/genai";
import ai from "../config/ai.js";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

const stylePrompts = {
  'Bold & Graphic': 'eye-catching thumbnail, bold typography, vibrant colors, expressive facial reaction, dramatic lighting, high contrast, click-worthy composition, professional style',
  'Tech/Futuristic': 'futuristic thumbnail, sleek modern design, digital UI elements, glowing accents, holographic effects, cyber-tech aesthetic, sharp lighting, high-tech atmosphere',
  'Minimalist': 'minimalist thumbnail, clean layout, simple shapes, limited color palette, plenty of negative space, modern flat design, clean focal point',
  'Photorealistic': 'photorealistic thumbnail, ultra-realistic lighting, natural skin tones, candid moment, DSLR-style photography, lifestyle realism, shallow depth of field',
  'Illustrated': 'illustrated thumbnail, custom digital illustration, stylized characters, bold outlines, vibrant colors, creative cartoon or vector art style',
}

const colorSchemeDescriptions = {
  vibrant: 'vibrant and energetic colors, high saturation, bold contrasts, eye-catching palette',
  sunset: 'warm sunset tones, orange pink and purple hues, soft gradients, cinematic glow',
  forest: 'natural green tones, earthy colors, calm and organic palette, fresh atmosphere',
  neon: 'neon glow effects, electric blues and pinks, cyberpunk lighting, high contrast glow',
  purple: 'purple-dominant color palette, magenta and violet tones, modern and stylish mood',
  monochrome: 'black and white color scheme, high contrast, dramatic lighting, timeless aesthetic',
  ocean: 'cool blue and teal tones, aquatic color palette, fresh and clean atmosphere',
  pastel: 'soft pastel colors, low saturation, gentle tones, calm and friendly aesthetic',
}

export const generateThumbnail = async (request: Request, response: Response) => {
  try {
    const { userId } = request.session;
    const { title, prompt: user_prompt, style, aspect_ratio, color_scheme, text_overlay } = request.body;

    const thumbnail = await Thumbnail.create({
      userId,
      title,
      prompt_used: user_prompt,
      user_prompt,
      style,
      aspect_ratio,
      color_scheme,
      text_overlay,
      isGenerating: true,
    });

    const model = 'gemini-3-pro-image-preview';

    const generationConfig: GenerateContentConfig = {
      maxOutputTokens: 32768,
      temperature: 1,
      topP: 0.95,
      responseModalities: ['IMAGE'],
      imageConfig: {
        aspectRatio: aspect_ratio || '16:9',
        imageSize: '1K'
      },
    }

    let prompt = `Create a ${stylePrompts[style as keyof typeof stylePrompts]} for: "${title}"`;

    if (color_scheme) {
      prompt += `Use a ${colorSchemeDescriptions[color_scheme as keyof typeof colorSchemeDescriptions]} color scheme`
    }

    if (user_prompt) {
      prompt += `Additional Details: ${user_prompt}.`;
    }

    prompt += `The thumbnail should be ${aspect_ratio}, visually stunning, and designed to maximize click-through rate. Make it bold, professional, and impossible to ignore.`

    // Generate the image using the ai model
    const res: any = await ai.models.generateContent({
      model,
      contents: [prompt],
      config: generationConfig
    });

    // check if the response is valid
    if (!res?.candidates?.[0]?.content?.parts) {
      throw new Error("Unexpected response.");
    }

    const parts = res.candidates[0].content.parts;

    let finalBuffer: Buffer | null = null;

    for (const part of parts) {
      if (part.inlineData) {
        finalBuffer = Buffer.from(part.inlineData.data, "base64");
      }
    }

    const filename = `final-output-${Date.now()}.png`;
    const filePath = path.join('images', filename);

    // Create the image directory if it doesn't exist
    fs.mkdirSync('images', { recursive: true });

    // Write the final image to file
    fs.writeFileSync(filePath, finalBuffer!);

    const uploadResult = await cloudinary.uploader.upload(filePath, { resource_type: 'image' });

    thumbnail.image_url = uploadResult.url;
    thumbnail.isGenerating = false;

    await thumbnail.save();

    response.json({ message: "Thumbnail generated.", thumbnail });

    // remove image from disk
    fs.unlinkSync(filePath);
  } catch (error) {
    console.error("Error in generate thumbnail controller: ", error);
    response.status(500).json({ message: "Internal Server Error." });
  }
}