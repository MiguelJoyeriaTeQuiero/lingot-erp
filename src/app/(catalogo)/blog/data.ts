export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readMinutes: number;
  category: string;
  imageUrl: string;
  imageAlt: string;
  content: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "tipos-interes-fed-precio-oro",
    title: "Por qué los tipos de interés de la Fed mueven el precio del oro",
    excerpt:
      "La política monetaria de la Reserva Federal es el factor macroeconómico con mayor impacto en el precio spot del oro. Entendemos la mecánica detrás de esta relación y cómo anticipar sus movimientos.",
    date: "2025-05-10",
    readMinutes: 7,
    category: "Macroeconomía",
    imageUrl:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Gráfico de tipos de interés y cotización del oro",
    content: `
<h2>La mecánica fundamental</h2>
<p>El oro no genera dividendos ni paga intereses. Esta característica, que a menudo se cita como una debilidad, es en realidad la clave para entender su relación con los tipos de interés: cuando los tipos suben, el <em>coste de oportunidad</em> de mantener oro aumenta, y cuando bajan, el metal precioso se vuelve comparativamente más atractivo.</p>
<p>Cuando la Reserva Federal eleva el tipo de los fondos federales, los activos de renta fija —bonos del Tesoro, cuentas de ahorro, money market funds— ofrecen rendimientos más altos. Un inversor racional ponderará si le compensa mantener lingotes que no generan yield frente a un bono a 2 años al 5%. La balanza se inclina hacia el bono, y la demanda de oro cae.</p>

<h2>Tipos reales: el verdadero termómetro</h2>
<p>La relación no es directa con los tipos nominales, sino con los <strong>tipos de interés reales</strong> (tipos nominales menos inflación esperada). Los tipos reales negativos —frecuentes en períodos de alta inflación con políticas acomodaticias— son el entorno más favorable para el oro. En 2020-2022, con tipos nominales en cero e inflación disparada, el oro marcó máximos históricos.</p>
<p>El rendimiento real de los bonos ligados a la inflación (TIPS en EEUU) sirve como proxy fiable. Cuando el rendimiento real del bono americano a 10 años cae por debajo de cero, históricamente el oro inicia ciclos alcistas sostenidos.</p>

<h2>El dólar como variable intermediaria</h2>
<p>Los tipos de la Fed también afectan al oro de forma indirecta a través del dólar. Subidas de tipos atraen capital hacia activos en dólares, apreciando la divisa. Dado que el oro cotiza en dólares en los mercados internacionales, un dólar más fuerte encarece el metal para compradores en otras divisas, reduciendo la demanda global y presionando el precio a la baja.</p>
<p>Este mecanismo explica por qué durante el ciclo de subidas de tipos de 2022-2023 el oro se mantuvo en rangos relativamente estrechos a pesar de la elevada inflación: la fortaleza del dólar actuó como contrapeso.</p>

<h2>¿Cómo anticipar los movimientos?</h2>
<p>Los inversores profesionales siguen de cerca el mercado de futuros sobre tipos de la Fed (los <em>Fed Funds Futures</em> en el CME), que reflejan la probabilidad implícita de subidas o bajadas en cada reunión del FOMC. Cuando el mercado comienza a descontar bajadas de tipos —incluso antes de que se produzcan—, el oro suele reaccionar al alza.</p>
<p>Las declaraciones del presidente de la Fed, las actas del FOMC y los datos de empleo e inflación (PCE subyacente) son los catalizadores de mayor volatilidad en los mercados de metales preciosos. En Lingot monitorizamos estas variables en tiempo real para ofrecer a nuestros clientes precios actualizados al momento.</p>

<h2>Conclusión</h2>
<p>Comprender la política monetaria de la Fed no es solo territorio de macroeconomistas. Para cualquier inversor en metales preciosos —desde particulares que compran monedas de oro hasta tesorerías corporativas— este conocimiento es esencial para tomar decisiones informadas sobre el momento óptimo de compra.</p>
    `.trim(),
  },
  {
    slug: "inflacion-oro-activo-refugio",
    title: "Inflación y oro: el activo refugio que resiste al tiempo",
    excerpt:
      "Históricamente el oro ha preservado el poder adquisitivo a lo largo de los siglos. Analizamos la relación entre inflación y precio del oro, con datos de los últimos 50 años y los matices que todo inversor debe conocer.",
    date: "2025-04-28",
    readMinutes: 8,
    category: "Inversión",
    imageUrl:
      "https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Lingotes de oro como cobertura contra la inflación",
    content: `
<h2>El oro como reserva de valor milenaria</h2>
<p>La afirmación de que el oro preserva el poder adquisitivo a lo largo del tiempo no es solo una creencia popular: está respaldada por siglos de historia. Una onza de oro en la Roma Imperial compraba una toga de calidad; hoy, esa misma onza permite adquirir un traje de confección. El metal no "gana" dinero en el sentido convencional, pero tampoco lo pierde frente a la erosión inflacionaria.</p>
<p>Sin embargo, la relación entre inflación y precio del oro no es lineal ni inmediata. Existen matices cruciales que determinan en qué contextos el oro funciona mejor como cobertura inflacionaria.</p>

<h2>Inflación moderada vs. inflación desbocada</h2>
<p>Los estudios académicos muestran que el oro es un cobertura eficaz contra la inflación a <strong>muy largo plazo</strong> (décadas), pero en períodos más cortos —1 a 5 años— la correlación puede ser débil o incluso negativa. Durante la inflación moderada de los años 90, el oro cayó en términos reales mientras la renta variable batía records.</p>
<p>Donde el oro brilla como refugio es en escenarios de <em>inflación desbocada</em> o <em>hiperinflación</em>. En la Alemania de Weimar, en Zimbabwe o en Venezuela contemporánea, quienes poseían oro preservaron su riqueza mientras la moneda local se evaporaba. Esta es la función aseguradora más valiosa del metal.</p>

<h2>El contexto 2021-2024: una lección práctica</h2>
<p>El episodio inflacionario post-pandemia ofrece un caso de estudio interesante. Con el IPC americano alcanzando el 9,1% en junio de 2022, el oro apenas reaccionó al alza —de hecho, cayó desde los ~1.900 $/oz hasta los ~1.620 $/oz a finales de ese año. El motivo: la Fed respondió con agresivas subidas de tipos que apreciaron el dólar y elevaron los tipos reales, contrarrestando el impulso inflacionario sobre el oro.</p>
<p>Sin embargo, cuando en 2024 el mercado comenzó a anticipar bajadas de tipos, el oro inició un rally histórico que lo llevó a superar los 2.400 $/oz. La combinación de inflación persistente, tipos reales moderados y debilidad del dólar creó el entorno perfecto.</p>

<h2>¿Cuánto oro debe tener una cartera?</h2>
<p>Los gestores de patrimonio tradicionales recomiendan entre un 5% y un 15% de la cartera en oro o activos relacionados como cobertura. Ray Dalio, gestor del mayor hedge fund del mundo, sugiere el 7,5% en su "All Weather Portfolio". El objetivo no es maximizar rentabilidad, sino reducir la volatilidad global de la cartera mediante la descorrelación del oro con la renta variable y los bonos.</p>
<p>En Lingot ofrecemos lingotes y monedas certificadas que permiten a nuestros clientes construir esta posición de forma directa, física y verificable, sin la intermediación de productos financieros derivados.</p>
    `.trim(),
  },
  {
    slug: "geopolitica-demanda-oro",
    title: "Tensiones geopolíticas y demanda de oro: cuando el mundo tiembla",
    excerpt:
      "Guerras, sanciones, crisis bancarias y conflictos comerciales: los metales preciosos tienden a apreciarse en los momentos de mayor incertidumbre global. Analizamos los mecanismos y los episodios históricos más relevantes.",
    date: "2025-04-12",
    readMinutes: 6,
    category: "Mercados",
    imageUrl:
      "https://images.unsplash.com/photo-1584306670957-acf935f5033c?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Oro como activo refugio en tiempos de incertidumbre",
    content: `
<h2>El oro como señal de miedo global</h2>
<p>Los traders de commodities tienen un término para el movimiento del oro en crisis: el <em>flight to safety</em> o vuelo hacia la seguridad. Cuando la incertidumbre global se dispara, el capital huye de activos de riesgo hacia refugios considerados seguros: el yen japonés, el franco suizo, los bonos del Tesoro americano y, en primer lugar, el oro.</p>
<p>La lógica es simple: en un escenario de crisis severa —guerras, colapsos financieros, pandemias— las obligaciones contractuales de los emisores de deuda pueden no cumplirse, las divisas pueden devaluarse y las acciones pueden hundirse. El oro, en cambio, es un activo físico que no tiene contrapartida, no puede quebrar y ha mantenido su valor a lo largo de toda la historia humana conocida.</p>

<h2>Episodios históricos destacados</h2>
<p>El ataque a las Torres Gemelas en septiembre de 2001 provocó un salto inmediato en el precio del oro. La crisis financiera de 2008 catapultó el metal desde los 800 $/oz hasta superar los 1.900 $/oz en 2011, mientras los bancos caían uno tras otro. La pandemia de COVID-19 en 2020 llevó al oro a máximos históricos por encima de 2.000 $/oz por primera vez.</p>
<p>La invasión rusa de Ucrania en febrero de 2022 provocó un rally inmediato en metales preciosos: el oro saltó un 8% en pocas semanas. Las sanciones a Rusia, el segundo mayor productor de paladio del mundo, dispararon este metal hasta cotas récord.</p>

<h2>La demanda de bancos centrales como factor estructural</h2>
<p>Más relevante que los picos especulativos es la tendencia de fondo en los bancos centrales: desde 2010, los bancos centrales del mundo se han convertido en compradores netos de oro de forma sostenida, revirtiendo décadas de desinversión. China, Rusia, India, Turquía y Polonia han aumentado significativamente sus reservas áureas.</p>
<p>El motivo subyacente es la <em>dedolarización</em>: ante la posibilidad de que EEUU use el dólar como arma económica —como ocurrió con las sanciones a Rusia— muchos países buscan diversificar sus reservas hacia activos neutros e inconfiscables. El oro es la opción natural.</p>

<h2>Implicaciones para el inversor</h2>
<p>El oro no debe verse como una apuesta especulativa sobre la próxima crisis, sino como un seguro permanente en cartera. La prima de ese seguro —el coste de oportunidad de no invertir ese capital en activos de mayor rendimiento— tiene sentido en el contexto de un mundo cada vez más multipolar e impredecible.</p>
    `.trim(),
  },
  {
    slug: "dolar-oro-correlacion-inversa",
    title: "El dólar y el oro: la correlación inversa que todo inversor debe conocer",
    excerpt:
      "El índice DXY y el precio spot del oro muestran una correlación negativa histórica que supera el -0.6. Entendemos por qué ocurre esta relación y cómo aprovecharla para optimizar el timing de compra.",
    date: "2025-03-22",
    readMinutes: 6,
    category: "Divisas",
    imageUrl:
      "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Dólar americano y lingotes de oro",
    content: `
<h2>La relación estructural dólar-oro</h2>
<p>El oro cotiza en dólares americanos en los principales mercados internacionales (COMEX, LBMA). Esta denominación crea una relación matemática directa: cuando el dólar se aprecia frente a otras divisas, el mismo lingote de oro cuesta más en euros, yenes o rupias, lo que reduce su demanda internacional y presiona el precio a la baja. La inversa también es cierta.</p>
<p>Pero la relación va más allá de la aritmética de divisas. El dólar y el oro compiten como activos de reserva global. Cuando el dólar goza de credibilidad y los activos denominados en él ofrecen buenos rendimientos, la demanda de oro como alternativa disminuye. En períodos de dudas sobre la sostenibilidad fiscal americana o la credibilidad del dólar como reserva, el oro cobra protagonismo.</p>

<h2>El índice DXY como indicador de referencia</h2>
<p>El índice DXY mide la fortaleza del dólar frente a una cesta de seis divisas principales (euro, yen, libra, dólar canadiense, corona sueca y franco suizo). La correlación estadística entre el DXY y el precio del oro a lo largo de los últimos 20 años se sitúa alrededor de -0,60, lo que indica una relación inversa significativa pero no perfecta.</p>
<p>Esta imperfección es importante: hay períodos en que ambos activos suben simultáneamente (como en algunos episodios de crisis geopolítica aguda) y otros en que ambos caen juntos (como en liquidaciones masivas de 2008). El contexto siempre importa.</p>

<h2>Impacto para compradores europeos</h2>
<p>Para un inversor en euros, la relación dólar-oro tiene una dimensión adicional. Cuando el dólar se debilita —lo que típicamente coincide con un oro más caro en dólares—, el efecto sobre el precio en euros puede ser neutral o incluso negativo: el oro sube en dólares pero el euro se aprecia, compensando parcialmente la subida.</p>
<p>Esto significa que los ciclos óptimos de compra para un inversor europeo son aquellos en que el dólar está fuerte (oro barato en dólares) pero se anticipa una debilitación futura. En Lingot actualizamos los precios en euros en tiempo real, reflejando tanto el movimiento del spot como el tipo de cambio EUR/USD.</p>

<h2>¿Durará la hegemonía del dólar?</h2>
<p>El debate sobre la dedolarización del sistema financiero global y sus implicaciones para el oro está más vivo que nunca. Si el dólar pierde gradualmente su estatus de divisa de reserva dominante —algo que muchos economistas consideran un proceso secular en curso—, la demanda estructural de oro como activo de reserva alternativo podría aumentar de forma significativa en las próximas décadas.</p>
    `.trim(),
  },
  {
    slug: "produccion-minera-oro-oferta",
    title: "La producción minera de oro: por qué la oferta no puede crecer rápido",
    excerpt:
      "A diferencia del petróleo o los metales industriales, la producción de oro responde muy lentamente a los aumentos de precio. Exploramos por qué la rigidez de la oferta minera actúa como soporte estructural en el precio del oro.",
    date: "2025-03-05",
    readMinutes: 7,
    category: "Oferta y Demanda",
    imageUrl:
      "https://images.unsplash.com/photo-1579621970590-9d624316904b?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Extracción minera de oro, oferta global",
    content: `
<h2>El stock mundial de oro y su crecimiento marginal</h2>
<p>Toda la producción de oro de la historia humana —desde las minas de Nubia del antiguo Egipto hasta las explotaciones actuales en Australia— suma aproximadamente 208.000 toneladas. De ese total, alrededor del 50% se encuentra en joyas, el 20% en lingotes y monedas de inversión, el 17% en reservas de bancos centrales y el 13% en aplicaciones industriales y electrónica.</p>
<p>La producción minera anual ronda las 3.300-3.500 toneladas, lo que supone un incremento del stock total de apenas el 1,5-1,7% anual. Esta tasa de crecimiento extremadamente baja —la llamada ratio stock/flujo o S2F— es una de las propiedades más singulares del oro como activo.</p>

<h2>Por qué la oferta es tan rígida</h2>
<p>Abrir una nueva mina de oro no es como construir una fábrica. El proceso completo, desde la exploración inicial hasta la primera producción, tarda entre 10 y 20 años y requiere inversiones de cientos de millones de dólares. Los permisos medioambientales, la exploración geológica, la ingeniería civil, la construcción de infraestructuras en zonas remotas y la puesta en marcha de las instalaciones de procesamiento hacen de la minería aurífera uno de los negocios con mayor capital intensivo y mayor plazo de maduración del planeta.</p>
<p>Esto significa que aunque el precio del oro se duplique mañana, la oferta minera no puede responder en años, y mucho menos en meses. Los economistas llaman a esto "inelasticidad de la oferta" y es uno de los pilares estructurales del soporte de precio del oro.</p>

<h2>El pico de producción y la ley de mena decreciente</h2>
<p>Los geólogos llevan años advirtiendo de que los principales yacimientos de alta ley —aquellos donde la concentración de oro por tonelada de roca es más alta— están siendo agotados. Los nuevos proyectos tienden a trabajar con menas de menor concentración, lo que eleva los costes de extracción y procesamiento (los llamados AISC o All-In Sustaining Costs).</p>
<p>En 2023, el AISC medio de la industria se situó alrededor de los 1.350 $/oz. Con el precio del oro por encima de los 2.000 $/oz, las mineras operan con márgenes saneados, pero cualquier caída significativa del precio eliminaría rápidamente la rentabilidad de numerosas operaciones, reduciendo la oferta futura.</p>

<h2>La oferta reciclada como válvula de escape</h2>
<p>Alrededor del 25-30% de la oferta anual de oro no procede de minas, sino del reciclaje: chatarra de joyería, componentes electrónicos, piezas dentales. Esta oferta reciclada sí responde más rápidamente a los precios: cuando el oro sube, más personas venden sus joyas o recuperan el metal de dispositivos usados.</p>
<p>Sin embargo, esta válvula de escape tiene un límite: la chatarra disponible no es ilimitada y la industria del reciclado no puede escalar indefinidamente. En el largo plazo, la rigidez de la oferta minera sigue siendo el factor dominante en la ecuación oferta-demanda del oro.</p>
    `.trim(),
  },
  {
    slug: "etfs-oro-plata-precio-spot",
    title: "ETFs de oro y plata: cómo los fondos cotizados mueven el precio spot",
    excerpt:
      "Desde la creación del SPDR Gold Shares en 2004, los ETFs respaldados por metal físico se han convertido en uno de los mayores propietarios de oro del mundo. Analizamos su impacto en el mercado spot y la diferencia con el oro físico directo.",
    date: "2025-02-18",
    readMinutes: 8,
    category: "Inversión",
    imageUrl:
      "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "ETFs de oro y plata, inversión en metales preciosos",
    content: `
<h2>El nacimiento de los ETFs de oro</h2>
<p>Antes de 2004, invertir en oro físico requería comprar lingotes o monedas, asumir el coste de custodia y almacenamiento, y lidiar con los diferenciales de compraventa del mercado OTC. La creación del SPDR Gold Shares (GLD) en noviembre de 2004 democratizó el acceso al oro: por primera vez, cualquier inversor con una cuenta de valores podía comprar y vender oro con la misma facilidad que una acción de Apple.</p>
<p>El impacto fue inmediato y masivo. En cuestión de años, el GLD se convirtió en uno de los mayores ETFs del mundo por activos bajo gestión. Hoy, los ETFs de oro físico globales gestionan colectivamente más de 3.000 toneladas de metal, una cantidad comparable a las reservas de oro de muchos países soberanos.</p>

<h2>La mecánica de arbitraje que conecta ETF y spot</h2>
<p>Los ETFs de oro físico funcionan mediante un mecanismo de creación y redención que garantiza que el precio del ETF se mantenga próximo al valor del oro subyacente. Cuando hay exceso de demanda del ETF, los <em>authorized participants</em> (grandes bancos) crean nuevas participaciones comprando oro físico en el mercado spot y entregándolo al custodio. Cuando hay exceso de oferta, ocurre lo inverso: se destruyen participaciones y se vende oro en el mercado.</p>
<p>Este mecanismo implica que las entradas y salidas netas de capital en ETFs de oro tienen un impacto directo sobre la demanda física en el mercado spot. Los flujos semanales del GLD y del iShares Gold Trust (IAU) son seguidos de cerca por los participantes del mercado como indicadores adelantados del sentimiento inversor.</p>

<h2>ETF de papel vs. oro físico directo</h2>
<p>A pesar de su comodidad, los ETFs presentan diferencias importantes respecto al oro físico directo que los inversores deben considerar. Los ETFs implican un riesgo de contrapartida —el custodio, el depósito, el propio vehículo financiero— que el oro físico elimina completamente. En un escenario de crisis sistémica severa, donde se busca precisamente la protección que ofrece el oro, esas capas de intermediación pueden ser problemáticas.</p>
<p>Además, los ETFs generan un coste anual de gestión (TER) que erosiona el rendimiento a largo plazo. El oro físico, una vez adquirido con custodia propia o almacenado en un depósito de confianza, no tiene costes recurrentes más allá del seguro.</p>
<p>En Lingot, ofrecemos la opción de oro físico directo en forma de lingotes y monedas certificadas: el activo en su forma más pura, sin intermediarios financieros, con la pureza verificable por cualquier laboratorio acreditado.</p>

<h2>El ratio oro/plata: una herramienta para el timing</h2>
<p>Los inversores en metales preciosos utilizan frecuentemente el ratio oro/plata (el precio del oro dividido entre el precio de la plata) como indicador de valoración relativa. Históricamente este ratio ha oscilado entre 40 y 80; valores por encima de 80 suelen indicar que la plata está barata en términos relativos, mientras que valores por debajo de 50 sugieren lo contrario.</p>
<p>En momentos de máxima aversión al riesgo, el ratio tiende a dispararse (llegó a 125 en marzo de 2020), lo que refleja la mayor demanda relativa de oro como activo refugio puro. La plata, con mayor componente industrial, sufre más en recesiones pero se recupera con más fuerza cuando mejora el ciclo económico.</p>
    `.trim(),
  },
];

export const POSTS_PER_PAGE = 6;

export function getPaginatedPosts(page: number): {
  posts: BlogPost[];
  totalPages: number;
  currentPage: number;
} {
  const totalPages = Math.ceil(BLOG_POSTS.length / POSTS_PER_PAGE);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const start = (currentPage - 1) * POSTS_PER_PAGE;
  const posts = BLOG_POSTS.slice(start, start + POSTS_PER_PAGE);
  return { posts, totalPages, currentPage };
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
