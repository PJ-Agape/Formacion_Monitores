#!/usr/bin/env python3
"""Borrador del calendario de Camino Ágape para un año.

Uso:  python3 scripts/calendario-camino.py 2028 [--json]

Calcula los domingos desde el primer domingo de marzo (nunca antes del I de Cuaresma) hasta Jesucristo, Rey del Universo, con su nombre
litúrgico (uso de Chile: Ascensión y Corpus Christi se celebran en domingo), el ciclo del año (A/B/C)
y las semanas que normalmente NO tienen encuentro (Semana Santa, invierno, Fiestas Patrias).
Si existe una edición archivada del mismo ciclo, copia la cita del Evangelio de ese mismo domingo.

Todo lo marcado con «VERIFICAR» se confirma con el calendario litúrgico de la Conferencia Episcopal
de Chile y el calendario escolar antes de escribir la revista.
"""
import datetime as dt
import glob
import json
import os
import sys

ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII",
         "XVIII", "XIX", "XX", "XXI", "XXII", "XXIII", "XXIV", "XXV", "XXVI", "XXVII", "XXVIII", "XXIX", "XXX", "XXXI",
         "XXXII", "XXXIII", "XXXIV"]
MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
D = dt.timedelta


def pascua(y):  # algoritmo gregoriano (Meeus/Jones/Butcher)
    a, b, c = y % 19, y // 100, y % 100
    d, e = b // 4, b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = c // 4, c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    mes = (h + l - 7 * m + 114) // 31
    dia = (h + l - 7 * m + 114) % 31 + 1
    return dt.date(y, mes, dia)


def ciclo(y):  # año litúrgico que termina en noviembre de y
    return {1: "A", 2: "B", 0: "C"}[y % 3]


def fecha(d):
    return f"{d.day} de {MESES[d.month - 1]} de {d.year}"


def domingos(y):
    P = pascua(y)
    adv1 = dt.date(y, 12, 3) - D(days=(dt.date(y, 12, 3).weekday() + 1) % 7)  # domingo entre 27 nov y 3 dic
    rey = adv1 - D(days=7)
    pent = P + D(days=49)
    out = []
    # Empieza el primer domingo de marzo (año escolar), nunca antes del I Domingo de Cuaresma
    m1 = dt.date(y, 3, 1) + D(days=(6 - dt.date(y, 3, 1).weekday()) % 7)
    d = max(m1, P - D(days=42))
    while d <= rey:
        notas = []
        if d < P:
            k = (P - d).days // 7
            nombre = {6: "I Domingo de Cuaresma", 5: "II Domingo de Cuaresma", 4: "III Domingo de Cuaresma", 3: "IV Domingo de Cuaresma", 2: "V Domingo de Cuaresma", 1: "Domingo de Ramos"}[k]
            tramo = "cuaresma"
        elif d == P:
            nombre, tramo = "Domingo de Pascua", "pascua"
            notas.append("SIN ENCUENTRO: Semana Santa / Pascua (el grupo celebra en la parroquia)")
        elif d < pent:
            k = (d - P).days // 7 + 1
            nombre = {2: "II Domingo de Pascua (de la Divina Misericordia)", 4: "IV Domingo de Pascua (del Buen Pastor)",
                      7: "Ascensión del Señor"}.get(k, f"{ROMAN[k]} Domingo de Pascua")
            tramo = "pascua"
        elif d == pent:
            nombre, tramo = "Domingo de Pentecostés", "pascua"
        else:
            num = 34 - (rey - d).days // 7
            if d == pent + D(days=7):
                nombre = "Santísima Trinidad"
            elif d == pent + D(days=14):
                nombre = "Santísimo Cuerpo y Sangre de Cristo"
            elif d == rey:
                nombre = "Jesucristo, Rey del Universo"
            else:
                nombre = f"{ROMAN[num]} Domingo del Tiempo Ordinario"
            tramo = "ordinario"
            if d == dt.date(y, 8, 15):
                nombre = "Asunción de la Virgen María"
            if d == dt.date(y, 11, 1):
                nombre = "Todos los Santos"
            if d.month == 6 and 28 <= d.day <= 30 or d.month == 7 and d.day <= 1:
                notas.append("VERIFICAR: San Pedro y San Pablo (en Chile puede trasladarse a este domingo)")
            if d.month == 7 and d.day <= 21:
                notas.append("VERIFICAR: ¿vacaciones de invierno? (calendario escolar del MINEDUC, Ñuble)")
            if d.month == 9 and 15 <= d.day <= 21:
                notas.append("SIN ENCUENTRO probable: Fiestas Patrias")
        out.append({"domingo": nombre, "fecha": fecha(d), "iso": d.isoformat(), "tramo_liturgico": tramo, "notas": notas})
        d += D(days=7)
    return out, P, rey, adv1


def year_of(d):
    try:
        return int(str(d["encuentros"][0]["fecha"]).split()[-1])
    except Exception:
        return None


def evangelios_del_ciclo(y, root):
    """Citas del Evangelio de una edición anterior del mismo ciclo (mismo nombre de domingo)."""
    refs = {}
    files = glob.glob(os.path.join(root, "data", "archivo", "encuentros-*.json")) + [os.path.join(root, "data", "encuentros.json")]
    for f in files:
        try:
            d = json.load(open(f, encoding="utf-8"))
        except Exception:
            continue
        year = d.get("year") or year_of(d)
        if not year or year == y or ciclo(year) != ciclo(y):
            continue
        for e in d.get("encuentros", []):
            if e.get("evangelio", {}).get("ref"):
                refs.setdefault(e["domingo"], (e["evangelio"]["ref"], year))
    return refs


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    y = int(sys.argv[1])
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    lista, P, rey, adv1 = domingos(y)
    refs = evangelios_del_ciclo(y, root)
    for x in lista:
        r = refs.get(x["domingo"])
        x["evangelio"] = r[0] if r else ""
        if r:
            x["notas"].append(f"Evangelio tomado de {r[1]} (mismo ciclo): confirmar")
        else:
            x["notas"].append("VERIFICAR: cita del Evangelio (leccionario, ciclo " + ciclo(y) + ")")
    if "--json" in sys.argv:
        print(json.dumps({"year": y, "ciclo": f"Ciclo {ciclo(y)}", "pascua": P.isoformat(), "cristo_rey": rey.isoformat(),
                          "adviento": adv1.isoformat(), "domingos": lista}, ensure_ascii=False, indent=2))
        return
    print(f"Camino Ágape {y} · Ciclo {ciclo(y)}")
    print(f"Pascua: {fecha(P)} · Cristo Rey: {fecha(rey)} · Adviento: {fecha(adv1)}\n")
    for x in lista:
        print(f"{x['iso']}  {x['domingo']:<50} {x['evangelio']}")
        for n in x["notas"]:
            print(f"            · {n}")
    sin = sum(1 for x in lista if any(n.startswith("SIN ENCUENTRO") for n in x["notas"]))
    print(f"\n{len(lista)} domingos · {sin} sin encuentro marcados · faltan restar vacaciones de invierno si corresponde")


if __name__ == "__main__":
    main()
