// All on-screen text. Code stays English; add texts.en.ts later with `satisfies Texts`.

export const de = {
  /** BCP 47 locale for number formatting. */
  locale: 'de-DE',
  appTitle: 'Fotosim',
  appSubtitle: 'Schärfe, Belichtung und Rauschen zum Ausprobieren',
  kb: 'KB',

  sensors: {
    phone2019: 'Handy (2019)',
    phoneModern: 'Handy (aktuell, Pro)',
    oneInch: '1-Zoll',
    mft: 'Micro Four Thirds',
    apsc: 'APS-C',
    fullFrame: 'Vollformat (Kleinbild)',
    mf4433: 'Mittelformat digital (44×33)',
    mf645: 'Mittelformat 6×4,5 (Film)',
    mf66: 'Mittelformat 6×6 (Film)',
    mf67: 'Mittelformat 6×7 (Film)',
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
    sensor: 'Sensor / Film',
    focalLength: 'Brennweite',
    aperture: 'Blende',
    shutter: 'Belichtungszeit',
    iso: 'ISO',
    autoIso: 'Auto-ISO',
    light: 'Lichtsituation',
    mode: 'Modus',
    flash: 'Blitz',
    stabilized: 'Bildstabilisator',
    focus: 'Fokus',
    logScale: 'Logarithmische Skala',
    autoSetHint: 'von der Kamera gesetzt',
    fixedApertureHint: 'beim Handy fest',
    digitalCropHint: 'Digitalzoom (Ausschnitt)',
  },

  elements: {
    person1: 'Person 1',
    person2: 'Person 2',
    background: 'Hintergrund',
    visible: 'Anzeigen',
    distance: 'Entfernung',
    focusHere: 'Hierauf fokussieren',
  },

  exposure: {
    title: 'Belichtung',
    strongUnder: 'stark unterbelichtet',
    slightUnder: 'leicht unterbelichtet',
    ok: 'passt',
    slightOver: 'leicht überbelichtet',
    strongOver: 'stark überbelichtet',
  },

  noise: {
    title: 'Rauschen',
    low: 'gering',
    medium: 'sichtbar',
    high: 'stark',
    veryHigh: 'sehr stark',
    equivalentIso: 'entspricht ISO {iso} an Vollformat',
  },

  shake: {
    safe: 'aus der Hand',
    needsIS: 'aus der Hand nur mit Stabilisator',
    needsTripod: 'Stativ nötig',
    markerHand: 'Hand',
    markerIS: 'Hand + IS',
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
    dofRange: 'Schärfentiefe {near} – {far}',
    infinity: '∞',
    meters: '{value} m',
    blurTimes: '{value}×',
    resetView: 'Ansicht zurücksetzen',
    hintLog: 'Personen und Fokuslinie ziehen · Antippen stellt scharf',
    hintLinear: 'Ziehen verschiebt · Mausrad oder zwei Finger zoomen',
  },

  lenses: {
    kitZoom: 'Kit-Zoom (z.B. 18–55 mm)',
    nifty50: '50 mm f/1.8',
    fast35: '35 mm f/1.4',
    portrait85: '85 mm f/1.8',
    wideZoom: 'Weitwinkel-Zoom (z.B. 16–35 mm f/4)',
    standardZoom28: 'Standardzoom 24–70 mm f/2.8',
    teleZoomBudget: 'Telezoom 70–300 mm (günstig)',
    teleZoom28: 'Telezoom 70–200 mm f/2.8',
    superTele: 'Supertele 150–600 mm',
  },

  phones: {
    y2019basic: 'Handy 2019 ohne Tele (z.B. iPhone 11, Pixel 4a)',
    y2019tele: 'Handy 2019 mit Tele (z.B. iPhone 11 Pro, Galaxy S10)',
    currentBasic: 'Aktuelles Basis-Handy (z.B. iPhone 15/16)',
    currentPro: 'Aktuelles Pro-Handy (z.B. iPhone 15 Pro)',
    currentZoom: 'Zoom-Flaggschiff (z.B. Galaxy S24 Ultra, Pixel 9 Pro)',
    portraitModeNote: 'Unscharfer Hintergrund beim Handy ist meist Software („Porträtmodus“), nicht Optik.',
  },

  // Infobox: shown for the last clicked/tapped element. {placeholders} get live values.
  info: {
    sensor:
      'Je größer der Sensor, desto mehr Licht sammelt er insgesamt – weniger Rauschen, und bei gleicher Blende weniger Schärfentiefe. Die Belichtungszeit hängt NICHT von der Sensorgröße ab.',
    focalLength:
      'Die Brennweite bestimmt den Bildausschnitt. Angegeben ist die echte Brennweite und in Klammern, was sie an Kleinbild entspricht. Lange Brennweiten verwackeln leichter.',
    aperture:
      'Kleine Blendenzahl = große Öffnung: mehr Licht, weniger Schärfentiefe. Aktuell: {aperture}, das entspricht {eqAperture} an Kleinbild.',
    shutter:
      'Wie lange der Sensor belichtet wird. Länger = heller, aber Bewegung und Verwacklung werden sichtbar. Aus der Hand bis etwa {handLimit}, mit Stabilisator bis etwa {isLimit}.',
    iso: 'Verstärkung des Signals. Höhere ISO = heller, aber mehr Rauschen.',
    light: 'Wie hell die Szene ist. Sonne ist rund 500-mal heller als ein Wohnzimmer am Abend.',
    mode: 'Der Modus legt fest, was du einstellst und was die Kamera übernimmt.',
    flash:
      'Der Blitz reicht nur ein paar Meter. Was weiter weg ist, bleibt dunkel. Im Graph siehst du die Reichweite.',
    focus:
      'Auf diese Entfernung ist scharfgestellt. Davor und dahinter wird es allmählich unscharf. Schärfentiefe gerade: {dof}.',
    exposure:
      'Zeigt, wie weit die Belichtung vom Ideal abweicht, in Blendenstufen. Eine Stufe = doppelt bzw. halb so viel Licht.',
    noise:
      'Rauschen hängt von ISO und Sensorgröße ab. Ein kleiner Sensor rauscht bei ISO 100 etwa so wie Vollformat bei viel höherer ISO.',
    graph:
      'Die Kurve zeigt, wie unscharf etwas in welcher Entfernung wird. Unter der Linie „scharf“ gilt es als scharf. Personen und Hintergrund kannst du verschieben.',
    equivalence:
      'Gleiches Bild an verschiedenen Sensoren: Brennweite und Blende mit dem Cropfaktor multiplizieren. f/1.8 an einem Handy von 2019 wirkt in Schärfentiefe und Rauschen etwa wie f/11 an Vollformat.',
  },
};

export type Texts = typeof de;

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}
