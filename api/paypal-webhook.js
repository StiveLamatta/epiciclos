import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const payload = req.body;
    // PayPal Webhook event type para pagos completados suele ser CHECKOUT.ORDER.APPROVED o PAYMENT.CAPTURE.COMPLETED
    // Depende de si usas botones de suscripción o pago único
    const eventType = payload.event_type;

    if (eventType === 'PAYMENT.CAPTURE.COMPLETED' || eventType === 'CHECKOUT.ORDER.APPROVED') {
      
      // El ID de usuario lo debemos mandar en la configuración del botón de PayPal
      // en el campo 'custom_id'
      const resource = payload.resource;
      
      // Buscar custom_id (depende de la estructura exacta del evento, usualmente está en purchase_units)
      let userId = resource.custom_id;
      
      if (!userId && resource.purchase_units && resource.purchase_units.length > 0) {
        userId = resource.purchase_units[0].custom_id;
      }

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
          } else {
            console.log(`Usuario ${userId} es ahora Premium (PayPal).`);
          }
        }
      } else {
        console.warn("Pago de PayPal recibido pero sin custom_id (user_id)");
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error("PayPal webhook error:", err);
    res.status(500).send('Server error');
  }
}
