import { ReactNode } from 'react';

declare global {
    interface Window {
        axios: any;
    }
}

declare module '@inertiajs/react' {
    interface PageProps {
        auth: {
            user?: {
                id: number;
                name: string;
                email: string;
            };
        };
        [key: string]: any;
    }
}

declare module 'laravel-vite-plugin/inertia-helpers' {
    export function resolvePageComponent<T extends Record<string, unknown>>(
        path: string,
        pages: Record<string, () => Promise<T>>
    ): Promise<T>;
}
