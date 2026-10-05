import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    allowedDevOrigins: [
        '192.168.1.214', // Barn
        '192.168.1.222', // Jackson house
    ],
};

export default nextConfig;
