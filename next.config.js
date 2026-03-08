/** @type {import('next').NextConfig} */
const nextConfig = {}
module.exports = nextConfig

// Increase body size limit for image uploads
module.exports = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}
