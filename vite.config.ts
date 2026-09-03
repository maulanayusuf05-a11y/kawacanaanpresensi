import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { pathToFileURL } from 'url';
import { defineConfig, Plugin } from 'vite';

function apiDevMiddleware(): Plugin {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (url.startsWith('/api/')) {
          try {
            const pathname = (url.split('?')[0] || '').replace(/^\/api\//, '');
            const safeRoutes: Record<string, string> = {
              'superadmin': './api/superadmin.ts',
              'admin-users': './api/admin-users.ts',
              'school-lookup': './api/school-lookup.ts',
              'register-school': './api/register-school.ts',
              'payments': './api/payments.ts',
              'resolve-login': './api/resolve-login.ts',
              'setup-superadmin': './api/setup-superadmin.ts',
              'onboarding': './api/onboarding.ts',
            };
            const targetModule = safeRoutes[pathname];
            if (!targetModule) {
              return next();
            }
            const absPath = path.resolve(__dirname, targetModule);
            const handlerModule = await import(pathToFileURL(absPath).href);
            const handler = handlerModule.default;

            const processRequest = async (bodyStr: string) => {
              try {
                (req as any).body = bodyStr ? JSON.parse(bodyStr) : {};
              } catch {
                (req as any).body = {};
              }
              // Parse URL query params
              try {
                const parsedUrl = new URL(req.url || '', 'http://localhost:3000');
                const queryObj: Record<string, string> = {};
                parsedUrl.searchParams.forEach((val, key) => {
                  queryObj[key] = val;
                });
                (req as any).query = queryObj;
              } catch {
                (req as any).query = {};
              }

              (res as any).status = (code: number) => {
                res.statusCode = code;
                return res;
              };
              (res as any).json = (data: any) => {
                if (!res.headersSent) {
                  res.setHeader('Content-Type', 'application/json');
                }
                res.end(JSON.stringify(data));
                return res;
              };

              try {
                await handler(req, res);
              } catch (err: any) {
                if (!res.writableEnded) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err?.message || 'Server error' }));
                }
              }
            };

            if (req.method === 'GET' || req.method === 'HEAD') {
              await processRequest('');
            } else {
              let bodyStr = '';
              req.on('data', (chunk: Buffer) => {
                bodyStr += chunk;
              });
              req.on('end', async () => {
                await processRequest(bodyStr);
              });
            }
            return;
          } catch (err: any) {
            if (!res.writableEnded) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err?.message || 'Failed to load API route' }));
            }
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiDevMiddleware()],
    // Only VITE_* may be embedded into browser code. Never expose SUPABASE_SERVICE_ROLE_KEY.
    envPrefix: ['VITE_'],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
