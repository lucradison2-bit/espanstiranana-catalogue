// js/scanner.js
let scannerActif = null;

export async function ouvrirScannerQr({
  lecteurId,
  onSuccess,
  onError
}) {
  if (scannerActif) {
    await fermerScannerQr();
  }

  if (typeof Html5Qrcode === 'undefined') {
    const erreur = new Error(
      "Le scanner n'est pas chargé. Vérifiez la connexion Internet."
    );

    if (onError) onError(erreur);
    return;
  }

  const lecteur = document.getElementById(lecteurId);

  if (!lecteur) {
    const erreur = new Error('Zone du scanner introuvable.');

    if (onError) onError(erreur);
    return;
  }

  scannerActif = new Html5Qrcode(lecteurId);

  try {
    const cameras = await Html5Qrcode.getCameras();

    if (!cameras || cameras.length === 0) {
      throw new Error('Aucune caméra détectée sur cet appareil.');
    }

    const cameraArriere =
      cameras.find((camera) =>
        /back|rear|environment/i.test(camera.label)
      ) || cameras[0];

    await scannerActif.start(
      cameraArriere.id,
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1
      },
      async (texteScanne) => {
        await fermerScannerQr();

        if (onSuccess) {
          onSuccess(texteScanne);
        }
      },
      () => {
        // Lecture continue : aucune erreur à afficher ici.
      }
    );
  } catch (error) {
    console.error('Erreur caméra/scan :', error);
    await fermerScannerQr();

    if (onError) {
      onError(error);
    }
  }
}

export async function fermerScannerQr() {
  if (!scannerActif) return;

  try {
    const etat = scannerActif.getState();

    if (etat === Html5QrcodeScannerState.SCANNING) {
      await scannerActif.stop();
    }

    await scannerActif.clear();
  } catch (error) {
    console.warn('Fermeture scanner :', error);
  } finally {
    scannerActif = null;
  }
}
