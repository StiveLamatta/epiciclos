export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Falta userId' });
  }

  const mpAccessToken = process.env.MP_ACCESS_TOKEN;
  if (!mpAccessToken) {
    return res.status(500).json({ error: 'Falta MP_ACCESS_TOKEN en el servidor' });
  }

  try {
    const preferenceData = {
      items: [
        {
          title: 'Epiciclos Premium',
          description: 'Acceso a guardado ilimitado, descargas rápidas y sin anuncios.',
          quantity: 1,
          unit_price: 2.50, // Precio en Soles (PEN) o la moneda de tu cuenta MP
          currency_id: 'PEN'
        }
      ],
      payer: {
        // Opcional, podríamos pasar el correo del usuario si lo tuviéramos en req.body
      },
      external_reference: userId,
      back_urls: {
        success: 'https://epy.stivesci.com?payment=success',
        failure: 'https://epy.stivesci.com?payment=failure',
        pending: 'https://epy.stivesci.com?payment=pending'
      },
      auto_return: 'approved',
      // Esto asegura que Mercado Pago mande el aviso a nuestro webhook sin necesidad de configurarlo en el panel
      notification_url: 'https://epy.stivesci.com/api/mercadopago-webhook'
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mpAccessToken}`
      },
      body: JSON.stringify(preferenceData)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error creando preferencia en Mercado Pago:", data);
      return res.status(500).json({ error: 'Error al contactar a Mercado Pago' });
    }

    // Devuelve la URL a la que debemos redirigir al usuario
    // init_point es la URL estándar, sandbox_init_point es para pruebas
    return res.status(200).json({ init_point: data.init_point });
  } catch (error) {
    console.error("Error interno:", error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
