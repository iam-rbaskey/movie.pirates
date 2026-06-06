
import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  outputFileTracingRoot: path.join(__dirname),
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    // reactCompiler moved to top level
  },
  async headers() {
    return [
      {
        // matching all API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'xl.movieposterdb.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ibb.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.imdb.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'imdb.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ia.media-imdb.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'serializd-tmdb-images.b-cdn.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'assets-in.bmscdn.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'imgshare.info',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'posters.movieposterdb.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer, webpack }) => { // `webpack` instance is available in options
    // These packages are optional dependencies of mongodb and bson, but webpack tries to bundle them even if they are not used.
    config.externals.push(
      'kerberos',
      '@mongodb-js/zstd',
      'snappy',
      'aws4',
      'mongodb-client-encryption',
      'socks',
      '@aws-sdk/credential-providers'
    );

    // Disable Webpack minification to avoid HookWebpackError from next's internal plugins
    config.optimization = { ...config.optimization, minimize: false };

    if (!isServer) {
      // Ensure resolve and fallback objects exist
      config.resolve = config.resolve || {};
      config.resolve.fallback = config.resolve.fallback || {};

      // Prevent server-only modules from being bundled for the client
      config.resolve.fallback.async_hooks = false;
      config.resolve.fallback.fs = false;
      config.resolve.fallback.tls = false;
      config.resolve.fallback.net = false;
      config.resolve.fallback.http2 = false;
      config.resolve.fallback.dns = false;
      config.resolve.fallback.child_process = false;
      config.resolve.fallback['timers/promises'] = false;
      config.resolve.fallback.perf_hooks = false;
      config.resolve.fallback.path = false;
      config.resolve.fallback.os = false;
      config.resolve.fallback.crypto = false;
      config.resolve.fallback.stream = false;
      config.resolve.fallback.util = false;
      config.resolve.fallback.http = false;
      config.resolve.fallback.https = false;
      config.resolve.fallback.zlib = false;
      config.resolve.fallback.url = false;
      config.resolve.fallback.assert = false;
      config.resolve.fallback.tty = false;
      config.resolve.fallback.vm = false;
    }

    // Add the NormalModuleReplacementPlugin to strip "node:" prefixes
    // This helps ensure that fallbacks for Node.js core modules work correctly
    // even when they are imported with the "node:" prefix.
    if (webpack && webpack.NormalModuleReplacementPlugin) {
      config.plugins = config.plugins || [];
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^node:(.*)/,
          (resource: any) => { // Using 'any' for resource type as it's Webpack internal
            resource.request = resource.request.replace(/^node:/, '');
          }
        )
      );
    }

    return config;
  },
};

export default nextConfig;
