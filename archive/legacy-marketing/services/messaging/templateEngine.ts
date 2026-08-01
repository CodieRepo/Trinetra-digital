/**
 * Template Engine
 * Compiles Mustache-style templates from the database by injecting dynamic variables.
 */

export function compileTemplate(body: string, variables: Record<string, string>): string {
  let compiled = body;
  
  for (const [key, value] of Object.entries(variables)) {
    // Replace {{key}} or {{ key }} with the value
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    compiled = compiled.replace(regex, value !== undefined && value !== null ? String(value) : "");
  }
  
  // Clean up any remaining unresolved double-brace variables
  compiled = compiled.replace(/{{\s*[\w_]+\s*}}/g, "");
  
  return compiled;
}
