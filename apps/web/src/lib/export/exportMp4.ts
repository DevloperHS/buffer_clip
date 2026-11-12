import { buildCursorTrack, outputSize, renderFrame, type Project, type Recording } from '@buffer-clip/core';
import {
  ALL_FORMATS, AudioBufferSource, AudioSampleSink, BlobSource, BufferTarget, CanvasSource,
  getFirstEncodableAudioCodec, getFirstEncodableVideoCodec, Input, Mp4OutputFormat, Output, Quality, VideoSampleSink,
  type AudioCodec, type InputAudioTrack, type VideoCodec,
} from 'mediabunny';
import { AUDIO_BITRATE, bitrateFor, exportFrameTimes, planAudio, type AudioSegment, type ExportErrorCode } from './export-plan';

export class ExportError extends Error {
  constructor(public readonly code: ExportErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'ExportError';
  }
}

export interface ExportOptions {
  project: Project;
  recording: Recording;
  video: Blob;
  onProgress?: (p: number) => void;
  signal?: AbortSignal;
}

const VIDEO_CODECS: VideoCodec[] = ['avc', 'hevc', 'vp9', 'av1'];
const AUDIO_CODECS: AudioCodec[] = ['aac', 'opus'];

const checkAbort = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new ExportError('cancelled');
};

async function renderAudio(track: InputAudioTrack, segments: AudioSegment[], signal?: AbortSignal): Promise<AudioBuffer[]> {
  const sampleRate = track.sampleRate;
  const channels = track.numberOfChannels;
  const sink = new AudioSampleSink(track);
  const out: AudioBuffer[] = [];
  for (const seg of segments) {
    checkAbort(signal);
    const length = Math.round((seg.outDurationMs / 1000) * sampleRate);
    if (length <= 0) continue;
    const buffer = new AudioBuffer({ length, numberOfChannels: channels, sampleRate });
    if (!seg.mute) {
      const start = seg.srcStartMs / 1000;
      for await (const sample of sink.samples(start, seg.srcEndMs / 1000)) {
        const chunk = sample.toAudioBuffer();
        const offset = Math.round((sample.timestamp - start) * sampleRate);
        for (let c = 0; c < channels; c++) {
          const src = chunk.getChannelData(Math.min(c, chunk.numberOfChannels - 1));
          const from = Math.max(0, -offset);
          const to = Math.max(0, offset);
          const n = Math.min(src.length - from, length - to);
          if (n > 0) buffer.getChannelData(c).set(src.subarray(from, from + n), to);
        }
        sample.close();
      }
    }
    out.push(buffer);
  }
  return out;
}

export async function exportMp4({ project, recording, video, onProgress, signal }: ExportOptions): Promise<Blob> {
  const size = outputSize(project.output);
  const fps = project.output.fps;
  const times = exportFrameTimes(project.clips, fps);

  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(video) });
  const videoTrack = await input.getPrimaryVideoTrack();
  if (!videoTrack || !(await videoTrack.canDecode())) throw new ExportError('decode');

  const bitrate = bitrateFor(size, fps);
  const videoCodec = await getFirstEncodableVideoCodec(VIDEO_CODECS, { width: size.w, height: size.h, bitrate });
  if (!videoCodec) throw new ExportError('codec');

  const audioTrack = recording.hasAudio ? await input.getPrimaryAudioTrack() : null;
  const audioCodec =
    audioTrack && (await audioTrack.canDecode())
      ? await getFirstEncodableAudioCodec(AUDIO_CODECS, {
          numberOfChannels: audioTrack.numberOfChannels,
          sampleRate: audioTrack.sampleRate,
          bitrate: AUDIO_BITRATE,
        })
      : null;

  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ExportError('failed', 'Canvas 2D unavailable');

  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target });
  const videoSource = new CanvasSource(canvas, { codec: videoCodec, quality: new Quality({ bitrate }) });
  output.addVideoTrack(videoSource, { frameRate: fps });
  const audioSource = audioCodec ? new AudioBufferSource({ codec: audioCodec, quality: new Quality({ bitrate: AUDIO_BITRATE }) }) : null;
  if (audioSource) output.addAudioTrack(audioSource);

  await output.start();
  try {
    const track = buildCursorTrack(recording.events);
    const sink = new VideoSampleSink(videoTrack);
    const videoShare = audioSource ? 0.9 : 1;
    let i = 0;
    let drawn = false;
    for await (const sample of sink.samplesAtTimestamps(times.map((t) => t / 1000))) {
      if (signal?.aborted) {
        sample?.close();
        throw new ExportError('cancelled');
      }
      const outT = (i * 1000) / fps;
      if (sample) {
        renderFrame(ctx, {
          project,
          recording,
          track,
          outT,
          source: sample.toCanvasImageSource(),
          sourceSize: { w: sample.displayWidth, h: sample.displayHeight },
        });
        sample.close();
        drawn = true;
      } else if (!drawn) {
        renderFrame(ctx, { project, recording, track, outT, source: null, sourceSize: { w: 1, h: 1 } });
        drawn = true;
      }
      await videoSource.add(i / fps, 1 / fps);
      i++;
      onProgress?.((i / times.length) * videoShare);
    }
    if (audioSource && audioTrack) {
      for (const buffer of await renderAudio(audioTrack, planAudio(project.clips), signal)) await audioSource.add(buffer);
    }
    checkAbort(signal);
    await output.finalize();
  } catch (e) {
    await output.cancel().catch(() => {});
    throw e instanceof ExportError ? e : new ExportError('failed', e instanceof Error ? e.message : String(e));
  }

  onProgress?.(1);
  if (!target.buffer) throw new ExportError('failed', 'No output was produced');
  return new Blob([target.buffer], { type: 'video/mp4' });
}
