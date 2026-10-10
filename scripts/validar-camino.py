#!/usr/bin/env python3
"""Revisa una edición de Camino Ágape antes de publicarla.

Uso:  python3 scripts/validar-camino.py [data/encuentros.json]

Comprueba la estructura que usan la app (Nuestra Revista, Mi Camino, Nuestras familias) y algunas
reglas de estilo del equipo. Termina con código 1 si hay errores (las advertencias no bloquean).
"""
import datetime as dt
import json
import re
import sys

MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
ENC_KEYS = ["n", "domingo", "fecha", "tramo", "evangelio", "tema", "lema", "objetivo", "comentario", "preparar", "materiales",
            "acogida", "oracion", "etapas", "plenario", "envio", "evaluar", "tips", "diocesis"]
ETAPA_KEYS = ["titulo", "objetivo", "intro", "dinamica", "preguntas", "desafio", "frase"]
ETAPAS = ["ingreso", "madurez", "aspirante"]
TOP_KEYS = ["year", "title", "subtitle", "claim", "ciclo", "principal", "etapas", "estructura", "encuentros", "tramos", "pausas", "papa", "diocesis"]
PROHIBIDAS = [r"\bgratis\b"]  # estilo del equipo: no decir «gratis»

err, warn = [], []


def fecha(s):
    m = re.match(r"(\d+) de (\w+) de (\d{4})$", str(s).strip())
    if not m or m.group(2) not in MESES:
        return None
    return dt.date(int(m.group(3)), MESES.index(m.group(2)) + 1, int(m.group(1)))


def textos(o, path=""):
    if isinstance(o, str):
        yield path, o
    elif isinstance(o, list):
        for i, x in enumerate(o):
            yield from textos(x, f"{path}[{i}]")
    elif isinstance(o, dict):
        for k, x in o.items():
            yield from textos(x, f"{path}.{k}" if path else k)


def main():
    f = sys.argv[1] if len(sys.argv) > 1 else "data/encuentros.json"
    d = json.load(open(f, encoding="utf-8"))
    for k in TOP_KEYS:
        if k not in d:
            err.append(f"Falta «{k}» en la raíz")
    year = d.get("year")
    tramos = {t.get("key") for t in d.get("tramos", [])}
    prios = {p.get("key") for p in (d.get("diocesis") or {}).get("prioridades", [])}
    encs = d.get("encuentros", [])
    prev, temas = None, {}
    usados = set()
    for i, e in enumerate(encs):
        tag = f"Encuentro {e.get('n', '?')}"
        for k in ENC_KEYS:
            if k not in e or e[k] in ("", None, []):
                (err if k in ("n", "domingo", "fecha", "tramo", "tema", "etapas", "evangelio") else warn).append(f"{tag}: falta «{k}»")
        if e.get("n") != i + 1:
            err.append(f"{tag}: la numeración debe ser correlativa (esperaba {i + 1})")
        fd = fecha(e.get("fecha"))
        if not fd:
            err.append(f"{tag}: fecha con formato inválido «{e.get('fecha')}» (ej.: «7 de marzo de 2027»)")
        else:
            if fd.weekday() != 6:
                err.append(f"{tag}: {e['fecha']} no es domingo")
            if year and fd.year != year:
                err.append(f"{tag}: la fecha no es del año {year}")
            if prev and fd <= prev:
                err.append(f"{tag}: las fechas deben ir en orden")
            prev = fd
            usados.add(MESES[fd.month - 1])
        if e.get("tramo") not in tramos:
            err.append(f"{tag}: tramo «{e.get('tramo')}» no existe en «tramos»")
        ev = e.get("evangelio") or {}
        if not ev.get("ref") or not ev.get("resumen"):
            err.append(f"{tag}: el Evangelio necesita «ref» y «resumen»")
        if e.get("diocesis") and prios and e["diocesis"] not in prios:
            warn.append(f"{tag}: prioridad diocesana «{e['diocesis']}» desconocida")
        t = (e.get("tema") or "").strip().lower()
        if t in temas:
            warn.append(f"{tag}: el tema repite el del encuentro {temas[t]}")
        temas[t] = e.get("n")
        for et in ETAPAS:
            x = (e.get("etapas") or {}).get(et)
            if not x:
                err.append(f"{tag}: falta la etapa «{et}»")
                continue
            for k in ETAPA_KEYS:
                if not x.get(k):
                    err.append(f"{tag} · {et}: falta «{k}»")
            if not isinstance(x.get("preguntas"), list):
                err.append(f"{tag} · {et}: «preguntas» debe ser una lista")
            if len(x.get("frase", "")) > 160:
                warn.append(f"{tag} · {et}: la frase es larga ({len(x['frase'])} caracteres); que sea fácil de recordar")
            if len(x.get("titulo", "")) > 60:
                warn.append(f"{tag} · {et}: el título es largo; en las tarjetas de familia se corta")
    for t in tramos:
        if not any(e.get("tramo") == t for e in encs):
            warn.append(f"El tramo «{t}» no tiene encuentros")
    meses_papa = set(((d.get("papa") or {}).get("meses") or {}).keys())
    for m in sorted(usados - meses_papa, key=MESES.index):
        warn.append(f"Falta la intención del Papa de {m} (papa.meses)")
    for path, s in textos(d):
        for pat in PROHIBIDAS:
            if re.search(pat, s, re.I):
                warn.append(f"Palabra a evitar ({pat.strip(chr(92) + 'b?')}) en {path}")
    try:
        js = open("js/encuentros.js", encoding="utf-8").read()
        if year and not re.search(rf"year:\s*{year},\s*actual:\s*true", js):
            err.append(f"js/encuentros.js: EDICIONES no marca {year} como edición actual")
    except OSError:
        pass

    print(f"{d.get('title', '?')} {year or '(sin «year»)'} · {d.get('ciclo', '')} · {len(encs)} encuentros")
    for w in warn:
        print("  ⚠", w)
    for x in err:
        print("  ✗", x)
    print(f"\n{len(err)} errores · {len(warn)} advertencias" + (" · LISTA PARA PUBLICAR" if not err else ""))
    sys.exit(1 if err else 0)


if __name__ == "__main__":
    main()
