import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Inicializar Stripe con la clave secreta
// process.env.STRIPE_SECRET_KEY debe estar configurada en Vercel
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

// Configuración requerida por Vercel para procesar el webhook (necesitamos el raw body)
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

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  let rawBody;

  try {
    rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Manejar el evento (checkout.session.completed)
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // Obtener el ID del usuario de Supabase que pusimos en el payment link
    const userId = session.client_reference_id;

    if (userId) {
      // Conectar a Supabase usando Service Role Key para tener permisos de escritura
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        // Actualizar el perfil del usuario a Premium
        const { error } = await supabase
          .from('profiles')
          .update({ is_premium: true })
          .eq('id', userId);
          
        if (error) {
          console.error("Error actualizando Supabase:", error);
          return res.status(500).json({ error: 'Database error' });
        }
        
        console.log(`Usuario ${userId} actualizado a Premium con éxito.`);
      } else {
        console.error("Faltan credenciales de Supabase en Vercel.");
      }
    } else {
      console.warn("No se encontró client_reference_id en la sesión de Stripe.");
    }
  }

  // Confirmar a Stripe que recibimos el evento
  res.json({ received: true });
}
