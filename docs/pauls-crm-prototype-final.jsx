import React, { useState, useMemo } from "react";
import { Search, ArrowLeft, Plus, Cake, Phone, Mail, Instagram, Linkedin, Bell, X, Moon, Sun } from "lucide-react";

const FONT = "'Lora', Georgia, serif";

// Full theme tokens for both modes — swap THEMES[mode] to drive the eventual toggle.
const THEMES = {
  dark: {
    bg: "#0D0D0F",
    card: "#1B1B1E",
    modal: "#222126",
    inputBg: "#232226",
    textPrimary: "#F3F2EE",
    textSecondary: "#A9A9AD",
    textTertiary: "#77777B",
    cardBorder: "rgba(243,242,238,0.08)",
    reminderCard: "#2A2013",
    reminderText: "#E3A855",
    reminderIcon: "#D99A3D",
    pillPrimaryBg: "#F3F2EE",
    pillPrimaryText: "#17171A",
    dotEmptyBorder: "#45454A",
  },
  light: {
    bg: "#F3F2EE",
    card: "#FFFFFF",
    modal: "#FFFFFF",
    inputBg: "#F3F2EE",
    textPrimary: "#17171A",
    textSecondary: "#65656A",
    textTertiary: "#9A9A9D",
    cardBorder: "rgba(23,23,26,0.08)",
    reminderCard: "#EFE3D2",
    reminderText: "#6B4A1E",
    reminderIcon: "#B5790C",
    pillPrimaryBg: "#17171A",
    pillPrimaryText: "#FFFFFF",
    dotEmptyBorder: "#CBCAC5",
  },
};

// Category accents get a dark-mode tint and a light-mode tint so contrast holds in both.
const CATEGORY_CONFIG = {
  Work: { accent: { dark: "#5B9BC2", light: "#2F6F8F" }, fields: [{ key: "company", label: "Company" }, { key: "title", label: "Title" }] },
  School: { accent: { dark: "#8B95D6", light: "#5A67A8" }, fields: [{ key: "school", label: "School" }, { key: "year", label: "Class / year" }] },
  Family: { accent: { dark: "#D48CA0", light: "#A4697E" }, fields: [{ key: "relation", label: "Relation" }] },
  Friends: { accent: { dark: "#63B39F", light: "#3F8A7A" }, fields: [{ key: "howMet", label: "How you met" }] },
  Acquaintances: { accent: { dark: "#9A9A9E", light: "#8C8C90" }, fields: [{ key: "context", label: "Context" }] },
};
const CATEGORIES = Object.keys(CATEGORY_CONFIG);

const SAMPLE_PEOPLE = [
  {
    id: 1, name: "Maribel Ortiz", category: "Work", closeness: 3,
    fields: { company: "Hershey Entertainment & Resorts", title: "Guest Experience Manager" },
    phone: "717-555-0142", email: "m.ortiz@example.com", instagram: "", linkedin: "in/maribelortiz",
    birthday: "08-28", importantDates: [{ label: "Started at HE&R", date: "2023-06-01" }],
    giftIdeas: "Mentioned wanting a good coffee grinder.",
    lastContacted: "2026-08-14",
    notes: [{ date: "2026-08-14", text: "Caught up at the partnerships meeting, she's taking over the fall schedule." }],
  },
  {
    id: 2, name: "Devon Marsh", category: "Friends", closeness: 5,
    fields: { howMet: "Freshman year dorm hall" },
    phone: "717-555-0198", email: "devon.m@example.com", instagram: "@devonmarsh", linkedin: "",
    birthday: "09-01", importantDates: [],
    giftIdeas: "Big into vinyl records, especially anything jazz.",
    lastContacted: "2026-08-20",
    notes: [{ date: "2026-08-20", text: "Grabbed dinner downtown, talked about his internship search." }, { date: "2026-07-30", text: "Watched the game at his place." }],
  },
  {
    id: 3, name: "Grandma Ruth", category: "Family", closeness: 5,
    fields: { relation: "Grandmother" },
    phone: "717-555-0111", email: "", instagram: "", linkedin: "",
    birthday: "11-12", importantDates: [{ label: "Anniversary (with Grandpa)", date: "1968-06-14" }],
    giftIdeas: "Loves puzzles and anything with cardinals on it.",
    lastContacted: "2026-08-10",
    notes: [{ date: "2026-08-10", text: "Called to check in, she's doing well, garden's producing a lot of tomatoes." }],
  },
  {
    id: 4, name: "Professor Aldrich", category: "School", closeness: 2,
    fields: { school: "Elizabethtown College", year: "Business faculty" },
    phone: "", email: "aldrich@etown.edu", instagram: "", linkedin: "",
    birthday: "03-22", importantDates: [],
    giftIdeas: "",
    lastContacted: "2026-08-05",
    notes: [{ date: "2026-08-05", text: "Office hours, discussed the fall course load." }],
  },
  {
    id: 5, name: "Sam Whitfield", category: "Acquaintances", closeness: 1,
    fields: { context: "Met at a Rock Lititz networking event" },
    phone: "", email: "s.whitfield@example.com", instagram: "", linkedin: "in/samwhitfield",
    birthday: "05-30", importantDates: [],
    giftIdeas: "",
    lastContacted: "2026-06-18",
    notes: [{ date: "2026-06-18", text: "Exchanged info, said to follow up about production roles." }],
  },
  {
    id: 6, name: "Janai Reyes", category: "Work", closeness: 4,
    fields: { company: "Hershey Entertainment & Resorts", title: "Fellow intern" },
    phone: "717-555-0176", email: "janai.r@example.com", instagram: "@janaireyes", linkedin: "",
    birthday: "10-04", importantDates: [],
    giftIdeas: "Collects enamel pins.",
    lastContacted: "2026-08-19",
    notes: [{ date: "2026-08-19", text: "Coordinated the Character Meet and Greet schedule together." }],
  },
];

