import { AdMob, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';
import { isNative } from './platform';

// Test Ad Unit IDs oficiales de Google AdMob para Android
const TEST_AD_UNITS = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  reward: 'ca-app-pub-3940256099942544/5224354917',
};

// En producción se reemplazarían por los IDs reales de la consola de AdMob
export const AD_CONFIG = {
  isTesting: true,
  bannerId: TEST_AD_UNITS.banner,
  interstitialId: TEST_AD_UNITS.interstitial,
  rewardId: TEST_AD_UNITS.reward,
};

let isAdMobInitialized = false;

/**
 * Inicializa AdMob en Android Nativo
 */
export async function initializeAdMob() {
  if (!isNative()) return false;
  if (isAdMobInitialized) return true;

  try {
    await AdMob.initialize({
      initializeForTesting: AD_CONFIG.isTesting,
    });
    isAdMobInitialized = true;
    console.log('[AdMob] Inicializado con éxito en Android.');
    return true;
  } catch (error) {
    console.warn('[AdMob] Error al inicializar:', error);
    return false;
  }
}

/**
 * Muestra el Banner inferior nativo
 */
export async function showNativeBanner() {
  if (!isNative()) return;
  try {
    await initializeAdMob();
    await AdMob.showBanner({
      adId: AD_CONFIG.bannerId,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.TOP_CENTER,
      isTesting: AD_CONFIG.isTesting,
      margin: 0,
    });
  } catch (error) {
    console.warn('[AdMob] Error al mostrar banner:', error);
  }
}

/**
 * Oculta o remueve el banner nativo
 */
export async function hideNativeBanner() {
  if (!isNative()) return;
  try {
    await AdMob.hideBanner();
  } catch (error) {
    console.warn('[AdMob] Error al ocultar banner:', error);
  }
}

/**
 * Prepara y muestra un anuncio intersticial (pantalla completa)
 */
export async function showNativeInterstitial() {
  if (!isNative()) return true; // Si es web, continuar
  try {
    await initializeAdMob();
    await AdMob.prepareInterstitial({
      adId: AD_CONFIG.interstitialId,
      isTesting: AD_CONFIG.isTesting,
    });
    await AdMob.showInterstitial();
    return true;
  } catch (error) {
    console.warn('[AdMob] Error al mostrar intersticial:', error);
    return false;
  }
}

/**
 * Muestra un anuncio de video con recompensa
 */
export async function showNativeRewardVideo() {
  if (!isNative()) return true;
  try {
    await initializeAdMob();
    await AdMob.prepareRewardVideoAd({
      adId: AD_CONFIG.rewardId,
      isTesting: AD_CONFIG.isTesting,
    });
    const rewardItem = await AdMob.showRewardVideoAd();
    return rewardItem;
  } catch (error) {
    console.warn('[AdMob] Error al mostrar video de recompensa:', error);
    return null;
  }
}
