import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Mercado Pago puede enviar GET, POST, etc. 
  // Lo estándar es POST para Webhooks e IPN
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Mercado Pago envía notificaciones. La estructura depende si es Webhook o IPN.
    // Generalmente viene el ID del pago en req.body.data.id o en req.query.id
    const paymentId = req.query.id || req.query['data.id'] || req.body?.data?.id;
    const type = req.query.topic || req.query.type || req.body?.type;

    if (type === 'payment' && paymentId) {
      // 1. Verificar el estado real del pago consultando a la API de Mercado Pago
      // Necesitamos el Access Token de Mercado Pago configurado en Vercel
      const mpAccessToken = process.env.MP_ACCESS_TOKEN;
      
      if (!mpAccessToken) {
        console.error("Falta MP_ACCESS_TOKEN en Vercel");
        return res.status(500).json({ error: 'Missing MP token' });
      }

      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${mpAccessToken}`
        }
      });
      
      const paymentData = await mpResponse.json();

      // 2. Si el pago está aprobado (status === 'approved')
      if (paymentData.status === 'approved') {
        // Obtenemos el user_id de Supabase. 
        // Al crear el link de pago o preferencia, debemos enviarlo en 'external_reference'
        const userId = paymentData.external_reference;

        if (userId) {
          const supabaseUrl = process.env.VITE_SUPABASE_URL;
          const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          
          if (supabaseUrl && supabaseServiceKey) {
            const supabase = createClient(supabaseUrl, supabaseServiceKey);
            
            // 3. Actualizar perfil en Supabase
            const { error } = await supabase
              .from('profiles')
              .update({ is_premium: true })
              .eq('id', userId);
              
            if (error) {
              console.error("Error actualizando Supabase:", error);
            } else {
              console.log(`Usuario ${userId} es ahora Premium vía Mercado Pago!`);
            }
          }
        } else {
          console.warn("Pago aprobado pero sin external_reference (user_id)");
        }
      }
    }
    
    // Mercado Pago siempre espera un 200 OK rápido
    res.status(200).send('OK');
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).send('Server error');
  }
}
