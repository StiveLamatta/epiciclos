import { isNative } from './platform';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Convierte un Blob o Blob URL a base64
 */
async function blobUrlToBase64(blobUrl) {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      // Remover el prefijo data:*/*;base64,
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Descarga o comparte el video según la plataforma (Web vs Android)
 */
export async function downloadOrShareVideo(url, extension = 'mp4') {
  const fileName = `animacion-epiciclos-${Date.now()}.${extension}`;

  if (isNative()) {
    try {
      // 1. Convertir el blob a base64
      const base64Data = await blobUrlToBase64(url);

      // 2. Guardar en el almacenamiento temporal/cache del dispositivo
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      // 3. Abrir la hoja nativa de Android para Guardar en Galería, Descargas, WhatsApp, etc.
      await Share.share({
        title: 'Animación de Epiciclos',
        text: '¡Mira la animación de Fourier que creé con Epiciclos!',
        url: savedFile.uri,
        dialogTitle: 'Guardar o Compartir Video',
      });
      return true;
    } catch (error) {
      console.error('[Downloader] Error al guardar/compartir en Android:', error);
      alert('Hubo un problema al procesar el video en el dispositivo.');
      return false;
    }
  } else {
    // Modo Web convencional
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  }
}
