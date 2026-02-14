import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { apiRoot, apiSuffix } from '../../shared/api-base';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AiAudioService {
  recording = signal(false);
  transcribing = signal(false);
  recordingDuration = signal(0);
  /** Raw waveform time-domain data (0-255, 128 = silence) updated ~30fps */
  waveformData = signal<Uint8Array>(new Uint8Array(0));

  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private timerInterval: any = null;
  private startTime = 0;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;

  constructor(private http: HttpClient) {}

  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      this.chunks = [];

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };

      // Setup Web Audio analyser for waveform
      this.audioCtx = new AudioContext();
      const source = this.audioCtx.createMediaStreamSource(stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
      this.startWaveformLoop();

      this.mediaRecorder.start();
      this.recording.set(true);
      this.startTime = Date.now();
      this.recordingDuration.set(0);

      this.timerInterval = setInterval(() => {
        this.recordingDuration.set(Math.floor((Date.now() - this.startTime) / 1000));
      }, 1000);
    } catch (e: any) {
      console.error('[ai-audio] getUserMedia error:', e);
      throw new Error(e?.message === 'Permission denied' ? 'Accès au microphone refusé' : 'Microphone non disponible');
    }
  }

  stopAndGetBlob(): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        reject(new Error('Not recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'audio/webm' });
        this.cleanup();
        resolve(blob);
      };
      this.mediaRecorder.stop();
    });
  }

  transcribe(blob: Blob): Observable<string> {
    this.transcribing.set(true);
    const subject = new Subject<string>();

    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');

    const path = '/api/ai/transcribe';
    const root = apiRoot();
    const suffix = apiSuffix();
    const cleanPath = environment.production ? path.replace(/^\/api\b/, '') : path;
    const url = `${root}${suffix}${cleanPath}`;

    this.http.post<any>(url, formData).subscribe({
      next: (res) => {
        const text = res?.data?.text || res?.text || '';
        this.transcribing.set(false);
        subject.next(text);
        subject.complete();
      },
      error: (e) => {
        console.error('[ai-audio] transcribe error:', e);
        this.transcribing.set(false);
        subject.error(e);
      },
    });

    return subject.asObservable();
  }

  private startWaveformLoop() {
    const loop = () => {
      if (!this.analyser) return;
      const data = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteTimeDomainData(data);
      this.waveformData.set(data);
      this.animFrameId = requestAnimationFrame(loop);
    };
    loop();
  }

  private stopWaveformLoop() {
    if (this.animFrameId != null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.waveformData.set(new Uint8Array(0));
  }

  private cleanup() {
    this.recording.set(false);
    this.recordingDuration.set(0);
    this.stopWaveformLoop();
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    try {
      this.audioCtx?.close();
    } catch {}
    this.audioCtx = null;
    this.analyser = null;
    try {
      this.mediaRecorder?.stream?.getTracks()?.forEach(t => t.stop());
    } catch {}
    this.mediaRecorder = null;
    this.chunks = [];
  }

  cancelRecording() {
    this.cleanup();
  }
}
