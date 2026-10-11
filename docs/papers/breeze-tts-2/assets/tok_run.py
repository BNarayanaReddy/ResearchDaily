"""Round-trip one clip through the Breeze TTS 2 audio tokenizer (Qwen3-TTS 12.5 Hz), CPU only."""
import sys, time, json
import numpy as np, soundfile as sf, torch
from qwen_tts import Qwen3TTSTokenizer
tok_dir, wav_path, out = sys.argv[1], sys.argv[2], sys.argv[3]
torch.set_num_threads(8)
t0 = time.perf_counter(); tok = Qwen3TTSTokenizer.from_pretrained(tok_dir, device_map="cpu"); t_load = time.perf_counter() - t0
wav, sr = sf.read(wav_path, always_2d=True, dtype="float32"); wav = wav.mean(axis=1)
dur = len(wav) / sr
t0 = time.perf_counter(); enc = tok.encode(wav, sr=sr); t_enc = time.perf_counter() - t0
codes = torch.as_tensor(enc["audio_codes"][0])
t0 = time.perf_counter(); dec = tok.decode(enc); t_dec = time.perf_counter() - t0
audio, out_sr = (dec[0][0], dec[1]) if isinstance(dec, tuple) else (dec, 24000)
audio = np.asarray(audio, dtype=np.float32).reshape(-1)
res = {"clip_seconds": round(dur, 3), "input_sr": sr, "codes_shape": list(codes.shape),
       "frames_per_second": round(codes.shape[0] / dur, 3), "code_min": int(codes.min()), "code_max": int(codes.max()),
       "decoded_seconds": round(len(audio) / out_sr, 3), "output_sr": out_sr,
       "load_s": round(t_load, 2), "encode_s": round(t_enc, 2), "decode_s": round(t_dec, 2),
       "torch": torch.__version__, "threads": torch.get_num_threads(), "device": "cpu"}
print(json.dumps(res, indent=1)); json.dump(res, open(out, "w"), indent=1)