function daysUntilBirthday(mmdd, today) {
  const [m, d] = mmdd.split("-").map(Number);
  let next = new Date(today.getFullYear(), m - 1, d);
  if (next < today) next = new Date(today.getFullYear() + 1, m - 1, d);
  return Math.ceil((next - today) / (1000 * 60 * 60 * 24));
}
function daysSince(dateStr, today) {
  return Math.floor((today - new Date(dateStr)) / (1000 * 60 * 60 * 24));
}
function formatMMDD(mmdd) {
  const [m, d] = mmdd.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[m - 1]} ${d}`;
}
function contactLink(type, value) {
  if (!value) return null;
  switch (type) {
    case "phone": return `tel:${value.replace(/[^\d+]/g, "")}`;
    case "email": return `mailto:${value}`;
    case "instagram": return `https://instagram.com/${value.replace("@", "")}`;
    case "linkedin": return `https://linkedin.com/${value.replace(/^\/+/, "")}`;
    default: return null;
  }
}

function ClosenessDots({ value, accent, borderColor, onChange, editable }) {
  return (
    <div style={{ display: "flex", gap: 5 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => editable && onChange && onChange(n)}
          disabled={!editable}
          style={{
            width: 6, height: 6, borderRadius: "50%", padding: 0,
            cursor: editable ? "pointer" : "default",
            background: n <= value ? accent : "transparent",
            border: n <= value ? "none" : `1px solid ${borderColor}`,
          }}
          aria-label={`Set closeness to ${n}`}
        />
      ))}
    </div>
  );
}

function CategoryChip({ category, mode }) {
  const cfg = CATEGORY_CONFIG[category];
  const accent = cfg.accent[mode];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: 3, background: accent, flexShrink: 0 }} />
      <span style={{ fontFamily: FONT, fontSize: 11.5, fontWeight: 500, letterSpacing: "0.01em", color: accent }}>
        {category}
      </span>
    </span>
  );
}

