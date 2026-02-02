const upstreamTransformer = require('@expo/metro-config/babel-transformer');

/**
 * Custom Metro transformer that replaces import.meta with a compatible alternative
 */
module.exports.transform = async function transform({ src, filename, options }) {
  // For web platform, replace import.meta with a polyfill
  if (options.platform === 'web' && src.includes('import.meta')) {
    // Replace import.meta.env with process.env equivalent
    src = src.replace(/import\.meta\.env\.MODE/g, '(process.env.NODE_ENV || "development")');
    src = src.replace(/import\.meta\.env\.DEV/g, '(process.env.NODE_ENV !== "production")');
    src = src.replace(/import\.meta\.env\.PROD/g, '(process.env.NODE_ENV === "production")');
    src = src.replace(/import\.meta\.env/g, '({ MODE: process.env.NODE_ENV || "development", DEV: process.env.NODE_ENV !== "production", PROD: process.env.NODE_ENV === "production" })');
    src = src.replace(/import\.meta\.url/g, '""');
    src = src.replace(/import\.meta/g, '({ env: { MODE: process.env.NODE_ENV || "development" }, url: "" })');
  }

  // Use the upstream transformer
  return upstreamTransformer.transform({ src, filename, options });
};
