/**
 * @file renderTemplate.js
 * @description Utility for rendering HTML templates with variable replacement
 */
const fs = require('fs').promises;
const path = require('path');

/**
 * Renders an HTML template by replacing variables
 * 
 * @param {string} templatePath - Full path to template file
 * @param {Object} variables - Variables to replace in the template
 * @returns {Promise<string>} Rendered HTML content
 * @throws {Error} If template can't be read or processed
 */
async function renderTemplate(templatePath, variables = {}) {
  try {
    // Read template file
    let content = await fs.readFile(templatePath, 'utf8');
    
    // Replace all variables using the format {{ variableName }}
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      content = content.replace(regex, value);
    });
    
    return content;
  } catch (error) {
    throw new Error(`Template rendering failed: ${error.message}`);
  }
}

/**
 * Renders an email template from the templates directory
 * 
 * @param {string} templateName - Name of the template (without extension)
 * @param {Object} variables - Variables to replace in the template
 * @param {string} [templatesDir] - Optional custom templates directory
 * @returns {Promise<string>} Rendered HTML content
 */
async function renderEmailTemplate(templateName, variables = {}, templatesDir = null) {
  const baseDir = templatesDir || path.join(process.cwd(), 'src/templates/email');
  const templatePath = path.join(baseDir, `${templateName}.html`);
  
  return renderTemplate(templatePath, variables);
}

module.exports = {
  renderTemplate,
  renderEmailTemplate
}; 