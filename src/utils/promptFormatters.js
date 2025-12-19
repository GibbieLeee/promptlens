/**
 * Prompt formatters for different AI image generation models
 * Each formatter adapts the generated prompt to the specific syntax and style
 * preferred by each model/platform
 */

/**
 * Formats prompt for Midjourney
 * - Concise, comma-separated
 * - Can include parameters like --ar, --v, --style
 */
export function formatMidjourneyPrompt(basePrompt) {
  // Remove section headers and structure, make it flow naturally
  let formatted = basePrompt
    .replace(/^(Overall Impression|Subject and Appearance|Setting and Background|Technical Aspects|Style and Mood)[:-\s]*/gmi, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Make it more concise and comma-separated style
  formatted = formatted
    .replace(/\.\s+/g, ', ')
    .replace(/,\s*$/, '');
  
  return formatted;
}

/**
 * Formats prompt for Stable Diffusion
 * - Supports weights like (word:1.5)
 * - Can include negative prompts
 * - More technical, keyword-focused
 */
export function formatStableDiffusionPrompt(basePrompt) {
  let formatted = basePrompt
    .replace(/^(Overall Impression|Subject and Appearance|Setting and Background|Technical Aspects|Style and Mood)[:-\s]*/gmi, '')
    .replace(/\n{2,}/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Convert to comma-separated format
  formatted = formatted
    .replace(/\.\s+/g, ', ')
    .replace(/,\s*$/, '');
  
  return formatted;
}

/**
 * Formats prompt for DALL·E
 * - Natural language, descriptive
 * - More conversational style
 */
export function formatDallePrompt(basePrompt) {
  // Keep structure but make it flow naturally
  let formatted = basePrompt
    .replace(/^(Overall Impression|Subject and Appearance|Setting and Background|Technical Aspects|Style and Mood)[:-\s]*/gmi, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Make it more natural, less structured
  formatted = formatted
    .replace(/\.\s+/g, '. ')
    .trim();
  
  return formatted;
}

/**
 * Formats prompt for Leonardo AI
 * - Similar to Stable Diffusion but with some specific formatting
 */
export function formatLeonardoPrompt(basePrompt) {
  let formatted = basePrompt
    .replace(/^(Overall Impression|Subject and Appearance|Setting and Background|Technical Aspects|Style and Mood)[:-\s]*/gmi, '')
    .replace(/\n{2,}/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
  
  formatted = formatted
    .replace(/\.\s+/g, ', ')
    .replace(/,\s*$/, '');
  
  return formatted;
}

/**
 * Formats prompt for Playground AI
 * - Natural language, descriptive
 */
export function formatPlaygroundPrompt(basePrompt) {
  let formatted = basePrompt
    .replace(/^(Overall Impression|Subject and Appearance|Setting and Background|Technical Aspects|Style and Mood)[:-\s]*/gmi, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  formatted = formatted
    .replace(/\.\s+/g, '. ')
    .trim();
  
  return formatted;
}

/**
 * Formats prompt for Flux / FLUX.2
 * - Modern format, detailed descriptions
 * - Supports natural language with technical details
 */
export function formatFluxPrompt(basePrompt) {
  // Flux works well with detailed, natural language prompts
  let formatted = basePrompt
    .replace(/^(Overall Impression|Subject and Appearance|Setting and Background|Technical Aspects|Style and Mood)[:-\s]*/gmi, '')
    .replace(/\n{2,}/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Keep detailed but make it flow
  formatted = formatted
    .replace(/\.\s+/g, ', ')
    .replace(/,\s*$/, '');
  
  return formatted;
}

/**
 * Formats prompt for Nano Banana / Nano Banana Pro
 * - Natural language, detailed descriptions
 * - Google's model prefers descriptive, comprehensive prompts
 */
export function formatNanoBananaPrompt(basePrompt) {
  // Nano Banana works well with detailed, natural language
  let formatted = basePrompt
    .replace(/^(Overall Impression|Subject and Appearance|Setting and Background|Technical Aspects|Style and Mood)[:-\s]*/gmi, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  formatted = formatted
    .replace(/\.\s+/g, '. ')
    .trim();
  
  return formatted;
}

/**
 * Formats prompt for SDXL (Stable Diffusion XL)
 * - Similar to Stable Diffusion but optimized for XL model
 */
export function formatSDXLPrompt(basePrompt) {
  return formatStableDiffusionPrompt(basePrompt);
}

/**
 * Formats prompt for Ideogram
 * - Natural language, good for text rendering
 */
export function formatIdeogramPrompt(basePrompt) {
  let formatted = basePrompt
    .replace(/^(Overall Impression|Subject and Appearance|Setting and Background|Technical Aspects|Style and Mood)[:-\s]*/gmi, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  formatted = formatted
    .replace(/\.\s+/g, ', ')
    .replace(/,\s*$/, '');
  
  return formatted;
}

/**
 * Formats prompt for Fooocus
 * - Based on Stable Diffusion, similar formatting
 */
export function formatFooocusPrompt(basePrompt) {
  return formatStableDiffusionPrompt(basePrompt);
}

/**
 * Formats prompt for Kandinsky
 * - Sber AI model, prefers detailed descriptions
 */
export function formatKandinskyPrompt(basePrompt) {
  let formatted = basePrompt
    .replace(/^(Overall Impression|Subject and Appearance|Setting and Background|Technical Aspects|Style and Mood)[:-\s]*/gmi, '')
    .replace(/\n{2,}/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
  
  formatted = formatted
    .replace(/\.\s+/g, ', ')
    .replace(/,\s*$/, '');
  
  return formatted;
}

/**
 * Universal format - keeps the structured, detailed format
 */
export function formatUniversalPrompt(basePrompt) {
  // Keep the original structured format
  return basePrompt.trim();
}

/**
 * Main formatter function that routes to the appropriate formatter
 */
export function formatPromptForModel(promptText, modelType = 'universal') {
  const formatters = {
    'universal': formatUniversalPrompt,
    'midjourney': formatMidjourneyPrompt,
    'stable-diffusion': formatStableDiffusionPrompt,
    'dalle': formatDallePrompt,
    'leonardo': formatLeonardoPrompt,
    'playground': formatPlaygroundPrompt,
    'flux': formatFluxPrompt,
    'flux-2': formatFluxPrompt,
    'nano-banana': formatNanoBananaPrompt,
    'nano-banana-pro': formatNanoBananaPrompt,
    'sdxl': formatSDXLPrompt,
    'ideogram': formatIdeogramPrompt,
    'fooocus': formatFooocusPrompt,
    'kandinsky': formatKandinskyPrompt,
  };
  
  const formatter = formatters[modelType] || formatUniversalPrompt;
  return formatter(promptText);
}
