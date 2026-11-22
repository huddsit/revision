# Revision aide

A phone quiz app for the user's sons. Each assessment/exam has a source folder here (e.g. `Science Assessment/`)
holding curriculum material; Claude turns that into a question bank the app serves.

## Layout
- `<Assessment name>/` – source material dropped in by the user (pptx, pdf, photos…). **Not published** (gitignored).
- `docs/` – the published site (GitHub Pages serves this folder).
  - `index.html` – the whole app, no build step, no dependencies.
  - `tests/<id>.json` – one question bank per assessment.
  - `tests/index.json` – list shown when the site is opened without `?t=`.
- Link to send: `https://<user>.github.io/<repo>/?t=<id>`

## Making a test from a new folder
1. Read everything in the folder. For pptx use the pptx skill's `slide_text.py`; also look at embedded images
   (`ppt/media/`) – tables and labelled diagrams are often only in pictures.
2. Write `docs/tests/<kebab-id>.json` in the same shape as `science-cells-particles.json`:
   - `topics`: short key → display label (aim for 6–12 topics).
   - each question: `id`, `t` (topic key), `q`, `a` (**correct answer first**; the app shuffles), optional
     `tf: true` for True/False (a must contain "True" and "False"), optional `x` explanation shown when wrong.
   - **Pitch it for a bright pupil.** Before finishing, go through every question (including diagram ones) and
     ask how a pupil in the top 75% of the class would find it. Cut giveaways: general knowledge, absurd
     distractors, the same fact asked both ways, obvious diagram parts (use `skip`). Prefer application,
     comparison, "which is NOT", cause and effect, short scenarios; True/False only for real misconceptions.
     Keep options similar in length and detail, so the right answer isn't the longest. Check this with a script.
   - Stick to what the material says, using its wording for definitions. Distractors should be plausible
     (other items from the same table), not silly. Aim for ~10–15 questions per topic, 120–200 total.
   - Mostly 4-option multiple choice; some True/False for misconceptions (with `x`).
3. **Diagrams.** Look at every image in the material. If it is the kind of picture an exam would show and ask
   about (labelled apparatus, organism/cell diagrams, particle diagrams, results like chromatograms), draw our
   own version in `tools/make-diagrams.js`. Don't copy the source images: many are stock/BBC/third-party and the
   site is public. Images that only illustrate a point don't need a diagram.
   - Each labellable part gets an anchor `A(partId, cx, cy, lx, ly)`: the point on the part, and where the
     bubble goes (keep bubbles ≥ 18 units inside the viewBox, away from the drawing).
   - In the test JSON, `diagrams.<svgName> = { t, title, parts: {partId: "Name"}, name?, find?, modes? }`.
     The app generates a "name the part labelled ?" question and a "which letter shows the X?" question for every
     part (`modes: ["name"]` to turn off letters, e.g. when the picture already has letters on it).
   - `galleries: [{ t, q, items: { svgName: "Answer" } }]` gives "what is this picture?" questions.
   - Hand-written questions can use `img` and `mark` (one "?" pointer) too.
   - `node tools/make-diagrams.js`, then check them all on the app's "Study the diagrams" page.
4. Add the test to `docs/tests/index.json`.
5. Give it a finishing word: `node tools/set-word.js <id>` (takes the next unused word from `finish-words.txt`,
   logs it in `word-assignments.txt`; both files are local only). Tell the user which word it got.
   Tests are for Joe and Tom, who are different ages, so each test belongs to one boy and has one word.
6. Validate: `node tools/check-test.js docs/tests/<id>.json` (ids, topics, duplicate answers, diagram anchors).
7. Test locally: `python -m http.server 8765 --bind 127.0.0.1` in `docs/`, open `http://127.0.0.1:8765/?t=<id>`.
8. Commit and push; Pages updates in about a minute.

## How the app works
- Progress is per phone in localStorage (`rev.<testId>`); per question: s (asked), c, w, ok (last answer correct).
- Every round is 20 questions. Only questions not yet answered correctly are asked (up to half previous mistakes,
  the rest new). Already-correct questions are used only to fill a round when fewer than 20 remain.
  Two questions about the same diagram part are kept out of the same round where possible.
- When every question is answered correctly (so the final round was 100%), the test is finished: the
  finishing word is shown on the results and home screens and added to the WhatsApp message.
- The word is stored XOR-scrambled (key `rev:<testId>`) in the test's `finish` field. It can't be read at a
  glance, but anyone who decodes the page could find it.
- "Send result on WhatsApp" opens wa.me with a summary and a short code (hash of the details with a salt
  in the page). It stops casual editing of the message, nothing more; the salt is visible in the source.
