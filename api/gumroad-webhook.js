import { createClient } from '@supabase/supabase-js';

// Vercel Serverless Function Config
export const config = {
  api: {
    bodyParser: true, // Gumroad envía datos como x-www-form-urlencoded normales
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const payload = req.body;
    
    // Validar el webhook de Gumroad (opcionalmente podrías chequear req.body.short_url)
    // El ID de usuario lo enviaremos a Gumroad usando un parámetro en la URL de compra
    // En el Dashboard: href={`https://tu-usuario.gumroad.com/l/epiciclos?user_id=${session.user.id}`}
    // Gumroad lo envía de vuelta en un campo llamado 'user_id' dentro del body del Ping.
    
    const userId = payload.user_id;

    if (userId) {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        // Actualizar el perfil a Premium en Supabase
        const { error } = await supabase
          .from('profiles')
          .update({ is_premium: true })
          .eq('id', userId);
          
        if (error) {
          console.error("Error actualizando Supabase:", error);
          return res.status(500).send('Database error');
        }
        
        console.log(`Usuario ${userId} es ahora Premium (Gumroad Ping).`);
      } else {
        console.error("Faltan credenciales de Supabase en Vercel.");
      }
    } else {
      console.warn("No se encontró el parámetro user_id en el evento de Gumroad.");
    }

    res.send('OK');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
}
