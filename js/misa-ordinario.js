// El Ordinario de la Misa para seguirla en orden: lo que dice el sacerdote (s), lo que respondemos
// (p), las oraciones que rezamos todos (t), lo que dice el lector (l), indicaciones (r) y el lugar
// de cada lectura del día (lec). Textos del Misal Romano en uso en Chile (tercera edición).
// info: la clave del momento en misa-partes.js, para la explicación breve «¿Qué pasa aquí?».
// solo: cuándo aparece ("gloria": domingos fuera de Adviento y Cuaresma, y fiestas; "credo":
// domingos y solemnidades; "segunda": si hay segunda lectura).

export const YO_CONFIESO = "Yo confieso ante Dios todopoderoso\ny ante ustedes, hermanos,\nque he pecado mucho\nde pensamiento, palabra, obra y omisión.\nPor mi culpa, por mi culpa, por mi gran culpa.\nPor eso ruego a santa María, siempre Virgen,\na los ángeles, a los santos\ny a ustedes, hermanos,\nque intercedan por mí ante Dios, nuestro Señor.";
export const GLORIA = "Gloria a Dios en el cielo,\ny en la tierra paz a los hombres que ama el Señor.\nPor tu inmensa gloria te alabamos,\nte bendecimos, te adoramos,\nte glorificamos, te damos gracias,\nSeñor Dios, Rey celestial,\nDios Padre todopoderoso.\nSeñor, Hijo único, Jesucristo.\nSeñor Dios, Cordero de Dios, Hijo del Padre;\ntú que quitas el pecado del mundo,\nten piedad de nosotros;\ntú que quitas el pecado del mundo,\natiende nuestra súplica;\ntú que estás sentado a la derecha del Padre,\nten piedad de nosotros;\nporque solo tú eres Santo,\nsolo tú Señor,\nsolo tú Altísimo, Jesucristo,\ncon el Espíritu Santo\nen la gloria de Dios Padre.\nAmén.";
export const CREDO = "Creo en un solo Dios,\nPadre todopoderoso,\nCreador del cielo y de la tierra,\nde todo lo visible y lo invisible.\n\nCreo en un solo Señor, Jesucristo,\nHijo único de Dios,\nnacido del Padre antes de todos los siglos:\nDios de Dios, Luz de Luz,\nDios verdadero de Dios verdadero,\nengendrado, no creado,\nde la misma naturaleza del Padre,\npor quien todo fue hecho;\nque por nosotros, los hombres,\ny por nuestra salvación bajó del cielo,\n[inclinamos la cabeza]\ny por obra del Espíritu Santo\nse encarnó de María, la Virgen,\ny se hizo hombre;\ny por nuestra causa fue crucificado\nen tiempos de Poncio Pilato;\npadeció y fue sepultado,\ny resucitó al tercer día, según las Escrituras,\ny subió al cielo,\ny está sentado a la derecha del Padre;\ny de nuevo vendrá con gloria\npara juzgar a vivos y muertos,\ny su reino no tendrá fin.\n\nCreo en el Espíritu Santo,\nSeñor y dador de vida,\nque procede del Padre y del Hijo,\nque con el Padre y el Hijo\nrecibe una misma adoración y gloria,\ny que habló por los profetas.\nCreo en la Iglesia,\nque es una, santa, católica y apostólica.\nConfieso que hay un solo bautismo\npara el perdón de los pecados.\nEspero la resurrección de los muertos\ny la vida del mundo futuro.\nAmén.";
export const CREDO_AP = "Creo en Dios, Padre todopoderoso,\nCreador del cielo y de la tierra.\nCreo en Jesucristo, su único Hijo, nuestro Señor,\n[inclinamos la cabeza]\nque fue concebido por obra y gracia del Espíritu Santo,\nnació de santa María Virgen,\npadeció bajo el poder de Poncio Pilato,\nfue crucificado, muerto y sepultado,\ndescendió a los infiernos,\nal tercer día resucitó de entre los muertos,\nsubió a los cielos\ny está sentado a la derecha de Dios, Padre todopoderoso.\nDesde allí ha de venir a juzgar a vivos y muertos.\nCreo en el Espíritu Santo,\nla santa Iglesia católica,\nla comunión de los santos,\nel perdón de los pecados,\nla resurrección de la carne\ny la vida eterna.\nAmén.";
export const SANTO = "Santo, Santo, Santo es el Señor,\nDios del universo.\nLlenos están el cielo y la tierra de tu gloria.\nHosanna en el cielo.\nBendito el que viene en nombre del Señor.\nHosanna en el cielo.";
export const PADRE_NUESTRO = "Padre nuestro, que estás en el cielo,\nsantificado sea tu Nombre;\nvenga a nosotros tu reino;\nhágase tu voluntad en la tierra como en el cielo.\nDanos hoy nuestro pan de cada día;\nperdona nuestras ofensas,\ncomo también nosotros perdonamos a los que nos ofenden;\nno nos dejes caer en la tentación,\ny líbranos del mal.";
export const CORDERO = "Cordero de Dios, que quitas el pecado del mundo,\nten piedad de nosotros.\nCordero de Dios, que quitas el pecado del mundo,\nten piedad de nosotros.\nCordero de Dios, que quitas el pecado del mundo,\ndanos la paz.";
export const COMUNION_ESP = "Jesús mío, creo que estás realmente presente en el Santísimo Sacramento del altar.\nTe amo sobre todas las cosas y deseo recibirte en mi alma.\nYa que ahora no puedo recibirte sacramentalmente,\nven al menos espiritualmente a mi corazón.\nComo si ya te hubiese recibido, te abrazo y me uno todo a ti.\nNo permitas, Señor, que jamás me separe de ti.\nAmén.";

