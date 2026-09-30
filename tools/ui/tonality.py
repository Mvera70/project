"""¿Cuánto suena a nota? (`python tools/ui/tonality.py fichero.wav ...`) Mide cuánto tiempo aguanta un componente estrecho por encima de su entorno.
Un timbal, una caja de música o un juguete tienen una resonancia que dura decenas de ms;
un golpe de verdad es ruido que se apaga sin dejar altura."""
import sys, numpy as np, soundfile as sf
from scipy import signal
def ring_ms(x, sr, lo=300, hi=4000):
    f, t, Z = signal.stft(x, sr, nperseg=int(sr*0.024), noverlap=int(sr*0.024*0.75))
    M = np.abs(Z)+1e-12
    sel = (f>=lo)&(f<=hi); M = M[sel]; F = f[sel]
    # cuánto sobresale cada bin de la mediana de sus vecinos (±6 bins)
    from scipy.ndimage import median_filter
    med = median_filter(M, size=(13,1))
    peak = (M/med) > 4.0            # +12 dB sobre el entorno
    loud = M > M.max()*0.05          # y no es cola inaudible
    hit = peak & loud
    dt = (t[1]-t[0])*1000
    best = 0; where=0
    for i in range(hit.shape[0]):
        run=0
        for j in range(hit.shape[1]):
            run = run+1 if hit[i,j] else 0
            if run*dt>best: best=run*dt; where=F[i]
    return best, where
if __name__=='__main__':
    for p in sys.argv[1:]:
        x,sr=sf.read(p)
        r,fz=ring_ms(x,sr)
        print(f'{p.split("/")[-1]:<38} resonancia sostenida {r:5.0f} ms @ {fz:5.0f} Hz')
