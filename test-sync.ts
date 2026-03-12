import { config } from 'dotenv';
config({ path: '.env.production.local' });

async function run() {
    const { default: handler } = await import('./api/admin/sync-transactions');

    const req = {
        method: 'POST',
        headers: {},
        query: {}
    } as any;

    const res = {
        status: (code: number) => {
            console.log(`Status: ${code}`);
            return {
                json: (data: any) => {
                    console.log(`Response:`, data);
                    process.exit(code === 200 ? 0 : 1);
                }
            };
        }
    } as any;

    handler(req, res).catch(console.error);
}

run();
