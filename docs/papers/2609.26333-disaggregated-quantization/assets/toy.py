# Toy "prefiller" (educational simplification of DQ §2.6, not the paper's code).
# A tiny causal transformer learns to copy a 24-token prompt. We then freeze a
# 2-bit weight-only decoder and compare prefill pathways by response-token accuracy.
import os; os.environ["CUDA_VISIBLE_DEVICES"] = ""            # CPU only
import copy, torch, torch.nn as nn, torch.nn.functional as F
torch.manual_seed(0); V, L, D = 32, 24, 32; SEP = V - 1
E2M1 = torch.tensor([0, .5, 1, 1.5, 2, 3, 4, 6.])            # NVFP4 magnitudes (App. A.3)
LUT2 = torch.tensor([-3.6517, 0, 2.5227, 6.])                 # 2-bit grid (App. A.3)
def snap(x, g): return g[(x.unsqueeze(-1) - g).abs().argmin(-1)]
def nvfp4(x):                                                 # blocks of 16, max -> 6
    b = x.reshape(-1, 16); s = b.abs().amax(1, keepdim=True).clamp(min=1e-8) / 6
    return (snap((b / s).abs(), E2M1) * (b / s).sign() * s).reshape(x.shape)
def lut2(w):                                                  # signed scale: max elem -> +6
    b = w.reshape(-1, 16); i = b.abs().argmax(1, keepdim=True)
    s = b.gather(1, i) / 6; s = torch.where(s.abs() < 1e-8, torch.full_like(s, 1e-8), s)
    return (snap(b / s, LUT2) * s).reshape(w.shape)
def ste(x, q): return x + (q - x).detach()                    # straight-through estimator
MASK = None                                                   # [B,T,1] True = prefill position
class PLinear(nn.Module):                                     # one linear, two pathways
    def __init__(s, lin): super().__init__(); s.wp = nn.Parameter(lin.weight.data.clone()); s.wd = lin.weight.data.clone(); s.mode = "fp"
    def forward(s, x):
        if s.mode == "fp": return x @ s.wp.T
        yd = x @ lut2(s.wd).T                                 # decode: 2-bit weight-only, BF16 acts
        if s.mode == "wo": yp = x @ lut2(s.wd).T              # prefill reuses the weight-only path
        else: yp = ste(x, nvfp4(x)) @ ste(s.wp, nvfp4(s.wp)).T       # prefill: W4A4 NVFP4, own weights
        return torch.where(MASK, yp, yd)
class Block(nn.Module):
    def __init__(s): super().__init__(); s.n1, s.n2 = nn.LayerNorm(D), nn.LayerNorm(D); s.qkv, s.o = nn.Linear(D, 3*D, bias=False), nn.Linear(D, D, bias=False); s.f1, s.f2 = nn.Linear(D, 4*D, bias=False), nn.Linear(4*D, D, bias=False)
    def forward(s, x):
        q, k, v = s.qkv(s.n1(x)).view(*x.shape[:2], 3, 4, D // 4).unbind(2)
        a = F.scaled_dot_product_attention(*(t.transpose(1, 2) for t in (q, k, v)), is_causal=True)
        x = x + s.o(a.transpose(1, 2).reshape(x.shape)); return x + s.f2(F.gelu(s.f1(s.n2(x))))
class LM(nn.Module):
    def __init__(s): super().__init__(); s.emb, s.pos = nn.Embedding(V, D), nn.Parameter(torch.randn(2*L+1, D) * .02); s.blocks = nn.Sequential(Block(), Block()); s.head = nn.Linear(D, V, bias=False)
    def forward(s, t): return s.head(s.blocks(s.emb(t) + s.pos[:t.shape[1]]))
def batch(n=128):
    p = torch.randint(0, SEP, (n, L)); return torch.cat([p, torch.full((n, 1), SEP), p], 1)
def resp(logits): return logits[:, L:-1]                      # position t predicts token t+1
teacher = LM(); opt = torch.optim.AdamW(teacher.parameters(), 3e-3)
for step in range(800):                                      # train the full-precision teacher
    t = batch(); loss = F.cross_entropy(resp(teacher(t)).reshape(-1, V), t[:, L+1:].reshape(-1))
    opt.zero_grad(); loss.backward(); opt.step()
student = copy.deepcopy(teacher); lins = []
for blk in student.blocks:
    for n in ["qkv", "o", "f1", "f2"]: pl = PLinear(getattr(blk, n)); setattr(blk, n, pl); lins.append(pl)
MASK = (torch.arange(2*L+1) <= L).view(1, -1, 1)             # prompt + SEP use the prefill path
# One teacher-forced pass == prefill then decode: each position's K/V comes from its own pathway.
@torch.no_grad()
def acc(model, n=2000):
    t = batch(n); return (resp(model(t)).argmax(-1) == t[:, L+1:]).float().mean().item()
def setmode(m): [setattr(pl, "mode", m) for pl in lins]
print(f"teacher (fp32, both phases)              acc={acc(teacher):.3f}")
setmode("wo");   print(f"2-bit weight-only, both phases           acc={acc(student):.3f}")
setmode("disagg"); print(f"+ RTN NVFP4 prefiller (untrained)        acc={acc(student):.3f}")
for p in student.parameters(): p.requires_grad_(False)       # decoder, norms, emb, head frozen
for pl in lins: pl.wp.requires_grad_(True)                    # train only prefill weights (QADD)
opt = torch.optim.AdamW([pl.wp for pl in lins], 1e-3)
for step in range(201):
    t = batch()
    with torch.no_grad(): pt = F.log_softmax(resp(teacher(t)), -1)
    ps = F.log_softmax(resp(student(t)), -1)                  # loss only on response positions
    kl = F.kl_div(ps, pt, log_target=True, reduction="batchmean") / L
    opt.zero_grad(); kl.backward(); opt.step()
    if step % 100 == 0: print(f"  QADD step {step:3d}  KL(teacher||student)={kl.item():.4f}")
print(f"+ QADD-trained NVFP4 prefiller           acc={acc(student):.3f}")
