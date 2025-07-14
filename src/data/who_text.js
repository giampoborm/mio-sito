// src/data/who_text.js

export const ANCHORS = [
  {
    id: "main-name",
    text: "i'm gianpaolo\nbormioli",
    position: {
      desktop: { x: 0.42, y: 0.45 }, // edit as you wish, 0.5 = centered
      mobile:  { x: 0.25, y: 0.42 }
    },
    size: "big",
    microTexts: [
      { text: "yes, i'm italian" }
    ]
  },
  {
    id: "contact",
    text: "what\nabout you?",
    position: {
      desktop: { x: 0.62, y: 0.55 },
      mobile:  { x: 0.8, y: 0.52 }
    },
    size: "big",
    microTexts: [
      { text: "send me an email", link: "mailto:giampobo@gmail.com", class: "link" },
      { text: "or intrude my privacy on instagram", link: "https://instagram.com/giampogonzalez", class: "link" }
    ]
  },
  {
    id: "anti-nothing",
    text: "anti-nothing approach",
    position: {
      desktop: { x: 0.14, y: 0.2 },
      mobile:  { x: 0.7, y: 0.8 }
    },
    size: "small",
    microTexts: [
      { text: "if there's a box, i think outside of it" },
      { text: "intuition fueled by knowledge and research" },
      { text: "in short: i am a curious boy." }
    ]
  },
  {
    id: "communication-designer",
    text: "a communication designer",
    position: {
      desktop: { x: 0.785, y: 0.3 },
      mobile:  { x: 0.3, y: 0.17 }
    },
    size: "small",
    microTexts: [
      { text: "across print, digital, and hybrid media" },
      { text: "what does that mean? well..." }
    ]
  },
  {
    id: "stuff-i-do",
    text: "i do stuff",
    position: {
      desktop: { x: 0.2, y: 0.7 },
      mobile:  { x: 0.7, y: 0.3 }
    },
    size: "small",
    microTexts: [
      { text: "visual identities" },
      { text: "motion design" },
      { text: "generative design" },
      { text: "audiovisual design" },
      { text: "editorial & bookmaking" },
      { text: "typography" },
      { text: "other stuff" }
    ]
  },
  {
    id: "creative-direction",
    text: "creative direction / storytelling",
    position: {
      desktop: { x: 0.7, y: 0.8 },
      mobile:  { x: 0.3, y: 0.67 }
    },
    size: "small",
    microTexts: [
      { text: "shaping ideas into artefacts" },
      { text: "yeah, i'm good at thinking" },
      { text: "i swear." }
    ]
  }
];
