// Turns the SRD's feature HTML (og-dhsrd) into the app's feature format: internal #define links and CSS classes
// removed, bold/emphasis and lists kept, paragraphs joined with "\n" (the UI turns newlines into <br/>),
// and the "<strong><em>Name—Type:</em></strong>" header split into name + "<strong>Type:</strong> …".

const ENTITIES = { mdash: "—", ndash: "–", mldr: "…", hellip: "…", minus: "−", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", nbsp: " ", times: "×" };

// Drops closing tags without an opener and closes tags left open (the SRD has a few "</em>" too many).
function balanceTags(html) {
  const stack = [];
  const out = html.replace(/<(\/?)(strong|em|ul|ol|li)>/g, (tag, close, name) => {
    if (!close) {
      stack.push(name);
      return tag;
    }
    const i = stack.lastIndexOf(name);
    if (i === -1) return "";
    const closing = stack.splice(i).reverse().map((n) => `</${n}>`).join("");
    return closing;
  });
  return out + stack.reverse().map((n) => `</${n}>`).join("");
}

export function cleanHtml(html) {
  let h = String(html ?? "");
  h = h.replace(/<strong(?=[^\s>a-z])/g, "<strong>"); // "<strong1d4</strong>"
  h = h.replace(/<a\b[^>]*>/g, "").replace(/<\/a>/g, "");
  h = h.replace(/<\/?span\b[^>]*>/g, "");
  h = h.replace(/<(ul|ol|li|p|strong|em)\b[^>]*>/g, "<$1>");
  h = h.replace(/&([a-z]+);/g, (m, name) => ENTITIES[name] ?? m);
  // Paragraphs: list items hold no <p>; consecutive paragraphs become lines.
  h = h.replace(/<li>\s*<p>/g, "<li>").replace(/<\/p>\s*<\/li>/g, "</li>");
  h = h.replace(/<\/p>\s*<p>/g, "\n").replace(/<\/p>\s*(?=<(ul|ol)>)/g, "").replace(/(<\/(ul|ol)>)\s*<p>/g, "$1");
  h = h.replace(/<\/?p>/g, "");
  h = h.replace(/<(strong|em)>\s*<\/\1>/g, "");
  h = balanceTags(h);
  h = h.replace(/<(strong|em)>\s*<\/\1>/g, "");
  return h.replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").trim();
}

export const stripTags = (h) => String(h ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

const HEADER = /^((?:<\/?(?:strong|em)>|\s)*)([\s\S]+?)\s*(?:—|–|\s-\s)\s*(Passive|Action|Reaction|Evolution)\s*:\s*((?:<\/?(?:strong|em)>|\s)*)/;

// One SRD feature → { name, type, description (app format), question? }
// Environment features carry GM questions in a trailing <p class='og-questions'> paragraph.
export function convertFeature(html) {
  let question;
  const raw = String(html).replace(/<p class='[^']*og-questions[^']*'>([\s\S]*?)<\/p>/g, (m, q) => {
    const text = stripTags(cleanHtml(q));
    if (text) question = question ? `${question} ${text}` : text;
    return "";
  });
  const cleaned = cleanHtml(raw);
  const m = cleaned.match(HEADER);
  if (!m) return { name: "", type: "", description: cleaned, question };
  const name = stripTags(m[2]);
  const type = m[3];
  const body = balanceTags(cleaned.slice(m[0].length)).trim();
  return { name, type, description: `<strong>${type}:</strong> ${body}`, body, question };
}
