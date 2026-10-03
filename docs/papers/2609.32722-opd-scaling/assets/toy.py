# Toy weak-to-strong on-policy distillation (educational simplification, not the paper's code).
# 400 "prompts", one correct answer out of 8 each. The strong student has LATENT
# knowledge on 90% of prompts that its SFT init barely uses; a shared scalar
# `s` ("elicitation") decides how much of it shows up. Per-prompt logits `tab`
# can also memorise whatever the teacher says. The weak RL teacher is sharp on
# 45% of prompts and only mildly right elsewhere.
# Vanilla-OPD: sample from the student, reward each sampled answer with
# log pi_T - log pi_theta (zero-discount, sampled-token), policy-gradient step.
import torch, math
torch.manual_seed(0)
P, V = 400, 8
correct = torch.randint(V, (P,))
onehot = torch.nn.functional.one_hot(correct, V).float()
latent = onehot * (torch.rand(P) < 0.90).float()[:, None]          # student's latent knowledge
teach = (torch.rand(P) < 0.45).float()[:, None]                     # what the weak expert knows
teacher = torch.log_softmax(0.8 * torch.randn(P, V) + onehot * (1.0 + 3.0 * teach), -1)
base = 0.5 * torch.randn(P, V)                                       # SFT init noise

s = torch.nn.Parameter(torch.tensor(0.35))                            # shared: generalises across prompts
tab = torch.nn.Parameter(torch.zeros(P, V))                          # per-prompt: memorises the teacher
policy = lambda: torch.log_softmax(base + s * 4.0 * latent + tab, -1)
opt = torch.optim.Adam([{"params": [s], "lr": 0.004}, {"params": [tab], "lr": 0.0005}])
ref = policy().detach()
gold = lambda lp: (lp.exp() * onehot).sum(-1).mean().item()          # exact expected accuracy

print(f"teacher G_T = {gold(teacher):.3f}   student init G_0 = {gold(ref):.3f}")
log = []
for step in range(1501):
    lp = policy()
    if step % 30 == 0:
        y = torch.multinomial(lp.exp().detach(), 64, replacement=True)
        delta = ref.gather(1, y) - lp.detach().gather(1, y)          # log pi_ref - log pi_theta
        k3 = (delta.exp() - delta - 1).mean().item()                 # Eq. 5, one token per response
        log.append((step, math.sqrt(k3), gold(lp)))
    y = torch.multinomial(lp.exp().detach(), 16, replacement=True)  # fresh student rollouts
    lp_y = lp.gather(1, y)
    adv = (teacher.gather(1, y) - lp_y).detach()                    # A_t = log pi_T - log pi_theta (Eq. 2)
    loss = -(adv * lp_y).mean()
    opt.zero_grad(); loss.backward(); opt.step()

import json; json.dump(log, open("toy_log.json", "w"))
print(" step     d      G")
for st, d, g in log[::5]:
    print(f"{st:5d}  {d:.3f}  {g:.3f}")
def linfit(x, g):                                                 # least-squares line + R^2
    A = torch.stack([torch.ones(len(x)), x], 1)
    c, m = torch.linalg.lstsq(A, g[:, None]).solution.squeeze().tolist()
    res = g - (c + m * x)
    return c, m, (1 - (res ** 2).sum() / ((g - g.mean()) ** 2).sum()).item()
early = torch.tensor(log[:5])                                       # steps 0..120, before the peak
_, _, r2_step = linfit(early[:, 0], early[:, 2])
c, m, r2 = linfit(early[:, 1], early[:, 2])
print(f"first 5 logs, G vs optimizer step: R^2 = {r2_step:.3f}")
st_pk, d_pk, g_pk = max(log, key=lambda t: t[2])
print(f"first 5 logs, G vs d: G = {c:.3f} + {m:.3f} d   (R^2 = {r2:.3f})")
print(f"peak G = {g_pk:.3f} at step {st_pk} (d = {d_pk:.3f}); final G = {log[-1][2]:.3f}; teacher {gold(teacher):.3f}")
