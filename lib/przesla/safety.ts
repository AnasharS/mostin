// Bezpieczeństwo w Przęsłach bez cenzury: można się wygadać (także mocnymi słowami),
// blokujemy tylko groźby, nienawiść i obrażanie innych; kryzys nie jest blokowany, tylko dostaje ramkę z pomocą.

// Telefony wsparcia - zweryfikowane na gov.pl (Ministerstwo Zdrowia, „Gdzie uzyskać pomoc psychologiczną i psychiatryczną”)
export const HELPLINES = [
  { nr: "116 123", label: "Telefon dla osób w kryzysie emocjonalnym (całodobowo, bezpłatnie)" },
  { nr: "800 70 2222", label: "Centrum Wsparcia dla osób dorosłych w kryzysie psychicznym (całodobowo, bezpłatnie)" },
  { nr: "116 111", label: "Telefon zaufania dla dzieci i młodzieży (całodobowo, bezpłatnie)" },
  { nr: "112", label: "Zagrożenie życia - numer alarmowy" },
] as const
export const HELPLINES_SOURCE = "https://www.gov.pl/web/zdrowie/gdzie-uzyskac-pomoc-psychologiczna-i-psychiatryczna"

const CRISIS = /(samob[oó]j|odebra[cćł]\w* sobie życi|zabi[cćł]\w* si[eę]|si[eę] zabi[cćł]|nie chc[eę] (już )?żyć|skończy[cć] ze sobą|nie ma sensu żyć|chc[eę] umrze[cć]|pocię?ł\w* si[eę]|okalecz)/iu
export const looksLikeCrisis = (text: string) => CRISIS.test(text)

// kategorie moderacji OpenAI, które blokują wiadomość w kręgu (samookaleczenie celowo NIE blokuje - to sygnał kryzysu)
export const BLOCKING_CATEGORIES = ["harassment/threatening", "hate", "hate/threatening", "violence/graphic", "sexual/minors"] as const

// obelgi skierowane do kogoś („ty debilu”, „jesteś idiotą”) - samo przekleństwo z frustracji przechodzi
// \b w JS nie zna polskich liter - granice słów przez \p{L}
const DIRECTED_INSULT = /(?<!\p{L})(ty|jeste[sś]|jeste[sś]cie|wy)(?!\p{L})[^.!?\n]{0,25}(?<!\p{L})(debil\w*|idiot\w*|kretyn\w*|imbecyl\w*|głup(i|ek|ia|ol)\w*|frajer\w*|dure[nń]\w*|matoł\w*|ciul\w*|baran\w*)/iu
export const isDirectedInsult = (text: string) => DIRECTED_INSULT.test(text)
