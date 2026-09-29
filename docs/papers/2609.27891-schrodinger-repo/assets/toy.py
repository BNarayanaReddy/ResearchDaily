# Toy SchrodingerRepo: Level 2 (consistent token remap) + Level 3 (random,
# dependency-safe reorder) on a two-file "repo", then two toy "agents".
# Educational simplification, not the paper's implementation.
import ast, random, re

REPO = {
    "models/fields.py": '''
def make_label(name):
    return name.replace("_", " ").title()

class Field:
    def __init__(self, name):
        self.name = name

class CharField(Field):
    def contribute_to_class(self, cls):
        # BUG: silently overwrites a user-defined get_<name>_display
        setattr(cls, "get_%s_display" % self.name, lambda obj: make_label(self.name))
''',
    "models/query_set.py": '''
class QuerySet:
    def filter(self, **kw):
        return QuerySet()
'''}

# Repo-owned subword tokens and plausible alternatives (the paper asks an LLM for these).
VOCAB = {"query": ["ledger", "lookup"], "set": ["suite", "batch"], "field": ["entry", "column"],
         "display": ["label", "caption"], "get": ["render", "fetch"], "make": ["build", "craft"],
         "label": ["title", "tag"], "contribute": ["attach", "bind"], "char": ["text", "glyph"],
         "models": ["object_models", "records"], "fields": ["entries", "columns"]}
WORD = re.compile(r"[A-Z]?[a-z]+|[A-Z]+(?![a-z])")

def token_map(seed):                     # ONE choice per token, reused everywhere
    rng = random.Random(seed)
    return {tok: rng.choice(alts) for tok, alts in sorted(VOCAB.items())}

def remap_word(m, tm):                   # keep the casing convention of each piece
    w = m.group(); new = tm.get(w.lower(), w.lower())
    return "".join(p.title() for p in new.split("_")) if w[0].isupper() else new

def level2(text, tm):                    # rename only identifiers made of repo-owned tokens
    def ident(m):
        s = m.group()
        if not any(t.lower() in VOCAB for t in WORD.findall(s)): return s
        return WORD.sub(lambda w: remap_word(w, tm), s)
    return re.sub(r"[A-Za-z_][A-Za-z0-9_%]*", ident, text)

def level3(src, seed):                   # random topological order of top-level definitions
    body = ast.parse(src).body
    names = [n.name for n in body]
    deps = [{names.index(b.id) for b in getattr(n, "bases", []) if isinstance(b, ast.Name)} for n in body]
    rng, order = random.Random(seed), []
    while len(order) < len(body):        # a class must come after its base class
        ready = [i for i in range(len(body)) if i not in order and deps[i] <= set(order)]
        order.append(rng.choice(ready))
    return "\n\n".join(ast.unparse(body[i]) for i in order) + "\n", [names[i] for i in order]

def run_test(files, tm):                 # the harness speaks ORIGINAL names, translated in
    ns = {}
    for src in files.values(): exec(src, ns)
    class Person: pass
    ns[level2("CharField", tm)]("first_name").__getattribute__(level2("contribute_to_class", tm))(Person)
    return getattr(Person(), level2("get_first_name_display", tm))()

def memorizer(files):                    # "I remember where get_%s_display lives"
    for step, (path, src) in enumerate(files.items(), 1):
        if "get_%s_display" in src: return path, step
    return None, len(files)

def explorer(files, issue):              # list, read every file, score overlap with the issue
    steps, scored = 1, []
    for path, src in files.items():
        steps += 2
        scored.append((sum(src.count(w) for w in issue.split()) + 3 * ("setattr" in src), path))
    return max(scored)[1], steps + 2     # + reproduce, confirm

ISSUE = "overriding get_first_name_display is ignored because setattr overwrites it"
print("canonical  memorizer:", memorizer(REPO), " explorer:", explorer(REPO, ISSUE))
print("canonical  test ->", repr(run_test(REPO, {})))
for seed in (0, 1, 2):
    tm = token_map(seed)
    view, orders = {}, []
    for path, src in REPO.items():
        new_src, order = level3(level2(src, tm), seed)
        view[level2(path, tm)] = new_src; orders.append(order)
    print(f"\nseed {seed}: {list(view)}  order={orders[0]}")
    print("   test ->", repr(run_test(view, tm)), "| same behaviour:", run_test(view, tm) == run_test(REPO, {}))
    print("   memorizer:", memorizer(view), " explorer:", explorer(view, level2(ISSUE, tm)))
print("\nseed 2 bug line:", [l.strip() for l in view[list(view)[0]].splitlines() if "setattr" in l][0])
