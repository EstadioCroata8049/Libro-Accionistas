/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // Usamos el directorio de trabajo actual como raíz
    root: process.cwd(),
  },
};

export default nextConfig;
