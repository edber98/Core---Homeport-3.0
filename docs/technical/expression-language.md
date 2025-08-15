# Langage d’Expressions — Grammaire, Contexte, Sécurité

Ce document formalise la syntaxe des expressions, le contexte d’évaluation, les fonctions autorisées et les garanties de sécurité/déterminisme.

## 1. Objectifs

- Expressif mais sûr; pas d’exécution arbitraire.
- Déterministe et rapide (budget 10 ms par expression).
- Stable entre éditeur (UI) et runtime (backend).

## 2. Syntaxe & Grammaire

Opérateurs:
- Logiques: `&&`, `||`, `!`
- Comparaisons: `==`, `!=`, `>`, `>=`, `<`, `<=`, `in`, `contains`
- Arithmétique: `+`, `-`, `*`, `/`, `%`
- Nullish/coalescence: `??` ; ternaire `cond ? a : b` (si supporté)

EBNF (simplifiée):
```
expression  := orExpr
orExpr      := andExpr ("||" andExpr)*
andExpr     := notExpr ("&&" notExpr)*
notExpr     := ("!" notExpr) | compare
compare     := add (compOp add)?
compOp      := "=="|"!="|">"|">="|"<"|"<="|" in "|" contains "
add         := mul (("+"|"-") mul)*
mul         := unary (("*"|"/"|"%") unary)*
unary       := primary | ("-" unary)
primary     := literal | identifier | call | group | index
group       := "(" expression ")"
index       := primary ("[" string "]" | "." identifier)*
```

Littéraux: nombres, chaînes (quotes simples/doubles), booléens, `null`, `undefined`.

## 3. Contexte d’Évaluation

Racine `$` (lecture seule):
- `$.input` — message ou payload courant
- `$.ctx` — contexte applicatif (utilisateur, paramètres globaux)
- `$.node` — infos du nœud courant (params, meta, times)
- `$.env` — variables d’environnement exposées
- `$.now` — date/heure courante ISO (fixée pour la durée d’une évaluation)
- `$.form` — modèle de formulaire pour `requiredIf`

## 4. Fonctions Autorisées

String: `lower`, `upper`, `trim`, `startsWith`, `endsWith`, `includes`, `regex`.
Array: `len`, `includes`.
Number: `abs`, `round`, `floor`, `ceil`.
Date: `date`, `before`, `after`, `addDays`, `addHours`.
Utils: `isEmpty`, `coalesce(a,b)`.

Signature uniforme: `fn(...args) -> value`. Validation stricte du nombre/type d’arguments.

## 5. Sémantique

- Truthiness: `false`, `0`, `""`, `null`, `undefined`, `[]`, `{}` → faux (configurable).
- Short-circuit: `&&`/`||` s’arrêtent dès que possible.
- Coercions contrôlées: `==` réalise coercion simple (option: forcer `===`).

## 6. Sécurité

- Parseur AST dédié (ex: JSEP) + interpréteur maison; pas d’`eval`.
- Interdiction des globales (`globalThis`, `process`, `Function`, etc.).
- Limites: profondeur AST, longueur source, temps d’évaluation.
- Pas d’accès en écriture; les fonctions n’ont pas d’effets de bord.

## 7. Encodage JSON dans les Paramètres

Deux représentations:
- Valeur statique JSON: `"url": "https://..."`
- Expression: `{ "$expr": "$.input.total * 1.2" }`

Règle d’évaluation:
```ts
function resolveParam(v) { return isExpr(v) ? evalExpr(v.$expr, ctx) : v; }
```

## 8. Erreurs d’Expression

- `ParseError`, `NameError` (référence inconnue), `TypeError` (mauvais type), `RangeError` (date invalide), `TimeoutError`.
- Format sérialisé: `{ name, message, location?: { line, column } }`.

