// All on-screen text. Code stays English; add texts.en.ts later with `satisfies Texts`.

export const de = {
  /** BCP 47 locale for number formatting. */
  locale: 'de-DE',
  appTitle: 'Fotosim',
  appSubtitle: 'Schärfe, Belichtung und Rauschen zum Ausprobieren',
  /** Header switch: off = simplified mode (sun, full frame, Av; only aperture, shutter and focal length). */
  allSettings: 'Alle Einstellungen',
  kb: 'KB',

  sensors: {
    iphoneXR: 'iPhone XR (2018)',
    iphone15ProMax: 'iPhone 15 Pro Max (2023)',
    fairphone5: 'Fairphone 5 (2023)',
    oneInch: 'Kompaktkamera (1 Zoll)',
    mft: 'Micro Four Thirds',
    apsc: 'APS-C',
    fullFrame: 'Vollformat digital (Mittelklasse)',
    fullFramePro: 'Vollformat digital (Profi)',
    film35: 'Kleinbild analog (Film)',
    mf4433: 'Mittelformat digital (44×33)',
    mf645: 'Mittelformat 6×4,5 (Film)',
    mf66: 'Mittelformat 6×6 (Film)',
    mf67: 'Mittelformat 6×7 (Film)',
  },

  scanners: {
    lab: 'Labor-Scan (Standard)',
    flatbed: 'Flachbettscanner',
    filmScanner: 'Filmscanner',
    cameraScan: 'Abfotografiert (Digitalkamera)',
    drum: 'Trommelscanner',
  },

  cameraLenses: {
    kit: 'Kit-Zoom (f/3.5–5.6)',
    fastZoom: 'Profi-Zoom (f/2.8)',
    prime: 'Lichtstarke Festbrennweite (f/1.4)',
  },

  modes: {
    auto: {
      short: 'A',
      name: 'Vollautomatik',
      description: 'Die Kamera entscheidet alles – auch ISO und ob geblitzt wird.',
    },
    P: {
      short: 'P',
      name: 'Programm',
      description: 'Kamera wählt Blende und Zeit, du bestimmst ISO und Blitz.',
    },
    Av: {
      short: 'Av',
      name: 'Blendenvorwahl (Nikon/Sony: A)',
      description: 'Du wählst die Blende (Schärfentiefe), die Kamera die passende Zeit.',
    },
    Tv: {
      short: 'Tv',
      name: 'Zeitvorwahl (Nikon/Sony: S)',
      description: 'Du wählst die Belichtungszeit (Bewegung), die Kamera die Blende.',
    },
    M: {
      short: 'M',
      name: 'Manuell',
      description: 'Du stellst alles selbst ein. Der Belichtungsbalken zeigt, wie weit du daneben liegst.',
    },
  },

  light: {
    sun: 'Sonne',
    cloudy: 'Bewölkt',
    shade: 'Schatten / stark bewölkt',
    dusk: 'Dämmerung',
    office: 'Helles Büro',
    livingRoom: 'Wohnzimmer abends',
    nightStreet: 'Straße nachts',
    candle: 'Kerzenlicht',
  },

  controls: {
    focalLength: 'Brennweite',
    digitalZoom: 'Digitalzoom',
    /** Digital zoom slider value: factor, the matching full-frame focal length and the pixels left. */
    digitalZoomValue: '{factor}× (≙ {eq} mm {kb}, {mp} MP)',
    digitalZoomOff: 'aus – ganzes Bild',
    phoneModuleHint: 'Die {eq}-mm-Kamera wäre hier schärfer.',
    aperture: 'Blende',
    shutter: 'Belichtungszeit',
    iso: 'ISO',
    autoIso: 'Auto-ISO',
    light: 'Lichtsituation',
    lightDarker: 'dunkler',
    lightBrighter: 'heller',
    mode: 'Modus',
    flash: 'Blitz',
    stabilized: 'Bildstabilisator',
    cameraMotion: 'Du beim Auslösen',
    focus: 'Fokus',
    sectionScene: 'Szene',
    sectionCamera: 'Kamera',
    sectionLens: 'Objektiv',
    cameraType: 'Kameratyp',
    lensType: 'Objektivtyp',
    scanner: 'Scan',
    phoneLensHint: 'Beim Handy fest eingebaut.',
    autofocus: 'Fokus nachführen',
    autofocusOff: 'Aus',
    autofocusHint: 'folgt {target} – zum Verstellen „Fokus nachführen“ ausschalten',
    autofocusShort: 'AF-C',
    logScale: 'Logarithmisch',
    details: 'Details',
    autoSetHint: 'von der Kamera gesetzt',
    autoIsoCapHint: 'Auto-ISO geht nur bis {iso} – heller wird es nur über Zeit, Blende oder Blitz',
    fixedApertureHint: 'beim Handy fest',
    lensLimitHint: 'Objektiv öffnet bei dieser Brennweite nur bis {aperture}',
    nearLimitHint: 'näher stellt dieses Objektiv nicht scharf: {min}',
  },

  elements: {
    person1: 'Person 1',
    person2: 'Person 2',
    background: 'Hintergrund',
    visible: 'Anzeigen',
    distance: 'Entfernung',
    focusHere: 'Hierauf fokussieren',
    focusHereShort: 'Fokussieren',
    motion: 'Bewegung',
  },

  motion: {
    // How the photographer holds the camera.
    camera: {
      frozen: 'auf Stativ oder angelehnt',
      still: 'stehend',
      walk: 'gehend',
      run: 'rennend',
      drive: 'im fahrenden Auto',
    },
    // How a person moves (shown in their row of the scene panel).
    subject: {
      frozen: 'regungslos',
      still: 'steht',
      walk: 'geht',
      run: 'rennt',
      drive: 'fährt Auto',
    },
    blurred: 'Bewegung verwischt {names}',
    and: ' und ',
  },

  exposure: {
    title: 'Belichtung',
    strongUnder: 'stark unterbelichtet',
    slightUnder: 'leicht unterbelichtet',
    ok: 'passt',
    slightOver: 'leicht überbelichtet',
    strongOver: 'stark überbelichtet',
    stops: '{value} Blendenstufen',
  },

  noise: {
    title: 'Rauschen',
    low: 'gering',
    medium: 'sichtbar',
    high: 'stark',
    veryHigh: 'sehr stark',
    equivalentIso: 'entspricht ISO {iso} an Vollformat',
  },

  movement: {
    title: 'Bewegung',
    sharp: 'scharf',
    slight: 'leicht verwischt',
    visible: 'verwischt',
    strong: 'stark verwischt',
    value: '{name}: {speed} km/h relativ zu dir',
    none: 'nichts im Bild',
  },

  resolution: {
    title: 'Auflösung',
    megapixels: '{value} MP',
    /** Box headline: effective megapixels, then what the file holds. */
    headlineLabel: 'echte Details',
    file: 'von {nominal} MP in der Datei',
    fileZoom: 'von {nominal} MP, die nach {factor}× Digitalzoom übrig sind',
    fileFilm: 'von {nominal} MP im Scan',
    /** Factors in the shares list. */
    factors: {
      pixels: 'Pixelraster',
      diffraction: 'Beugung',
      lens: 'Objektiv',
      defocus: 'Fokus',
      motion: 'Bewegung',
      shake: 'Verwacklung',
      processing: 'Rauschfilter',
      film: 'Film',
      scanner: 'Scan',
    },
    /** Infobox: one sentence on the bottleneck. */
    because: {
      pixels: 'Hier setzt die Pixelzahl die Grenze – Objektiv und Blende holen schon fast alles heraus.',
      diffraction:
        'Am meisten kostet die Beugung bei {aperture}: Je weiter abgeblendet, desto weicher wird alles. Für das meiste Detail die Blende nur bis etwa f/5.6–8 schließen.',
      lens: 'Hier ist das Objektiv die Grenze – offen und an den Enden eines Zooms ist es am weichsten. Abblenden hilft, ein besseres Objektiv mehr.',
      defocus: 'Das Motiv liegt nicht genau in der Schärfe – das kostet hier am meisten.',
      motion: 'Die Bewegung des Motivs kostet hier am meisten – eine kürzere Zeit hilft.',
      shake: 'Verwacklung kostet hier am meisten – kürzere Zeit, Stabilisator oder Stativ helfen.',
      processing:
        'Die Rauschunterdrückung bügelt feine Details weg („Aquarell-Look“). Mehr Licht hilft am meisten; Handys filtern früher und kräftiger als Kameras.',
      film: 'Der Film selbst löst nicht feiner auf. Ein langsamerer Film (niedrigere ISO) hat feineres Korn und hält mehr Detail fest.',
      scanner: 'Der Scan ist der Flaschenhals: Auf dem Film steckt mehr, als dieser Scan herausholt.',
    },
    sharesTitle: 'Wo Detail verloren geht',
    sharesNote: 'Anteil jedes Faktors am Verlust. Ohne den größten gewinnt man am meisten zurück.',
    more: 'Was heißt „echte Details“?',
  },

  outputSize: {
    title: 'Wofür reicht das Foto?',
    intro:
      'Aus 30 cm (Fotobuch, Abzug in der Hand) braucht ein großer Druck viele Pixel. Mit Abstand – so weit weg, wie das Bild groß ist – reicht für jede Größe dasselbe, etwa {mp} MP: Ein Poster von der anderen Raumseite braucht nicht mehr als ein A4-Blatt in der Hand.',
    size: 'Größe',
    close: 'aus 30 cm',
    normal: 'mit Abstand',
    need: 'nötig',
    targets: {
      phone: 'Handy',
      fullHd: 'Full-HD-Monitor',
      uhd: '4K-Monitor',
      p10x15: '10 × 15 cm',
      p13x18: '13 × 18 cm',
      a4: 'A4',
      a3: 'A3',
      p50x70: '50 × 70 cm',
      p100x150: '100 × 150 cm',
    },
    verdicts: { sharp: 'gestochen scharf', ok: 'ordentlich', soft: 'weich' },
    grainy: 'körnig',
    legend: '✓ gestochen scharf · ~ ordentlich · ✗ weich oder körnig. „Nötig“: echte Megapixel für ✓ aus 30 cm – bei Bildschirmen ihre eigenen Pixel.',
    summaryClose: {
      sharp: 'Aus der Nähe gestochen scharf bis {size}.',
      ok: 'Aus der Nähe ordentlich bis {size}.',
      none: 'Aus der Nähe in jeder Druckgröße weich.',
    },
    summaryNormal: {
      sharp: 'Mit Abstand betrachtet reicht es für jede Größe.',
      ok: 'Mit Abstand betrachtet ordentlich in jeder Größe.',
      soft: 'Auch mit Abstand betrachtet weich.',
      grainy: 'Mit Abstand betrachtet körnig.',
    },
  },

  shake: {
    safe: 'aus der Hand',
    needsIS: 'aus der Hand nur mit Stabilisator',
    needsTripod: 'Stativ nötig',
    zoneTripod: 'Stativ',
    zoneIS: 'Hand + IS',
    zoneHand: 'Hand',
  },

  flash: {
    zoneTooClose: 'zu nah',
    zoneRange: 'Blitzreichweite',
    zoneWeak: 'Blitz zu schwach',
  },

  graph: {
    distance: 'Entfernung (m)',
    sharpness: 'Unschärfe',
    sharp: 'scharf',
    unsharp: 'unscharf',
    dof: 'Schärfentiefe',
    dofRange: 'Schärfentiefe {range}',
    infinity: '∞',
    unit: 'm',
    camera: 'Kamera',
    cameraTitle: 'Kamera – von hier aus wird die Entfernung gemessen',
    meters: '{value} m',
    blurTimes: '{value}×',
    resetView: 'Ansicht zurücksetzen',
    hintLog: 'Personen und Fokuslinie ziehen · Antippen stellt scharf',
    hintAutofocus: 'Personen ziehen – der Fokus folgt',
    hintLinear: 'Antippen stellt scharf · Ziehen verschiebt · Mausrad oder zwei Finger zoomen',
    hintLinearAutofocus: 'Personen ziehen – der Fokus folgt · Mausrad oder zwei Finger zoomen',
  },

  sim: {
    title: 'Kamerabild',
    group: 'Kamerabild · Belichtung · Rauschen',
    // Folded: the heading carries the verdict instead.
    groupFolded: 'Kamerabild – {exposure}, {noise}',
    exposureVerdict: {
      strongUnder: 'stark unterbelichtet',
      slightUnder: 'leicht unterbelichtet',
      ok: 'richtig belichtet',
      slightOver: 'leicht überbelichtet',
      strongOver: 'stark überbelichtet',
    },
    noiseVerdict: {
      low: 'rauscharm',
      medium: 'leicht verrauscht',
      high: 'verrauscht',
      veryHigh: 'stark verrauscht',
    },
    caption: '{shutter} · {aperture} · ISO {iso}',
    zoomCaption: '{factor}× Digitalzoom',
    resize: 'Größe des Kamerabilds ändern (ziehen oder Pfeiltasten, Doppelklick setzt zurück)',
  },

  costs: {
    title: 'Kosten',
    camera: 'Kamera',
    phone: 'Handy',
    lens: 'Objektiv',
    tripod: 'Stativ',
    total: 'Summe',
    price: '{min} – {max} €',
    builtIn: 'eingebaut',
    used: 'gebraucht',
    intro: 'Grobe Preise für das, was du gerade eingestellt hast – nur Größenordnungen.',
    lensEquivalent: 'Brennweiten als Kleinbild-Äquivalent.',
    usedNote: 'Gibt es nur noch gebraucht – die Preise schwanken stark.',
    filmNote: 'Dazu kommt jeder Film: mit Entwicklung und Scan etwa {min}–{max} € für {frames} Bilder, also rund {perFrame} € pro Bild.',
    mediumFormatFilmNote: 'Zooms und sehr lichtstarke Objektive gibt es für Mittelformat-Film kaum – der Preis gilt fürs Nächstbeste.',
    examples: {
      iphoneXR: '',
      iphone15ProMax: '',
      fairphone5: '',
      oneInch: 'z.B. Sony RX100, Canon G7 X',
      mft: 'z.B. OM System OM-5, Panasonic G9 II',
      apsc: 'z.B. Canon R50, Sony A6400, Fujifilm X-T5',
      fullFrame: 'z.B. Canon RP, Nikon Z5 bis Sony A7 IV, Canon R6 II',
      fullFramePro: 'z.B. Nikon Z8, Canon R5 II, Sony A1 II',
      film35: 'z.B. Pentax K1000, Nikon FM2, Leica M6',
      mf4433: 'z.B. Fujifilm GFX 100S II, Hasselblad X2D',
      mf645: 'z.B. Mamiya 645, Pentax 645',
      mf66: 'z.B. Yashica Mat, Hasselblad 500C/M, Rolleiflex',
      mf67: 'z.B. Pentax 67, Mamiya RZ67, Mamiya 7',
    },
    lenses: {
      wideZoomBudget: 'Weitwinkel-Zoom (z.B. 16–35 mm f/4)',
      kitZoom: 'Kit-Zoom (z.B. 28–85 mm f/3.5–5.6)',
      teleZoomBudget: 'Telezoom 70–300 mm (günstig)',
      superTele: 'Supertele-Zoom 150–600 mm',
      wideZoom28: 'Weitwinkel-Zoom 14–24 mm f/2.8',
      standardZoom28: 'Standardzoom 24–70 mm f/2.8',
      teleZoom28: 'Telezoom 70–200 mm f/2.8',
      tele300: 'Lichtstarkes Tele 300 mm f/2.8',
      fastTele: 'Lichtstarkes Supertele (z.B. 400 mm f/2.8)',
      widePrime: 'Weitwinkel-Festbrennweite 14–20 mm f/1.4',
      prime35: 'Festbrennweite 24–35 mm f/1.4',
      prime50: 'Festbrennweite 50 mm f/1.4',
      prime85: 'Porträt-Festbrennweite 85 mm f/1.4',
      prime135: 'Tele-Festbrennweite 105–135 mm f/1.4–1.8',
    },
    tripodFor: {
      phone: 'kleines Stativ mit Handyhalter',
      camera: 'vom Reisestativ bis zum stabilen Karbon-Stativ',
    },
  },

  // Infobox titles, keyed like `info`.
  /** Summary of the folded infobox (unfolded it shows the current title). */
  infoFolded: 'Hilfe',

  infoTitles: {
    sensor: 'Kameratyp',
    lens: 'Objektiv',
    focalLength: 'Brennweite',
    digitalZoom: 'Digitalzoom',
    aperture: 'Blende',
    shutter: 'Belichtungszeit',
    iso: 'ISO',
    light: 'Lichtsituation',
    mode: 'Modus',
    flash: 'Blitz',
    focus: 'Fokus',
    autofocus: 'Fokus nachführen',
    stabilized: 'Bildstabilisator',
    cameraMotion: 'Du beim Auslösen',
    motion: 'Bewegung',
    shutterTripod: 'Belichtungszeit',
    movement: 'Bewegungsunschärfe',
    exposure: 'Belichtung',
    noise: 'Rauschen',
    resolution: 'Echte Details',
    scanner: 'Scan',
    graph: 'Schärfekurve',
    graphSimple: 'Schärfentiefe',
    sim: 'Kamerabild',
  },

  // Infobox: shown for the last clicked/tapped element. {placeholders} get live values.
  info: {
    sensor:
      'Der Kameratyp steht für die Sensor- oder Filmgröße. Ein größerer Sensor sammelt mehr Licht: weniger Rauschen und bei gleicher Blende weniger Schärfentiefe, aber dieselbe Belichtungszeit. Faustregel: Brennweite und Blende mal Cropfaktor ergeben den Kleinbild-Wert; f/1.8 am iPhone XR wirkt wie f/11 an Vollformat.',
    lens: 'Das Objektiv legt fest, wie weit die Blende aufgeht. Das Kit-Zoom aus dem Kamera-Set ist günstig, aber lichtschwach – gerade am langen Ende. Lichtstarke Objektive (kleine Blendenzahl) kosten mehr, lassen mehr Licht herein und machen den Hintergrund unschärfer. Gerade: größte Blende {maxAperture}.',
    focalLength:
      'Die Brennweite bestimmt den Bildausschnitt. Angegeben ist die echte Brennweite und in Klammern, was sie an Kleinbild entspricht. Lange Brennweiten verwackeln leichter.',
    digitalZoom:
      'Digitalzoom schneidet nur einen Ausschnitt aus dem Foto und vergrößert ihn – Detail kommt keins dazu. Hier bleiben {mp} MP übrig; Rauschen, Unschärfe und irgendwann die Pixel werden sichtbar. Auch die Schärfentiefe schrumpft (der Rahmen im Graph zeigt sie ohne Zoom): Am Objektiv ändert sich nichts, aber was im ganzen Bild noch als scharf durchging, ist vergrößert sichtbar unscharf. Ein 2×-Ausschnitt aus 50 mm hat etwa die halbe Schärfentiefe, echte 100 mm nur ein Viertel. Mehr Detail gibt es nur näher dran („Zoom mit den Füßen“) oder mit längerer Brennweite.',
    aperture:
      'Kleine Blendenzahl = große Öffnung: mehr Licht, weniger Schärfentiefe. Aktuell: {aperture}, das entspricht {eqAperture} an Kleinbild.',
    shutter:
      'Wie lange der Sensor belichtet wird. Länger = heller, aber Bewegung und Verwacklung werden sichtbar. Aus der Hand bis etwa {handLimit}, mit Stabilisator bis etwa {isLimit}.',
    shutterTripod:
      'Wie lange der Sensor belichtet wird. Länger = heller. Auf dem Stativ verwackelt nichts, auch nicht bei sekundenlangen Zeiten – was sich bewegt, verwischt aber trotzdem.',
    cameraMotion:
      'Wie ruhig du die Kamera hältst. Auf dem Stativ oder fest angelehnt verwackelt nichts. Im Gehen, Rennen oder aus dem Auto wackelt sie stärker: Für Aufnahmen aus der Hand brauchst du kürzere Zeiten – die Bereiche unter der Belichtungszeit rücken mit. Bewegst du dich, verwischt außerdem alles, was stillsteht, und zwar Nahes stärker als Fernes. Wer sich so schnell wie du in dieselbe Richtung bewegt, bleibt dagegen scharf.',
    motion:
      'Wie sich die Person bewegt (quer durchs Bild). Während der Belichtung legt sie ein Stück Weg zurück und verwischt – je schneller, je näher und je länger die Brennweite, desto stärker. Auch wer still steht, schwankt und atmet ein wenig. Gegen Bewegung hilft nur eine kürzere Zeit, weder Stabilisator noch Stativ. Bewegst du dich mit, zählt nur der Unterschied: Gehst du neben jemandem her, bleibt er scharf.',
    movement:
      'Wie stark das Motiv im Fokus ({subject}) während der Belichtung verwischt, weil es sich gegenüber dir bewegt. Über der Linie gilt es nicht mehr als scharf. Dagegen hilft eine kürzere Zeit, mehr Abstand, eine kürzere Brennweite – oder du bewegst dich mit. Das Verwackeln deiner Hand zeigt dagegen der Bereich unter der Belichtungszeit.',
    iso: 'Verstärkung des Signals. Höhere ISO = heller, aber mehr Rauschen.',
    light: 'Wie hell die Szene ist. Sonne ist rund 500-mal heller als ein Wohnzimmer am Abend.',
    mode: 'Der Modus legt fest, was du einstellst und was die Kamera übernimmt.',
    stabilized:
      'Der Stabilisator gleicht kleine Wackler der Hand aus – etwa zwei Blendenstufen längere Zeiten werden möglich. Gegen Bewegung der Personen hilft er nicht.',
    flash:
      'Der Blitz reicht nur ein paar Meter. Was weiter weg ist, bleibt dunkel. Im Graph siehst du die Reichweite.',
    focus:
      'Auf diese Entfernung ist scharfgestellt. Davor und dahinter wird es allmählich unscharf. Schärfentiefe gerade: {dof}.',
    exposure:
      'Zeigt, wie weit die Belichtung vom Ideal abweicht, in Blendenstufen. Eine Stufe = doppelt bzw. halb so viel Licht.',
    noise:
      'Rauschen hängt von ISO und Sensorgröße ab. Ein kleiner Sensor rauscht bei ISO 100 etwa so wie Vollformat bei viel höherer ISO. Handys gleichen einen Teil davon aus: Sie nehmen mehrere Bilder kurz hintereinander auf und verrechnen sie – neuere Handys mehr als ältere.',
    resolution:
      'Echte Details zählen, wie viel feine Struktur vom Motiv im Fokus wirklich im Foto steckt. Selbst mit perfektem Objektiv sind das nur etwa 80 % der Pixel, denn jedes Pixel misst nur eine Farbe. Objektiv, Blende, Fokus und Bewegung kosten mehr – darum bringen doppelt so viele Megapixel weniger als doppelt so viel Detail. Nachschärfen macht Kanten kräftiger, aber kein Detail.',
    scanner:
      'Ein Negativ wird erst durch den Scan zur Datei – und der Scan entscheidet oft, wie viel vom Film übrig bleibt. Der Standard-Scan vom Labor hat nur etwa 6 MP; ein Filmscanner oder eine abfotografierende Digitalkamera holt deutlich mehr heraus, ein Trommelscanner fast alles. Bei Mittelformat bringt der größere Film mehr Pixel bei gleicher Scan-Dichte.',
    graphSimple:
      'Der grüne Bereich ist die Schärfentiefe: Was darin steht, wird scharf. Personen, Hintergrund und Fokuslinie kannst du verschieben. Mit „Details“ siehst du die ganze Schärfekurve.',
    graph:
      'Die Kurve zeigt, wie unscharf etwas in welcher Entfernung wird. Unter der Linie „scharf“ gilt es als scharf. Personen und Hintergrund kannst du verschieben.',
    autofocus:
      'Beim Nachführen bleibt die Schärfe auf dem gewählten Motiv, auch wenn es sich bewegt – an Kameras heißt das „AF-C“ oder kontinuierlicher Autofokus. Tippst du jetzt im Kamerabild auf etwas anderes, wird das verfolgt. Zum Scharfstellen von Hand: „Aus“.',
    sim: 'Tippe auf eine Person oder den Hintergrund, um darauf scharfzustellen. So ungefähr sähe das Foto aus. Unschärfe, Helligkeit, Rauschen und Bildausschnitt kommen direkt aus den Einstellungen – die Figuren sind Comic, die Rechnung dahinter nicht.',
  },
};

export type Texts = typeof de;

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}
