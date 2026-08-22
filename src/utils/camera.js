/**
 * ============================================================================
 * WEBCAM & SELFIE CAMERA UTILITY
 * APDAGU Enterprise v2.0
 * For GPS + Selfie Attendance and Profile Photo Capture
 * ============================================================================
 */

export const Camera = {
  stream: null,

  async start(videoElement) {
    this.stop();
    try {
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoElement) {
        videoElement.srcObject = this.stream;
        await videoElement.play();
      }
      return true;
    } catch (err) {
      console.warn('[Camera] Failed accessing camera:', err.message);
      return false;
    }
  },

  capture(videoElement, quality = 0.8) {
    if (!videoElement || !this.stream) return null;

    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg', quality);
  },

  async captureBlob(videoElement, quality = 0.8) {
    const dataUrl = this.capture(videoElement, quality);
    if (!dataUrl) return null;

    const res = await fetch(dataUrl);
    return await res.blob();
  },

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }
};