export default function PaulsCRM() {
  const [mode, setMode] = useState("dark");
  const t = THEMES[mode];
  const today = useMemo(() => new Date(2026, 7, 25), []);
  const [people, setPeople] = useState(SAMPLE_PEOPLE);
  const [query, setQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [sortBy, setSortBy] = useState("birthday");
  const [selectedId, setSelectedId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [newContact, setNewContact] = useState({ name: "", category: "Friends" });

  const upcomingBirthdays = useMemo(
    () => people.map((p) => ({ ...p, daysUntil: daysUntilBirthday(p.birthday, today) })).filter((p) => p.daysUntil <= 7).sort((a, b) => a.daysUntil - b.daysUntil),
    [people, today]
  );

  const filtered = useMemo(() => {
    let list = people.filter((p) => (filterCategory === "All" || p.category === filterCategory) && p.name.toLowerCase().includes(query.toLowerCase()));
    if (sortBy === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "lastContacted") list = [...list].sort((a, b) => daysSince(a.lastContacted, today) - daysSince(b.lastContacted, today));
    if (sortBy === "birthday") list = [...list].sort((a, b) => daysUntilBirthday(a.birthday, today) - daysUntilBirthday(b.birthday, today));
    return list;
  }, [people, query, filterCategory, sortBy, today]);

  const selected = people.find((p) => p.id === selectedId);

  function updateSelected(patch) {
    setPeople((prev) => prev.map((p) => (p.id === selectedId ? { ...p, ...patch } : p)));
  }
  function addNote() {
    if (!noteDraft.trim()) return;
    const dateStr = today.toISOString().slice(0, 10);
    updateSelected({ notes: [{ date: dateStr, text: noteDraft.trim() }, ...selected.notes], lastContacted: dateStr });
    setNoteDraft("");
  }
  function addContact() {
    if (!newContact.name.trim()) return;
    const cfg = CATEGORY_CONFIG[newContact.category];
    const fields = {};
    cfg.fields.forEach((f) => (fields[f.key] = ""));
    const contact = {
      id: Date.now(), name: newContact.name.trim(), category: newContact.category, closeness: 3,
      fields, phone: "", email: "", instagram: "", linkedin: "",
      birthday: "01-01", importantDates: [], giftIdeas: "", lastContacted: today.toISOString().slice(0, 10), notes: [],
    };
    setPeople((prev) => [...prev, contact]);
    setNewContact({ name: "", category: "Friends" });
    setShowAddForm(false);
  }

  function Card({ children, style }) {
    return <div style={{ background: t.card, borderRadius: 22, padding: "16px 18px", marginBottom: 12, ...style }}>{children}</div>;
  }
  function SectionLabel({ children }) {
    return <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: t.textTertiary, marginBottom: 10 }}>{children}</div>;
  }
  function Row({ label, value }) {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${t.cardBorder}`, fontFamily: FONT, fontSize: 13.5 }}>
        <span style={{ color: t.textTertiary }}>{label}</span>
        <span style={{ color: t.textPrimary, fontWeight: 500 }}>{value}</span>
      </div>
    );
  }
  function IconRow({ icon, label, value, href }) {
    const linkColor = mode === "dark" ? "#8FC2E0" : "#2F6F8F";
    const content = (
      <>
        {icon && <span style={{ color: t.textTertiary, display: "flex" }}>{icon}</span>}
        {label && <span style={{ color: t.textTertiary, minWidth: 70 }}>{label}</span>}
        <span style={{ color: href ? linkColor : t.textPrimary, fontWeight: 500, textDecoration: href ? "underline" : "none", textUnderlineOffset: 2 }}>{value}</span>
      </>
    );
    const rowStyle = { display: "flex", alignItems: "center", gap: 8, padding: "7px 0", fontFamily: FONT, fontSize: 13.5 };
    return href
      ? <a href={href} target="_blank" rel="noreferrer" style={{ ...rowStyle, textDecoration: "none", cursor: "pointer" }}>{content}</a>
      : <div style={rowStyle}>{content}</div>;
  }

  const fontImport = "@import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap');";
  const wrap = { maxWidth: 420, margin: "0 auto", background: t.bg, minHeight: 640, fontFamily: FONT, color: t.textPrimary, transition: "background 0.2s" };

  const ThemeToggle = (
    <button
      onClick={() => setMode((m) => (m === "dark" ? "light" : "dark"))}
      style={{ border: "none", borderRadius: 999, background: t.card, color: t.textSecondary, padding: 8, display: "flex", cursor: "pointer" }}
      aria-label="Toggle theme"
    >
      {mode === "dark" ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );

  if (selected) {
    const cfg = CATEGORY_CONFIG[selected.category];
    const accent = cfg.accent[mode];
    return (
      <div style={wrap}>
        <style>{fontImport}</style>
        <div style={{ padding: "20px 18px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setSelectedId(null)} style={{ border: "none", background: "none", cursor: "pointer", padding: 4, color: t.textPrimary }} aria-label="Back">
              <ArrowLeft size={20} />
            </button>
            <span style={{ fontFamily: FONT, fontSize: 13, color: t.textTertiary }}>Back to people</span>
          </div>
          {ThemeToggle}
        </div>

        <div style={{ padding: "12px 18px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, paddingLeft: 2 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: accent + "26", color: accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 15 }}>
              {selected.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 18, marginBottom: 4, color: t.textPrimary }}>{selected.name}</div>
              <CategoryChip category={selected.category} mode={mode} />
            </div>
          </div>

          <Card style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: t.textTertiary }}>Closeness</span>
            <ClosenessDots value={selected.closeness} accent={accent} borderColor={t.dotEmptyBorder} editable onChange={(n) => updateSelected({ closeness: n })} />
          </Card>

          <Card>
            <SectionLabel>{selected.category === "Work" ? "Work details" : selected.category === "School" ? "School details" : selected.category === "Family" ? "Family details" : "Details"}</SectionLabel>
            {cfg.fields.map((f) => <Row key={f.key} label={f.label} value={selected.fields[f.key] || "\u2014"} />)}
          </Card>

          <Card>
            <SectionLabel>Contact</SectionLabel>
            <IconRow icon={<Phone size={14} />} value={selected.phone || "\u2014"} href={contactLink("phone", selected.phone)} />
            <IconRow icon={<Mail size={14} />} value={selected.email || "\u2014"} href={contactLink("email", selected.email)} />
            <IconRow icon={<Instagram size={14} />} value={selected.instagram || "\u2014"} href={contactLink("instagram", selected.instagram)} />
            <IconRow icon={<Linkedin size={14} />} value={selected.linkedin || "\u2014"} href={contactLink("linkedin", selected.linkedin)} />
          </Card>

          <Card>
            <SectionLabel>Important dates</SectionLabel>
            <IconRow icon={<Cake size={14} />} label="Birthday" value={formatMMDD(selected.birthday)} />
            {selected.importantDates.map((d, i) => <IconRow key={i} label={d.label} value={d.date} />)}
          </Card>

          <Card>
            <SectionLabel>Gift ideas</SectionLabel>
            <p style={{ fontFamily: FONT, fontSize: 14, lineHeight: 1.55, color: selected.giftIdeas ? t.textPrimary : t.textTertiary, margin: 0 }}>
              {selected.giftIdeas || "No gift ideas noted yet."}
            </p>
          </Card>

          <Card>
            <SectionLabel>Notes</SectionLabel>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Add a note..."
                style={{ flex: 1, fontFamily: FONT, fontSize: 13.5, padding: "9px 12px", border: `1px solid ${t.cardBorder}`, borderRadius: 999, background: t.inputBg, color: t.textPrimary }}
              />
              <button onClick={addNote} style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12.5, padding: "9px 16px", border: "none", borderRadius: 999, background: t.pillPrimaryBg, color: t.pillPrimaryText, cursor: "pointer" }}>
                Add
              </button>
            </div>
            {selected.notes.length === 0 && <p style={{ fontFamily: FONT, fontSize: 13.5, color: t.textTertiary }}>No notes yet.</p>}
            {selected.notes.map((n, i) => (
              <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: i < selected.notes.length - 1 ? `1px solid ${t.cardBorder}` : "none" }}>
                <div style={{ fontFamily: FONT, fontSize: 11.5, fontWeight: 500, color: t.textTertiary, marginBottom: 3 }}>{n.date}</div>
                <div style={{ fontFamily: FONT, fontSize: 14, lineHeight: 1.55, color: t.textSecondary }}>{n.text}</div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <style>{fontImport}</style>
      <div style={{ padding: "22px 18px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h1 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 26, letterSpacing: "-0.01em", margin: 0, color: t.textPrimary }}>Paul's CRM</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {ThemeToggle}
            <button onClick={() => setShowAddForm(true)} style={{ border: "none", borderRadius: 999, background: t.pillPrimaryBg, color: t.pillPrimaryText, padding: "8px 14px", display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontFamily: FONT, fontWeight: 600, fontSize: 12.5 }}>
              <Plus size={14} /> Add
            </button>
          </div>
        </div>

        {upcomingBirthdays.length > 0 && (
          <div style={{ background: t.reminderCard, borderRadius: 18, padding: "12px 14px", marginBottom: 14, display: "flex", gap: 9, alignItems: "flex-start" }}>
            <Bell size={14} style={{ color: t.reminderIcon, marginTop: 2, flexShrink: 0 }} />
            <div style={{ fontFamily: FONT, fontSize: 13, color: t.reminderText, lineHeight: 1.5 }}>
              {upcomingBirthdays.map((p) => (
                <div key={p.id}>{p.name}'s birthday {p.daysUntil === 0 ? "is today" : `in ${p.daysUntil} day${p.daysUntil === 1 ? "" : "s"}`}</div>
              ))}
            </div>
          </div>
        )}

        <div style={{ position: "relative", marginBottom: 14 }}>
          <Search size={14} style={{ position: "absolute", left: 14, top: 12, color: t.textTertiary }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people..."
            style={{ width: "100%", boxSizing: "border-box", fontFamily: FONT, fontSize: 13.5, padding: "11px 12px 11px 36px", border: "none", borderRadius: 999, background: t.card, color: t.textPrimary }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {["All", ...CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setFilterCategory(c)}
              style={{
                fontFamily: FONT, fontSize: 12, fontWeight: 500,
                padding: "7px 13px", borderRadius: 999, cursor: "pointer",
                border: filterCategory === c ? "none" : `1px solid ${t.cardBorder}`,
                background: filterCategory === c ? t.pillPrimaryBg : "transparent",
                color: filterCategory === c ? t.pillPrimaryText : t.textTertiary,
              }}
            >
              {c}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ fontFamily: FONT, fontSize: 12, border: "none", background: "none", color: t.textTertiary, cursor: "pointer" }}>
            <option value="birthday">Sort: birthday</option>
            <option value="lastContacted">Sort: last contacted</option>
            <option value="name">Sort: name</option>
          </select>
        </div>
      </div>

      <div style={{ padding: "0 18px 24px" }}>
        {filtered.length === 0 && <p style={{ fontFamily: FONT, fontSize: 13.5, color: t.textTertiary, textAlign: "center", marginTop: 24 }}>No one matches.</p>}
        {filtered.map((p) => {
          const cfg = CATEGORY_CONFIG[p.category];
          const accent = cfg.accent[mode];
          const dSince = daysSince(p.lastContacted, today);
          return (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              style={{
                width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 12,
                background: t.card, border: "none", borderRadius: 18,
                padding: "14px 16px", marginBottom: 10, cursor: "pointer",
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 12, background: accent + "1F", color: accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 12.5, flexShrink: 0 }}>
                {p.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 14.5, marginBottom: 4, color: t.textPrimary }}>{p.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <CategoryChip category={p.category} mode={mode} />
                  <span style={{ fontFamily: FONT, fontSize: 11, color: t.textTertiary }}>{dSince}d since contact</span>
                </div>
              </div>
              <ClosenessDots value={p.closeness} accent={accent} borderColor={t.dotEmptyBorder} editable={false} />
            </button>
          );
        })}
      </div>

      {showAddForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: t.modal, borderRadius: 24, padding: 22, width: "100%", maxWidth: 340 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 16, color: t.textPrimary }}>Add person</span>
              <button onClick={() => setShowAddForm(false)} style={{ border: "none", background: "none", cursor: "pointer", color: t.textTertiary }}><X size={18} /></button>
            </div>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: t.textTertiary, marginBottom: 6 }}>Name</div>
            <input
              value={newContact.name}
              onChange={(e) => setNewContact((c) => ({ ...c, name: e.target.value }))}
              style={{ width: "100%", boxSizing: "border-box", fontFamily: FONT, fontSize: 14, padding: "10px 14px", border: `1px solid ${t.cardBorder}`, borderRadius: 999, marginBottom: 16, background: t.inputBg, color: t.textPrimary }}
            />
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: t.textTertiary, marginBottom: 6 }}>Category</div>
            <select
              value={newContact.category}
              onChange={(e) => setNewContact((c) => ({ ...c, category: e.target.value }))}
              style={{ width: "100%", boxSizing: "border-box", fontFamily: FONT, fontSize: 14, padding: "10px 14px", border: `1px solid ${t.cardBorder}`, borderRadius: 999, marginBottom: 20, background: t.inputBg, color: t.textPrimary }}
            >
              {CATEGORIES.map((c) => <option key={c} value={c} style={{ color: "#000" }}>{c}</option>)}
            </select>
            <button onClick={addContact} style={{ width: "100%", padding: "12px", background: t.pillPrimaryBg, color: t.pillPrimaryText, border: "none", borderRadius: 999, cursor: "pointer", fontFamily: FONT, fontWeight: 600, fontSize: 13.5 }}>
              Add person
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
