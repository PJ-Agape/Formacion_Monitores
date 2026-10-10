# Camino Ágape: cómo se prepara la revista de cada año

Este es el procedimiento para preparar la edición de cada año de Nuestra Revista (Camino Ágape), con su
calendario de encuentros. Acordado en octubre de 2026: **hasta 2030, Claude redacta la revista completa**.
El equipo revisa, corrige y aprueba. Cualquier sesión nueva de Claude debe partir leyendo este archivo.

## Qué se actualiza solo (no hay que tocarlo)

Todo esto lee `data/encuentros.json`:

- las **tarjetas de Nuestras familias**: «Hoy es el encuentro N° x del año», el título según la etapa
  de la familia y el enlace al encuentro en su revista;
- **Mi Camino** de cada joven: el encuentro de la semana, el avance y la línea de tiempo;
- **Nuestra Revista** (#/encuentros) y sus 5 revistas: principal, coordinación, ingreso, madurez y aspirante;
- el **archivo** de años anteriores (#/archivo/AAAA).

## Calendario de trabajo

| Cuándo | Qué | Quién |
| --- | --- | --- |
| Agosto | Borrador del calendario con `scripts/calendario-camino.py AAAA`. El equipo confirma las semanas sin encuentro: vacaciones de invierno, Fiestas Patrias y actividades parroquiales. | Claude + equipo |
| Septiembre | El equipo define el lema y el foco del año (ej.: «año de la misión», «año vocacional»). Claude propone los tramos y los temas de los 34 a 36 encuentros. | Equipo decide |
| Octubre | Claude redacta la revista completa: principal, coordinación y las tres etapas. | Claude |
| Noviembre | El equipo lee el borrador (PDF o vista previa) y marca lo que no le hace sentido. Claude corrige. | Equipo revisa |
| Diciembre (después de Cristo Rey) | Se cargan las intenciones del Papa del año nuevo, se archiva el año que termina y se publica la edición nueva. | Claude, con el visto bueno del admin |
| Enero y febrero | Pausa. La app muestra la cuenta regresiva hasta el primer encuentro. | — |

## Cómo se prepara (para Claude)

1. **Calendario.** Corre `python3 scripts/calendario-camino.py AAAA`.
   - El año del grupo parte el primer domingo de marzo, nunca antes del I Domingo de Cuaresma, y
     termina en Jesucristo, Rey del Universo.
   - El domingo de Pascua no tiene encuentro, porque el grupo celebra en la parroquia.
   - Hay que confirmar todo lo marcado con «VERIFICAR»:
     - en el calendario litúrgico de la Conferencia Episcopal de Chile: la Ascensión y el Corpus van en
       domingo; también San Pedro y San Pablo, la Asunción y Todos los Santos cuando caen en domingo;
     - en el calendario escolar de Ñuble (MINEDUC), las vacaciones de invierno.
2. **Evangelios.**
   - El ciclo del año lo calcula el script: 2028 es C, 2029 es A, 2030 es B.
   - Si hay una edición archivada del mismo ciclo, el script copia la cita de ese domingo (2030 reutiliza
     2027). Aun así, se confirma cada cita en el leccionario.
   - Los resúmenes se escriben breves y fieles al texto.
3. **Intenciones del Papa.**
   - Salen de la Red Mundial de Oración del Papa (popesprayer.va) para los meses de marzo a noviembre.
   - Van en `papa.meses` dentro de la revista y en `js/papa.js` (`INT`, el tablero del rosario mensual).
   - Si en diciembre aún no están publicadas, se dejan las conocidas y el admin completa el resto desde
     Gestión → Resumen.
4. **Contenido.**
   - Se usa la misma estructura de la edición actual: cada encuentro con su tema, lema, objetivo,
     comentario, preparación, acogida, oración, la parte de cada etapa (título, objetivo, intro, dinámica,
     preguntas, desafío y frase), plenario, envío, evaluación, tips y prioridad diocesana.
   - Se mantienen la alineación con las Prioridades Pastorales de la Diócesis de Chillán (vigentes hasta
     2028: revisar si en 2029 hay prioridades nuevas) y el Mes de María, el Mes de la Solidaridad
     (San Alberto Hurtado) y el Mes de la Familia.
5. **Estilo** (reglas del equipo):
   - público muy joven: textos cortos, cercanos y concretos;
   - salud mental: con delicadeza y sin dramatizar;
   - no usar la palabra «gratis»; decir «intenciones», no «velas», para la oración de intenciones;
   - títulos por etapa de 60 caracteres o menos (se ven en las tarjetas de familia) y frases fáciles de recordar.
6. **Revisión automática.** Corre `python3 scripts/validar-camino.py` hasta que diga **LISTA PARA
   PUBLICAR**. Revisa estructura, fechas (que sean domingos y en orden), etapas completas, tramos,
   intenciones del Papa por mes y palabras a evitar.
7. **Vista previa para el equipo.** Envía la revista en PDF (botón «Revista completa (PDF)» en la copia de
   prueba) o como página para revisar. No se publica nada hasta que el admin dé el visto bueno.
8. **Publicar** (diciembre, después de Cristo Rey):
   1. copiar el `data/encuentros.json` vigente a `data/archivo/encuentros-AAAA.json` (el año que termina);
   2. en `js/encuentros.js`, `EDICIONES`: el año que termina queda sin `actual` y se agrega el nuevo con
      `actual: true`, `ciclo` y `rango`;
   3. reemplazar `data/encuentros.json` por la edición nueva, con `"year": AAAA` (lo usan Mi Camino y el
      validador para separar el avance de cada año);
   4. revisar las «pausas» del año nuevo (antes de empezar, Semana Santa, invierno, Fiestas Patrias,
      Adviento);
   5. subir la versión de `sw.js`, probar en la copia local (#/encuentros, #/mi-camino,
      #/nuestras-familias) y publicar.

## Qué no cambia de un año a otro

- Las 5 revistas y su diseño, las tres etapas y la estructura del encuentro
  (`estructura`: acogida, oración, Palabra, trabajo por etapa, plenario y envío).
- Las familias: la etapa de cada familia la define el equipo en Nuestras familias. Si una familia sube de
  etapa, basta con cambiarla ahí para que vea su nueva revista.
