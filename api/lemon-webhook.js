import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Configuración requerida por Vercel para procesar el webhook (necesitamos el raw body para la firma HMAC)
export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
    req.on('error', err => {
      reject(err);
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const rawBody = await getRawBody(req);
    const secret = process.env.LEMON_WEBHOOK_SECRET;
    
    // Verificar firma de Lemon Squeezy
    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
    const signature = Buffer.from(req.headers['x-signature'] || '', 'utf8');

    if (digest.length !== signature.length || !crypto.timingSafeEqual(digest, signature)) {
      console.error('Invalid signature.');
      return res.status(400).json({ error: 'Invalid signature.' });
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload.meta.event_name;

    // Manejar el pago completado
    if (eventName === 'order_created') {
      // Obtenemos el ID de Supabase desde los datos personalizados
      // En el enlace de pago debimos poner: ?checkout[custom][user_id]=EL_ID_DEL_USUARIO
      const userId = payload.meta.custom_data?.user_id;

      if (userId) {
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          
          // Actualizar el perfil a Premium
          const { error } = await supabase
            .from('profiles')
            .update({ is_premium: true })
            .eq('id', userId);
            
          if (error) {
            console.error("Error actualizando Supabase:", error);
            return res.status(500).json({ error: 'Database error' });
          }
          console.log(`Usuario ${userId} es ahora Premium (Lemon Squeezy).`);
        } else {
          console.error("Faltan credenciales de Supabase.");
        }
      } else {
        console.warn("No se encontró custom_data.user_id en el evento de Lemon Squeezy.");
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}
