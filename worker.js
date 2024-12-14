export default {
	async fetch(request, env, ctx) {
	  return handleRequest(request, env, ctx);
	}
  };

async function handleRequest(request, env, ctx) {
    try {
        const { name, email, message, 'cf-turnstile-response': token } = await request.json();
        const CAPTCHA_SECRET = env.CAPTCHA_SECRET_KEY;

        // Validasi Metode HTTP
	if (request.method !== 'POST') {
	    return new Response('Method Not Allowed', { status: 405 });
	}

        // Validasi input
        if (typeof name !== 'string' || name.length < 1 || name.length > 100) {
            return new Response('Invalid name', { status: 400 });
        }
        if (!/^[\w\-._]+@[\w\-._]+\.[A-Za-z]{2,}$/.test(email)) {
            return new Response('Invalid email', { status: 400 });
        }
        if (typeof message !== 'string' || message.length < 1 || message.length > 1000) {
            return new Response('Invalid message', { status: 400 });
        }

        // Verifikasi CAPTCHA
        const CaptchaResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `secret=${CAPTCHA_SECRET}&response=${token}`
        });
        const CaptchaData = await CaptchaResponse.json();

        if (!CaptchaData.success) {
            return new Response('Captcha verification failed', { status: 403 });
        }

        // Simpan ke Cloudflare D1
        const db = env.D1;
	    await db.prepare(`INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)`)
            .bind(name, email, message)
            .run();

        return new Response('Message send successfully', { status: 200 });
    } catch (error) {
        return new Response('Failed to send message', { status: 500 });
    }
}
