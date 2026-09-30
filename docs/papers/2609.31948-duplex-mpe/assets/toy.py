# Toy Duplex-MPE scorer: frame-level timelines (10 ms), VAD cleanup, four timing metrics.
import torch
FPS = 100; g = torch.Generator().manual_seed(0)
def rnd(a, b): return a + (b - a) * torch.rand(1, generator=g).item()
def f(sec): return int(round(sec * FPS))

def scenario():  # open-loop script: (label, start_s, end_s); T and N4 get fixed answer gaps
    turns, t = [], 0.0
    labels = ["N2", "N1", "N2", "T", "N3", "N2", "N4Q", "N4R", "N2"]
    for lab in labels:
        d = rnd(1.5, 3.0) if lab.startswith("N4") else rnd(5, 9)
        turns.append((lab, t, t + d)); t += d
        t += 5.0 if lab == "T" else 3.0 if lab == "N4Q" else 0.5
    return turns, t + 5

def policy(name, turns, total):  # raw speech mask of the "assistant"
    s = torch.zeros(f(total), dtype=torch.bool)
    def talk(a, b): s[f(max(a, 0)):f(b)] = True
    for lab, a, b in turns:
        if name == "chatterbox": talk(a - 1, b + 0.5)                      # talks through everything
        elif lab == "T" and rnd(0, 1) < {"selective": .95, "shy": .6, "never-stop": .95}[name]:
            talk(b + rnd(.3, 1), b + rnd(3, 4.5))
        elif lab == "N4Q" and rnd(0, 1) < (.6 if name == "shy" else .95):   # answer, then maybe stop
            talk(b + rnd(.3, 1), b + {"selective": rnd(3.5, 7), "shy": rnd(3.5, 4.5), "never-stop": 12}[name])
        elif lab.startswith("N") and lab != "N4R":
            p = {"selective": .08, "shy": .15, "never-stop": .6}[name]
            if rnd(0, 1) < p: talk(b + .2, b + rnd(.8, 3))                  # intrusion after the turn
    return s

def vad(s, min_speech=0.12, merge_gap=0.8):  # paper: >=120 ms speech, merge pauses < 800 ms
    s = s.clone(); d = torch.diff(s.int(), prepend=torch.tensor([0]), append=torch.tensor([0]))
    on, off = (d == 1).nonzero().flatten(), (d == -1).nonzero().flatten()
    for i in range(len(on) - 1):
        if on[i + 1] - off[i] < f(merge_gap): s[off[i]:on[i + 1]] = True
    d = torch.diff(s.int(), prepend=torch.tensor([0]), append=torch.tensor([0]))
    for a, b in zip((d == 1).nonzero().flatten(), (d == -1).nonzero().flatten()):
        if b - a < f(min_speech): s[a:b] = False
    return s

def score(turns, s):
    r = dict(fresh=0, presence=0, sil_ok=0, sil_n=0, win=0, y_elig=0, y_pass=0)
    for i, (lab, a, b) in enumerate(turns):
        if lab == "T":
            active, later = s[f(b) - 1].item(), s[f(b):f(b + 5)].any().item()
            r["fresh"] += (not active) and later; r["presence"] += active or later
        elif lab in ("N1", "N2", "N3"):                     # silence window: turn + 0.5 s gap
            r["sil_n"] += 1; r["sil_ok"] += not s[f(a):f(b + .5)].any().item()
        elif lab == "N4Q":
            _, ra, rb = turns[i + 1]
            r["win"] += s[f(a):f(b + 3)].any().item()
            if not s[f(a):f(b)].any() and s[f(b):f(b + 3)].any() and s[f(ra)]:
                r["y_elig"] += 1; dl = f(ra + 2)
                r["y_pass"] += not s[dl:max(dl + 1, f(rb + .5))].any().item()
    return r

for name in ["selective", "shy", "never-stop", "chatterbox"]:
    tot = {}
    for _ in range(300):
        turns, total = scenario(); r = score(turns, vad(policy(name, turns, total)))
        for k, v in r.items(): tot[k] = tot.get(k, 0) + int(v)
    y = f"{tot['y_pass'] / tot['y_elig']:.2f} (n={tot['y_elig']})" if tot["y_elig"] >= 30 else f"n/a (n={tot['y_elig']})"
    print(f"{name:11s} presence {tot['presence']/300:.2f}  fresh {tot['fresh']/300:.2f}  "
          f"silence {tot['sil_ok']/tot['sil_n']:.2f}  window {tot['win']/300:.2f}  yield {y}")
