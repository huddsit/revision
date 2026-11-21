// Gives a test its finishing word (shown when every question has been answered correctly).
//   node tools/set-word.js <test-id>          takes the next unused word from finish-words.txt
//   node tools/set-word.js <test-id> <word>   uses the word given
// Words live in finish-words.txt and assignments are logged in word-assignments.txt.
// Both files stay on this computer (gitignored). The word is stored scrambled in the test file
// so it can't be read at a glance; someone determined could still decode it from the page.
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const [id, given] = process.argv.slice(2);
if (!id) { console.log("usage: node tools/set-word.js <test-id> [word]"); process.exit(1); }
const file = path.join(root, "docs", "tests", id + ".json");
const t = JSON.parse(fs.readFileSync(file, "utf8"));

const log = path.join(root, "word-assignments.txt");
const used = fs.existsSync(log) ? fs.readFileSync(log, "utf8").split(/\r?\n/).map(l => l.split("\t")[2]).filter(Boolean) : [];
let word = given;
if (!word) {
  const words = fs.readFileSync(path.join(root, "finish-words.txt"), "utf8").split(/\r?\n/).map(w => w.trim()).filter(Boolean);
  word = words.find(w => !used.includes(w));
  if (!word) { console.log("No unused words left in finish-words.txt"); process.exit(1); }
}
word = word.trim().toLowerCase();

const k = "rev:" + t.id;
t.finish = Buffer.from([...word].map((c, i) => c.charCodeAt(0) ^ k.charCodeAt(i % k.length))).toString("base64");

// same layout as the other tools: settings pretty-printed, one question per line
const { questions, ...rest } = t;
fs.writeFileSync(file, JSON.stringify(rest, null, 2).slice(0, -2) + ',\n  "questions": [\n' +
  questions.map(q => "    " + JSON.stringify(q)).join(",\n") + "\n  ]\n}\n");
fs.appendFileSync(log, `${new Date().toISOString().slice(0, 10)}\t${t.id}\t${word}\n`);
console.log(`${t.id}: finishing word is "${word}" (logged in word-assignments.txt)`);
