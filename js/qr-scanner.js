// js/qr-scanner.js
export async function demarrerScanQr({
  containerId,
  onSuccess,
  onClose
}) {
  const container = document.getElementById(containerId);

  if (!container) {
    throw new Error('Zone de scan introuvable.');
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error(
      "La caméra n'est pas disponible dans ce navigateur."
    );
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: 'environment' }
    },
    audio: false
  });

  const video = document.createElement('video');
  video.setAttribute('playsinline', 'true');
  video.autoplay = true;
  video.muted = true;
  video.srcObject = stream;

  const canvas = document.createElement('canvas');
  const contexte = canvas.getContext('2d', { willReadFrequently: true });

  const boutonFermer = document.createElement('button');
  boutonFermer.type = 'button';
  boutonFermer.textContent = 'Fermer le scanner';
  boutonFermer.className = 'btn-reject';

  container.innerHTML = '';
  container.appendChild(video);
  container.appendChild(boutonFermer);

  await video.play();

  let scannerActif = true;

  function fermer() {
    scannerActif = false;
    stream.getTracks().forEach((track) => track.stop());
    container.innerHTML = '';

    if (typeof onClose === 'function') {
      onClose();
    }
  }

  boutonFermer.addEventListener('click', fermer);

  if (!('BarcodeDetector' in window)) {
    fermer();

    throw new Error(
      "Le scan QR n'est pas compatible avec ce navigateur. Utilisez Google Chrome sur Android, ou ouvrez directement le QR code avec l'appareil photo du téléphone."
    );
  }

  const detector = new BarcodeDetector({
    formats: ['qr_code']
  });

  async function analyserImage() {
    if (!scannerActif) return;

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      contexte.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        const codes = await detector.detect(canvas);

        if (codes.length > 0 && codes[0].rawValue) {
          const valeur = codes[0].rawValue;
          fermer();

          if (typeof onSuccess === 'function') {
            onSuccess(valeur);
          }

          return;
        }
      } catch (error) {
        console.error('Erreur scan QR :', error);
      }
    }

    requestAnimationFrame(analyserImage);
  }

  analyserImage();
        }
