let scanner = null;

export async function ouvrirScanner({ lecteurId, onSuccess, onError }) {
  try {
    if (typeof Html5Qrcode === 'undefined') {
      throw new Error('Le scanner QR ne peut pas être chargé.');
    }

    if (scanner) {
      await fermerScanner();
    }

    scanner = new Html5Qrcode(lecteurId);

    const cameras = await Html5Qrcode.getCameras();

    if (!cameras?.length) {
      throw new Error('Aucune caméra détectée.');
    }

    const camera =
      cameras.find((element) =>
        /back|rear|environment/i.test(element.label)
      ) || cameras[0];

    await scanner.start(
      camera.id,
      {
        fps: 10,
        qrbox: {
          width: 250,
          height: 250
        }
      },
      async (valeur) => {
        await fermerScanner();
        onSuccess?.(valeur);
      },
      () => {}
    );
  } catch (error) {
    await fermerScanner();
    onError?.(error);
  }
}

export async function fermerScanner() {
  if (!scanner) return;

  try {
    await scanner.stop();
    await scanner.clear();
  } catch (error) {
    console.warn(error);
  } finally {
    scanner = null;
  }
}