export const ORDINARIO = [
  // 1. Ritos iniciales
  { g: "inicio", k: "entrada", t: "Canto de entrada", postura: "De pie", canto: "entrada", info: "entrada", l: [
    ["r", "Al entrar el sacerdote nos ponemos de pie y cantamos."],
  ] },
  { g: "inicio", k: "saludo", t: "Señal de la cruz y saludo", postura: "De pie", info: "saludo", l: [
    ["s", "En el nombre del Padre, y del Hijo, y del Espíritu Santo."],
    ["p", "Amén."],
    ["s", "La gracia de nuestro Señor Jesucristo, el amor del Padre y la comunión del Espíritu Santo estén con todos ustedes."],
    ["r", "O bien: «El Señor esté con ustedes»."],
    ["p", "Y con tu espíritu."],
  ] },
  { g: "inicio", k: "perdon", t: "Acto penitencial", postura: "De pie", canto: "perdon", info: "perdon", l: [
    ["s", "Hermanos: para celebrar dignamente estos sagrados misterios, reconozcamos nuestros pecados."],
    ["r", "Un momento de silencio. Luego, todos:"],
    ["t", YO_CONFIESO, "Yo confieso"],
    ["s", "Dios todopoderoso tenga misericordia de nosotros, perdone nuestros pecados y nos lleve a la vida eterna."],
    ["p", "Amén."],
    ["s", "Señor, ten piedad."], ["p", "Señor, ten piedad."],
    ["s", "Cristo, ten piedad."], ["p", "Cristo, ten piedad."],
    ["s", "Señor, ten piedad."], ["p", "Señor, ten piedad."],
  ] },
  { g: "inicio", k: "gloria", t: "Gloria", postura: "De pie", canto: "gloria", info: "gloria", solo: "gloria", l: [
    ["t", GLORIA, "Gloria"],
  ] },
  { g: "inicio", k: "colecta", t: "Oración colecta", postura: "De pie", info: "colecta", l: [
    ["s", "Oremos."],
    ["r", "Un momento de silencio: pon tus intenciones. El sacerdote reza la oración propia del día."],
    ["p", "Amén."],
  ] },

  // 2. Liturgia de la Palabra
  { g: "palabra", k: "lectura1", t: "Primera lectura", postura: "Sentados", info: "lectura1", l: [
    ["lec", "primera"],
    ["l", "Palabra de Dios."], ["p", "Te alabamos, Señor."],
  ] },
  { g: "palabra", k: "salmo", t: "Salmo responsorial", postura: "Sentados", info: "salmo", l: [
    ["r", "El salmista dice la respuesta y todos la repetimos después de cada estrofa."],
    ["lec", "salmo"],
  ] },
  { g: "palabra", k: "lectura2", t: "Segunda lectura", postura: "Sentados", info: "lectura2", solo: "segunda", l: [
    ["lec", "segunda"],
    ["l", "Palabra de Dios."], ["p", "Te alabamos, Señor."],
  ] },
  { g: "palabra", k: "aleluya", t: "Aclamación al Evangelio", postura: "De pie", canto: "aleluya", info: "aleluya", l: [
    ["aleluya"],
  ] },
  { g: "palabra", k: "evangelio", t: "Evangelio", postura: "De pie", info: "evangelio", l: [
    ["s", "El Señor esté con ustedes."], ["p", "Y con tu espíritu."],
    ["evg"], ["p", "Gloria a ti, Señor."],
    ["r", "Hacemos tres cruces pequeñas: en la frente, en la boca y en el pecho."],
    ["lec", "evangelio"],
    ["s", "Palabra del Señor."], ["p", "Gloria a ti, Señor Jesús."],
  ] },
  { g: "palabra", k: "homilia", t: "Homilía", postura: "Sentados", info: "homilia", l: [
    ["r", "Escuchamos al sacerdote. Busca una idea para llevarte en la semana."],
  ] },
  { g: "palabra", k: "credo", t: "Credo", postura: "De pie", info: "credo", solo: "credo", l: [
    ["t", CREDO, "Credo"],
    ["alt", CREDO_AP, "A veces se reza el Credo de los Apóstoles"],
  ] },
  { g: "palabra", k: "fieles", t: "Oración de los fieles", postura: "De pie", info: "fieles", l: [
    ["r", "Después de cada petición respondemos:"],
    ["p", "Te rogamos, óyenos."],
    ["r", "O la respuesta que indique el lector."],
  ] },

  // 3. Liturgia eucarística
  { g: "eucaristia", k: "ofertorio", t: "Presentación de las ofrendas", postura: "Sentados", canto: "ofertorio", info: "ofertorio", l: [
    ["r", "Mientras se prepara el altar, cantamos. Si no hay canto, el sacerdote dice en voz alta:"],
    ["s", "Bendito seas, Señor, Dios del universo, por este pan, fruto de la tierra y del trabajo del hombre, que recibimos de tu generosidad y ahora te presentamos; él será para nosotros pan de vida."],
    ["p", "Bendito seas por siempre, Señor."],
    ["s", "Bendito seas, Señor, Dios del universo, por este vino, fruto de la vid y del trabajo del hombre, que recibimos de tu generosidad y ahora te presentamos; él será para nosotros bebida de salvación."],
    ["p", "Bendito seas por siempre, Señor."],
    ["r", "Nos ponemos de pie."],
    ["s", "Oren, hermanos, para que este sacrificio, mío y de ustedes, sea agradable a Dios, Padre todopoderoso."],
    ["p", "El Señor reciba de tus manos este sacrificio, para alabanza y gloria de su nombre, para nuestro bien y el de toda su santa Iglesia."],
    ["r", "El sacerdote reza la oración sobre las ofrendas."],
    ["p", "Amén."],
  ] },
  { g: "eucaristia", k: "prefacio", t: "Prefacio", postura: "De pie", info: "prefacio", l: [
    ["s", "El Señor esté con ustedes."], ["p", "Y con tu espíritu."],
    ["s", "Levantemos el corazón."], ["p", "Lo tenemos levantado hacia el Señor."],
    ["s", "Demos gracias al Señor, nuestro Dios."], ["p", "Es justo y necesario."],
    ["r", "El sacerdote reza el prefacio, una gran acción de gracias."],
  ] },
  { g: "eucaristia", k: "santo", t: "Santo", postura: "De pie", canto: "santo", info: "santo", l: [
    ["t", SANTO, "Santo"],
  ] },
  { g: "eucaristia", k: "consagracion", t: "Consagración", postura: "De rodillas", info: "consagracion", l: [
    ["r", "Nos arrodillamos. El sacerdote pide al Espíritu Santo que santifique el pan y el vino, y repite las palabras de Jesús en la Última Cena:"],
    ["s", "Tomen y coman todos de él, porque esto es mi Cuerpo, que será entregado por ustedes."],
    ["r", "Eleva la Hostia. La miramos y podemos decir en silencio: «Señor mío y Dios mío»."],
    ["s", "Tomen y beban todos de él, porque este es el cáliz de mi Sangre, Sangre de la alianza nueva y eterna, que será derramada por ustedes y por muchos para el perdón de los pecados. Hagan esto en conmemoración mía."],
    ["r", "Eleva el cáliz. Lo adoramos en silencio."],
    ["s", "Este es el Misterio de la fe."],
    ["p", "Anunciamos tu muerte, proclamamos tu resurrección. ¡Ven, Señor Jesús!"],
  ] },
  { g: "eucaristia", k: "intercesiones", t: "Por Cristo, con Él y en Él", postura: "De pie", info: "intercesiones", l: [
    ["r", "Nos ponemos de pie. El sacerdote reza por la Iglesia, por los difuntos y por todos nosotros, y eleva el Cuerpo y la Sangre de Cristo:"],
    ["s", "Por Cristo, con Él y en Él, a ti, Dios Padre omnipotente, en la unidad del Espíritu Santo, todo honor y toda gloria por los siglos de los siglos."],
    ["p", "Amén."],
  ] },

  // 4. Rito de comunión
  { g: "comunion", k: "padrenuestro", t: "Padre nuestro", postura: "De pie", canto: "padrenuestro", info: "padrenuestro", l: [
    ["s", "Fieles a la recomendación del Salvador y siguiendo su divina enseñanza, nos atrevemos a decir:"],
    ["t", PADRE_NUESTRO, "Padre nuestro"],
    ["s", "Líbranos de todos los males, Señor, y concédenos la paz en nuestros días, para que, ayudados por tu misericordia, vivamos siempre libres de pecado y protegidos de toda perturbación, mientras esperamos la gloriosa venida de nuestro Salvador Jesucristo."],
    ["p", "Tuyo es el reino, tuyo el poder y la gloria, por siempre, Señor."],
  ] },
  { g: "comunion", k: "paz", t: "Rito de la paz", postura: "De pie", info: "paz", l: [
    ["s", "Señor Jesucristo, que dijiste a tus apóstoles: «La paz les dejo, mi paz les doy», no tengas en cuenta nuestros pecados, sino la fe de tu Iglesia y, conforme a tu palabra, concédele la paz y la unidad. Tú que vives y reinas por los siglos de los siglos."],
    ["p", "Amén."],
    ["s", "La paz del Señor esté siempre con ustedes."], ["p", "Y con tu espíritu."],
    ["s", "Dense fraternalmente la paz."],
    ["r", "Saludamos a quienes están cerca: «La paz esté contigo»."],
  ] },
  { g: "comunion", k: "cordero", t: "Cordero de Dios", postura: "De pie", canto: "cordero", info: "cordero", l: [
    ["t", CORDERO, "Cordero de Dios"],
    ["r", "Nos arrodillamos (o seguimos de pie, según la costumbre de la parroquia)."],
    ["s", "Este es el Cordero de Dios, que quita el pecado del mundo. Dichosos los invitados a la cena del Señor."],
    ["p", "Señor, no soy digno de que entres en mi casa, pero una palabra tuya bastará para sanarme."],
  ] },
  { g: "comunion", k: "comunion", t: "Comunión", postura: "En fila", canto: "comunion", info: "comunion", l: [
    ["s", "El Cuerpo de Cristo."], ["p", "Amén."],
    ["r", "Si no vas a comulgar, puedes acercarte con los brazos cruzados sobre el pecho para recibir una bendición, o rezar desde tu lugar:"],
    ["alt", COMUNION_ESP, "Comunión espiritual"],
  ] },
  { g: "comunion", k: "gracias", t: "Acción de gracias", postura: "Sentados o de rodillas", canto: "accion", info: "gracias", l: [
    ["r", "Un momento de silencio para estar con Jesús. Luego nos ponemos de pie."],
    ["s", "Oremos."],
    ["r", "El sacerdote reza la oración después de la comunión."],
    ["p", "Amén."],
  ] },

  // 5. Ritos de conclusión
  { g: "final", k: "bendicion", t: "Bendición", postura: "De pie", info: "bendicion", l: [
    ["r", "Si hay avisos, se dicen ahora."],
    ["s", "El Señor esté con ustedes."], ["p", "Y con tu espíritu."],
    ["s", "La bendición de Dios todopoderoso, Padre, Hijo y Espíritu Santo, descienda sobre ustedes."],
    ["p", "Amén."],
  ] },
  { g: "final", k: "envio", t: "Envío", postura: "De pie", canto: "maria", info: "envio", l: [
    ["s", "Pueden ir en paz."],
    ["p", "Demos gracias a Dios."],
    ["r", "Canto final. Muchas veces es a María."],
  ] },
];
