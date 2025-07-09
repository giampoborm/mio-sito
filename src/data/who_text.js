// src/data/who_text.js

export const ANCHORS = [
  {
    id: "main-name",
    text: "i'm gianpaolo\nbormioli",
    position: {
      desktop: { x: 0.4, y: 0.45 }, // edit as you wish, 0.5 = centered
      mobile:  { x: 0.32, y: 0.50 }
    },
    size: "big",
    microTexts: [
      { text: "yes, i'm italian" }
    ]
  },
  {
    id: "what-about-you",
    text: "what\nabout you?",
    position: {
      desktop: { x: 0.6, y: 0.55 },
      mobile:  { x: 0.745, y: 0.6 }
    },
    size: "big",
    microTexts: [
      { text: "send me an email", link: "mailto:giampobo@gmail.com", class: "link" },
      { text: "or intrude my privacy on instagram", link: "https://instagram.com/giampogonzalez", class: "link" }
    ]
  },
  {
    id: "maniacally-diy",
    text: "maniacally diy",
    position: {
      desktop: { x: 0.14, y: 0.2 },
      mobile:  { x: 0.15, y: 0.17 }
    },
    size: "small",
    microTexts: [
      { text: "i love anything open-source, raw, self-made, independent" },
      { text: "contradictions, research, intuition, seeking knowledge, anthropocentrism" },
      { text: "ok, i'm getting esoteric again... someone come get me pls" }
    ]
  },
  {
    id: "communication-designer",
    text: "a communication designer",
    position: {
      desktop: { x: 0.75, y: 0.23 },
      mobile:  { x: 0.7, y: 0.23 }
    },
    size: "small",
    microTexts: [
      { text: "what does that even mean?" },
      { text: "usually that's what i'm asked" }
    ]
  },
  {
    id: "digital-analog",
    text: "digital / analog media",
    position: {
      desktop: { x: 0.4, y: 0.74 },
      mobile:  { x: 0.42, y: 0.35 }
    },
    size: "small",
    microTexts: [
      { text: "graphic design" },
      { text: "motion design" },
      { text: "AI image manipulation" },
      { text: "creative coding" },
      { text: "screenprinting" },
      { text: "live visuals" },
      { text: "bookbinding" },
      { text: "calligraphy" },
      { text: "other stuff" }
    ]
  },
  {
    id: "creative-direction",
    text: "creative direction / storytelling",
    position: {
      desktop: { x: 0.85, y: 0.8 },
      mobile:  { x: 0.65, y: 0.76 }
    },
    size: "small",
    microTexts: [
      { text: "creative director" }, // now its own microtext
      { text: "yeah, i'm good at thinking. i swear." }
    ]
  },
  {
    id: "joke-anchor",
    text: "i could make some jokes here",
    position: {
      desktop: { x: 0.14, y: 0.9 },
      mobile:  { x: 0.35, y: 0.95 }
    },
    size: "small",
    microTexts: [
      { text: "my tools are coffee and ctrl+z" },
      { text: "pineapple on pizza" },
      { text: "crying laughing emoji" }
    ]
  }
];
