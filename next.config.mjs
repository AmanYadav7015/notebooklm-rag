/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "@huggingface/transformers", "onnxruntime-node", "sharp"],
  },
};

export default nextConfig;
