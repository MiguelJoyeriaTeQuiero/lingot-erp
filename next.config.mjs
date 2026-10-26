/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: false,
  },
  // El catálogo vivía en /catalogo y ahora está en la raíz. Las direcciones
  // antiguas (marcadores, enlaces compartidos, buscadores) llevan a la nueva.
  async redirects() {
    return [
      { source: "/catalogo", destination: "/", permanent: true },
      { source: "/catalogo/:path*", destination: "/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
